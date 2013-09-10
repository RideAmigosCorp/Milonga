module.exports = function (app) {

  app.resource = function (path, model, middleware) {

    if (!middleware) { middleware = []; }

     app.get(path, middleware, function (req, res, next) {
        model.find({},function (err, results) {
            if (err) { return next(err); }
            res.json(results);
        });
      

    });

    app.get(path + '/:id', middleware, function (req, res, next) {
      
          model.findById(req.params.id, function (err, instance) {
            if (err) { return next(err); }
              res.json(instance);
          }); 

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
      model.findByIdAndRemove(req.params.id, function (err) {
        if (err) { return next(err); }
        res.send(204);
      });
    });

  };

  app.userResource = function (path, model, resourceUserIDField, sessionUserIDField, middleware) {

    if(!middleware)
        throw("Must include middleware for auth")

     app.get(path, middleware, function (req, res, next) {
        
        var params = {}
        params[resourceUserIDField] = req.user[sessionUserIDField];
       

        model.find(params,function (err, results) {
            if (err) { return next(err); }
            res.json(results);
        });
      

    });

    app.get(path + '/:id', middleware, function (req, res, next) {
        
          var params = {}
          // params[resourceUserIDField] = req.user[sessionUserIDField];
          params['_id'] = req.params.id;

          model.findOne(params, function (err, instance) {
            if (err) { return next(err); }

              if(instance == null){
                res.json(404);
              }
              else if(instance[resourceUserIDField] === req.user[sessionUserIDField])
              {
                res.json(instance);
              }
              else
              {
                res.json(403,{message:"Not owned by user:"+req.user[sessionUserIDField]})
              }
          }); 

    });


    app.post(path, middleware, function (req, res, next) {

      var newModel = new model(req.body);
      newModel.set(resourceUserIDField,req.user[sessionUserIDField]);
      
      newModel.validate(function(err,result){
          if(err){
            res.json(400,err);
            return;
          }

          newModel.save(function(err,instance){
              res.json(201, instance);
          })
      })

    });


    app.put(path + '/:id', middleware, function (req, res, next) {
      var attrs = req.body;

      
      var params = {}
      // params[resourceUserIDField] = req.user[sessionUserIDField];
      params['_id'] = req.params.id;

      model.findOne(params, function (err, instance) {
          if (err) { return next(err); }
          
          if(instance == null){
            res.json(404,{});
          }
          else if(instance[resourceUserIDField] === req.user[sessionUserIDField])
          {
            instance.update(attrs, function (err, instance) {
                if (err) { return next(err); }
                res.json(instance);
             });
          }
          else
          {
            res.json(403,{message:"Not owned by user:"+req.user[sessionUserIDField]})
          }
      }); 

    });


    app.del(path + '/:id', middleware, function (req, res, next) {
      
      var params = {}
      // params[resourceUserIDField] = req.user[sessionUserIDField];
      params['_id'] = req.params.id;

      model.findOne(params, function (err, instance) {
          if (err) { return next(err); }
          
          if(instance == null){
            res.json(404,{});
          }
          else if(instance[resourceUserIDField] === req.user[sessionUserIDField])
          {
            instance.remove(function (err, records) {
                if (err) { return next(err); }
                res.send(204);
             });
          }
          else
          {
            res.json(403,{message:"Not owned by user:"+req.user[sessionUserIDField]})
          }
      }); 

      
    });


  };

};