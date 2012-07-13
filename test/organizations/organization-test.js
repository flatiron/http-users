/*
 * organization-test.js: Tests for the http-users Organization resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    macros = require('../macros');

macros.resources.organizations(
  vows.describe('http-users/couchdb/organizations'),
  require('../fixtures/app/couchdb')
).export(module);

// macros.resources.organizations(
//   vows.describe('http-users/memory/organizations'),
//   require('../fixtures/app/memory')
// ).export(module);
