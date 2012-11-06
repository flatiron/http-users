/*
 * users-thirdparty-api-test.js: Tests for the RESTful users 3rdparty tokens.
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

apiEasy.describe('http-users/user/api/thirdparty')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  //
  // Charlie is an admin user
  //
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  //
  // Add a named token
  //
  .post('/users/charlie/thirdparty', { token: {
        provider: "twitter",
        token: "12345",
        app: "*",
        info: {somestuff: "from testing 1"}
      }, 
      id: "testing"
    })
    .expect(201)
    .expect("should return the token that was created", function (err, r, b){
      var result = JSON.parse(b);
      assert.isObject(result);
      //
      // Has Id `testing`
      //
      assert.equal(result.id, "testing");

      //
      // Has app "*"
      //
      assert.equal(result.app, "*");

      //
      // Kept the token
      //
      assert.equal(result.info.somestuff, "from testing 1");
    })
  .next()
  //
  // Update named token
  //
  .post('/users/charlie/thirdparty', { token: {
        id: "testing",
        provider: "twitter",
        token: "12345",
        app: "dinosaur",
        info: {somestuff: "from testing 2"}
      }
    })
    .expect(201)
    .expect("should return the token that was updated", function (err, r, b){
      var result = JSON.parse(b);
      assert.isObject(result);
      //
      // Has Id `testing`
      //
      assert.equal(result.id, "testing");

      //
      // Has app "dinosaur"
      //
      assert.equal(result.app, "dinosaur");
    })
  .next()
  //
  // Create an unnamed token with id
  //
  .post('/users/charlie/thirdparty', { token: {
        provider: "github",
        token: "12345",
        info: {somestuff: "from github"}
      }
    })
    .expect(201)
    .expect("should return the token that was created", function (err, r, b) {
      var result = JSON.parse(b);
      assert.isObject(result);

      //
      // Has auto generated id
      //
      assert.isString(result.id);

      //
      // Has app "*"
      //
      assert.equal(result.app, "*");

      //
      // Kept the token
      //
      assert.equal(result.provider, "github");
      assert.equal(result.token, "12345");
      assert.equal(result.info.somestuff, "from github");
    })
  .next()
  //
  // Create some more tokens for testing purposes (delete's/etc)
  //
  .post('/users/charlie/thirdparty', { token: {
        provider: "travis",
        token: "12345",
        info: {somestuff: "from travis"}
      }
    })
    .expect(201)
  .next()
  //
  // Create some more tokens for testing purposes (delete's/etc)
  //
  .post('/users/charlie/thirdparty', { token: {
        id: "watwat",
        provider: "bitbucket",
        token: "12345",
        info: {somestuff: "from bitbucket"}
      }
    })
    .expect(201)
  .next()
  .del('/users/charlie/thirdparty/watwat')
    .expect(201)
    .expect("should return the token that was created", function (err, r, b) {
      var result = JSON.parse(b);
      //
      // Id is watwat
      //
      assert.equal(result.id, "watwat");

      //
      // The deleted object was returned
      //
      assert.isObject(result.deleted);
    })
  .next()
  //
  // Try to create a token without a token should fail
  //
  .post('/users/charlie/thirdparty', {})
    .expect(500)
  .next()
  //
  // Try to create a token without a token without a provider
  // should also fail
  //
  .post('/users/charlie/thirdparty', {token: {token: "123"}})
    .expect(500)
  .next()
  //
  // Try to create a token without a token without a token
  // should also fail
  //
  .post('/users/charlie/thirdparty', {token: {provider: "123"}})
    .expect(500)
  .next()
  .get('/users/charlie/thirdparty')
    .expect(200)
    .expect("should return all non app spec tokens", function (err, r, b) {
      var result = JSON.parse(b);
      //
      // Travis and github
      // Both wildcarded and non deleted
      //
      assert.equal(result.length, 2);

      //
      // Providers should be travis and github
      //
      var githubOrTravis = result.filter(function (t) {
        return t.provider === "github" || t.provider === "travis";
      });
      assert.equal(githubOrTravis.length, 2);

      //
      // Make sure all tokens are wildcarded since we did not request a
      // particular app
      //
      var wildcardedTokens = result.filter(function (t) {
        return t.app === "*";
      });
      assert.equal(wildcardedTokens.length, result.length);
    })
  .next()
  .get('/users/charlie/thirdparty/app/dinosaur')
    .expect(200)
    .expect("should return all dinosaur and * tokens", function (err, r, b) {
      var result = JSON.parse(b);
      //
      // Travis and github
      // Both wildcarded and non deleted
      //
      // Also the dinosaur twitter one that was subject to update
      //
      assert.equal(result.length, 3);

      //
      // Providers should be travis, github and twitter
      //
      var rightProviders = result.filter(function (t) {
        return t.provider === "github" || t.provider === "travis" ||
               t.provider === "twitter";
      });
      assert.equal(rightProviders.length, result.length);

      //
      // Wildcarded tokens should be returned for all apps
      // In our database we have two
      //
      var wildcardedTokens = result.filter(function (t) {
        return t.app === "*";
      });
      assert.equal(wildcardedTokens.length, 2);

      //
      // One app specific token exists
      //
      var dinoTokens = result.filter(function (t) {
        return t.app === "dinosaur";
      });
      assert.equal(dinoTokens.length, 1);
    })
  .next()
  .get('/users/charlie/thirdparty/app/dinosaur?provider=twitter')
    .expect(200)
    .expect("should return all dinosaur and * tokens", function (err, r, b) {
      var result = JSON.parse(b);
      //
      // Only one has the provider `twitter`
      //
      assert.equal(result.length, 1);

      //
      // Providers should be twitter
      //
      var rightProviders = result.filter(function (t) {
        return t.provider === "twitter";
      });
      assert.equal(rightProviders.length, result.length);

      //
      // Wildcarded tokens should be out, cause we asked for a specific
      // provider
      //
      var wildcardedTokens = result.filter(function (t) {
        return t.app === "*";
      });
      assert.equal(wildcardedTokens.length, 0);

      //
      // One app specific token exists, cause it was twitter
      //
      var dinoTokens = result.filter(function (t) {
        return t.app === "dinosaur";
      });
      assert.equal(dinoTokens.length, 1);
    })
  .next()
["export"](module);