var util = require('util'),
    httpUsers = require('../'),
    passport = require('passport'),
    director = require('director'),
    flatiron = require('flatiron'),
    resourceful = require('resourceful');
    app = flatiron.app;

function DummyStrategy() {
  this.name = 'DummyStrategy';
}
util.inherits(DummyStrategy, passport.Strategy);

DummyStrategy.prototype.authenticate = function (req, callback) {
  return callback(null, {
    username: 'sillyUser'
  });
};

resourceful.use('couchdb', { database: 'dev' });

app.unauthorized = new director.http.Router().configure({
  async: true,
  strict: false
});

app.use(flatiron.plugins.http, {
  before: [
    function (req, res) {
      if (!app.unauthorized.dispatch(req, res)) {
        res.emit('next');
      }
    }
  ]
});

app.use(flatiron.plugins.config);

app.use(httpUsers, {
  strategy: new DummyStrategy()
});

app.router.before(app.requireAuth);

app.router.get('/', function () {
  this.res.writeHead(200, { 'Content-Type': 'text/plain' });
  this.res.end('Hello, ' + this.req.user.username + '.\n');
});

app.start(8000);
