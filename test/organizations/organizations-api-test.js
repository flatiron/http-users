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
  .get('/organizations/devjitsu', {})
    .expect(200)
    .expect('should respond with organization object', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.equal(result.owner, 'charlie');
    })
  .put('/organizations/devjitsu2', {})
    .expect(200)
    .expect('should respond with organization object', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.isNotNull(result);
      assert.isDefined(result.owner);
      assert.equal(result.owner, 'charlie');
    })
  .put('/organizations/devjitsu2/marak', {})
    .expect(200)
    .expect('should add marak to devjitsu2', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.lengthOf(result.members, 2);
      assert.equal(result.members[1], 'marak');
    })
  .put('/organizations/devjitsu2/non-existent', {})
    .expect(500)
    .expect('should show an error', function (err, res, body) {
      assert.isNull(err);
    })
  .delete('/organizations/devjitsu2/marak', {})
    .expect(200)
    .expect('should remove marak from devjitsu2', function (err, res, body) {
      assert.isNull(err);
    })
  .put('/organizations/devjitsu2/elijah', {})
    .expect(200)
    .expect('should add user to organization', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.lengthOf(result.members, 2);
      assert.equal(result.members[1], 'elijah');
    })
  .get('/organizations/devjitsu2', {})
    .expect(200)
    .expect('should show updated devjitsu2', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.lengthOf(result.members, 2);
      assert.equal(result.members[1], 'elijah');
    })
  .delete('/organizations/devjitsu2', {})
    .expect(200)
    .expect('should delete organization', function (err, res, body) {
      assert.isNull(err);
    })
  .get('/organizations/devjitsu2', {})
    .expect(500)
    .expect('should respond with an error', function (err, res, body) {
      assert.isNull(err);
      var result = JSON.parse(body);
      assert.isDefined(result.error);
    })
  .addBatch(macros.requireStop(app))
  .export(module);
