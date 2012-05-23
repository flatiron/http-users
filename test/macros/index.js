
var assert = require('assert');

var macros = exports;

macros.requireStart = function (app) {
  return {
    "Once the app is started": {
      topic: function () {
        app.start(8080, this.callback);
      },
      "it should have the appropriate config": function () {
        assert.equal(app.config.get('resourceful:database'), 'flatiron-http-users');
      }
    }
  };
}

macros.resources = {
  user: require('./user-resource')
};