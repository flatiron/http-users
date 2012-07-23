/*
 * organizations-api-test.js: Tests for the RESTful organizations API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    apiEasy = require('api-easy'),
    macros  = require('../macros'),
    app     = require('../fixtures/app/couchdb');

var port = 8080;

apiEasy.describe('http-users/organization/api')
  .addBatch(macros.requireStart(app))
  .addBatch(macros.destroyDb(app))
  //.addBatch(macros.createDb(app))
  .addBatch(macros.seedDb(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .authenticate('charlie', '1234')
  .discuss('With valid creds')
  .get('/organizations/non-existent', {})
    .expect(500)
    .expect('should respond with error', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.isDefined(result.error);
    })
  .get('/organizations/devjitsu')
    .expect(200)
    .expect('should respond with organization object', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.equal(result.owners[0], 'charlie');
    })
  .post('/organizations/devjitsu', {})
    .expect(500)
    .expect('should show an error', function (err, res, body) {
      assert.isNull(err);
    })
  .post('/organizations/devjitsu-new', {})
    .expect(200)
    .expect('should respond with organization object', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.isNotNull(result);
      assert.isDefined(result.owners);
      assert.equal(result.owners[0], 'charlie');
    })
  .post('/organizations/devjitsu/members/marak', {})
    .expect(200)
    .expect('should add user to devjitsu', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.lengthOf(result.members, 3);
      assert.equal(result.members[2], 'marak');
    })
  .post('/organizations/non-existent/members/marak', {})
    .expect(500)
    .expect('should show an error', function (err, res, body) {
      assert.isNull(err);
    })
  .post('/organizations/devjitsu/members/non-existent', {})
    .expect(500)
    .expect('should show an error', function (err, res, body) {
      assert.isNull(err);
    })
  .del('/organizations/devjitsu/members/charlie', {})
    .expect(403)
    .expect('should not remove user from devjitsu', function (err, res, body) {
      assert.isNull(err);
    })
  .del('/organizations/devjitsu/members/maciej', {})
    .expect(200)
    .expect('should remove user from devjitsu', function (err, res, body) {
      assert.isNull(err);
    })
  .post('/organizations/devjitsu2/members/elijah', {})
    .expect(200)
    .expect('should add user to organization', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.lengthOf(result.members, 3);
      assert.equal(result.members[2], 'elijah');
    })
//  .put('/organizations/devjitsu/members/marak', {})
//    .expect(200)
//    .expect('should give user permissions to devjitsu', function (err, res, body) {
//      assert.isNull(err);
//    })
  .del('/organizations/non-existent', {})
    .expect(500)
    .expect('should show an error', function (err, res, body) {
      assert.isNull(err);
    })
  .del('/organizations/devjitsu3', {})
    .expect(200)
    .expect('should delete organization', function (err, res, body) {
      assert.isNull(err);
    })
  .addBatch(macros.requireStop(app))
  .export(module);
