/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    helpers = require('../../helpers');
    
var port = 9002;

var suite = apiEasy.describe('http-users/user/api').addBatch(
  helpers.macros.requireProvisioner(port)
);

helpers.testApi(suite, port)
  .discuss('With valid creds')
  .get('/auth')
    .expect(200)
    .expect('should respond with true', function (error, response, body) {
      var result = JSON.parse(body); 
      assert.isTrue(result.authorized);
    })
  .undiscuss()
  .get('/users')
    .expect(200)
    .expect('should respond with a list of users', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isArray(result.users);
      assert.lengthOf(result.users, 4);
    })
  .get('/users/devjitsu')
    .expect(200)
    .expect('should respond with the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isObject(result.user);
      assert.equal(result.user.username, 'devjitsu');
    })
  .put('/users/devjitsu', { email: 'working@test.com' })
    .expect(204)
  .next()
  .get('/users/devjitsu')
    .expect(200)
    .expect('should respond with the user', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isObject(result.user);
      assert.equal(result.user.username, 'devjitsu');
      assert.equal(result.user.email, 'working@test.com');
    })
  .post('/users/testjitsu', {
    username: 'testjitsu',
    password: '1234',
    email: 'testjitsu@test.com'
  })
  .expect(201)
  .next()
  .discuss('With a username that exists')
  .post('/users/testjitsu', {
    username: 'testjitsu',
    password: '1234',
    email: 'testjitsu@test.com'
  })
  .expect(500)
  .undiscuss()
  .next()
  .get('users/testjitsu')
    .expect(200)
  .next()
  .del('/users/testjitsu')
    .expect(200)
  .next()
  .get('users/testjitsu')
    .expect(500)
  .next()
  .discuss('With a username that is not available')
    .get('/users/devjitsu/available')
    .expect(200)
    .expect('should respond with not available', function (err, res, body) {
      var result = JSON.parse(body);
      assert.equal(result.available, false);
    })
  .undiscuss()
  .discuss('With a username that is available')
    .get('/users/available-user/available')
    .expect(200)
    .expect('should respond with available', function (err, res, body) {
      var result = JSON.parse(body);
      assert.equal(result.available, true);
    })
  .undiscuss()
  .next()
  .discuss('With a valid username')
  .discuss('but without other parameters (a new reset request)')
    .post('/users/test-user/forgot')
    .expect(200)
  .undiscuss()
  .discuss('a shake parameter, and no password')
    .post('/users/forgot-password/forgot', { shake: '0123456789' })
    .expect(400)
  .undiscuss()
  .discuss('a new password, but an invalid shake')
    .post('/users/forgot-password/forgot', {
      shake: 'invalid_sauce',
      'new-password': 'secretpassword'
    })
    .expect(403)
  .undiscuss()
  .discuss('a valid shake, and a new password')
    .post('/users/forgot-password/forgot', { 
      shake: '0123456789',
      'new-password': 'secretpassword'
    })
    .expect(200);

    
suite.export(module);