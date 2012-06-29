/*
 * can.js: Resource extensions and routes for resetting User passwords.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var flatiron = require('flatiron'),
    uuid = require('node-uuid');

//
// ### function resource (app)
// #### @app {flatiron.App} Application to extend User resource
//
// Extends the User resource for the `app` with password reset functionality.
//
exports.resource = function (app) {
  //
  // Grab the `User` resource from the `app`.
  //
  var User = app.resources.User;
  
  //
  // ### function forgot (id, params, callback)
  // #### @id {string} Username to reset the password for.
  // #### @params {Object} Object containing shake and new password, if applicable.
  // #### @callback {function} Continuation to respond to.
  // Provides a reset path for the user if they forgot their password.
  //
  User.forgot = function (username, params, callback) {
    var requireActivation = app.config.get('user:require-activation'),
        self = this;

    this.get(username, function (err, user) {
      if (err) {
        return callback(err);
      }

      if (params.shake && user.shake && (user.status === 'active'
        || !requireActivation)) {
        if (params.shake === user.shake) {
          user.setPassword(params['new-password']);
          user.shake = undefined;
          return self.update(username, user, callback);
        }

        return callback(null, false);
      }
      else if (!params.shake && (user.status === 'active'
        || !requireActivation)) {

        //
        // Give the user a shake and send an email to their account.
        // Note that resourceful doesn't properly update the user object
        // locally, just in the db, so we need to set user.shake ourselves.

        user.shake = uuid.v4();

        return user.update({ shake: user.shake }, function (err, res) {
          if (err) {
            return callback(err);
          }
          else if (params.sendEmail === false) {
            return callback(null, user);
          }
          else if (app.mailer && app.mailer.sendForgot) {
            return app.mailer.sendForgot(user, function (err) {
              return err ? callback(err) : callback(null, user);
            });
          }

          callback(null, user);
        });
      }

      callback(null, false);
    });
  };
};

//
// ### function routes (app)
// #### @app {flatiron.App} Application to extend with routes
//
// Extends the target `app` with routes for resetting forgotten passwords.
//
exports.routes = function (app) {
  //
  // Requesting password reset does not require authentication.
  //
  app.unauthorized.path('/users', function () {
    //
    // Password Resets: POST to /users/:id/forgot sends a security-reset email to the user
    //
    this.post('/:username/forgot', function (id) {
      var req = this.req,
          res = this.res,
          data = req.body,
          params = {};

      if (data && typeof data.shake !== 'undefined') {
        if (!data['new-password']) {
          return res.json(400, new Error('A new password must be submitted with your shake.'));
        }

        params.shake = data.shake;
        params['new-password'] = data['new-password'];
      }

      app.resources.User.forgot(id, params, function (err, user) {
        if (err) {
          return res.json(500, err);
        }
        else if (!user) {
          return !params.shake
            ? res.json(401, { error: 'Cannot reset password for inactive account.' })
            : res.json(403);
        }

        res.json(200);
      });
    });
  });
}
