/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    helpers = require('../../helpers');
    
var key = '0987654321abcdefghijklmnop0987654321abcdefghijklmnop0987654321abcdefghijklmnop',
    port = 9002;

var suite = apiEasy.describe('http-users/user/api/keys').addBatch(
  helpers.macros.requireProvisioner(port)
);

helpers.testApi(suite, port)
  .get('/keys/charlie/publicKey')
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
    });
    
suite.export(module);