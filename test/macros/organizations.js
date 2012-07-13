/**
 * macros/organizations.js
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    hash = require('node_hash'),
    macros = require('./index');

var key = '012345678901234567890123456789',
    neworg;

module.exports = function (suite, app) {
  return suite
    .addBatch(macros.requireStart(app))
    .addBatch(macros.destroyDb(app))
    .addBatch(macros.seedDb(app))
    .addBatch({
    "The Organization resource": {
      "the create() method": {
        topic: function () {
          app.resources.Organization.create({
            _id: 'organization/devjitsu3',
            name: 'devjitsu3',
            owner: 'charlie',
            members: ['charlie']
          }, this.callback)
        },
        "should respond with the appropriate object": function (err, org) {
          neworg = org;

          assert.isNull(err);
          assert.isObject(org);
          assert.equal(org.name, 'devjitsu3');
          assert.equal(org.owner, 'charlie');
          assert.lengthOf(org.members, 1);
        }
      },
      "the available() method": {
        "with an unused name": {
          topic: function () {
            app.resources.Organization.available('non-existent', this.callback);
          },
          "should respond available": function (err, res) {
            assert.isNull(err);
            assert.ok(res);
          }
        },
        "with an used name": {
          topic: function () {
            var self = this;
            app.resources.Organization.create({
              _id: 'organization/devjitsu',
              name: 'devjitsu'
            }, function () {
              app.resources.Organization.available('devjitsu', self.callback);
            })
          },
          "should said unavailable": function (err, res) {
            assert.isNull(err);
            assert.isFalse(res);
          }
        }
      }
    }
  });
};
