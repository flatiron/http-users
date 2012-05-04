
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