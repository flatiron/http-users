/*
 * third-party.js: Resource extensions and routes for working with 
 * external providor tokens
 *
 * E.g. Storing a github token that allows us access to github from this user
 *
 * (C) 2012, Nodejitsu Inc.
 *
 */

var uuid = require('node-uuid'),
    async = require('flatiron').common.async;

//
// ### function resource (app)
// #### @app {flatiron.App} Application to extend User resource
//
// Extends the User resource for the `app` with functionality working
// with third party auth tokens.
//
exports.resource = function (app) {

  //
  // Grab the `User` resource from the `app`.
  //
  var User = app.resources.User;
  
  //
  // ### function thirdPartyTokens (username, callback)
  // #### @callback {function} Continuation to respond to when complete.
  //
  // Returns all third party tokens for the specified `user`.
  //
  User.thirdPartyTokens = function (username, callback) {
    User.get(username, function (err, user) {
      if (err) {
        return callback(err);
      }

      var thirdPartyTokens = user.thirdPartyTokens || [];

      callback(null, {thirdPartyTokens: thirdPartyTokens});
    });
  };

  //
  // ### function deleteThirdPartyToken (name, data, callback)
  // #### @username  {string} Name of the user to update
  // #### @id        {string} Id of the token to delete.
  // #### @callback  {function} Continuation to respond to when complete.
  //
  // Delete a third party API token
  //
  User.deleteThirdPartyToken = function (username, id, callback) {
    //
    // Fetch the user so we can check for the token
    //
    User.get(username, function (err, user) {
      if (err) {
        return callback(err);
      }

      var thirdPartyTokens = user.thirdPartyTokens || [],
          tokenForId;

      //
      // Check each token for that id
      //
      for(var i in thirdPartyTokens) {
        if(thirdPartyTokens[i].id === id) {
          tokenForId = t;
          break;
        }
      }

      if(!tokenForId) {
        return callback(new Error("Can't delete token, it does not exist"));
      }

      //
      // Actually remove the token
      //
      thirdPartyTokens.splice(i, 1);

      //
      // Update the user document with the new `thirdPartyTokens`
      // We have now removed the `id` token
      //
      User.update(username, { thirdPartyTokens: thirdPartyTokens },
      function (err) {
        if (err) {
          return callback(err);
        }

        //
        // All done,
        // return the token that was removed from us
        //
        callback(null, tokenForId);
      });
    });
  };

  //
  // ### function addThirdPartyToken (username, tokenname, callback)
  // #### @username  {string} Name of the user to update
  // #### @options   {string} **Optional** Id and app.
  // #### @callback  {function} Continuation to respond to when complete.
  //
  // Adds/Updates an third party API Token
  //
  User.addThirdPartyToken = function (username, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    //
    // Id is required
    // So create it if it doesnt exit
    //
    if(!options.id) {
      options.id = uuid.v4();
    }

    //
    // App is required
    // Defaults to `*`, meaning any app can use this token
    //
    if(!options.app) {
      options.app = "*"; // Any will do
    }

    //
    // The actual token
    //
    // Normally something like:
    //
    // {
    //   provider: "github",
    //   token: "WATWAT",
    //   app: "fantasticapp", // or *
    //   info: { ... } // whatever they gave us back
    // }
    //
    if(!options.token) {
      return callback(new Error("No token was provided."));
    }

    //
    // Add them to object
    // Override if it must; consolidate.
    //
    options.token.id = options.id;
    options.token.app = options.app;

    //
    // Fetch the existing tokens and add the new one.
    // If tokens did not exist before create them
    //
    User.get(username, function (err, user) {
      if (err) {
        return callback(err);
      }

      //
      // Get our tokens
      //
      var thirdPartyTokens = user.thirdPartyTokens || [],
          selectedToken;

      //
      // Is this an update?
      // Give the problem back to the user if it fails
      //
      for(var i in thirdPartyTokens) {
        if(thirdPartyTokens[i].id === options.id) {
          selectedToken = options.token;
          break;
        }
      }

      //
      // Is this an update or insert?
      //
      if(selectedToken) {
        options.token.operation = "update";
        thirdPartyTokens[i] = options.token;
      } else {
        options.token.operation = "insert";
        thirdPartyTokens.push(options.token);
      }

      //
      // Update the user document with the new `thirdPartyTokens`
      //
      User.update(username, { thirdPartyTokens: thirdPartyTokens },
      function (err) {
        if (err) {
          return callback(err);
        }

        //
        // Return the token to the client, case he needs info
        // like auto generated id
        //
        callback(null, options.token);
      });
    });
  };
};

//
// ### function routes (app)
// #### @app {flatiron.App} Application to extend with routes
//
// Extends the target `app` with routes for working with third party
// tokens.
//
exports.routes = function (app) {
  //
  // Setup RESTful web service for `/users/:username/thirdParty`
  //
  app.router.path('/users/:username/thirdParty', function () {
    //
    // List Tokens: GET to `/users/:username/thirdParty` returns list
    //              of external tokens for the user.
    //
    this.get(function listThirdPartyTokens(username) {
      var res = this.res,
          authMethod = this.req.user.authMethod;

      app.resources.User.thirdPartyTokens(username, function (err, tokens) {
        //
        // If you are not using username and password auth
        //
        if(authMethod.method !== "username/password") {
          //
          // Return nothing
          //
          return res.json(403, new Error("Not authorized to list 3rd party" +
            " tokens unless you authenticate with username and password"));
        }

        return err
          ? res.json(500, err)
          : res.json(200, tokens);
      });
    });

    //
    // DELETE /users/:userid/thirdParty/:id
    //
    this.delete('/:id', function deleteThirdPartyToken(username, id, cb) {
      var res = this.res;

      app.resources.User.deleteThirdPartyToken(username, tokenname,
      function (err, deleted) {
        return err 
             ? res.json(500, err)
             : res.json(201, { ok: true, id: id, deleted: deleted });
      });
    });

    //
    // Add / Update Token: POST to `/users/:username/thirdParty/:id` 
    // adds/modified a new token to the 3rd party token array.
    //
    function addOrUpdateThirdPartyToken(username, id, callback) {
      var res = this.res,
          body = this.req.body,
          options = {};

      //
      // The three things people can set up
      //
      options.id    = id       || body.id    || body.token && body.token.id;
      options.app   = body.app || body.token && body.token.app;
      options.token = body.token;

      app.resources.User.addThirdPartyToken(username, options,
      function (err, newToken) {
        return err ? res.json(500, err) : res.json(201, newToken);
      });

    }

    //
    // POST /users/:userid/thirdParty/:id
    //
    this.put('/:id', addOrUpdateThirdPartyToken);

    //
    // POST /users/:userid/thirdParty
    //
    this.post(addOrUpdateThirdPartyToken);
  });
};
