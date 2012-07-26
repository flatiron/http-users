/*
 * organization-test.js: Tests for the http-users Organization resource
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    vows = require('vows'),
    macros = require('../macros');

var neworg;

var app = require('../fixtures/app/couchdb');

vows
.describe('http-users/couchdb/organizations')
.addBatch(macros.requireStart(app))
.addBatch(macros.destroyDb(app))
.addBatch(macros.seedDb(app))
.addBatch({
  'The Organization resource': {
    'the create() method': {
      topic: function () {
        app.resources.Organization.create({
          _id: 'organization/devjitsu4',
          name: 'devjitsu4',
          owners: ['charlie'],
          members: ['charlie']
        }, this.callback)
      },
      'should respond with the appropriate object': function (err, org) {
        neworg = org;

        assert.isNull(err);
        assert.isObject(org);
        assert.equal(org.name, 'devjitsu4');
        assert.equal(org.owners[0], 'charlie');
        assert.lengthOf(org.members, 1);
      }
    },
    'the available() method': {
      'with an unused name': {
        topic: function () {
          app.resources.Organization.available('non-existent', this.callback);
        },
        'should respond available': function (err, res) {
          assert.isNull(err);
          assert.ok(res);
        }
      },
      'with an used name': {
        topic: function () {
          var cb = this.callback;
          app.resources.Organization.create({
            _id: 'organization/devjitsu',
            name: 'devjitsu'
          }, function () {
            app.resources.Organization.available('devjitsu', cb);
          })
        },
        'should respond unavailable': function (err, res) {
          assert.isNull(err);
          assert.isFalse(res);
        }
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'the addMember() method': {
      topic: function () {
        app.resources.Organization.addMember('devjitsu4', 'marak', this.callback);
      },
      'should respond successfully': function (err, org) {
        assert.isNull(err);
        assert.ok(!!~org.members.indexOf('marak'));
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'the addOwner() method': {
      topic: function () {
        app.resources.Organization.addOwner('devjitsu4', 'marak', this.callback);
      },
      'should respond successfully': function (err, org) {
        assert.isNull(err);
        assert.ok(!!~org.owners.indexOf('marak'));
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'the removeOwner() method': {
      topic: function () {
        var cb = this.callback;
        app.resources.Organization.removeOwner('devjitsu4', 'marak', function (err) {
          if (err) return cb(err);
          app.resources.Organization.get('organization/devjitsu', cb);
        });
      },
      'should respond successfully': function (err, org) {
        assert.isNull(err);
        assert.ok(!~org.owners.indexOf('marak'));
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'the removeMember() method': {
      topic: function () {
        var cb = this.callback;
        app.resources.Organization.removeMember('devjitsu4', 'marak', function (err) {
          if (err) return cb(err);
          app.resources.Organization.get('organization/devjitsu', cb);
        });
      },
      'should respond successfully': function (err, org) {
        assert.isNull(err);
        assert.ok(!~org.members.indexOf('marak'));
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'the update() method': {
      topic: function () {
        var cb = this.callback;
        app.resources.Organization.update('organization/devjitsu4',
        { members: ['marak'] }, function (err) {
          if (err) return cb(err);
          app.resources.Organization.get('organization/devjitsu4', cb);
        });
      },
      'should respond successfully': function (err, org) {
        assert.isNull(err);
        assert.ok(!!~org.members.indexOf('marak'));
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'the destroy() method': {
      topic: function () {
        app.resources.Organization.destroy('organization/devjitsu4', this.callback);
      },
      'should respond successfully': function (err, org) {
        assert.isNull(err);
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'the available() method': {
      topic: function () {
        app.resources.Organization.available('devjitsu4', this.callback);
      },
      'should respond available': function (err, res) {
        assert.isNull(err);
        assert.ok(res);
      }
    }
  }
})
.addBatch({
  'The Organization resource': {
    'creating a user': {
      topic: function () {
        app.resources.User.create({
          _id: 'user/destroyme',
          name: 'destroyme',
          email: 'destroy@me.com'
        }, this.callback);
      },
      'should be created correctly': function (err, user) {
        assert.isNull(err);
        assert.ok(user);
        assert.equal(user.resource, 'User');
        assert.equal(user.username, 'destroyme');
        assert.equal(user._id, 'user/destroyme');
      },
      'creating a organization': {
        topic: function (user) {
          app.resources.Organization.create({
            _id: 'organization/devjitsu5',
            name: 'devjitsu5',
            owners: [user.username],
            members: [user.username]
          }, this.callback);
        },
        'should be created correctly': function (err, org) {
          assert.isNull(err);
          assert.ok(org);
          assert.equal(org.resource, 'Organization');
          assert.equal(org.name, 'devjitsu5');
          assert.lengthOf(org.owners, 1);
          assert.lengthOf(org.members, 1);
        },
        'and destroy de user': {
          topic: function (organization, user) {
            user.destroy(this.callback)
          },
          'should be destroyed correctly': function (err, res) {
            assert.isNull(err);
            assert.ok(res.ok);
          },
          'should be destroy the organization too': {
            topic: function () {
              app.resources.Organization.available('devjitsu5', this.callback);
            },
            'should left the name available': function (err, res) {
              assert.isNull(err);
              assert.ok(res);
            }
          }
        }
      }
    }
  }
})
.export(module);
