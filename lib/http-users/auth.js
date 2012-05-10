/*
 * auth.js: Utility functions for performing HTTP basic auth.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var director = require('director'),
    hash = require('node_hash'),
    base64 = require('flatiron').common.base64;

var auth = exports;

//
// ### function basicAuth (..., callback)
// #### @callback {function} The callback function continuing the director chain
// Performs HTTP Basic Authorization using Journey 0.3.0. This is naive
// on/off authorization that doesn't include any role-based authorization.
//
auth.create = function (app) {
  return function () {
    function forbidden(message) {
      callback(new director.http.Forbidden(message));
    }

    function notAuthorized(message) {
      callback(new director.http.NotAuthorized(message));
    }

    var args = Array.prototype.slice.call(arguments),
        callback = typeof args[args.length - 1] === 'function' && args.pop(),
        request = this.req,
        authorization = request.headers.authorization,
        realm = "Authorization Required",
        credentials,
        decoded,
        scheme,
        parts;

    if (!authorization) {
      return notAuthorized("Authorization header is required.");
    }

    // Parse the authorization header for `(Scheme)\s{1}(username)\:(password)`
    parts         = authorization.split(" ");            // Basic salkd787&u34n=
    scheme        = parts[0];                            // Basic
    decoded       = base64.decode(parts[1]);             // admin:password || null
    credentials   = decoded && decoded.split(":");       // ['admin', 'password'] || null

    if (scheme !== "Basic") {
      return forbidden("Authorization scheme must be 'Basic'");
    }
    else if (typeof credentials[0] !== 'string' || typeof credentials[1] !== 'string') {
      return forbidden("Both username and password are required");
    }

    credentials[0] = credentials[0].toLowerCase();

    //
    // Get the user from CouchDB
    //
    app.resources.User.get(credentials[0], function (err, user) {
      if (err) {
        return forbidden('Authorization failed with the provided credentials.');
      }

      //
      // Perform one-way hash on incoming password with stored salt to determine if login is correct
      //
      var checksum = hash.md5(credentials[1], user['password-salt']);

      if (user.username.toLowerCase() === credentials[0] && user.password === checksum) {
        //
        // If the username and password match the provided username and checksum
        // then authorize the user.
        //
        request.user = user;
        callback(null);
      }
      else {
        //
        // They do not match, so do not authorize them.
        //
        forbidden('Authorization failed with the provided credentials.');
      }
    });
  }
};