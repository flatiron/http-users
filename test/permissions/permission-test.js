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

var app = require('../fixtures/app/couchdb'),
    permissions = macros.resources.permissions,
    shouldBeAble = permissions.shouldBeAble,
    shouldAllow = permissions.shouldAllow,
    shouldDisallow = permissions.shouldDisallow,
    shouldError = permissions.shouldError;

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
          assert.lengthOf(perms, 5);
        }
      },
      "the create() method": {
        "with an invalid type": {
          topic: function () {
            app.resources.Permission.create({
              name: 'invalid type',
              type: 'badtype'
            }, this.callback.bind(this, null));
          },
          "should respond with the correct validation error": function (_, err) {
            assert.isArray(err);
            assert.deepEqual(err[0].expected, ['boolean', 'array']);
          }
        }
      },
      "the can() method": {
        "with a no value provided": shouldBeAble(
          app,
          { permissions: { 'do foo': true } },
          'do foo'
        ),
        "with a simple boolean": shouldBeAble(
          app,
          { permissions: { 'do foo': true } },
          'do foo',
          true
        ),
        "with an array of values": shouldBeAble(
          app,
          { permissions: { 'access app': ['foo', 'bar'] } },
          'access app',
          'foo'
        ),
        "with an array of wildcards": shouldBeAble(
          app,
          { permissions: { 'access app': ['charlie/*', 'marak/bar'] } },
          'access app',
          'charlie/foo'
        ),
        "with a `superuser` permission": shouldBeAble(
          app,
          { permissions: { superuser: true } },
          'whatever, really'
        )
      },
      "the allow() method": {
        "with a simple boolean": shouldAllow(
          app,
          'charlie',
          'confirm users'
        ),
        "with a string value": shouldAllow(
          app,
          'marak',
          'array permission',
          'foo'
        ),
        "with a second string value": shouldAllow(
          app,
          'elijah',
          'array permission',
          'foo'
        ),
        "with a non-existant permission": shouldError(
          app,
          'elijah',
          'yunoexist',
          'foo',
          'allow',
          'not_found'
        ),
        "with a type mismatch": shouldError(
          app,
          'charlie',
          'confirm users',
          'foo',
          'allow',
          'foo is not valid for boolean permission'
        )
      }
    }
  })
  .addBatch({
    "The Permission resource": {
      "the allow() method": {
        "with a second string value": shouldAllow(
          app,
          'marak',
          'array permission',
          'bar',
          ['foo', 'bar']
        )
      }
    }
  })
  .addBatch({
    "The Permission resource": {
      "the disallow() method": {
        "when updating a boolean": shouldDisallow(
          app,
          'charlie',
          'confirm users'
        ),
        "when removing a string value": shouldDisallow(
          app,
          'marak',
          'array permission',
          'foo',
          ['bar']
        ),
        "with a non-existant permission": shouldError(
          app,
          'elijah',
          'yunoexist',
          'foo',
          'disallow',
          'not_found'
        ),
        "with a type mismatch": shouldError(
          app,
          'charlie',
          'confirm users',
          'foo',
          'disallow',
          'foo is not valid for boolean permission'
        )
      }
    }
  })
  .addBatch({
    "The Permission resource": {
      "the disallow() method": {
        "when removing the last string value": shouldDisallow(
          app,
          'marak',
          'array permission',
          'bar'
        )
      }
    }
  })
  .addBatch(macros.requireStop(app))
  .export(module);