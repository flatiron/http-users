module.exports = [
  {
     resource: "User",
     username: "charlie",
     password: "1234",
     email: "charlie.robbins@gmail.com",
     status: "active",
     permissions: {
       "modify permissions": true,
       "modify users": true
     }
  },
  {
     resource: "User",
     username: "marak",
     password: "1234",
     email: "marak.squires@gmail.com",
     status: "active"
  },
  {
     resource: "User",
     username: "elijah",
     password: "1234",
     email: "tmpvar@gmail.com",
     status: "active"
  },
  {
     resource: "User",
     username: "shaketest",
     password: "1234",
     shake: "q6L3D0A4falo8DSpgTNzrJ",
     email: "shaketest@nodejitsu.com"
  },
  {
    resource: "User",
    username: "maciej",
    password: "1234",
    inviteCode: "1337",
    email: "me@mmalecki.com",
    status: "new"
  },
  {
    resource: "User",
    username: "daniel",
    password: "1234",
    inviteCode: "h4x0r",
    email: "cronopio@nodejitsu.com",
    status: "new"
  },
  {
    resource: "User",
    username: "testconfirm",
    password: "1234",
    inviteCode: "must-have-this",
    email: "testconfirm@testing.com",
    status: "new"
  },
  {
    resource: "User",
    username: "chjj",
    password: "1234",
    inviteCode: "loudnoises",
    email: "chjj@nodejitsu.com",
    status: "active"
  }
];
