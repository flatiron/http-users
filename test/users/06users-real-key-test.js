/*
 * users-api-test.js: Tests for the RESTful users API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert  = require('assert'),
    apiEasy = require('api-easy'),
    app     = require('../fixtures/app/couchdb'),
    base64  = require('flatiron').common.base64,
    fs      = require('fs'),
    macros  = require('../macros');
    
// SSH-RSA Key
var sshkey = fs.readFileSync(__dirname + '/../fixtures/sshkey.pub','utf8');
    port = 8080;

apiEasy.describe('http-users/user/api/sshkeys')
  .addBatch(macros.requireStart(app))
  .use('localhost', port)
  .setHeader('Content-Type', 'application/json')
  .setHeader('Authorization', 'Basic ' + base64.encode('charlie:1234'))
  .discuss('Creating a user')
  .post('/users/keytester', { email: 'temporal@email.com', password: '1234' })
    .expect(201)
    .expect('should respond with the user created', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isNull(err);
      assert.isObject(result);
      assert.equal(result.user.username, 'keytester');
    })
  .next()
  .get('/users/keytester')
    .expect(200)
    .expect('should respond with the user', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isNull(err);
      assert.isObject(result);
      assert.isObject(result.user);
      assert.equal(result.user.username, 'keytester');
    })
  .undiscuss()
  .discuss('Creating a real ssh key')
  .post('/users/keytester/keys/mykey', { key: sshkey })
    .expect(201)
  .next()
  .get('/users/keytester/keys/mykey')
    .expect(200)
    .expect('should respond with the specified key', function (err, res, body) {
      var result = JSON.parse(body); 
      assert.isObject(result);
      assert.isString(result.key.key);
      assert.equal(result.key.key, sshkey);
    })
  .next()
  .get('/users/keytester/keys')
    .expect(200)
    .expect('should respond with all keys for the user', function (err, res, body) {
      var result = JSON.parse(body);
      assert.isObject(result);
      assert.isArray(result.keys);
      assert.lengthOf(result.keys, 1);
      assert.equal(result.keys[0].key, sshkey);
    })
  .undiscuss()
  .discuss('Creating ssh account with the real ssh key')
  .get('/users/keytester/keys/mykey/sshEnable')
    .expect(200)
    .expect('should respond with a confirmation message', function (err, res, body) {
      assert.isNull(err);
      assert.ok(res);
      assert.ok(body);
      assert.equal(body, '"Created.\\n"');
    })
  .undiscuss()
.export(module);