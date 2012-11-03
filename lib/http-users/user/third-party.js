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
          tokenForId = thirdPartyTokens[i];
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
        // Try not to confuse our users
        // This would be the previous operation, which is strange
        //
        tokenForId.operation = "delete";

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
    // Check for provider, its mandatory
    //
    if(!options.token.provider) {
      return callback(new Error("No token provider in the object."));
    }

    //
    // Check for token, its mandatory
    //
    if(!options.token.token) {
      return callback(new Error(
        "No provider token was provided in the object."));
    }

    //
    // Add them to object
    // Override if it must; consolidate.
    //
    // Thing declared uppermost wins
    // If not value on token wins
    // If nothing, we use the sensible defaults defined on lines below
    //
    // `options.token` has all the important information,
    // check for `options.token.id` not `options.id`
    //
    // Like, seriously.
    //
    options.token.id = options.id || options.token.id;
    options.token.app = options.app || options.token.app;

    //
    // Id is required
    // So create it if it doesnt exit
    //
    if(!options.token.id) {
      options.token.id = uuid.v4();
    }

    //
    // App is required
    // Defaults to `*`, meaning any app can use this token
    //
    if(!options.token.app) {
      options.token.app = "*"; // Any will do
    }

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
        if(thirdPartyTokens[i].id === options.token.id) {
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
  // This only returns tokens that can be used accross different applications
  // This means where app === "*"
  //
  app.router.path('/users/:username/thirdparty', function () {
    function listThirdPartyTokens(username, appId, cb) {
      if (typeof appId === "function") {
        cb = appId;
        appId = null;
      }

      var res = this.res,
          authMethod = this.req.user.authMethod;

      //
      // If you are not using username and password auth
      //
      if(authMethod.method !== "username/password") {
        //
        // Fuck off
        //
        return res.json(403, new Error("Not authorized to list 3rd party" +
          " tokens unless you authenticate with username and password"));
      }

      app.resources.User.thirdPartyTokens(username, function (err, tokens) {
        //
        // Return if there is an error
        //
        if(err) {
          return res.json(500, err);
        }

        //
        // Lets collect only the ones that apply to all applications
        //
        var filteredTokens = tokens.thirdPartyTokens.filter(function (token) {
          //
          // Wildcarded or matches the currently requested app
          //
          return token.app === "*" || (appId && token.app === appId);
        });

        return res.json(200, filteredTokens);
      });
    }

    //
    // List Tokens: GET to `/users/:username/thirdParty` returns list
    //              of external tokens for the user.
    //
    this.get(listThirdPartyTokens);

    //
    // List Tokens: GET to `/users/:username/thirdParty/app/:app` returns list
    //              of external tokens for the user
    //
    this.get('/app/:app', listThirdPartyTokens);

    //
    // DELETE /users/:userid/thirdParty/:id
    //
    this.delete('/:id', function deleteThirdPartyToken(username, id, cb) {
      var res = this.res;

      app.resources.User.deleteThirdPartyToken(username, id,
      function (err, deleted) {
        return err 
             ? res.json(500, err)
             : res.json(201, { ok: true, id: id, deleted: deleted });
      });
    });

    //
    // POST /users/:userid/thirdParty
    //
    // Add / Update Token: POST to `/users/:username/thirdParty/:id` 
    // adds/modified a new token to the 3rd party token array.
    //
    this.post(function addOrUpdateThirdPartyToken(username, callback) {
      var res = this.res,
          body = this.req.body,
          options = {};

      if(!body) {
        return res.json(400, new Error("You need to provide an body"));
      }

      //
      // The three things people can set up
      //
      options.id    = body.id  || body.token && body.token.id;
      options.app   = body.app || body.token && body.token.app;
      options.token = body.token;

      app.resources.User.addThirdPartyToken(username, options,
      function (err, newToken) {
        return err ? res.json(500, err) : res.json(201, newToken);
      });

    });
  });
};
