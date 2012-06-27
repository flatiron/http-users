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
     email: "shaketest@nodejitsu.com",
  },
];