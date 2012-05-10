/*
 * user-test.js: Tests for the http-users User resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    app = require('./fixtures/app'),
    helpers = require('../../helpers');

var key = '012345678901234567890123456789',
    charlie;

vows.describe('http-users/user').addBatch(
  helpers.macros.requireResources({ env: 'development' }, 'user')
).addBatch({
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
        //
        // TODO: Assert user
        //
      },
      "the updateKey() method": {
        "without a name": {
          topic: function (user) {
            charlie = user;
            user.updateKey(key, this.callback);
          },
          "should add the attachment correctly": function (err, res) {
            assert.isNull(err);
            assert.isObject(res.headers);
            assert.equal(res.headers.status, 201);
          }
        }
      }      
    }
  }
}).addBatch({
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
}).export(module);