/*
 * confirm.js: Resource extensions and routes for confirming users.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var uuid = require('node-uuid');
 
//
// ### function resource (app)
// #### @app {flatiron.App} Application to extend User resource
//
// Extends the User resource for the `app` with user confirmation functionality.
//
exports.resource = function (app) {
  //
  // Grab the `User` resource from the `app`.
  //
  var User = app.resources.User;
  
  //
  // Setup the filter for finding users by inviteCode.
  //
  User.filter('byInviteCode', { include_docs: true }, {
    map: function (doc) {
      if (doc.resource === 'User' && doc.inviteCode) {
        emit(doc.inviteCode, {_id: doc._id });
      }
    }
  });
  
  //
  // ### function confirm (username, creds, callback)
  // #### @username {string} Username to confirm status of.
  // #### @creds {Object} Properties to use when checking the inviteCode.
  // #### @callback {function} Continuation to respond to.
  //
  // Sets the status of the `username` specified if the user making the 
  // request has appropriate permissions or if the appropriate inviteCode 
  // is supplied in `creds`.
  //
  User.prototype.confirm = function (username, creds, callback) {
    if (!callback && typeof creds === 'function') {
      callback = creds;
      creds = username;
      username = null;
    }
    
    //
    // Updates the `status` of the `target` user along with the timestamp
    // when they were confirmed.
    //
    function updateStatus(target, status) {
      var update = { 
        status: status || 'pending',
        'confirm-time': +Date.now()
      };

      // TODO: Is this chunk of code necessary? It looks like a hack to get
      // around inviteCodes not being set during the create step (which is
      // now fixed).
      if (target.status === 'new' && update.status === 'pending') {
        update.inviteCode = uuid.v4();
      }

      //
      // `resourceful` updates don't update the User object (this is a bug).
      // We get around this (for now) by updating them by-hand.
      //
      Object.keys(update).forEach(function (k) {
        target[k] = update[k];
      });
      
      User.update(target.username, update, function (err, res) {
        if (err) {
          return callback(err);
        }

        //
        // If the new status is "pending", we need to send an email.
        //
        if (target.status === 'pending' && app.mailer && app.mailer.sendConfirm) {
          return app.mailer.sendConfirm(target, function (err) {
            return err ? callback(err) : callback(null, target);
          });
        }
        
        callback(null, target);
      });
    }
    
    if (!username && !creds.inviteCode) {
      //
      // An invite code was not provided and the user is 
      // attempting to confirm themselves.
      //
      return callback(new Error('Invalid Invite Code'));
    }
    else if (this.can('modify users')) {
      //
      // Confirmation by the superuser results in the user status being upgraded
      // by one level.
      //
      // * user.status == 'new': Unconfirmed users will be in a state of
      // 'new' so we upgrade them to a status of 'pending'.
      //
      // * user.status == 'pending': Unconfirmed users will be in a state of
      // 'pending' so we upgrade them to a status of 'active'.
      //
      User.get(username, function (err, user) {
        if (err) {
          return callback(err);
        }

        var status = user.status == 'pending' ? 'active' : 'pending';

        updateStatus(user, status);
      });
    }
    else if (creds.inviteCode) {
      //
      // In order for a user to become active on their own they must provide the invite
      // code (i.e. confirmation code) for their account to prove that they are human.
      //
      // Attempt to switch the user to "active".
      //
      User.byInviteCode(creds.inviteCode, function (err, users) {
        if (err) {
          return callback(err);
        }

        if (users.length > 0) {
          //
          // We found a user who matched the invite code, so we will set them to
          // 'active' in the database.
          //
          updateStatus(users[0], 'active');
        }
        else {
          //
          // We did not find any users who matched that invite code, consider it invalid
          //
          return callback(new Error('Invalid Invite Code'));
        }
      });
    }
    else {
      //
      // Otherwise, something when wrong so just Error back.
      //
      return callback(new Error('Invalid Invite Code'));
    }
  };
};

//
// ### function routes (app)
// #### @app {flatiron.App} Application to extend with routes
//
// Extends the target `app` with routes for confirming inactive users.
//
exports.routes = function (app) {

  var User = app.resources.User;

  app.unauthorized.path('/users', function () {
    //
    // Activate user account: Shortcut method for confirming new accounts
    //
    this.post('/:username/confirm', function (id) {
      //
      // Attempt to authenticate with the user provided
      // Remark (indexzero): Is passing null for `body` bad here?
      //
      var req = this.req,
          res = this.res,
          data = req.body;

      app.requireAuth.call({ req: req }, function (err) {
        User.get(id, function (err, user) {
          if (err) {
            return res.json(400, { error: err.message });
          }
          var authority = req.user || user;
          authority.confirm(id, data, function (err, user) {
            if (err) {
              return res.json(400, { error: err.message });
            }

            //
            // If the user does not have a password set, send them
            // one now.
            //
            if (typeof user.password === 'undefined') {
              User.forgot(id, { sendEmail: false }, function (err, user) {
                res.json(200, {
                  message: 'Your ninja status has been confirmed!',
                  shake: user.shake,
                  hasPassword: false
                });
              });
            }
            else {
              //
              // User has already set a password for their account
              //
              res.json(200, {
                message: 'Your ninja status has been confirmed!',
                hasPassword: true
              });
            }
          });
        });
      });
    });
  });
};
