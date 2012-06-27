/*
 * search.js: Resource extensions and routes for searching users.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var director = require('director');

//
// ### function resource (app)
// #### @app {flatiron.App} Application to extend User resource
//
// Extends the User resource for the `app` with search functionality.
//
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
      endkey: partialUser + 'zzzzzzzz'
    }, function (err, users) {
      return err
        ? callback(err)
        : callback(null, users);
    });
  };
};

//
// ### function routes (app)
// #### @app {flatiron.App} Application to extend with routes
//
// Extends the target `app` with routes for searching users.
//
exports.routes = function (app) {  
  //
  // ### Search
  // Routes related to searching for apps / users.
  //
  app.router.path(/\/search/, function () {
    this.get(/\/([\w\-\.]+)/, function (partialUser) {
      var res = this.res;
      
      app.resources.User.search(partialUser, function (err, users) {
        if (err) {
          return res.json(500, { message: err.message });
        }
        
        res.json(200, { 
          users: users.map(function (user) {
            return app.resources.User._restricted(user);
          }) 
        });
      });
    });
  });
}