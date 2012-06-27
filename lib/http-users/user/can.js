/*
 * can.js: Resource extensions and routes for working with User permissions.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var director = require('director');

//
// ### function resource (app)
// #### @app {flatiron.App} Application to extend User resource
//
// Extends the User resource for the `app` with permission functionality.
//
exports.resource = function (app) {
  //
  // Grab the `User` resource from the `app`.
  //
  var User = app.resources.User;
  
  //
  // Add the `permissions` property.
  //
  User.object('permissions');
  
  //
  // ### function can (username, perm, value, callback)
  // #### @username {string} Username to validate for `perm` and `value`.
  // #### @perm {string} Id of the permission to validate
  // #### @value {boolean|string} **Optional** Permission value to validate
  // #### @callback {function} Continuation to respond to when complete
  // Validates that the `username` has permission for the specified `id`
  // and `value`.
  //
  User.can = function (username, perm, value, callback) {
    if (!callback && typeof value === 'function') {
      callback = value;
      value = null;
    }
    
    this.get(username, function (err, user) {
      if (err) {
        return callback(err);
      }
      
      return !app.resources.Permission.can(user, perm, value)
        ? callback(new Error('User not authorized for: ' + perm))
        : callback();
    });
  };
  
  //
  // ### function can (perm, value)
  // #### @perm {string} Id of the permission to validate
  // #### @value {boolean|string} **Optional** Permission value to validate
  // Validates that this instance has permission for the specified `id`
  // and `value`.
  //
  User.prototype.can = function (perm, value) {
    return app.resources.Permission.can(this, perm, value);
  };
};

//
// ### function routes (app)
// #### @app {flatiron.App} Application to extend with routes
//
// Extends the target `app` with routes for modifying permissions.
//
exports.routes = function (app) {
  //
  // Ensure that any `permissions` are stripped from `req.body` when users
  // are created and updated unless the requesting user can `modify permissions`
  //
  app.router.before('/users', function stripPermissions() {
    var next = arguments[arguments.length - 1];
    
    if (!this.req.body || !this.req.body.permissions) {
      return next();
    }
    
    if (!this.req.user.can('modify permissions')) {
      delete this.req.body.permissions;
    }
    
    next();
  });
  
  //
  // Helper function which writes to the `res` if the `req.user`
  // is not authorized to modify permissions.
  //  
  app.router.before('/users/:username/permissions', app.needPermission('modify permissions'));
  app.router.path('/users/:username/permissions', function () {
    //
    // Helper function to add or remove permissions
    // for a specific route.
    //
    function addOrRemovePermission(method) {
      return function (username) {
        var perm = this.req.body,
            res = this.res;

        app.resources.User.get(username, function (err, user) {
          if (err && err.error === 'not_found') {
            return res.json(404, { error: 'User not found' });
          }
          else if (err) {
            return res.json(500, err); 
          }

          app.resources.Permission[method](user, perm.name, perm.value, function (err) {
            return err 
              ? res.json(500, err) 
              : res.json(200);
          });
        });
      }
    }
    
    //
    // ### Add Permissions
    // `PUT /users/:username/permissions` adds the permissions for the 
    // specified `id`.
    //
    this.put(addOrRemovePermission('allow'));
    
    //
    // ### Remove Permissions
    // `Delete /users/:username/permissions` removes the permissions for the 
    // specified `id`.
    //
    this.delete(addOrRemovePermission('disallow'));
  });
};