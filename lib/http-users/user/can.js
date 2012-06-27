
var director = require('director');

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

exports.routes = function (app) {
  //
  // Helper function which writes to the `res` if the `req.user`
  // is not authorized to modify permissions.
  //  
  app.router.before('/users/:id/permissions', app.requireAuth, app.needPermission('modify permissions'));
  
  app.router.path('/users/:id/permissions', function () {
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
    // `PUT /users/:id/permissions` adds the permissions for the 
    // specified `id`.
    //
    this.put(addOrRemovePermission('allow'));
    
    //
    // ### Remove Permissions
    // `Delete /users/:id/permissions` removes the permissions for the 
    // specified `id`.
    //
    this.delete(addOrRemovePermission('disallow'));
  });
};