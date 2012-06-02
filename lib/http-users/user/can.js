
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
  
  User.prototype.can = function (perm, value) {
    return app.resources.Permission.can(this, perm, value);
  };
};

exports.routes = function (app) {
  //
  // Helper function which writes to the `res` if the `req.user`
  // is not authorized to modify permissions.
  //  
  app.router.before('/users/:id/permissions', function (_, next) {
    return !this.req.user || !this.req.user.can('modify permissions')
      ? next(new director.http.Forbidden('You are not authorized to modify permissions'))
      : next();
  });
  
  app.router.path('/users/:id/permissions', function () {
    //
    // ### Add Permissions
    // `PUT /users/:id/permissions` adds the permissions for the 
    // specified `id`.
    //
    this.put(function (username) {
      
    });
    
    //
    // ### Remove Permissions
    // `Delete /users/:id/permissions` removes the permissions for the 
    // specified `id`.
    //
    this.delete(function (username) {
      
    });
  });
};