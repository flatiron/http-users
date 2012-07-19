/*
 * organization.js: Organization resource for managing application users.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var resourceful = require('resourceful');

exports.resource = function (app) {
  var User = app.resources.User;
  var Permission = app.resources.Permission;

  var Organization =
  app.resources.Organization =
  app.define('Organization', function () {
    var self = this;

    //
    // Setup properties
    //
    this.string('_id')
        .unique(true)
        .sanitize('lower')
        .sanitize('prefix', 'organization/');
    this.string('name').sanitize('lower');
    this.string('owner');
    //this.array('owner');
    this.array('members');

    this.timestamps();
    this.restful = true;

    //
    // Create and update hooks
    //
    ['create', 'update'].forEach(function (method) {
      self.before(method, function (org, callback) {
        if (org._id && !org.name) {
          org.name = org._id.split('/')[1];
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
          var l = doc.members.length,
              i = 0;

          for (; i < l; i++) {
            emit(doc.members[i], { _id: doc._id });
          }
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

  Organization._available = function (name, callback) {
    Organization.get(name, function (err, org) {
      if (!err || err.error !== 'not_found') {
        return err
          ? callback(err)
          : callback(null, false);
      }

      User.get(name, function (err, user) {
        if (!err || err.error !== 'not_found') {
          return err
            ? callback(err)
            : callback(null, false);
        }

        return err
          ? callback(err)
          : callback(null, true);
      });
    });
  };

  //
  // ### function addMember (username, callback)
  // #### @username {string} Member to add.
  // #### @callback {function} Continuation to respond to.
  // Add a member to specified organization.
  //
  // TODO hook into user deletion to remove users from organizations
  Organization.prototype.addMember = function (username, callback) {
    var org = this;

    org.members = org.members || [];

    if (~org.members.indexOf(username)) {
      return callback(new Error('User is already a part of this organization.'));
    }

    User.get(username, function (err, user) {
      if (err || !user) {
        return callback(err || new Error('User does not exist.'));
      }

      org.members.push(username);

      return Organization.update(org._id, { members: org.members }, callback);
    });
  };

  //
  // ### function removeMember (username, callback)
  // #### @username {string} Member to remove.
  // #### @callback {function} Continuation to respond to.
  // Remove a member from specified organization.
  //
  Organization.prototype.removeMember = function (username, callback) {
    var org = this;

    org.members = org.members || [];

    var i = org.members.indexOf(username);
    if (~i) {
      org.members.splice(i, 1);
    } else {
      return callback(new Error('Organization does not contain specified user.'));
    }

    return Organization.update(org._id, { members: org.members }, callback);
  };

  //
  // ### function setOwner (username, callback)
  // #### @username {string} User to set as owner of organization.
  // #### @callback {function} Continuation to respond to.
  // Set the owner of an organization.
  //
  Organization.prototype.setOwner = function (username, callback) {
    var org = this;

    if (org.owner === username) {
      return callback(new Error('Specified user is already the organization owner.'));
    }

    User.get(username, function (err, user) {
      if (err || !user) {
        return callback(err || new Error('User does not exist.'));
      }

      org.owner = username;
      // if (!~org.owner.indexOf(username)) org.owner.push(username);

      return Organization.update(org._id, { owner: org.owner }, callback);
    });
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
  var User = app.resources.User;
  var Permission = app.resources.Permission;
  var Organization = app.resources.Organization;

  //
  // Require authentication for `/organizations`.
  //
  app.router.before('/organizations', app.requireAuth);

  //
  // Add all organizations to the req object
  //
  app.router.before('/organizations', function () {
    var next = arguments[arguments.length-1],
        self = this;

    Organization.byMember(this.req.user.username, function (err, org) {
      if (err) {
        return next(err);
      } else if (!org) {
        return next(new Error('Not authorized.'));
      }

      self.req.organizations = org;
      org.forEach(function (org) {
        self.req.organizations[org.name] = org;
      });

      return next();
    });
  });

  //
  // Checking for organization name availability does not
  // require authentication.
  //
  app.unauthorized.path('/organizations', function () {
    //
    // Show all organizations
    //
    this.get(function () {
      var req = this.req,
          res = this.res;

      Organization.all(function (err, organizations) {
        if (err) {
          return res.json(500, err);
        }

        res.json(200, organizations);
      });
    });

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
    //
    // Show all of the user's organizations
    //
    this.get(function () {
      var req = this.req,
          res = this.res;

      Organization.byMember(req.user.username, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        res.json(200, org);
      });
    });

    //
    // Show Organization
    //
    this.get('/:id', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        res.json(200, org);
      });
    });

    //
    // Update Organization
    //
    this.post('/:id', function (id) {
      return res.json(500, { error: 'Not supported.' });
    });

    //
    // Temporarily Disabled
    //
    this.post('/:id', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        // XXX Possibly make owner-only?
        if (!req.user.can('modify organization', org.name)
            && req.user.username !== org.owner) {
          return res.json(403, { error: 'Not owner.' });
        }

        org.update(req.body, function (err) {
          return err
            ? res.json(500, err)
            : res.json(200);
        });
      });
    });

    //
    // Create Organization
    //
    this.put('/:id', function (id) {
      var req = this.req,
          res = this.res,
          user = req.user,
          org = {};

      org._id = ['organization', id].join('/');
      org.name = id;
      org.owner = user.username;
      org.members = [user.username];

      Organization.create(org, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        res.json(200, org);
      });
    });

    //
    // Delete Organization
    //
    this.delete('/:id', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        //if (!req.user.can('delete organization', org.name)
        //    && req.user.username !== org.owner) {
        // OWNER ONLY
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

    //
    // Get Member
    //
    this.get('/:id/:member', function (id, member) {
      return this.res.json(403, { error: 'Not supported.' });
    });

    //
    // Toggle Member Permissions
    // Maybe just stick with: `PUT /users/:username/permissions`, etc?
    // NOTE: permissions need to be removed from user when they are
    // removed from the organization.
    //
    this.post('/:id/:member', function (id, member) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        if (req.user.username !== org.owner) {
          return res.json(403);
        }

        if (!~org.members.indexOf(member)) {
          return res.json(500);
        }

        User.get(member, function (err, user) {
          if (err) return res.json(500, err);
          if (!user.can('modify organization', org.name)) {
            Permission.allow(user, 'modify organization', org.name, function (err) {
              if (err) return res.json(500, err);
              return res.json(200);
            });
          } else {
            Permission.disallow(user, 'modify organization', org.name, function (err) {
              if (err) return res.json(500, err);
              return res.json(200);
            });
          }
        });
      });
    });

    //
    // Add Member
    //
    this.put('/:id/:member', function (id, member) {
      var req = this.req,
          res = this.res,
          body = this.req.body;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        if (!req.user.can('modify organization', org.name)
            && req.user.username !== org.owner) {
          return res.json(403, { error: 'Not owner.' });
        }

        org.addMember(member, function (err) {
          if (err) {
            return res.json(500, err);
          }

          res.json(200, org);
        });
      });
    });

    //
    // Remove Member
    //
    this.delete('/:id/:member', function (id, member) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        if (member === org.owner) {
          return res.json(403, { error: 'You cannot remove the owner.' });
        }

        if (!req.user.can('modify organization', org.name)
            && req.user.username !== org.owner
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
