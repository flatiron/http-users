/*
 * users-api-confirm-test.js: Tests for confirmation in the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    macros  = require('../macros'),
    app     = require('../fixtures/app/couchdb');
    
var port = 8080;

app.config.set('users:require-activation', true);

apiEasy.describe('http-users/user/api')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .authenticate('charlie', '1234')
  .discuss('confirmation by superuser')
    .post('/users/maciej/confirm')
      .expect(200)
    .next()
    .get('/users/maciej')
      .expect(200)
      .expect('user to be `active`', function (err, res, body) {
        assert.isNull(err);
        body = JSON.parse(body);
        assert.equal(body.user.status, 'pending');
      })
    .undiscuss()
  .discuss('confirmation by non-superuser')
    .authenticate('daniel', '1234')
    .discuss('with no invite code')
    .post('/users/daniel/confirm', {})
      .expect(400)
    .next()
      .get('/users/daniel')
        .expect(200)
        .expect('user to be still `new`', function (err, res, body) {
          assert.isNull(err);
          body = JSON.parse(body);
          assert.equal(body.user.status, 'new');
        })
    .undiscuss()
    .next()
    .discuss('with invite code')
    .post('/users/daniel/confirm', { inviteCode: 'h4x0r' })
      .expect(200)
    .next()
      .get('/users/daniel')
        .expect(200)
        .expect('user to be `active`', function (err, res, body) {
          assert.isNull(err);
          body = JSON.parse(body);
          assert.equal(body.user.status, 'active');
        })
    .undiscuss()
  .next()
    .discuss('attempt to authenticate another user')
    .post('/users/testconfirm/confirm', {})
      .expect(400)
      .expect('should respond with `Invalid Invite Code`', function (err, res, body) {
        assert.isNull(err);
        assert.equal(JSON.parse(body).error, 'Invalid Invite Code');
      })
    .next()
    .authenticate('testconfirm', '1234')
    .get('/users/testconfirm')
      .expect('should not change the user status', function (err, res, body) {
        assert.isNull(err);
        
        var result = JSON.parse(body);
        assert.isObject(result.user);
        assert.equal(result.user.status, 'new');
      })
  .export(module);