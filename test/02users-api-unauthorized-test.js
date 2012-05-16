/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    app = require('./fixtures/app/couchdb');
    
var port = 8080;


apiEasy.describe('http-users/user/api/unauthorized')
  .use('localhost', port)
  .setHeader('content-type', 'application/json')
  .setHeader('authorization', 'Basic WTFFFUUUU==')
  .get('/auth')
    .expect(403)
  .get('/users/charlie/keys')
    .expect(403)
.export(module);