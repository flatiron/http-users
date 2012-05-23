/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    base64  = require('flatiron').common.base64,
    macros  = require('../macros'),
    app = require('../fixtures/app/couchdb');

var port = 8080;

apiEasy.describe('http-users/user/api/unauthorized')
  .addBatch(macros.requireStart(app))
  .use('localhost', port)
  .setHeader('content-type', 'application/json')
  .setHeader('authorization', 'Basic WTFFFUUUU==')
  .get('/auth')
    .expect(403)
  .get('/users/charlie/keys')
    .expect(403)
  .get('/users/charlie')
    .expect(403)
  .next()
  .setHeader('content-type', 'application/json')
  .setHeader('authorization', 'Basic ' + base64.encode('charlie:1234'))
  .get('/auth')
    .expect(200)
  .get('/users/charlie/keys')
    .expect(200)
  .get('/users/charlie')
    .expect(200)

.export(module);