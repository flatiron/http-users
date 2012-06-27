/*
 * auth.js: Utility functions for performing HTTP basic auth.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var director = require('director'),
    basicAuthParser = require('basic-auth-parser'),
    hash = require('node_hash');

var auth = exports;

var UserStrategy = auth.UserStrategy = function (options) {
  this.app = options.app;
};

function forbidden(message, callback) {
  return callback(new director.http.Forbidden(message));
}

function notAuthorized(message, callback) {
  return callback(new director.http.NotAuthorized(message));
}

UserStrategy.prototype.authenticate = function (req, callback) {
  if (!req.headers.authorization) {
    return notAuthorized('Authorization header is required', callback);
  }

  var auth = basicAuthParser(req.headers.authorization);

  if (auth.scheme !== 'Basic') {
    return forbidden('Authorization scheme must be `Basic`', callback);
  }
  else if (typeof auth.username !== 'string' || typeof auth.password !== 'string') {
    return forbidden('Both username and password are required', callback);
  }

  auth.username = auth.username.toLowerCase();

  //
  // Get the user from CouchDB
  //
  this.app.resources.User.get(auth.username, function (err, user) {
    if (err) {
      return (err.error === 'not_found') 
        ? forbidden(auth.username + ' not found', callback)
        : callback(err);
    }

    //
    // Perform one-way hash on incoming password with stored salt to determine if login is correct
    //
    var checksum = hash.md5(auth.password, user['password-salt']);

    if (user.username.toLowerCase() === auth.username && user.password === checksum) {
      //
      // If the username and password match the provided username and checksum
      // then authorize the user.
      //
      callback(null, user);
    }
    else {
      //
      // They do not match, so do not authorize them.
      //
      notAuthorized('Authorization failed with the provided credentials.', callback);
    }
  });
};

UserStrategy.prototype.authorize = function (req, perm, callback) {
  var self = this,
      auth = basicAuthParser(req.headers.authorization);

  auth.username = auth.username.toLowerCase();

  //
  // Check if the user can do the action requested
  //
  this.app.resources.User.can(auth.username, perm, true, function (err) {
    if (err) {
      return forbidden(err, callback);
    }
    return callback(null, true);
  });
};