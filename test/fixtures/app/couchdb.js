/*
 * app.js: Test fixtures for http-users tests
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var director = require('director'),
    flatiron = require('flatiron'),
    restful  = require('restful'),
    resourceful = require('resourceful'),
    httpUsers = require('../../../lib/http-users');

var app = module.exports = flatiron.app;

//
// Setup the `unauthorized` router.
//
app.unauthorized = new director.http.Router().configure({
  async: true,
  strict: false
});

//
// Allow trailing `/`
//
app.unauthorized.strict = false;

//
// Setup the `union` server through `flatiron.plugins.http`
// and then later add routes.
//
// This webservice users two routers:
//
// * `app.router`: All routes which require authorization.
// * `app.unauthorized`: All routes which do not require authorization.
//
app.use(flatiron.plugins.http, {
  headers: {
    'x-powered-by': 'flatiron ' + flatiron.version
  },
  before: [
    function (req, res) {

      function onError(err) {
        //
        // TODO: Something on `err.headers`
        //

        this.res.json(err.status || 500, err.body || new Error('Unhandled error'));
      }

      function notFound(err) {
        if (err.status !== 404) {
          onError.call(this, err);
        }
      }

      if (!app.unauthorized.dispatch(req, res, notFound)) {
        res.emit('next');
      }
    }
  ]
});

app.use(flatiron.plugins.resourceful, {
  engine: 'couchdb',
  database: 'flatiron-http-users',
  host: 'localhost',
  port: 5984
});

app.use(httpUsers, {
  unauthorized: [
    'create'
  ]
});

//
// This will expose all resources as restful routers
//
app.use(restful);

app.router.get('/', function(){
  this.res.text(niceTable(app.router.routes));
  this.res.end();
})

var traverse = require('traverse');

//
// TODO: Move this to director core?
//
function niceTable (routes) {
  var niceRoutes = routes,
      verbs = ['get', 'post', 'put', 'delete'],
      str = '';

  traverse(niceRoutes).forEach(visitor);

  function visitor () {
    var path = this.path, 
    pad = '';
    if (path[path.length - 1] && verbs.indexOf(path[path.length - 1]) !== -1) {
      pad += path.pop().toUpperCase();
      for (var i = pad.length; i < 8; i++) {
        pad += ' ';
      }
      path = path.join('/');
      str += pad + '/' + path  + ' \n'
    }
  }
  
  return str;
}

//
// Expose the common part of flatiron
//
app.common = flatiron.common;
app.start(8080);