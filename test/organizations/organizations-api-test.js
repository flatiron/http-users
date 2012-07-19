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

return;

/**
 * Vows
 */

var vows = require('vows'),
    request = require('request');

function auth(username, password) {
  var auth = new Buffer(username + ':' + password).toString('base64');
  return {
    headers: {
      'authorization': 'Basic ' + auth
    }
  };
}

vows
.describe('http-users/organizations/api')
.addBatch(macros.requireStart(app))
.addBatch(macros.destroyDb(app))
//.addBatch(macros.createDb(app))
.addBatch(macros.seedDb(app))
.addBatch({
  'GET to /organizations/non-existent': {
    'to get a non-existent organization': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:' + port + '/organizations/non-existent';
        options.method = 'GET';

        request(options, this.callback);
      },
      'should respond with 200': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);
        var result = JSON.parse(body);
        assert.isDefined(result.error);
      }
    }
  }
})
.addBatch({
  'GET to /organizations/devjitsu': {
    'to get an existing organization': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:' + port + '/organizations/devjitsu';
        options.method = 'GET';

        request(options, this.callback);
      },
      'should respond with 200': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);
        var result = JSON.parse(body);
        assert.equal(result.owners[0], 'charlie');
      }
    }
  }
})
.addBatch({
  'POST to /organizations/devjitsu': {
    'to create an existing organization': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:' + port + '/organizations/devjitsu';
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 500': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 500);
      }
    }
  }
})
.addBatch({
  'POST to /organizations/devjitsu-new': {
    'to create an new organization': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:' + port + '/organizations/devjitsu-new';
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 200': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);
        var result = JSON.parse(body);
        assert.isNotNull(result);
        assert.isDefined(result.owners);
        assert.equal(result.owners[0], 'charlie');
      }
    }
  }
})
.addBatch({
  'POST to /organizations/devjitsu/members/marak': {
    'to create an new member': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/devjitsu/members/marak';
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 200': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);
        var result = JSON.parse(body);
        assert.lengthOf(result.members, 3);
        assert.equal(result.members[2], 'marak');
      }
    }
  }
})
.addBatch({
  'POST to /organizations/non-existent/members/marak': {
    'to create an new member in non-existent organization': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/non-existent/members/marak';
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 500': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 500);
      }
    }
  }
})
.addBatch({
  'POST to /organizations/devjitsu/members/non-existent': {
    'to create a non-existent member': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/devjitsu/members/non-existent';
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 500': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 500);
      }
    }
  }
})
.addBatch({
  'DELETE to /organizations/devjitsu/members/charlie': {
    'to delete the sole owner': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/devjitsu/members/charlie';
        options.method = 'DELETE';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 403': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 403);
      }
    }
  }
})
.addBatch({
  'DELETE to /organizations/devjitsu/members/maciej': {
    'to delete a member': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/devjitsu/members/maciej';
        options.method = 'DELETE';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 200': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);
      }
    }
  }
})
.addBatch({
  'POST to /organizations/devjitsu2/members/elijah': {
    'to add a member': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/devjitsu2/members/elijah';
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 200': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);
        var result = JSON.parse(body);
        assert.lengthOf(result.members, 3);
        assert.equal(result.members[2], 'elijah');
      }
    }
  }
})
//.addBatch({
//  'PUT to /organizations/devjitsu/members/marak': {
//    'to update a member': {
//      topic: function () {
//        var options = auth('charlie', '1234');
//        options.uri = 'http://localhost:'
//          + port + '/organizations/devjitsu/members/marak';
//        options.method = 'PUT';
//        options.headers['Content-Type'] = 'application/json';
//        options.body = JSON.stringify({});
//
//        request(options, this.callback);
//      },
//      'should respond with 200': function (err, res, body) {
//        assert.isNull(err);
//        assert.equal(res.statusCode, 200);
//      }
//    }
//  }
//})
.addBatch({
  'DELETE to /organizations/non-existent': {
    'to delete a non-existent organization': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/non-existent';
        options.method = 'DELETE';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 500': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 500);
      }
    }
  }
})
.addBatch({
  'DELETE to /organizations/devjitsu3': {
    'to delete an existing organization': {
      topic: function () {
        var options = auth('charlie', '1234');
        options.uri = 'http://localhost:'
          + port + '/organizations/devjitsu3';
        options.method = 'DELETE';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});

        request(options, this.callback);
      },
      'should respond with 200': function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);
      }
    }
  }
})
.addBatch(macros.requireStop(app))
.export(module);
