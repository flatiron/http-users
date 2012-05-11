/*
 * user-test.js: Tests for the http-users User resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    app = require('./fixtures/app');

var key = '012345678901234567890123456789',
    charlie;

vows.describe('http-users/user').addBatch({
  "The User resource": {
    "the create() method": {
      topic: function () {
        app.resources.User.create({
          _id: 'charlie',
          password: '1234',
          email: 'foo@bar.com'
        }, this.callback)
      },
      "should respond with the appropriate object": function (err, user) {
        assert.isNull(err);
        assert.isObject(user);
        assert.equal(user.email, 'foo@bar.com');
        assert.equal(user.username, 'charlie');
        // using default options not require ativation so
        assert.equal(user.state, 'active');
      }
    },
    "the available() method": {
      "with an unused name": {
        topic: function () {
          app.resources.User.available('daniel', this.callback);
        },
        "should respond available": function (err, res) {
          assert.isNull(err);
          assert.ok(res);
        }
      },
      "with an used name": {
        topic: function () {
          var self = this;
          app.resources.User.create({
            _id: 'juan',
            password: '1234',
            email: 'foo@bar.com'
          }, function () {
            app.resources.User.available('juan', self.callback);
          })
        },
        "should said unavailable": function (err, res) {
          assert.isNull(err);
          assert.isFalse(res);
        }
      }
    }
  }
}).addBatch({
  /** THIS STILL NOT WORK
  "The User resource": {
    "the create() method setting require activation": {
      topic: function () {
        console.log(app.async);
        app.on('init', function () {
          app.config.set('users:require-activation', true);
        });
        app.resources.User.create({
          _id: 'Waiter',
          password: '1234',
          email:'waitfor@activate.com'
        }, this.callback);
      },
      "should respond with the appropriate state": function (err, user) {
        assert.isNull(err);
        assert.isObject(user);
        assert.equal(user.email, 'waitfor@activate.com');
        assert.equal(user.username, 'Waiter');
        // using default options not require ativation so
        assert.equal(user.state, 'new');
        console.log(typeof user.inviteCode);
        console.log(user.inviteCode);
      }
    }
  }
  **/
})/**.addBatch({
  "The User resource": {
    "the getKey() method": {
      topic: function () {
        charlie.getKey(this.callback);
      },
      "should respond with the correct attachment": function (err, data) {
        assert.isNull(err);
        assert.equal(data, key);
      }
    },
    "the all() method": {
      topic: function () {
        app.resources.User.all(this.callback);
      },
      "should respond with all users": function (err, users) {
        assert.isNull(err);
        assert.isArray(users);
        assert.lengthOf(users, 4);
      }
    }
  }
}).addBatch({
  "The User resource": {  
    "the keynames() method": {
      topic: function () {
        app.resources.User.keynames(this.callback);
      },
      "should respond with all keynames": function (err, keynames) {
        assert.isNull(err);
        assert.isArray(keynames);
        assert.equal(keynames[0]._id, 'user/charlie')
      }    
    },
    "the keys() method": {
      topic: function () {
        app.resources.User.keys(this.callback);
      },
      "should respond with all keys for all users": function (err, keys) {
        assert.isNull(err);
        assert.isArray(keys);
        assert.equal(keys[0], key);
      }
    }
  }
})**/.export(module);