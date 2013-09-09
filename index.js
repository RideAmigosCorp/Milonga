module.exports = function (app) {

  app.resource = function (path, model, middleware) {

    if (!middleware) { middleware = []; }

    app.get(path + '/:id', middleware, function (req, res, next) {
      
      if(req.params.hasOwnProperty('id') && req.params.id != null){
          model.findById(req.params.id, function (err, instance) {
            if (err) { return next(err); }
              res.json(instance);
          });
      }
      else
      {
        model.find({},function (err, results) {
            if (err) { return next(err); }
            
            res.json(results);
        });
      }
      

    });


    app.post(path, middleware, function (req, res, next) {
      model.create(req.body, function (err, instance) {
        if (err) { throw(err); return next(err); }
        res.json(201, instance);
      });
    });


    app.put(path + '/:id', middleware, function (req, res, next) {
      var conditions = { _id: req.params.id }
        , attrs = req.body;

      model.update(conditions, attrs, function (err, instance) {
        if (err) { return next(err); }
        res.json(instance);
      });
    });


    app.del(path + '/:id', middleware, function (req, res, next) {
      model.remove({ _id: req.params.id }, function (err) {
        if (err) { return next(err); }
        res.send(204);
      });
    });


  };

};