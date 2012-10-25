/*
 * users-tokens-api-test.js: Tests for the RESTful users API tokens.
 *
 * (C) 2012, Nodejitsu Inc.
 *
 */

var assert  = require('assert'),
    apiEasy = require('api-easy'),
    app     = require('../fixtures/app/couchdb'),
    macros  = require('../macros'),
    base64  = require('flatiron').common.base64;

var port = 8080;

apiEasy.describe('http-users/user/api/tokens')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  .put('/users/charlie/tokens/test-token', {})
    .expect(201)
    .expect("should return the token that was created", function (err, r, b){
      var result = JSON.parse(b);
      assert.isObject(result);
      assert.isString(result["test-token"]);
    })
  .next()
  .get('/users/charlie/tokens')
    .expect(200)
    .expect('should respond with all tokens for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isObject(result.apiTokens);
    })
  .next()
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:token123'))
  .get('/users/charlie/tokens')
    .expect(200)
    .expect('should respond with all tokens for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isObject(result.apiTokens);
    })
  .next()
  .get('/users/elijah/tokens')
    .expect(401)
    .expect('should not have permissions to see other tokens', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(err);
      assert.isNull(body);
    })
["export"](module);
