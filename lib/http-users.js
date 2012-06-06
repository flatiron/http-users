/*
 * flatiron-http-users.js: Top-level include for the `flatiron-http-users` module. 
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

  //
  // TODO: Require `resource` plugin when it is complete.
  //
  // else if (!app.plugins.resource) {
  //   throw new Error('`resource` plugin is required to use `flatiron-http-users`');
  // }
  
  app.resources = app.resources || {};

  app.authStrategy = options.strategy || new auth.UserStrategy({ app: app });

  app.basicAuth = function (next) {
    var self = this;

    app.authStrategy.authenticate(self.req, function (err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return next(new director.http.Forbidden('Not authorized'));
      }

      self.req.user = user;
      next();
    });
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
  callback();
};

//
// ### function detach ()
// Detaches this plugin from the application.
//
httpUsers.detach = function () {
  var app = this;
  
  
};
