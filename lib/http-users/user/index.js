/*
 * index.js: Top-level include for the User resource and associated routes.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

//
// ### function module.exports (app)
// #### @app {flatiron.App} Application to extend with User functionality
//
// Adds all resources and routes associated with Users.
//
module.exports = function (app) {
  var options = app.options['http-users'];

  //
  // Attach core User functionality.
  //
  ['core', 'forgot', 'can'].forEach(function (feature) {
    var mod = require('./' + feature);

    mod.resource(app);

    if (mod.routes) {
      mod.routes(app);
    }
  });

  //
  // Attach optional functionality unless explicitly
  // asked not to do so.
  //
  ['confirm', 'keys', 'search', 'tokens', 'third-party'].forEach(
  function (feature) {
    var mod = require('./' + feature);

    if (options[feature] !== false) {
      ['resource', 'routes'].forEach(function (action) {
        if (mod[action]) {
          mod[action](app);
        }
      });
    }
  });
};