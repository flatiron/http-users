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
  app.router.param(':perm', /([\w\s\-]+)/);
  
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
    this.string('type', { 
      required: true,
      enum: ['boolean', 'array']
    });

    this.timestamps();    
    this.restful = {
      param: ':perm'
    };

    //
    // Setup create and update hooks for creating password salt
    //
    ['create', 'update'].forEach(function (method) {
      self.before(method, function (perm, callback) {
        if (perm._id) {
          perm.name = perm._id;
        }
        else if (perm.name) {
          perm._id = perm.name;
        }
        else {
          return callback(new Error('_id or name are required'));
        }
        
        callback();
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
          emit(doc._id, { _id: doc._id });
        }
      }
    });
  });
  
  //
  // ### function allow (resource, id, value, callback)
  // #### @resource {resourceful.Resource} Resource to allow for `id`.
  // #### @id {string} Id of the permission to allow
  // #### @value {boolean|string} **Optional** Value to allow for `id`.
  // #### @callback {function} Continuation to respond to when complete
  // Allows the permission with the specified `id` and `value` to the `resource`.
  //
  Permission.allow = function (resource, id, value, callback) {
    if (!callback && typeof value === 'function') {
      callback = value;
      value = true;
    }
    
    this.get(id, function (err, perm) {
      return err
        ? callback(err)
        : perm.allow(resource, value, callback);
    });
  };
  
  //
  // ### function allow (resource, id, value, callback)
  // #### @resource {resourceful.Resource} Resource to allow for this instance.
  // #### @value {boolean|string} **Optional** Value to allow for this instance.
  // #### @callback {function} Continuation to respond to when complete
  // Allows this instance and `value` for the `resource`.
  //
  Permission.prototype.allow = function (resource, value, callback) {
    if (!callback && typeof value === 'function') {
      callback = value;
      value = false;
    }
    
    value = value || true;
    resource.permissions = resource.permissions || {};
    
    //
    // Check to ensure the value being set on the resource is valid
    //
    if (!this.validValue(value)) {
      return callback(new Error(value + ' is not valid for ' + this.type + ' permission'));
    }
    
    if (this.type === 'boolean') {
      resource.permissions[this.name] = true;
    }
    else if (this.type === 'array') {
      if (!Array.isArray(resource.permissions[this.name])) {
        resource.permissions[this.name] = [value];
      }
      else {
        resource.permissions[this.name].push(value);
      }
    }
    
    resource.update({ permissions: resource.permissions }, callback);
  };
  
  //
  // ### function disallow (resource, id, value, callback)
  // #### @resource {resourceful.Resource} Resource to disallow for `id`.
  // #### @id {string} Id of the permission to disallow
  // #### @value {boolean|string} **Optional** Value to disallow for `id`.
  // #### @callback {function} Continuation to respond to when complete
  // Removes the permission with the specified `id` and `value` from the `resource`.
  //
  Permission.disallow = function (resource, id, value, callback) {
    if (!callback && typeof value === 'function') {
      callback = value;
      value = false;
    }
    else if (typeof value === 'undefined') {
      value = false;
    }
    
    this.get(id, function (err, perm) {
      return err
        ? callback(err)
        : perm.disallow(resource, value, callback);
    })
  };
  
  //
  // ### function disallow (resource, id, value, callback)
  // #### @resource {resourceful.Resource} Resource to disallow for `id`.
  // #### @value {boolean|string} **Optional** Value to disallow for `id`.
  // #### @callback {function} Continuation to respond to when complete
  // Removes this instance and `value` from the `resource`.
  //
  Permission.prototype.disallow = function (resource, value, callback) {
    if (!callback && typeof value === 'function') {
      callback = value;
      value = false;
    }
    else if (typeof value === 'undefined') {
      value = false;
    }
    
    //
    // Check to ensure the value being set on the resource is valid
    //
    if (!this.validValue(value)) {
      return callback(new Error(value + ' is not valid for ' + this.type + ' permission'));
    }
    
    var valueIndex;
    
    resource.permissions = resource.permissions || {};
    
    if (this.type === 'boolean') {
      resource.permissions[this.name] = value;
    }
    else if (this.type === 'array') {
      valueIndex = resource.permissions[this.name].indexOf(value);
      
      if (~valueIndex) {
        resource.permissions[this.name].splice(valueIndex, 1);
      }
      
      if (!resource.permissions[this.name].length) {
        delete resource.permissions[this.name];
      }
    }
    
    resource.update({ permissions: resource.permissions }, callback);
  };
  
  //
  // ### function can (resource, id, value)
  // #### @resource {Object} Object to ensure `id` and `value` are allowed.
  // #### @id {string} Id of the permission to validate
  // #### @value {boolean|string} **Optional** Permission value to validate
  // Validates that the `resource` has permission for the specified `id`
  // and `value`.
  //
  Permission.can = function (resource, id, value) {
    if (!resource.permissions || !resource.permissions[id]) {
      return false;
    }
    
    var target = resource.permissions[id];
    
    if (!value || !Array.isArray(target)) {
      return true;
    }
    
    return target.some(function (t) {
      return (new RegExp('^' + t.replace(/\*/, '(?:.*)') + '$', 'i')).test(value);
    });
  };
  
  //
  // ### function can (resource, id, value)
  // #### @resource {Object} Object to ensure this instance and `value` are allowed.
  // #### @value {boolean|string} **Optional** Permission value to validate
  // Validates that the `resource` has permission for this instance and `value`.
  //
  Permission.prototype.can = function (resource, value) {
    return Permission.can(resource, this.name, value);
  };
  
  //
  // ### function validValue (value)
  // #### @value {boolean|string} Value to ensure is valid.
  // Returns a value indicating whether the specified `value` is 
  // valid for this instance based on `this.type`.
  //
  Permission.prototype.validValue = function (value) {
    switch (typeof value) {
      case 'string':
        return this.type === 'array';
      case 'boolean': 
        return this.type === 'boolean';
      default:
        return false;
    }
  };
};