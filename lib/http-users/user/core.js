/*
 * user.js: User resource for managing application users.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    hash = require('node_hash'),
    resourceful = require('resourceful'),
    common = require('flatiron').common,
    async = common.async;

exports.resource = function (app) {
  var User = app.resources.User = resourceful.define('User', function () {
    var self = this;
    
    //
    // Setup properties
    //
    this.string('username');
    this.string('password-salt');
    this.string('password');
    this.string('shake');
    this.string('email', { format: 'email', required: true });
    this.string('_id').unique(true).sanitize('lower').prefix('user/');

    this.timestamps();

    this.restful = true;

    //
    // Setup create and update hooks for creating password salt
    //
    ['create', 'update'].forEach(function (method) {
      self.before(method, function (user, callback) {
        if (user._id) {
          user.username = user._id;
        }

        if (method === 'create' || typeof user.password === 'string') {
          user['password-salt'] = user['password-salt'] || common.randomString(16);
          user.password = user.password || '';
          user.password = hash.md5(user.password, user['password-salt']);
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
      self.after(method, function (_, obj, callback) {
        app.emit(['user', method], 'info', obj);
        callback();
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
};

exports.routes = function (app) {
  //
  // Require authentication for `/user` and `/keys/:username`.
  //
  app.router.before(/\/auth/, app.basicAuth);
  app.router.before(/\/user/, app.basicAuth);
  
  //
  // Helper method for `/auth` which tells a user if they are
  // authorized or not.
  //
  app.router.get(/\/auth/, function () {
    this.res.json(200, {
      user: this.req.username,
      authorized: true
    });
  });
  
  //
  // Checking for username availability does not
  // require authentication.
  //
  app.unauthorized.path(/\/user/, function () {
    //
    // Check: GET to `/user/:id/available` will check to see
    // if a specified username is available
    //
    this.get(/\/([\w\-\.]+)\/available/, function (id) {
      var res = this.res;

      app.resources.User.available(id, function (err, available) {
        return err
          ? res.json(500, { error: err.message })
          : res.json(200, { available: available });
      });
    });
  });


}