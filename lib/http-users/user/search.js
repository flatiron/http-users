

exports.resource = function (app) {
  //
  // Grab the `User` resource from the `app`.
  //
  var User = app.resources.User;
  
  //
  // ### function search (partialUser, callback)
  // #### partialUser {string} Partial Username to search for.
  // #### @callback {function} Continuation to respond to.
  // Searches all users for those who match the partial username `partialUser`.
  //
  User.search = function (partialUser, callback) {
    partialUser = partialUser.toLowerCase();
    this.byUsername({
      startkey: partialUser,
      endkey: getEndKey(partialUser)
    }, function (err, users) {
      return err
        ? callback(err)
        : callback(null, users);
    });
  };
};

exports.routes = function (app) {
  //
  // Helper function which writes to the `res` if the `req.user`
  // is not authorized to search.
  //  
  app.router.before('/search', function (_, next) {
    return !this.req.user || !this.req.user.can('search')
      ? next(new director.http.Forbidden('You are not authorized to search'))
      : next();
  });
  
  //
  // ### Search
  // Routes related to searching for apps / users.
  //
  app.router.path(/\/search/, function () {
    this.get(/\/([\w\-\.]+)/, function (partialUser) {
      var res = this.res;
      
      controllers.user.search(partialUser, function (err, users) {
        if (err) {
          return res.json(500, { message: err.message });
        }
        
        res.json(200, { 
          users: users.map(function (user) {
            return controllers.user._restricted(user);
          }) 
        });
      });
    });
  });
}