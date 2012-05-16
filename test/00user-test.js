/*
 * user-test.js: Tests for the http-users User resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    helpers = require('./helpers'),
    couchApp = require('./fixtures/app/couchdb');
    memoryApp = require('./fixtures/app/memory');

var key = '012345678901234567890123456789',
    charlie;

var suite = vows.describe('http-users/couchdb/user');
suite = helpers['user-resource-test'](suite, couchApp);
//suite = helpers['user-resource-test'](suite, memoryApp);

suite.export(module);