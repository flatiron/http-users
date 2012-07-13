/*
 * organization/index.js: Organization resource for managing application users.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

module.exports = function (app) {
  var options = app.options['http-users'];

  //
  // Attach core Organization functionality.
  //
  ['core'].forEach(function (feature) {
    var mod = require('./' + feature);

    mod.resource(app);

    if (mod.routes) {
      mod.routes(app);
    }
  });
};
