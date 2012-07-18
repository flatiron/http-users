/*
 * users-api-keys-test.js: Tests for the RESTful users SSH keys API.
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
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  .put('/users/charlie/keys/test-key', { key: key })
    .expect(201)
  .next()
  .get('/users/charlie/keys/test-key')
    .expect(200)
    .expect('should respond with the specified key', function (err, res, body) {
      var result = JSON.parse(body)
      assert.isObject(result);
      assert.isObject(result.key);
      assert.include(result.key, 'username');
      assert.include(result.key, 'name');
      assert.include(result.key, 'key');
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
  .post('/users/elijah/keys', { key: key })
    .expect(201)
  .next()
  .get('/users/elijah/keys')
    .expect(200)
    .expect('should respond with all keys for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.lengthOf(result.keys, 1);
      result.keys.forEach(function (key) {
        assert.equal(key.username, 'elijah');
      })
    })
.export(module);
