/*
 * users-permissions-unauth-api-test.js: Tests for the RESTful user permissions API with no auth.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    base64  = require('flatiron').common.base64,
    macros  = require('../macros'),
    app     = require('../fixtures/app/couchdb');
    
var port = 8080;

apiEasy.describe('http-users/user/permissions/api/unauthorized')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('shaketest:1234'))
  .discuss('With a user')
    .get('/auth')
      .expect(200)
      .expect('a valid user', function (err, req, body) {
        assert.isNull(err);
        assert.ok(req);
        assert.equal(body, '{"authorized":true}');
      })
    .get('/user/me')
      .expect(200)
      .expect('should not have any permission', function (err, req) {
        var body = JSON.parse(req.body);
        assert.isNull(err);
        assert.ok(body.user);
        assert.equal(body.user.resource, 'User');
        assert.equal(body.user.username, 'shaketest');
        assert.isEmpty(body.user.permissions)
      })
    .discuss('who is not authorized to modify permissions')
      .get('/permissions')
        .expect(403)
      .post('/permissions', {
        name: 'unauthorized permission',
        type: 'array'
      }).expect(403)
      .post('/permissions', {
        name: 'unauthorized permission',
        type: 'boolean'
      }).expect(403)
      .next()
      .get('/permissions/unauthorized permission')
        .expect(403)
      .del('/permissions/unauthorized permission')
        .expect(403)
      .discuss('of someone else')
        .put('/users/charlie/permissions', {
          name: 'view all users',
          value: true
        }).expect(403)
        .del('/users/charlie/permissions', {
          name: 'modify permissions'
        }).expect(403)
        .put('/users/charlie/permissions', {
          name: 'yunoexist',
          value: true
        }).expect(403)
      .undiscuss()
      .next()
    .undiscuss()
    .discuss('who is not authorized to modify users')
      .get('/users/charlie')
        .expect(403)
      .discuss('With an invalid permission')
        .del('/users/charlie/permissions', {
          name: 'yunoexist'
        }).expect(403)
      .undiscuss()
      .discuss('With a valid permission')
        .del('/users/charlie/permissions', {
          name: 'confirm users'
        }).expect(403)
      .undiscuss()
      .post('/users/unauthorized', { email: 'initial@email.com', password: '1234' })
        .expect(403)
      .get('/users')
        .expect(403)
      .get('/users/marak')
        .expect(403)
      .get('/users/noexists')
        .expect(403)
      .put('/users/marak', { email: 'working@test.com' })
        .expect(403)
      .post('/users/testjitsu', {
        username: 'testjitsu',
        password: '1234',
        email: 'testjitsu@test.com'
      }).expect(403)
      .post('/users/marak/forgot')
        .expect(403)
      .post('/users/marak/forgot', { shake: '0123456789' })
        .expect(403)
      .post('/users/marak/forgot', {
        shake: 'invalid_sauce',
        'new-password': 'secretpassword'
      }).expect(403)
      .post('/users/marak/forgot', {
        shake: '0123456789',
        'new-password': 'secretpassword'
      }).expect(403)
      .get('/users/marak/keys')
        .expect(403)
      .post('/users/marak/keys', { key: 'abcdefghijklmnopeqrstuvwxyz' })
        .expect(403)
    .undiscuss()
  .undiscuss()
.export(module);
