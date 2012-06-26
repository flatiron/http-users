/*
 * 01permissions-api-test.js: Tests for the RESTful permissions API.
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

apiEasy.describe('http-users/permissions/api')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  .post('/permissions/new permission', {
    name: 'new permission',
    type: 'boolean'
  })
  .expect(201)
  .post('/permissions', {
    _id: 'second permission',
    name: 'second permission',
    type: 'array'
  }).expect(201)
  .next()
  .get('/permissions/new permission')
    .expect(200)
    .expect('should respond with the permission', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isObject(result.permission);
      assert.equal(result.permission.name, 'new permission');
      assert.equal(result.permission.type, 'boolean');
    })
  .del('permissions/second permission')
    .expect(204)
  .next()
  .get('permissions/second permission')
    .expect(404)
  .export(module);