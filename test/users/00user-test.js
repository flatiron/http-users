/*
 * user-test.js: Tests for the http-users User resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    macros = require('../macros');

macros.resources.user(
  vows.describe('http-users/couchdb/users'),
  require('../fixtures/app/couchdb')
).export(module);

//
// Remark: I don't think the memory engine will every really
// work with our filters.
//
// macros.resources.user(
//   vows.describe('http-users/memory/users'),
//   require('../fixtures/app/memory')
// ).export(module);