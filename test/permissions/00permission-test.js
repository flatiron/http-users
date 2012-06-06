/*
 * user-test.js: Tests for the http-users User resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    vows = require('vows'),
    async = require('flatiron').common.async,
    macros = require('../macros');

var app = require('../fixtures/app/couchdb');

function shouldBeAble(resource, perm, value) {
  return function () {
    assert.isTrue(app.resources.Permission.can(resource, perm, value));
  }
}

function shouldAllow(username, perm, value, expected) {
  return {
    topic: function () {
      async.waterfall([
        function getUser(next) {
          app.resources.User.get(username, next);
        },
        function addPermission(user, next) {
          app.resources.Permission.allow(user, perm, value, next);
        },
        function getUserAgain(_, next) {
          app.resources.User.get(username, next);
        }
      ], this.callback);
    },
    "should add the permission to the resource": function (err, user) {
      assert.isNull(err);
      
      if (!value) {
        assert.equal(user.permissions[perm], value || true);
      }
      else {
        assert.include(user.permissions[perm], value);
      }
      
      if (expected) {
        assert.deepEqual(user.permissions[perm], expected);
      }
    }
  }
}

function shouldDisallow(username, perm, value, expected) {
  if (typeof value === 'undefined') {
    value = false;
  }
  
  return {
    topic: function () {
      async.waterfall([
        function getUser(next) {
          app.resources.User.get(username, next);
        },
        function addPermission(user, next) {
          app.resources.Permission.disallow(user, perm, value, next);
        },
        function getUserAgain(_, next) {
          app.resources.User.get(username, next);
        }
      ], this.callback);
    },
    "should remove the permission from the resource": function (err, user) {
      assert.isNull(err);
      
      if (Array.isArray(user.permissions[perm])) {
        assert.isTrue(!!user.permissions[perm].length);
        assert.equal(user.permissions[perm].indexOf(value), -1);
      }
      else if (!value) {
        assert.equal(user.permissions[perm], value);
      }
      
      if (expected) {
        assert.deepEqual(user.permissions[perm], expected);
      }
    }
  }
}

vows.describe('http-users/couchdb/permissions')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .addBatch({
    "The Permission resource": {
      "the all() method": {
        topic: function () {
          app.resources.Permission.all(this.callback);
        },
        "should respond with all permissions": function (err, perms) {
          assert.isNull(err);
          assert.isArray(perms);
          assert.lengthOf(perms, 3);
        }
      },
      "the can() method": {
        "with a no value provided": shouldBeAble(
          { permissions: { 'do foo': true } },
          'do foo'
        ),
        "with a simple boolean": shouldBeAble(
          { permissions: { 'do foo': true } },
          'do foo',
          true
        ),
        "with an array of values": shouldBeAble(
          { permissions: { 'access app': ['foo', 'bar'] } },
          'access app',
          'foo'
        ),
        "with an array of wildcards": shouldBeAble(
          { permissions: { 'access app': ['charlie/*', 'marak/bar'] } },
          'access app',
          'charlie/foo'
        )
      },
      "the allow() method": {
        "with a simple boolean": shouldAllow(
          'charlie',
          'new permission'
        ),
        "with a string value": shouldAllow(
          'marak',
          'string list',
          'foo'
        ),
        "with a second string value": shouldAllow(
          'elijah',
          'string-to-bool',
          'foo'
        )
      }
    }
  })
  .addBatch({
    "The Permission resource": {
      "the allow() method": {
        "with a second string value": shouldAllow(
          'marak',
          'string list',
          'bar',
          ['foo', 'bar']
        ),
        "when updating a boolean to a string": shouldAllow(
          'charlie',
          'new permission',
          'value'
        ),
        "when updating a string to a boolean": shouldAllow(
          'elijah',
          'string-to-bool'
        )
      }
    }
  })
  .addBatch({
    "The Permission resource": {
      "the disallow() method": {
        "when updating a string": shouldDisallow(
          'charlie',
          'new permission'
        ),
        "when updating a boolean": shouldDisallow(
          'elijah',
          'string-to-bool'
        ),
        "when removing a string value": shouldDisallow(
          'marak',
          'string list',
          'foo',
          ['bar']
        )
      }
    }
  })
  .addBatch({
    "The Permission resource": {
      "the disallow() method": {
        "when removing the last string value": shouldDisallow(
          'marak',
          'string list',
          'bar'
        )
      }
    }
  })
  .export(module);