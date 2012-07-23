
var assert = require('assert'),
    common = require('flatiron').common,
    async = common.async,
    hash = require('node_hash'),
    permissions = require('../fixtures/permissions'),
    users = require('../fixtures/users'),
    organizations = require('../fixtures/organizations');

//
// Use nano to help bootstrap couch for testing
//
var nano = require('nano')('http://localhost:5984');

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
};

macros.requireStop = function (app) {
  return {
    "Once the app is stopped": {
      topic: function () {
        app.server.on('close', this.callback);
        app.server.close();
      },
      "it should stop to listen connections": function () {
        assert.ok(true);
      }
    }
  }
};

macros.destroyDb = function (app) {
  return {
    "Setting up the tests": {
      "clearing the couch database": {
        topic: function () {
          nano.db.destroy(app.config.get('resourceful:database'), this.callback)
        },
        "should not throw": function (err, result) {
          assert(true);
        }
      }
    }
  };
};

macros.createDb = function (app) {
  return {
    "Setting up the tests": {
      "creating the couch database": {
        topic: function () {
          nano.db.create(app.config.get('resourceful:database'), this.callback)
        },
        "should create database": function (err, result) {
          assert.isNull(err);
        }
      }
    }
  };
};

macros.seedDb = function (app, options) {
  options = options || { activation: true };

  return {
    "Setting up the tests": {
      "seeding the couch database": {
        topic: function () {
          var name = app.config.get('resourceful:database');

          async.series([
            //
            // 1. Destroy the database
            //
            function tryDestroy(next) {
              nano.db.destroy(name, next.bind(null, null));
            },
            //
            // 2. Create the database.
            //
            async.apply(nano.db.create, name),
            //
            // 3. Sync views.
            //
            function (next) {
              var actions = [];

              Object.keys(app.resources).forEach(function (key) {
                var resource = app.resources[key];
                actions.push(resource.sync.bind(app.resources[key]));
              });
              async.parallel(actions, next);
            },
            //
            // 4. Insert the docs into the database.
            //
            function insertDocs(next) {
              permissions.forEach(function (perm) {
                perm.ctime = perm.mtime = +(new Date());
                perm._id = ['permission', perm.name].join('/');
              });

              users.forEach(function (user) {
                user.ctime = user.mtime = +(new Date());
                user._id = ['user', user.username].join('/');

                user['password-salt'] = user['password-salt'] || common.randomString(16);
                user.password = user.password || '';
                user.password = hash.md5(user.password, user['password-salt']);

                if (!options.activation && user.status === 'new') {
                  user.status = 'pending';
                }
              });

              organizations.forEach(function (org) {
                org.ctime = org.mtime = +(new Date());
                org._id = ['organization', org.name].join('/');
                org.members = org.members || [];
                org.members[0] = org.members[0] || org.owner;
              });

              nano.db.use(name).bulk(
                { docs: permissions.concat(users).concat(organizations) },
                next
              );
            }
          ], this.callback);
        },
        "should seed the database": function (err, result) {
          assert.isNull(err);
        }
      }
    }
  }
};

macros.resources = {
  users: require('./users'),
  permissions: require('./permissions')
};
