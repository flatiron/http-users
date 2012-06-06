
var assert = require('assert'),
    async = require('flatiron').common.async,
    permissions = require('../fixtures/permissions'),
    users = require('../fixtures/users');

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

macros.seedDb = function (app) {
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
            // 3. Insert the docs into the database.
            //
            function insertDocs(next) {
              permissions.forEach(function (perm) {
                perm.ctime = perm.mtime = +(new Date()); 
                perm._id = ['permission', perm.name].join('/');
              });
              
              users.forEach(function (user) {
                user.ctime = user.mtime = +(new Date()); 
                user._id = ['user', user.username].join('/');
              });
              
              nano.db.use(name).bulk(
                { docs: permissions.concat(users) }, 
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