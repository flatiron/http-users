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

var UserStrategy = auth.UserStrategy = function () {
};

UserStrategy.prototype.authenticate = function (req, callback) {
  function forbidden(message) {
    callback(new director.http.Forbidden(message));
  }

  function notAuthorized(message) {
    callback(new director.http.NotAuthorized(message));
  }

  if (!req.headers.authorization) {
    return notAuthorized('Authorization header is required');
  }

  var auth = basicAuthParser(req.headers.authorization);

  if (auth.scheme !== 'Basic') {
    return forbidden('Authorization scheme must be `Basic`');
  }
  else if (typeof auth.username !== 'string' || typeof auth.password !== 'string') {
    return forbidden('Both username and password are required');
  }

  auth.username = auth.username.toLowerCase();

  //
  // Get the user from CouchDB
  //
  app.resources.User.get(auth.username, function (err, user) {
    if (err) {
      return (err.error === 'not_found') ? callback() : callback(err);
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
      callback();
    }
  });
};
