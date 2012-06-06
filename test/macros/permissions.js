

var assert = require('assert'),
    async = require('flatiron').common.async,
    path = require('path');
    
exports.shouldBeAble = function (app, resource, perm, value) {
  return function () {
    assert.isTrue(app.resources.Permission.can(resource, perm, value));
  }
};

exports.shouldError = function (app, username, perm, value, method, error) {
  return {
    topic: updatePermissions(app, username, perm, value, method),
    "should respond with the appropriate error": function (_, err) {
      assert.isObject(err);
      assert.equal(err.error || err.message, error);
    }
  };
};

exports.shouldAllow = function (app, username, perm, value, expected) {
  return {
    topic: updateAndGetPermissions(app, username, perm, value, 'allow'),
    "should add the permission to the resource": function (err, user) {
      assert.isNull(err);
      
      if (!value) {
        assert.equal(user.permissions[perm], value || true);
      }
      else {
        assert.include(user.permissions[perm], value);
      }
      
      if (expected) {
        assert.deepEqual(user.permissions[perm], expected);
      }
    }
  }
}

exports.shouldDisallow = function (app, username, perm, value, expected) {
  if (typeof value === 'undefined') {
    value = false;
  }
  
  return {
    topic: updateAndGetPermissions(app, username, perm, value, 'disallow'),
    "should remove the permission from the resource": function (err, user) {
      assert.isNull(err);
      
      if (Array.isArray(user.permissions[perm])) {
        assert.isTrue(!!user.permissions[perm].length);
        assert.equal(user.permissions[perm].indexOf(value), -1);
      }
      else if (!value) {
        assert.equal(user.permissions[perm], value);
      }
      
      if (expected) {
        assert.deepEqual(user.permissions[perm], expected);
      }
    }
  }
}

function updateAndGetPermissions(app, username, perm, value, method) {
  return function () {
    async.waterfall([
      function getUser(next) {
        app.resources.User.get(username, next);
      },
      function addPermission(user, next) {
        app.resources.Permission[method](user, perm, value, next);
      },
      function getUserAgain(_, next) {
        app.resources.User.get(username, next);
      }
    ], this.callback);
  }
};

function updatePermissions(app, username, perm, value, method) {
  return function () {
    async.waterfall([
      function getUser(next) {
        app.resources.User.get(username, next);
      },
      function addPermission(user, next) {
        app.resources.Permission[method](user, perm, value, next);
      }
    ], this.callback.bind(this, null));
  }
}