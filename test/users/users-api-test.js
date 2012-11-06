/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    macros  = require('../macros'),
    app     = require('../fixtures/app/couchdb');

var port = 8080;

apiEasy.describe('http-users/user/api')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .authenticate('charlie', '1234')
  .discuss('With valid creds')
  .get('/auth')
    .expect(200)
    .expect('should respond with true', function (error, response, body) {
      var result = JSON.parse(body);
      assert.isNull(error);
      assert.isTrue(result.authorized);
    })
  .post('/users/devjitsu', { email: 'initial@email.com', password: '1234' })
    .expect(201)
    .expect('should respond with the user created', function (err, res, body) {
      var result = JSON.parse(body).user;
      assert.isNull(err);
      assert.isObject(result);
      assert.equal('devjitsu', result.username);
    })
  .post('/users/MixEDCasE', { email: 'initial@email.com', password: '1234' })
    .expect(201)
    .expect('should respond with a lowercase username', function (err, res, body) {
      var result = JSON.parse(body).user;
      assert.isNull(err);
      assert.isObject(result);
      assert.equal('mixedcase', result.username);
    })
  .next()
  .get('/users')
    .expect(200)
    .expect('should respond with a list of users', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isNull(err);
      assert.isObject(result);
      assert.isArray(result.users);
      assert.lengthOf(result.users, 11);
    })
  .get('/users/devjitsu')
    .expect(200)
    .expect('should respond with the user', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isNull(err);
      assert.isObject(result);
      assert.isObject(result.user);
      assert.equal(result.user.username, 'devjitsu');
      assert.isString(result.user.inviteCode)
    })
  .get('/users/noob')
    .expect(404)
  .put('/users/devjitsu', { email: 'working@test.com' })
    .expect(204)
  .next()
  .get('/users/devjitsu')
    .expect(200)
    .expect('should respond with the user', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isNull(err);
      assert.isObject(result);
      assert.isObject(result.user);
      assert.equal(result.user.username, 'devjitsu');
      assert.equal(result.user.email, 'working@test.com');
      assert.isString(result.user.inviteCode);
    })
  .post('/users/testjitsu', {
    username: 'testjitsu',
    password: '1234',
    email: 'testjitsu@test.com'
  })
  .expect(201)
  .next()
  .discuss('and a username that exists')
  .post('/users/testjitsu', {
    username: 'testjitsu',
    password: '1234',
    email: 'testjitsu@test.com'
  })
  .expect(500)
  .undiscuss()
  .next()
  .get('/users/testjitsu')
    .expect(200)
  .next()
  .del('/users/testjitsu')
    .expect(204)
  .next()
  .get('/users/testjitsu')
    .expect(404)
  .next()
  .discuss('and a username that is not available')
    .get('/users/devjitsu/available')
    .expect(200)
    .expect('should respond with not available', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isNull(err);
      assert.equal(result.available, false);
    })
  .undiscuss()
  .discuss('and a username that is available')
    .get('/users/available-user/available')
    .expect(200)
    .expect('should respond with available', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isNull(err);
      assert.equal(result.available, true);
    })
  .undiscuss()
  .next()
  .discuss('and a valid username')
    .post('/users/silly-user', {
      shake: '0123456789',
      email: 'silly-user@test.com',
      password: '1234'
    })
    .expect(201)
    .expect('should respond with a valid user', function (err, res, body) {
      var result = JSON.parse(body).user;
      assert.isNull(err);
      assert.isObject(result);
      assert.equal('silly-user', result.username);
    })
  .undiscuss()
  .next()
  .discuss('a shake parameter, and no password')
    .post('/users/silly-user/forgot', { shake: '0123456789' })
    .expect(400)
  .undiscuss()
  .discuss('a new password, but an invalid shake')
    .post('/users/silly-user/forgot', {
      shake: 'invalid_sauce',
      'new-password': 'secretpassword'
    })
    .expect(403)
  .undiscuss()
  .discuss('a valid shake, and a new password')
    .post('/users/silly-user/forgot', {
      shake: '0123456789',
      'new-password': 'secretpassword'
    })
    .expect(200)
  .undiscuss()
  .next()
  .discuss('but without other parameters (a new reset request)')
    .post('/users/silly-user/forgot')
    .expect(200)
  .undiscuss()
  .discuss('should be able to authenticate with a new password')
    .authenticate('silly-user', 'secretpassword')
    .get('/auth')
      .expect(200)
  .undiscuss()
  .undiscuss()
  .unauthenticate()
  .next()
  .authenticate('marak', '1234')
  .discuss('and the user lacks `modify permissions`')
    .discuss('and attempts to modify their own permissions')
    .put('/users/marak', {
      permissions: {
        'modify users': true
      }
    })
    .expect(204)
  .next()
  .get('/users/marak')
  .expect('should not add the permissions to the user', function (err, res, body) {
    var result = JSON.parse(body).user;
    assert.isNull(err);
    assert.isObject(result);
    assert.equal('marak', result.username);
    assert.isObject(result.permissions);
    assert.isTrue(!result.permissions['modify users']);
  })
  .undiscuss()
  .addBatch(macros.requireStop(app))
  .export(module);
