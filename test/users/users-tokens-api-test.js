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

var port = 8080,
    postToken;

apiEasy.describe('http-users/user/api/tokens')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  //
  // Charlie is an admin user
  // Using username password for auth
  //
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  //
  // Add a named token
  //
  .put('/users/charlie/tokens/test-token', {})
    .expect(201)
    .expect("should return the token that was created", function (err, r, b){
      var result = JSON.parse(b);
      assert.isObject(result);
      assert.isString(result["test-token"]);
      assert.equal(result.operation, "insert");
    })
  .next()
  //
  // Normal users cant do this, charlie can cause he is a admin
  //
  .get('/users/charlie')
  .expect(200)
  .next()
  //
  // Update named token
  //
  .put('/users/charlie/tokens/test-token', {})
    .expect(201)
    .expect("should return the token that was created", function (err, r, b){
      var result = JSON.parse(b);
      assert.isObject(result);
      assert.isString(result["test-token"]);
      assert.equal(result.operation, "update");
    })
  .next()
  //
  // Create an unnamed token
  //
  .post('/users/charlie/tokens', {})
    .expect(201)
    .expect("should return the token that was created", function (err, r, b){
      var result = JSON.parse(b);
      assert.isObject(result);
      for (var key in result) {
        if(key !== "operation") {
          postToken = key;
          break;
        }
      }
      assert.isString(postToken);
    })
  .next()
  //
  // Delete our named token
  //
  .del('/users/charlie/tokens/test-token')
    .expect(201)
    .expect("should delete the token", function (err, r, b){
      var result = JSON.parse(b);
      assert.isObject(result);
      assert.ok(result.ok);
      assert.equal(result.id, "test-token");
    })
  .next()
  //
  // Get all tokens, should not include named token (deleted)
  //
  .get('/users/charlie/tokens')
    .expect(200)
    .expect('should respond with all tokens for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isObject(result.apiTokens);
      assert.isString(result.apiTokens[postToken]);
      assert.isString(result.apiTokens.seeded);
      assert.isUndefined(result.apiTokens["test-token"]);
    })
  .next()
  //
  // Charlie is an admin user
  // Using token for auth
  //
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:token123'))
  //
  // Add a named token
  //
  .put('/users/charlie/tokens/test-token', {})
    .expect(403)
  .next()
  //
  // Normal users cant do this, charlie can cause he is a admin
  //
  .get('/users/charlie')
    .expect(403)
  .next()
  //
  // Update named token
  //
  .put('/users/charlie/tokens/test-token', {})
    .expect(403)
  .next()
  //
  // Create an unnamed token
  //
  .post('/users/charlie/tokens', {})
    .expect(403)
  .next()
  //
  // Delete our named token
  //
  .del('/users/charlie/tokens/test-token')
    .expect(403)
  .next()
  //
  // Delete our seeded token
  //
  .del('/users/charlie/tokens/seeded')
    .expect(403)
  .next()
  //
  // Get all tokens, should fail cause we authed with a api token
  //
  .get('/users/charlie/tokens')
    .expect(403)
  .next()
  //
  // Maciej is a non admin user
  //
  .setHeader('Authorization', 'Basic ' + base64.encode('maciej:1234'))
  //
  // Get his own tokens
  //
  .get('/users/maciej/tokens')
    .expect(200)
    .expect('should respond with all tokens for the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isObject(result.apiTokens);
    })
  .next()
  //
  // Shouldnt be able to get eli's tokens
  //
  .get('/users/elijah/tokens')
    .expect(403)
    .expect('should not have permissions to see other tokens', function (err, res, body) {
      assert.isNull(err);
      assert.equal(body.trim(), "Not authorized to modify users");
    })
  .next()
  //
  // Nuno is a non admin user
  // authenticating with a api token
  //
  .setHeader('Authorization', 'Basic ' + base64.encode('nuno:token123'))
  //
  // We shouldnt be able to access nuno's info with just a token
  // used as auth. All we can do on the user is add and remove tokens
  //
  // Tokens are for apps, not for users
  //
  .get('/users/nuno')
    .expect(403)
  .next()
  //
  // Add a named token should fail as we authenticated with a token
  // We can only create tokens when we auth with username password
  // or are admins
  //
  .put('/users/nuno/tokens/test-token', {})
    .expect(403)
  .next()
  //
  // Even modifing the token we are using should fail
  //
  .put('/users/nuno/tokens/seeded', {})
    .expect(403)
  .next()
  //
  // Getting tokens when authen with a token it should also fail
  //
  .get('/users/nuno/tokens')
    .expect(403)
  .next()
  //
  // With a token we should not be able to access organizations
  //
  .get('/organizations', {})
    .expect(403)
  .next()
  //
  // Should be able to get auth information has that is not protected
  // by requiring username/password auth
  //
  .get('/auth')
    .expect(200)
["export"](module);
