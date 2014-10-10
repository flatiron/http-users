'use strict';

/*
 * user.js: User resource for managing application users.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    director = require('director'),
    hash = require('node_hash'),
    uuid = require('node-uuid'),
    common = require('flatiron').common,
    async = common.async;

//
// ### function resource (app)
// #### @app {flatiron.App} Application to extend User resource
//
// Attaches the core User resource to the target `app`.
//
exports.resource = function (app) {
  var options = app.options['http-users'] || {};

  //
  // Configure the `:username` parameter to the proper regexp
  //
  app.router.param(':username', /([@\w\-\.]+)/);

  var User = app.resources.User = app.define('User', function () {
    var self = this,
        config = options.user || options.User || {},
        hook;

    //
    // Setup properties
    //
    this.string('_id')
      .unique(true)
      .sanitize('lower')
      .sanitize('prefix', 'user/');

    this.string('username').sanitize('lower');
    this.string('password-salt');
    this.string('password');
    this.string('inviteCode');
    this.string('shake');
    this.string('status');
    this.string('email', { format: 'email', required: true });
    this.object('profile');
    this.array('thirdPartyTokens');

    this.timestamps();

    this.restful = {
      param: ':username'
    };

    //
    // Setup after/before hooks provided via app options/configuration.
    //
    for (hook in config.before) {
      this.before(hook, config.before[hook]);
    }

    for (hook in config.after) {
      this.after(hook, config.after[hook]);
    }

    //
    // Attempt to set user status and inviteCode on create
    //
    this.before('create', function (user, callback) {
      if (user._id && !user.username) {
        user.username = user._id.split('/')[1];
      }

      user.inviteCode = uuid.v4();

      // If we don't require an activation step, go straight to "pending"
      user.status = app.config.get('user:require-activation')
        ? 'new'
        : app.config.get('user:require-confirmation') !== false ? 'pending' : 'active';

      if (typeof user.password === 'string') {
        user.setPassword(user.password);
      }

      callback();
    });

    //
    // Setup after hooks for logging core methods.
    //
    ['get', 'create', 'update', 'destroy'].forEach(function (method) {
      self.after(method, function (_, user, callback) {
        app.emit(['user', method], 'info', user);
        callback();
      });
    });

    //
    // Attempt to send an email when a user is created
    //
    this.after('create', function (err, user, callback) {
      if (!err) {
        var requireActivation = app.config.get('user:require-activation'),
            method = requireActivation ? 'sendPending' : 'sendConfirm';

        if (!requireActivation && app.config.get('user:require-confirmation') === false) {
          return callback();
        }

        return app.mailer && app.mailer[method]
          ? app.mailer[method](user, callback)
          : callback();
      }
    });

    //
    // Destroy Organization / Remove Member if user is destroyed.
    //
    this.before('destroy', function (user, callback) {
      var username = user._id.replace(/^user\//, '');
      app.resources.Organization.byMember(username, function (err, orgs) {
        if (err) return callback(err);

        function each(org, next) {
          if (~org.owners.indexOf(username) && org.owners.length === 1) {
            org.destroy(function (err) {
              if (err) return cb(err);
              next();
            });
          } else {
            org.removeMember(username, function (err) {
              if (err) return cb(err);
              next();
            });
          }
        }

        function done() {
          return cb(null);
        }

        function cb(err) {
          if (callback) callback(err);
          callback = null;
        }

        async.forEach(orgs, each, done);
      });
    });

    //
    // Create default views
    //
    this.filter('all', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'User') {
          emit(doc._id, {_id: doc._id });
        }
      }
    });

    this.filter('byUsername', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'User') {
          emit(doc.username, {_id: doc._id });
        }
      }
    });

    this.filter('byEmail', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'User') {
          emit(doc.email, {_id: doc._id });
        }
      }
    });

    this.filter('byCtime', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'User' && doc.ctime) {
          emit(doc.ctime, { username: doc.username });
        }
      }
    });
  });

  //
  // ### function available (id, callback)
  // #### @id {string} Username to check existance of.
  // #### @callback {function} Continuation to respond to.
  // Checks the existance of the existing username `id`.
  //
  User.available = function () {
    return app.resources.Organization.available.apply
      (app.resources.Organization, arguments);
  };

  //
  // ### @private function _restricted (user)
  // #### @user {User} User object to convert to a restricted representation.
  // Returns a restricted representation of the specified `user`.
  //
  User._restricted = function (user, authType) {
    var restricted = user.toJSON(),
        apiTokens = restricted.apiTokens || {},
        thirdPartyTokens = restricted.thirdPartyTokens || {};

    //
    // Remove actual tokens and leave only the names
    //
    if (authType && authType.method !== "username/password") {
      restricted.apiTokens = Object.keys(apiTokens) || [];
      restricted.thirdPartyTokens = Object.keys(thirdPartyTokens) || [];
    }

    //
    // Delete password stuff
    //
    delete restricted.password;
    delete restricted['password-salt'];

    return restricted;
  };

  //
  // ### function setPassword (newPassword)
  // #### @newPassword {string} New password.
  // Sets new password on a User resource.
  //
  User.prototype.setPassword = function (newPassword) {
    this['password-salt'] = this['password-salt'] || common.randomString(16);
    this.password = newPassword || '';
    this.password = hash.md5(this.password, this['password-salt']);
  };
};

//
// ### function routes (app)
// #### @app {flatiron.App} Application to extend with routes
//
// Extends the target `app` with routes for core user functionality.
//
exports.routes = function (app) {
  //
  // Require authentication for `/users` and `/keys/:username`.
  //
  app.router.before('/auth', app.requireAuth);
  app.router.before('/users', app.requireAuth);
  app.router.before('/users', app.requireUserPassAuthForWrite);

  //
  // Only allow users to access `/users/*` routes if they are modifying
  // it for themselves or if they are authorized to `modify users`.
  //
  app.router.before('/users', function checkPermissions(username) {
    var next = arguments[arguments.length - 1];

    if (this.req.user.can('modify users')
      || /\/users\/me[\/]?/.test(this.req.url)) {
      return next();
    }
    else if (typeof username !== 'string' ||
      username.toLowerCase() !== this.req.user.username) {
      return next(new director.http.Forbidden('Not authorized to modify users'));
    }

    next();
  });

  //
  // Helper method for `/auth` which tells a user if they are
  // authorized or not.
  //
  app.router.get('/auth', function () {
    this.res.json(200, {
      user: this.req.username,
      authorized: true
    });
  });

  //
  // Checking for username availability does not
  // require authentication.
  //
  if (app.unauthorized) app.unauthorized.path('/users', function () {
    //
    // Check: GET to `/users/:username/available` will check to see
    // if a specified username is available
    //
    this.get('/:username/available', function (username) {
      var res = this.res;

      app.resources.User.available(username, function (err, available) {
        return err
          ? res.json(500, { error: err.message })
          : res.json(200, { available: available });
      });
    });

    //
    // Check: POST to `/users/email/taken` will check to see
    // if a specified email is unique and not registered already
    //
    this.post('/email/taken', function () {
      var res = this.res
        , req = this.req
        , data = req.body || {}
        , email = data.email;

      if (!email) {
        return res.json(500, {
          error: 'Please provide an email address'
        });
      }

      app.resources.User.byEmail(email, function (err, list) {
        if (err) {
          return res.json(500, {
            error: err.message,
            taken: true
          });
        }

        return res.json(200, { taken: !!(list && list.length) });
      });
    });
  });

  //
  // Route for allow the user request their own info.
  // This routes not need any especial permission for be accesed
  //
  app.router.get('/users/me', function () {
    var user  = this.req.user,
        authMethod = this.req.user.authMethod;

    return this.res.json(200, {
      user: app.resources.User._restricted(user, authMethod) });
  });

  //
  // Route to try to get a user by username
  //
  // Strips confidential fields that should not be accessible via api
  //
  app.router.get('/users/:username', function (username) {
    var res  = this.res,
        authMethod = this.req.user.authMethod;

    app.resources.User.get(username, function (err, user) {
      return err
        ? res.json(err.status || 500, err)
        : res.json(200, {
          user: app.resources.User._restricted(user, authMethod) });
    });
  });

  //
  // Ensure that passwords get hashed correctly in `PUT` requests
  //
  app.router.before('/users/:username', function (username) {
    var next = arguments[arguments.length - 1],
        self = this;

    if (self.req.method === 'PUT' && self.req.body && self.req.body.password) {
      self.req.body.password = hash.md5(
        self.req.body.password,
        self.req.user['password-salt'] || common.randomString(16)
      );
    }

    next();
  });
};
