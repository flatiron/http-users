/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert  = require('assert'),
    apiEasy = require('api-easy'),
    app     = require('../fixtures/app/couchdb'),
    macros  = require('../macros'),
    base64  = require('flatiron').common.base64;
    
var key = '0987654321abcdefghijklmnop0987654321abcdefghijklmnop0987654321abcdefghijklmnop',
    port = 8080;

apiEasy.describe('http-users/user/api/keys')
  .addBatch(macros.requireStart(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  .get('/users/charlie/keys/test-key')
    .expect(200)
    .expect('should respond with the specified key', function (err, res, body) {
      var result = JSON.parse(body)
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.isObject(result.keys[0]);
      assert.include(result.keys[0], 'username');
      assert.include(result.keys[0], 'name');
      assert.include(result.keys[0], 'key');
    })
  .get('/users/charlie/keys')
    .expect(200)
    .expect('should respond with all keys for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.lengthOf(result.keys, 1);
    })
  .next()
  .post('/users/devjitsu/keys', { key: key })
    .expect(201)
  .next()
  .get('/users/devjitsu/keys')
    .expect(200)
    .expect('should respond with all keys for the user', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.lengthOf(result.keys, 1);
    })
  .next()
  .get('/users/keys')
    .expect(200)
    .expect('should respond with all keys for all users', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.lengthOf(result.keys, 2);
    })
.export(module);