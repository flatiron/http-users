/*
 * permission.js: Permission resource for managing user permissions.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    resourceful = require('resourceful'),
    common = require('flatiron').common,
    async = common.async;

module.exports = function (app) {
  //
  // Define the `Permission` resource
  //
  var Permission = app.resources.Permission = resourceful.define('Permission', function () {
    var self = this;

    //
    // Setup properties
    //
    this.string('_id').unique(true).sanitize('lower').prefix('permission/');
    this.string('name', { required: true });

    this.timestamps();

    //
    // Ensure the user modifying any permissions is 
    // allowed to do so.
    //
    ['get', 'create', 'update', 'destroy'].forEach(function (method) {
      self.before(method, function (obj, callback) {
        app.resources.User.can(obj.user, 'modify permissions', callback);
      });
    });

    //
    // Setup after hooks for logging core methods.
    //
    ['get', 'create', 'update', 'destroy'].forEach(function (method) {
      self.after(method, function (_, obj, callback) {
        app.emit(['permission', method], 'info', obj);
        callback();
      });
    });

    //
    // Create default views
    //
    this.filter('all', { include_docs: true }, {
      map: function (doc) {
        if (doc.resource === 'Permission') {
          emit(doc._id, {_id: doc._id });
        }
      }
    });
  });
  
  Permission.authorize = function (username, perm, value, callback) {
    //if (!callback && typeof value )
    
    //app.resources.User.can(username, )
  };
  
  Permission.deauthorize = function (username, perm, callback) {
    
  };
  
  Permission.can = function (source, perm, value) {
    if (!source.permissions || !source.permissions[perm]) {
      return false;
    }
    
    var target = source.permissions[perm];
    
    if (!value || !Array.isArray(target)) {
      return true;
    }
    
    return target.some(function (t) {
      return (new RegExp('^' + t + '$', 'i')).test(value);
    });
  }
};