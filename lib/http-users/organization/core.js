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
    this.array('owners');
    this.array('members');

    this.timestamps();

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
          var l = doc.owners.length,
              i = 0;

          for (; i < l; i++) {
            emit(doc.owners[i], { _id: doc._id });
          }
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
  Organization.available = function (name, callback) {
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

        return callback(null, true);
      });
    });
  };

  //
  // ### function addMember (username, callback)
  // #### @username {string} Member to add.
  // #### @callback {function} Continuation to respond to.
  // Add a member to specified organization.
  //
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

      return Organization.update(org._id, { members: org.members }, function (err) {
        if (err) return callback(err);
        return callback(null, org);
      });
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

    var i = org.owners.indexOf(username);
    if (~i) {
      if (org.owners.length === 1) {
        return callback(new Error('Cannot remove the only owner.'));
      }
      org.owners.splice(i, 1);
    }

    var data = {
      members: org.members,
      owners: org.owners
    };

    return Organization.update(org._id, data, function (err) {
      if (err) return callback(err);
      return callback(null, org);
    });
  };

  //
  // ### function addOwner (username, callback)
  // #### @username {string} User to set as owner of organization.
  // #### @callback {function} Continuation to respond to.
  // Add an owner to the organization.
  //
  Organization.prototype.addOwner = function (username, callback) {
    var org = this;

    if (~org.owners.indexOf(username)) {
      return callback(new Error('Specified user is already the organization owner.'));
    }

    User.get(username, function (err, user) {
      if (err || !user) {
        return callback(err || new Error('User does not exist.'));
      }

      org.owners = org.owners || [];
      org.owners.push(username);

      org.members = org.members || [];
      org.members.push(username);

      var data = {
        members: org.members,
        owners: org.owners
      };

      return Organization.update(org._id, data, function (err) {
        if (err) return callback(err);
        return callback(null, org);
      });
    });
  };

  //
  // ### function removeOwner (username, callback)
  // #### @username {string} Owner to remove from organization.
  // #### @callback {function} Continuation to respond to.
  // Remove the owner of an organization.
  //
  Organization.prototype.removeOwner = function (username, callback) {
    var org = this;

    if (!~org.owners.indexOf(username)) {
      return callback(new Error('Specified user is not an owner.'));
    }

    // return org.removeMember(username, callback);

    var i = org.owners.indexOf(username);
    if (~i) {
      if (org.owners.length === 1) {
        return callback(new Error('Cannot remove the only owner.'));
      }
      org.owners.splice(i, 1);
    }

    return Organization.update(org._id, { owners: org.owners }, function (err) {
      if (err) return callback(err);
      return callback(null, org);
    });
  };

  //
  // Non-prototypal/Static
  //
  ['addMember',
   'removeMember',
   'addOwner',
   'removeOwner'].forEach(function (method) {
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
  app.router.before('/organizations', app.requireUserPassAuthForWrite);

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
  if (app.unauthorized) app.unauthorized.path('/organizations', function () {
    //
    // Check: GET to `/organizations/:org/available` will check to see
    // if a specified organization name is available.
    //
    this.get('/:org/available', function (id) {
      var res = this.res;

      Organization.available(id, function (err, available) {
        return err
          ? res.json(500, { error: err.message })
          : res.json(200, { available: available });
      });
    });
  });

  //
  // Authorized Routes
  //
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
    this.get('/:org', function (id) {
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
    this.put('/:org', function (id) {
      return res.json(500, { error: 'Not supported.' });
    });

    // Temporarily Disabled
    this.put('/:org', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        if (!~org.owners.indexOf(req.user.username)) {
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
    this.post('/:org', function (id) {
      var req = this.req,
          res = this.res,
          user = req.user,
          org = {};

      org._id = ['organization', id].join('/');
      org.name = id;
      org.owners = [user.username];
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
    this.delete('/:org', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        if (!~org.owners.indexOf(req.user.username)) {
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
    // Get Members
    //
    this.get('/:org/members', function (id) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }
        return res.json(200, org.members);
      });
    });

    //
    // Get Member
    //
    this.get('/:org/members/:member', function (id, member) {
      return this.res.json(403, { error: 'Not supported.' });
    });

    //
    // Add Member
    //
    this.post('/:org/members/:member', function (id, member) {
      var req = this.req,
          res = this.res,
          body = this.req.body;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        if (!~org.owners.indexOf(req.user.username)) {
          return res.json(403, { error: 'User is not an owner.' });
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
    this.delete('/:org/members/:member', function (id, member) {
      var req = this.req,
          res = this.res;

      Organization.get(id, function (err, org) {
        if (err) {
          return res.json(500, err);
        }

        if (~org.owners.indexOf(member) && org.owners.length === 1) {
          return res.json(403, { error: 'You cannot remove the only owner.' });
        }

        if (!~org.owners.indexOf(req.user.username)
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
