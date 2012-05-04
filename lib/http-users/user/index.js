

modules.exports = function (app) {
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
  ['confirm', 'keys', 'search'].forEach(function (feature) {
    var mod = require('./' + feature);
    
    if (options[feature] !== false) {
      mod.resource(app);
      mod.routes(app);
    }
  });
};