/*
 * auth.js: Utility functions for performing HTTP basic auth.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var director = require('director'),
    basicAuthParser = require('basic-auth-parser'),
    hash = require('node_hash');

//
// ### function UserStrategy (options)
// #### @options {Object} Options for this instance. Must contain the `.app` property.
//
// Constructor function for the UserStrategy object responsible for authenticating
// and authorizing users.
//
var UserStrategy = exports.UserStrategy = function (options) {
  this.app = options.app;
};

//
// ### function authenticate (req, callback)
// #### @req {http.IncomingRequest|union.RequestStream} Request to authenticate against
// #### @callback {function} Continuation to respond to when complete.
//
// Attempts to authenticate the target `req` using the User resource and 
// HTTP Basic Auth.
//
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
  // If this `req` has already been authenticated then simply respond.
  //
  if (req.user && req.user.username === auth.username) {
    return callback(null, req.user);
  }

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

    if (user.status !== 'active') {
      //
      // If the user is not yet active, do not authorize them.
      //
      notAuthorized('User ' + auth.username + ' is not yet active.');
    }
    else if (user.username.toLowerCase() === auth.username && user.password === checksum) {
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

//
// ### function authorize (req, perm, value)
// #### @req {http.IncomingRequest|union.RequestStream} Request to authorize against
// #### @perm {string} Permission to ensure exists
// #### @value {string|boolean} **Optional** Value to ensure on the target permission.
//
// Attempts to authorize the target `req` against the specified `perm` and `value`
// using the User resource.
//
UserStrategy.prototype.authorize = function (req, perm, value) {
  value = value || true;
  
  //
  // If there is no `user` property on the request then 
  // respond that the user it not authorized.
  //
  if (!req.user) {
    return new director.http.Forbidden('You are not logged in.');
  }

  //
  // Check if the user can do the action requested
  //
  if (!req.user.can(perm, value)) {
    return new director.http.Forbidden('Missing permissions: ' + perm);
  }

  return true;
};

//
// ### @private function forbidden (message, callback)
// Helper function for responding with `director.http.Forbidden`.
//
function forbidden(message, callback) {
  return callback(new director.http.Forbidden(message));
}

//
// ### @private function notAuthorized (message, callback)
// Helper function for responding with `director.http.NotAuthorized`.
//
function notAuthorized(message, callback) {
  return callback(new director.http.NotAuthorized(message));
}