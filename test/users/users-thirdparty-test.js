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

var port = 8080,
    postToken;

apiEasy.describe('http-users/user/api/tokens')
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
        provider: "github",
        token: "12345",
        app: "*",
        info: {somestuff: "from provider"}
      }, 
      id: "testing"
    })
    .expect(201)
    .expect("should return the token that was created", function (err, r, b){
      var result = JSON.parse(b);
      console.log("will fail", result);
      assert.isObject(result);
      //
      // Has Id `testing`
      //
      
      //
      // Has app "*"
      //
      
      //
      // Kept the token
      //
      
    })
  .next()
  //
  // Update named token
  //
  .post('/users/charlie/thirdparty', { token: {
        id: "testing",
        provider: "github",
        token: "12345",
        app: "dinosaur",
        info: {somestuff: "from provider"}
      }
    })
    .expect(201)
    .expect("should return the token that was updated", function (err, r, b){
      var result = JSON.parse(b);
      console.log("will fail2", result);
      assert.isObject(result);
      //
      // Has Id `testing`
      //
      
      //
      // Has app "dinosaur"
      //
      
      //
      // Modified the token
      //
      
    })
  .next()
  //
  // Create an unnamed token with id
  //
  .post('/users/charlie/thirdparty', { token: {
        provider: "github",
        token: "12345",
        info: {somestuff: "from provider"}
      }
    })
    .expect(201)
    .expect("should return the token that was created", function (err, r, b) {
      var result = JSON.parse(b);
      console.log("will fail3", result);
      assert.isObject(result);
      //
      // Has auto generated id
      //
      
      //
      // Has app "*"
      //
      
      //
      // Kept the token
      //
      
    })
["export"](module);
