/*
 * users-permissions-unauth-api-test.js: Tests for the RESTful user permissions API with no auth.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    base64  = require('flatiron').common.base64,
    macros  = require('../macros'),
    app     = require('../fixtures/app/couchdb');
    
var port = 8080;

apiEasy.describe('http-users/user/permissions/api/unauthorized')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('marak:1234'))
  .discuss('With a user who is not authorized to modify permissions')
    .put('/users/charlie/permissions', {
      name: 'view all users',
      value: true
    }).expect(403)
    .del('/users/charlie/permissions', {
      name: 'modify permissions'
    }).expect(403)
  .export(module);