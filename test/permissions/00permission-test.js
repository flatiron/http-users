/*
 * user-test.js: Tests for the http-users User resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    vows = require('vows'),
    macros = require('../macros');

var app = require('../fixtures/app/couchdb');

function shouldBeAble(resource, perm, value) {
  return function () {
    assert.isTrue(app.resources.Permission.can(resource, perm, value));
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
      }
    }
  })
  .export(module);