/*
 * permission.js: Top-level include for the Permission resource for managing user permissions.
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
  // Require authentication for `/permissions`.
  //
  app.router.before(/\/permissions/, app.basicAuth);
  
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
    // this.bool('type', { required: true });
    // this.object('values');
    this.timestamps();

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
          emit(doc._id, { _id: doc._id });
        }
      }
    });
  });
  
  Permission.allow = function (resource, perm, value, callback) {
    if (!callback && typeof value === 'function') {
      callback = value;
      value = true;
    }
    
    value = value || true;
    resource.permissions = resource.permissions || {};
    
    if (typeof value === 'boolean') {
      resource.permissions[perm] = value;
    }
    else if (!Array.isArray(resource.permissions[perm])) {
      resource.permissions[perm] = [value];
    }
    else {
      resource.permissions[perm].push(value);
    }
    
    resource.update({ permissions: resource.permissions }, callback);
  };
  
  Permission.disallow = function (resource, perm, value, callback) {
    if (!callback && typeof value === 'function') {
      callback = value;
      value = false;
    }
    else if (typeof value === 'undefined') {
      value = false;
    }
    
    var valueIndex;
    
    resource.permissions = resource.permissions || {};
    
    if (!Array.isArray(resource.permissions[perm])
      || typeof value === 'boolean') {
      resource.permissions[perm] = value;
    }
    else {
      valueIndex = resource.permissions[perm].indexOf(value);
      
      if (~valueIndex) {
        resource.permissions[perm].splice(valueIndex, 1);
      }
      
      if (!resource.permissions[perm].length) {
        resource.permissions[perm] = false;
      }
    }
    
    resource.update({ permissions: resource.permissions }, callback);
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
      return (new RegExp('^' + t.replace(/\*/, '(?:.*)') + '$', 'i')).test(value);
    });
  }
};