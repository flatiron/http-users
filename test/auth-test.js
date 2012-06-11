/*
 * basic-auth-test.js: Tests for the basic auth used in nodejitsu.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    assert = require('assert'),
    director = require('director'),
    common = require('flatiron').common,
    auth = require('../lib/http-users/auth'),
    macros = require('./macros');

var app = require('./fixtures/app/couchdb');

// Mock the valid request object
var validRequest = {
  headers: {
    authorization: "Basic " + common.base64.encode("charlie:1234")
  }
};

var mixedCaseRequest = {
  headers: {
    authorization: "Basic " + common.base64.encode("cHaRlie:1234")
  }
};

// Mock the invalid request object
var invalidRequest = {
  headers: {
    authorization: "Basic " + common.base64.encode("john:1234")
  }
};

// Mock the malformed request object
var malformedRequest = {
  headers: {
    authorization: "Basic " + common.base64.encode("noob")
  }
};

var shakeRequest = {
  headers: {
    authorization: "Basic " + common.base64.encode('shaketest:q6L3D0A4falo8DSpgTNzrJ')
  }
};

vows.describe('nodejitsu/common/auth')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .addBatch({
    "When using http-users": {
      "an instance of UserStrategy": {
        topic: function () {
          return new auth.UserStrategy({ app: app });
        },
        "when authorized": {
          topic: function (strategy) {
            strategy.authenticate(validRequest, this.callback.bind(null, null));
          },
          "should response with no error": function (err) {
            assert.isNull(err);
          }
        },
        "with mixed case": {
          topic: function (strategy) {
            strategy.authenticate(mixedCaseRequest, this.callback.bind(null, null));
          },
          "should respond with no error": function (err) {
            assert.isNull(err);
          }
        },
        "when unauthorized": {
          topic: function (strategy) {
            strategy.authenticate(invalidRequest, this.callback.bind(null, null));
          },
          "should response with an instance of 'auth.Forbidden'": function (err) {
            assert.instanceOf(err, director.http.Forbidden);
          }
        },
        "when unauthorized w/ malformedRequest": {
          topic: function (strategy) {
            strategy.authenticate(malformedRequest, this.callback.bind(null, null));
          },
          "should response with an instance of 'auth.Forbidden'": function (err) {
            assert.instanceOf(err, director.http.Forbidden);
          }
        },
        "when submitting a valid shake as the user's password": {
          topic: function (strategy) {
            strategy.authenticate(shakeRequest, this.callback.bind(null, null));
          },
          "the user SHOULD NOT be authorized": function (err) {
            assert.isDefined(err);
            assert.notEqual(err.statusCode, 200);
          },
          "the API should respond with an instance of 'auth.NotAuthorized'": function (err) {
            assert.instanceOf(err, director.http.NotAuthorized);
          }
        },
      }
    }
  }).export(module);
