/*
 * app.js: Test fixtures for http-users tests
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var director = require('director'),
    de = require('director-explorer'),
    flatiron = require('flatiron'),
    restful  = require('restful'),
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
  unauthorized: ['create']
});

//
// This will expose all resources as restful routers
//
app.use(restful);

app.router.get('/', function () {
  this.res.text(de.table(app.router.routes));
  this.res.end();
});

if (!module.parent) {
  app.start(8080);
}