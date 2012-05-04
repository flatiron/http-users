/*
 * routes.js: RESTful web service for the server resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var auth = require('./auth');

module.exports = function (app) {
  //
  // Require authentication for `/permissions`.
  //
  app.router.before(/\/permissions/, auth.basicAuth);

  app.router.path(/\/permissions/, function () {
    this.get(/\/(\w+)/, function () {
      
    });
    
    this.post(/\/(\w+)/, function () {
      
    });
    
    this.delete(/\/(\w+)/, function () {
      
    });
  });
};