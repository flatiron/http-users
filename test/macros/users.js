
var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    hash = require('node_hash'),
    macros = require('./index');

var key = '012345678901234567890123456789',
    newuser;

module.exports = function (suite, app) {
  return suite
    .addBatch(macros.requireStart(app))
    .addBatch(macros.destroyDb(app))
    .addBatch(macros.seedDb(app)).addBatch({
    "The User resource": {
      "the create() method": {
        topic: function () {
          app.resources.User.create({
            _id: 'newuser',
            password: '1234',
            email: 'foo@bar.com',
            permissions: {
              'modify users': true
            }
          }, this.callback)
        },
        "should respond with the appropriate object": function (err, user) {

          // Expose it first thing, in case some assertions fail.
          newuser = user;

          assert.isNull(err);
          assert.isObject(user);
          assert.equal(user.email, 'foo@bar.com');
          assert.equal(user.username, 'newuser');

          //
          // using default options not require ativation so
          //
          assert.equal(user.status, 'pending');
          assert.isString(user.inviteCode);
          assert.isString(user.password);
          assert.isString(user['password-salt']);
          assert.equal(user.password, hash.md5('1234', user['password-salt']));
          assert.isObject(user.permissions);

        }
      },
      "the available() method": {
        "with an unused name": {
          topic: function () {
            app.resources.User.available('randomguy', this.callback);
          },
          "should respond available": function (err, res) {
            assert.isNull(err);
            assert.ok(res);
          }
        },
        "with an used name": {
          topic: function () {
            var self = this;
            app.resources.User.create({
              _id: 'juan',
              password: '1234',
              email: 'foo@bar.com'
            }, function () {
              app.resources.User.available('juan', self.callback);
            })
          },
          "should said unavailable": function (err, res) {
            assert.isNull(err);
            assert.isFalse(res);
          }
        }
      }
    }
  }).addBatch({
    "The User resource": {
      "the `setPassword()` method": {
        topic: function () {
          newuser.setPassword('4321');
          this.callback();
        },
        "should set the password": function () {
          assert.isString(newuser.password);
          assert.isString(newuser['password-salt']);
          assert(newuser.password === hash.md5('4321', newuser['password-salt']));
        }
      }
    }
  }).addBatch({
    "The User resource": {
      "the addKey() method": {
        topic: function () {
          newuser.addKey('test-key', key, this.callback);
        },
        "should respond correctly": function (err, res) {
          assert.isNull(err);
          assert.isObject(res);
          assert.ok(res.ok);
          assert.equal(res.headers.status, 201);
        }
      }
    }
  }).addBatch({
    "The User resource": {
      topic: function () {
        app.resources.User.get('juan', this.callback);
      },
      "with a key": {
        topic: function (user) {
          user.addKey('update', key, this.callback);
        },
        "then test the updateKey() method": {
          topic: function (res, user) {
            user.updateKey('update', '987654321098765432109876543210', this.callback);
          },
          "should update the key": function (err, response) {
            assert.isNull(err);
            assert.isObject(response);
            assert.ok(response.ok);
            assert.equal(response.headers.status, 201);
          }
        }
      }
    }
  }).addBatch({
    "The User resource": {
      "the getKey() method": {
        topic: function () {
          newuser.getKey('test-key', this.callback);
        },
        "should respond with the correct attachment": function (err, result) {
          assert.isNull(err);
          assert.equal(key, result.key);
        }
      },
      "the all() method": {
        topic: function () {
          app.resources.User.all(this.callback);
        },
        "should respond with all users": function (err, users) {
          assert.isNull(err);
          assert.isArray(users);
          assert.lengthOf(users, 10);
        }
      }
    }
  }).addBatch({
    "The User resource": {
      "the keynames() method": {
        topic: function () {
          app.resources.User.keynames(this.callback);
        },
        "should respond with all keynames": function (err, keynames) {
          assert.isNull(err);
          assert.isArray(keynames);
          assert.lengthOf(keynames, 2);
          assert.equal(keynames[0]._id, 'user/juan');
          assert.equal(keynames[1]._id, 'user/newuser');
        }
      },
      "the keys() method": {
        topic: function () {
          app.resources.User.keys(this.callback);
        },
        "should respond with all keys for all users": function (err, keys) {
          assert.isNull(err);
          assert.isArray(keys);
          assert.equal(keys.length, 2);
        }
      }
    }
  }).addBatch({
    "The User resource": {
      "the forgot() method": {
        topic: function () {
          app.resources.User.forgot('juan', { sendEmail: false }, this.callback);
        },
        "should respond with a 'shake'": function (err, user) {
          assert.isNull(err);
          assert.isObject(user);
          assert.equal(user.username, 'juan');
          assert.ok(user.shake);
        }
      }
    }
  });
};
