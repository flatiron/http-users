/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert  = require('assert'),
    apiEasy = require('api-easy'),
    app     = require('./fixtures/app'),
    base64  = require('flatiron').common.base64;
    
var key = '0987654321abcdefghijklmnop0987654321abcdefghijklmnop0987654321abcdefghijklmnop',
    port = 8080;

apiEasy.describe('http-users/user/api/keys')
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  .get('/keys/charlie/test-key')
    .expect(200)
    .expect('should respond with the specified key', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isString(result.key);
    })
  .get('/keys/charlie')
    .expect(200)
    .expect('should respond with all keys for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.lengthOf(result.keys, 1);
    })
  .next()
  .post('/keys/devjitsu', { key: key })
    .expect(201)
  .next()
  .get('/keys/devjitsu')
    .expect(200)
    .expect('should respond with all keys for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.lengthOf(result.keys, 1);
      assert.equal(result.keys[0], key);
    })
.export(module);