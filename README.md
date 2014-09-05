# flatiron-http-users

Encapsulated routes and resources for managing users in [flatiron][0] HTTP apps

## Permissions

* "list all users"
* "modify permissions"
* "confirm users"

## Installation

### Installing npm (node package manager)

``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing flatiron-http-users

``` bash
  $ [sudo] npm install flatiron-http-users
```

## Run Tests
Tests are written in vows and give complete coverage of all APIs and storage engines.
If the admin party for CouchDB is set, the `AUTH` environment variable can be used to
pass custom credentials, in the form of `user:pwd`.

``` bash
  $ npm test                  # OR run
  $ AUTH=user:pwd npm test
```

# TODO

 - Make memory engine work ( `./fixtures/app/memory.js`)
 - Add support for Redis and MongoDB ( `./fixtures/app/mongodb.js`)  ( `./fixtures/app/redis.js`)

#### Author: [Charlie Robbins](http://nodejitsu.com)
#### License: MIT

[0]: http://flatironjs.org
[1]: http://github.com/flatiron/flatiron-http-users
[2]: http://github.com/flatiron/resourceful
[3]: http://github.com/flatiron/director