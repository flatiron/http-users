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


//
// Use nano to help bootstrap couch for testing
//
var nano = require('nano')('http://localhost:5984');

vows.describe('http-users/user').addBatch({
  "Setting up the tests": {
    "clearing the couch database" : {
      topic: function(){
        nano.db.destroy(app.database.database, this.callback)
      },
      "should not throw" : function(err, result){
        assert(true);
      }
    }
  }
}).addBatch({
  "Setting up the tests": {
    "creating the couch database" : {
      topic: function() {
        nano.db.create(app.database.database, this.callback)
      },
      "should create database" : function(err, result){
        assert.isNull(err);
        console.log(result)
      }
    }
  }
}).addBatch({
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
        charlie = user;
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
  "The User resource": {
    "the addKey() method": {
      topic: function () {
        charlie.addKey('test-key', key, this.callback);
      },
      "should respond correctly": function (err, res) {
        assert.isNull(err);
        assert.isObject(res);
        assert.ok(res.ok);
        assert.equal(res.headers.status, 201);
      }
    }
  }
}).addBatch({
  "The User resource": {
    topic: function () {
      app.resources.User.get('user/juan', this.callback);
    },
    "with a key": {
      topic: function (user) {
        user.addKey('update', key, this.callback);
      },
      "then test the updateKey() method": {
        topic: function (res, user) {
          user.updateKey('update', '987654321098765432109876543210', this.callback);
        },
        "should update the key": function (err, response) {
          assert.isNull(err);
          assert.isObject(response);
          assert.ok(response.ok);
          assert.equal(response.headers.status, 201);
        }
      }
    }
  }
}).addBatch({
  "The User resource": {
    "the getKey() method": {
      topic: function () {
        charlie.getKey('test-key', this.callback);
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
        assert.lengthOf(users, 2);
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
        assert.equal(keys[1], key);
      }
    }
  }
}).addBatch({
  "The User resource": {
    "the forgot() method": {
      topic: function () {
        app.resources.User.forgot('juan', { sendEmail: false }, this.callback);
      },
      "should respond with a 'shake'": function (err, user) {
        assert.isNull(err);
        assert.isObject(user);
        assert.equal(user.username, 'juan');
        assert.ok(user.shake);
      }
    }
  }
}).export(module);