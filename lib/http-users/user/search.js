

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
  // ### Search
  // Routes related to searching for apps / users.
  //
  app.router.path(/\/search/, function () {
    this.get(/\/([\w\-\.]+)/, function (partialUser) {
      var res = this.res;

      if (!this.req.user.can('search')) {
        return;
      }
      
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