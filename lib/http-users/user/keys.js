/*
 * keys.js: Resource extensions and routes for working with SSH keys.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var async = require('flatiron').common.async;

//
// ### function resource (app)
// #### @app {flatiron.App} Application to extend User resource
//
// Extends the User resource for the `app` with functionality working
// with SSH keys.
//
exports.resource = function (app) {
  //
  // Configure the `:keyid` parameter to the proper regexp
  //
  app.router.param(':keyid', /([\w\-\.]+)/);
  
  //
  // Grab the `User` resource from the `app`.
  //
  var User = app.resources.User;
  
  //
  // Setup `keynames` view and Factory method.
  //
  User.filter('keynames', {
    map: function (doc) {
      if (doc.resource === 'User' && doc._attachments) {
        for (var key in doc._attachments) {
          emit(doc._id, { 
            _id: doc._id, 
            username: doc.username, 
            keyname: key
          });
        }
      }
    }
  });

  User.keynames = function (username, callback) {
    if (!callback && typeof username === 'function') {
      callback = username;
      username = null;
    }

    var params = username
      ? { key: 'user/' + username }
      : {};

    this.connection.view([this.resource, 'keynames'].join('/'), params, function (err, keynames) {
      return err ? callback(err) : callback(null, keynames);
    });
  };
  
  //
  // ### function keys (username, callback)
  // #### @username {string} **Optional** User to retrieve all keys for.
  // #### @callback {function} Continuation to respond to when compelte.
  // Returns all keys for the specified `user` retreived through CouchDB attachments.
  // If no username is specified then keys for all users will be returned.
  //
  User.keys = function (username, callback) {
    if (!callback && typeof username === 'function') {
      callback = username;
      username = null;
    }

    var self = this,
        keys = [];

    function getKey(info, next) {
      var data = '',
          res;

      res = self.connection.connection.getAttachment(info._id, info.keyname);

      res.on('error', function (err) {
        //
        // Suppress errors, maybe retry?
        //
      });

      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        keys.push({
          username: info.username,
          name: info.keyname.split('/')[1],
          key: data
        });
        
        next();
      });
    }

    this.keynames(username, function (err, keynames) {
      if (err) {
        return callback(err);
      }

      async.forEach(keynames, getKey, function () {
        callback(null, keys);
      });
    });
  };
  
  //
  // ### function addKey | updateKey (name, data, callback)
  // #### @name {string} **Optional** Name of the key to add or update.
  // #### @data {string} Data to use for the CouchDB attachment.
  // #### @callback {function} Continuation to respond to when compelte.
  // Adds a key with the specified `name` and `data` to this user resource.
  // If no `name` is supplied, `publicKey` will be used.
  //
  User.prototype.addKey = User.prototype.updateKey = function (name, data, callback) {
    if (arguments.length === 2) {
      callback = data;
      data = name;
      name = 'publicKey';
    }

    var self = this;

    function onComplete(err, res) {
      if (!err && self.constructor.connection.cache.has(self._id)) {
        self.constructor.connection.cache.store[self._id]._rev = res.rev;
      }

      return err
        ? callback(err)
        : callback(null, res);
    }

    this.constructor.connection.connection.saveAttachment({
        id: this._id,
        rev: this._rev,
      }, {
        name: 'keys/' + name,
        contentType: 'text/plain',
        body: data
      },
      onComplete
    );
  };

  //
  // ### function getKey (name, callback)
  // #### @name {string} **Optional** Name of the key to add or update.
  // #### @callback {function} Continuation to respond to when compelte.
  // Retreives the key with the specified `name` for this user resource.
  // If no `name` is supplied, `publicKey` will be used.
  //
  User.prototype.getKey = function (name, callback) {
    if (!callback && typeof name === 'function') {
      callback = name;
      name = 'publicKey';
    }

    var self = this,
        data = '',
        err,
        res;

    res = this.constructor.connection.connection.getAttachment(this._id, 'keys/' + name);
    res.on('error', function (err) {
      callback(err);
    });

    res.on('data', function (chunk) {
      data += chunk;
    });

    res.on('end', function () {
      try {
        err = JSON.parse(data);
      }
      catch (ex) {
        //
        // Do nothing on error
        //
      }
      
      if (err) {
        return callback(err);
      }

      callback(null, {
        name: name,
        username: self.username,
        key: data
      });
    });
  };
};

//
// ### function routes (app)
// #### @app {flatiron.App} Application to extend with routes
//
// Extends the target `app` with routes for working with SSH keys.
//
exports.routes = function (app) {
  //
  // Setup RESTful web service for `/users/:username/keys`
  //
  app.router.path('/users/:username/keys', function () {
    //
    // List Keys: GET to `/users/:username/keys` returns list of all public keys
    //            for all users.
    //
    this.get(function () {
      var res = this.res;
      app.resources.User.keys(function (err, keys) {
        return err
          ? res.json(500, err)
          : res.json(200, { keys: keys });
      });
    });

    //
    // List Keys: GET to `/users/:userid/keys` returns the value
    //            of the CouchDB attachment.
    //
    this.get('/:keyid', function (id, keyname) {
      var res = this.res;

      app.resources.User.keys(id, function (err, keys) {
        return err
          ? res.json(500, err)
          : res.json(200, { keys: keys });
      });
    });

    //
    // Get Key: GET to `/users/:userid/keys/:keyid` returns the value
    //          of the CouchDB attachment.
    //
    this.get('/:keyid', function (id, keyname) {
      var res = this.res;
      app.resources.User.get(id, function (err, user) {
        if (err) {
          return res.json(500, err);
        }

        user.getKey(keyname, function (err, data) {
          return err ? res.json(500, err) : res.json(200, { key: data });
        });
      });
    });

    //
    // Add / Update Key: POST to `/keys/:username/:keyname` updates the
    //                   value of the CouchDB attachment.
    //
    function addOrUpdateKey(id, keyname, callback) {
      if (arguments.length === 2) {
        callback = keyname;
        keyname = 'publicKey';
      }

      var res = this.res,
          data = this.req.body;

      if (!data) {
        return res.json(400, new Error('Body required'));
      }
      if (!data.key || data.key.length < 32) {
        return res.json(400, new Error('Invalid key'));
      }

      app.resources.User.get(id, function (err, user) {
        if (err) {
          return res.json(500, err);
        }

        user.addKey(keyname, data.key, function (err) {
          return err ? res.json(500, err) : res.json(201);
        });
      });
    }

    //
    // POST /users/:userid/keys/:keyid
    //
    this.put('/:keyid', addOrUpdateKey);

    //
    // POST /users/:userid/keys
    //
    this.post(addOrUpdateKey);
  });
};
