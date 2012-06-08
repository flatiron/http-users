/*
 * 04users-permissions-api-test.js: Tests for the RESTful user permissions API.
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

apiEasy.describe('http-users/user/permissions/api')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  .discuss('With a user that does not exist')
    .put('/users/yunoexist/permissions', {
      name: 'confirm users',
      value: true
    }).expect(404)
  .undiscuss()
  .discuss('With a valid permission')
    .put('/users/charlie/permissions', {
      name: 'confirm users',
      value: true
    }).expect(200)
  .undiscuss()
  .discuss('With an invalid permission')
    .put('/users/charlie/permissions', {
      name: 'yunoexist',
      value: true
    }).expect(500)
  .undiscuss()
  .next()
  .get('/users/charlie')
    .expect('should have the new permission', function (err, res, body) {
      assert.include(
        JSON.parse(body).user.permissions, 
        'confirm users'
      );
    })
  .next()
  .discuss('With a valid permission')
    .del('/users/charlie/permissions', {
      name: 'confirm users'
    }).expect(200)
  .undiscuss()
  .discuss('With an invalid permission')
    .del('/users/charlie/permissions', {
      name: 'yunoexist'
    }).expect(500)
  .undiscuss()
  .next()
  .get('/users/charlie')
    .expect('should not have the permission', function (err, res, body) {
      assert.isFalse(!!JSON.parse(body).user.permissions['confirm users']);
    })
  .export(module);