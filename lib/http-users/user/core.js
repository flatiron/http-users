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
  //
  // Configure the `:username` parameter to the proper regexp
  //
  app.router.param(':username', /([\w\-\.]+)/);
  
  var User = app.resources.User = app.define('User', function () {
    var self = this;
    
    //
    // Setup properties
    //
    this.string('_id')
      .unique(true)
      .sanitize('lower')
      .sanitize('prefix', 'user/');
      
    this.string('username');
    this.string('password-salt');
    this.string('password');
    this.string('shake');
    this.string('email', { format: 'email', required: true });
    this.object('profile');

    this.timestamps();
    
    this.restful = {
      param: ':username'
    };

    //
    // Setup create and update hooks for creating password salt
    //
    ['create', 'update'].forEach(function (method) {
      self.before(method, function (user, callback) {
        if (user._id && !user.username) {
          user.username = user._id.split('/')[1];
        }

        if (method === 'create' && typeof user.password === 'string') {
          user.setPassword(user.password);
        }
        
        if (app.config.get('user:require-activation')) {
          user.state = 'new';
          user.inviteCode = uuid.v4();
        }
        else {
          user.state = 'active';
        }

        callback();
      });
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

        return app.mailer && app.mailer[method]
          ? app.mailer[method](user, callback)
          : callback();
      }
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
  });

  //
  // ### function available (id, callback)
  // #### @id {string} Username to check existance of.
  // #### @callback {function} Continuation to respond to.
  // Checks the existance of the existing username `id`.
  //
  User.available = function (username, callback) {
    this.get(username, function (err, user) {
      if (err && err.error === 'not_found') {
        return callback(null, true);
      }

      return err ? callback(err) : callback(null, false);
    });
  };

  //
  // ### @private function _restricted (user)
  // #### @user {User} User object to convert to a restricted representation.
  // Returns a restricted representation of the specified `user`.
  //
  User._restricted = function (user) {
    var restricted = user.toJSON();
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
  
  //
  // Only allow users to access `/users/*` routes if they are modifying
  // it for themselves or if they are authorized to `modify users`.
  //
  app.router.before('/users', function (username) {
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
  app.unauthorized.path('/users', function () {
    //
    // Check: GET to `/users/:id/available` will check to see
    // if a specified username is available
    //
    this.get('/:username/available', function (id) {
      var res = this.res;

      app.resources.User.available(id, function (err, available) {
        return err
          ? res.json(500, { error: err.message })
          : res.json(200, { available: available });
      });
    });
  });

  //
  // Route for allow the user request their own info.
  // This routes not need any especial permission for be accesed
  //
  app.router.get('/users/me', function () {
    return this.res.json(200, { user: this.req.user });
  });
};