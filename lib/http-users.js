/*
 * http-users.js: Top-level include for the `flatiron-http-users` module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var director = require('director'),
    common = require('flatiron').common,
    auth = require('./http-users/auth');

var httpUsers = exports;

//
// Expose commands and name this plugin
//
httpUsers.name = 'http-users';

//
// ### function attach (options)
// #### @options {Object} Options to use when attaching.
// Attaches the `flatiron-http-users` behavior to the application.
//
httpUsers.attach = function (options) {
  var app = this;
  options = options || {};

  if (!app.plugins.http) {
    throw new Error('`http` plugin is required to use `flatiron-http-users`');
  }
  else if (!app.config) {
    throw new Error('`app.config` must be set to use `flatiron-http-users`');
  }
  else if (!app.plugins.resourceful) {
    throw new Error('`resource` plugin is required to use `flatiron-http-users`');
  }

  //
  // Set the authentication strategy.
  //
  app.authStrategy = options.strategy || new auth.UserStrategy({ app: app });

  //
  // ### function requireAuth ()
  // Middleware which ensures that the User making the
  // request is authenticated.
  //
  app.requireAuth = function requireAuth() {
    var next = arguments[arguments.length - 1],
        self = this;

    app.authStrategy.authenticate(self.req, function (err, user) {
      if (err) {
        return next(err);
      }
      else if (!user) {
        return next(new director.http.Forbidden('Not authorized'));
      }

      self.req.user = user;
      next();
    });
  };

  //
  // ### function requireUserPassAuthForWrite()
  //
  // Middleware which ensures that a User is authenticated via username
  // and password
  //
  // This allows get request (read only access)
  //
  app.requireUserPassAuthForWrite = function requireUserPassAuthForWrite() {
    var next = arguments[arguments.length - 1],
        user = this.req.user;

    if(!user) {
      return next(new director.http.Forbidden('Not authenticated'));
    }

    //
    // If it is a get, it's ok to use a token
    //
    if(this.req.method !== "GET") {
      //
      // If you are not using username and password auth
      //
      if(user.authMethod.method !== "username/password") {
        return next(new director.http.Forbidden(
          'Requires username/password authentication'));
      }
    }

    //
    // All systems go!
    //
    next();
  };


  //
  // ### function needPermission (perm, value)
  // Middleware which ensures that the User making the
  // request has the `perm` with the specified value.
  //
  app.needPermission = function (perm, value) {
    value = value || true;

    return function needPermission() {
      var next = arguments[arguments.length - 1],
          can = app.authStrategy.authorize(this.req, perm, value);

      return can === true
        ? next()
        : next(can || new director.http.Forbidden('Forbidden: missing ' + perm));
    };
  };

  // if (app.config.stores.literal) {
  //   app.config.remove('literal');
  // }
};

httpUsers.init = function (callback) {
  var app = this;

  //
  // Attach the `User` and `Permission` resources
  // along with associated routes to the application.
  //
  require('./http-users/permission')(app);
  require('./http-users/user')(app);
  require('./http-users/organization')(app);
  callback();
};

//
// ### function detach ()
// Detaches this plugin from the application.
//
httpUsers.detach = function () {
  var app = this;

  //
  // TODO: Detach the plugin
  //
};
