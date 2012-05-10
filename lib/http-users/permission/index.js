


module.exports = function (app) {
  
  app.on('init', function () {
    require('./resource')(app);
    require('./routes')(app);
  })
};