/*
 * organization.js: Organization resource for managing application users.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var resourceful = require('resourceful');

exports.resource = function (app) {
  var Organization =
  app.resources.Organization =
  resourceful.define('Organization', function () {
    var self = this;

    //
    // Setup properties
    //
    this.string('_id')
        .unique(true)
        .sanitize('lower')
        .prefix('organization/');
    this.string('owner');
    this.array('members');
    this.object('profile');

    this.timestamps();
    this.restful = true;

    //
    // Create and update hooks
    //
    ['create', 'update'].forEach(function (method) {
      self.before(method, function (org, callback) {
        if (org._id) {
          org.name = org._id;
        }

        callback();
      });
    });

    //
    // Setup after hooks for logging core methods.
    //
    ['get', 'create', 'update', 'destroy'].forEach(function (method) {
      self.after(method, function (_, obj, callback) {
        app.emit(['organization', method], 'info', obj);
        callback();
      });
    });

    //
    // Create default views
    //
    this.filter('all', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'Organization') {
          emit(doc._id, { _id: doc._id });
        }
      }
    });

    this.filter('byName', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'Organization') {
          emit(doc.name, { _id: doc._id });
        }
      }
    });

    this.filter('byOwner', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'Organization') {
          emit(doc.owner, { _id: doc._id });
        }
      }
    });

    this.filter('byMember', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'Organization' && doc.members) {
          doc.members.forEach(function (member) {
            emit(member, { _id: doc._id });
          });
        }
      }
    });
  });

  //
  // ### function available (id, callback)
  // #### @id {string} Name to check existance of organization.
  // #### @callback {function} Continuation to respond to.
  // Checks the existance of the existing organization `id`.
  //
  Organization.available = function (organization, callback) {
    this.get(organization, function (err, org) {
      if (err && err.error === 'not_found') {
        return callback(null, true);
      }

      return err
        ? callback(err)
        : callback(null, false);
    });
  };

  //
  // ### function addMember (username, callback)
  // #### @username {string} Member to add.
  // #### @callback {function} Continuation to respond to.
  // Add a member to specified organization.
  //
  // TODO hook into user deletion to remove users from organizations
  Organization.addMember = function (organization, username, callback) {
    this.get(organization, function (err, org) {
      if (err) return callback(err);

      // TODO User.get(username, function () { .. });
      org.members = org.members || [];
      org.members.push(username);

      return Organization.update(org._id, { members: org.members }, callback);
    });
  };

  Organization.prototype.addMember = function (organization, username, callback) {
    var org = this;

    // TODO User.get(username, function () { .. });
    org.members = org.members || [];
    org.members.push(username);

    return Organization.update(org._id, { members: org.members }, callback);
  };

  //
  // ### function removeMember (username, callback)
  // #### @username {string} Member to remove.
  // #### @callback {function} Continuation to respond to.
  // Remove a member from specified organization.
  //
  Organization.removeMember = function (organization, username, callback) {
    this.get(organization, function (err, org) {
      if (err) return callback(err);

      org.members = org.members || [];
      var i = org.members.indexOf(username);
      if (~i) org.members.splice(i, 1);

      return Organization.update(org._id, { members: org.members }, callback);
    });
  };

  Organization.prototype.removeMember = function (username, callback) {
    var org = this;

    org.members = org.members || [];
    var i = org.members.indexOf(username);
    if (~i) org.members.splice(i, 1);

    return Organization.update(org._id, { members: org.members }, callback);
  };

  //
  // ### function setOwner (username, callback)
  // #### @username {string} User to set as owner of organization.
  // #### @callback {function} Continuation to respond to.
  // Set the owner of an organization.
  //
  Organization.setOwner = function (organization, username, callback) {
    this.get(organization, function (err, org) {
      if (err) return callback(err);

      // TODO User.get(username, function () { .. });
      org.owner = username;

      return Organization.update(org._id, { owner: org.owner }, callback);
    });
  };

  Organization.prototype.setOwner = function (username, callback) {
    var org = this;
    // TODO User.get(username, function () { .. });
    org.owner = username;
    return Organization.update(org._id, { owner: org.owner }, callback);
  };

  //
  // Non-prototypal/Static
  //
  ['addMember',
   'removeMember',
   'setOwner'].forEach(function (method) {
    Organization[method] = function (name) {
      var Organization = this,
          args = Array.prototype.slice.call(arguments, 1),
          callback = args[args.length-1];

      Organization.get(name, function (err, org) {
        if (err) return typeof callback === 'function' && callback(err);
        Organization.prototype[method].apply(org, args);
      });
    };
  });
};

exports.routes = function (app) {
  var Organization = app.resources.Organization;

  //
  // Require authentication for `/organizations`.
  //
  app.router.before('/organizations', app.requireAuth);

  //
  // Checking for organization name availability does not
  // require authentication.
  //
  app.unauthorized.path('/organizations', function () {
    //
    // Check: GET to `/organizations/:id/available` will check to see
    // if a specified organization name is available.
    //
    this.get('/:id/available', function (id) {
      var res = this.res;

      Organization.available(id, function (err, available) {
        return err
          ? res.json(500, { error: err.message })
          : res.json(200, { available: available });
      });
    });
  });

  app.router.path('/organizations', function () {
    this.get(function () {
      var req = this.req,
          res = this.res;

      //Organization.all(function (err, organizations) {
      Organization.byMember(req.user.username, function (err, organizations) {
        if (err) {
          return res.json(500, { error: err.message || err });
        }

        res.json(200, organizations);
      });
    });

    this.get('/:id', function (id) {
      var res = this.res;

      Organization.get(id, function (err, organization) {
        if (err) {
          return res.json(500, { error: err.message || err });
        }

        res.json(200, organization);
      });
    });

    this.post('/:id', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, { error: err.message || err });
        }

        // TODO Add permissions
        if (req.user.username !== org.owner) {
          return res.json(403, { error: 'Not owner.' });
        }

        org.update(req.body, function (err) {
          return err
            ? res.json(500, { error: err.message || err })
            : res.json(200);
        });
      });
    });

    this.put('/:id', function (id) {
      var res = this.res,
          organization = {};

      organization._id = organization._id || id;
      organization.name = organization.name || id;
      organization.owner = this.req.user.username;
      organization.members = [this.req.user.username];

      Organization.create(organization, function (err, organization) {
        if (err) {
          return res.json(500, { error: err.message || err });
        }

        res.json(200, organization);
      });
    });

    this.delete('/:id', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, { error: err.message || err });
        }

        // TODO Add permissions
        if (req.user.username !== org.owner) {
          return res.json(403, { error: 'Not owner.' });
        }

        org.destroy(function (err) {
          return err
            ? res.json(500, err)
            : res.json(200);
        });
      });
    });

    this.get('/:id/:member', function (id, member) {
      return this.res.json(403, { error: 'Not supported.' });
    });

    this.post('/:id/:member', function (id, member) {
      return this.res.json(403, { error: 'Not supported.' });
    });

    this.put('/:id/:member', function (id, member) {
      var res = this.res,
          body = this.req.body;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, { error: err.message || err });
        }

        // TODO Add permissions
        // Other users should be able to have permissions
        // to add members, etc.
        if (req.user.username !== org.owner) {
          return res.json(403, { error: 'Not owner.' });
        }

        org.addMember(member, function (err, organization) {
          if (err) {
            return res.json(500, err);
          }

          res.json(200, organization);
        });
      });
    });

    this.delete('/:id/:member', function (id, member) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, { error: err.message || err });
        }

        if (req.user.username === org.owner) {
          return res.json(403, { error: 'You cannot remove the owner.' });
        }

        // TODO Add permissions
        if (req.user.username !== org.owner
            && req.user.username !== member) {
          return res.json(403, { error: 'Not owner.' });
        }

        org.removeMember(member, function (err, organization) {
          if (err) {
            return res.json(500, err);
          }

          res.json(200, organization);
        });
      });
    });
  });
};
