/*
 * routes.js: RESTful web service for the server resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

module.exports = function (app) {
  //
  // Require authentication for `/permissions`.
  //
  app.router.before(/\/permissions/, app.basicAuth);

  app.router.path(/\/permissions/, function () {
    this.get(/\/(\w+)/, function () {
      
    });
    
    this.post(/\/(\w+)/, function () {
      
    });
    
    this.delete(/\/(\w+)/, function () {
      
    });
  });
};