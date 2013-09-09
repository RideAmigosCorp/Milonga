/**
 * Test dependencies
 */

var cwd = process.cwd()
  , path = require('path')
  , chai = require('chai')
  , expect = chai.expect
  , request = require('supertest');
/**
 * Should style assertions
 */

chai.should();


/**
 * Test application
 */

var express = require('express')
  , passport = require('passport')
  , BasicStrategy = require('passport-http').BasicStrategy
  , Model = require('modinha')
  , app = express()
  , mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/milonga');

var resourceSchema = mongoose.Schema({
  name: { type: 'string', required: true },
    desc: { type: 'string' }
});

var Resource = mongoose.model('Resource',resourceSchema);

app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(passport.initialize());
  app.use(passport.session());  
  app.use(app.router);
  app.use(function (err, req, res, next) {
    console.log(err)
    res.send(err.statusCode || 500, err);
  });
});

passport.use('basic', new BasicStrategy(function (username, password, done) {
  if (username !== 'foo' || password !== 'bar') {
    done(null, false);
  } else {
    next(null, {});
  }
}));

require('../index')(app);

app.resource('/resources', Resource);
app.resource('/private', Resource, passport.authenticate('basic', { session: false }))


/**
 * Spec
 */

describe('RESTful Resource', function () {

  var res;


  before(function (done) {
    Resource.collection.remove(function(err,res){    
      Resource.create({ name: 'Whatever' }, function (error, instance) {
        resource = instance;
        done();
      });
    });
  });


  describe('GET /resources', function () {
    before(function (done) {
      request(app)
        .get('/resources/')
        .end(function (error, response) {
          err = error;
          res = response;
          done();
        });
    });

    it('should respond 200', function () {
      res.statusCode.should.equal(200);
    });

    it('should respond with JSON', function () {
      res.headers['content-type'].should.contain('application/json');
    });

    it('should respond with an array of resources', function () {
      expect(res.body.length).to.be.at.least(1);
    });
  });


  describe('GET /resources/:id', function () {

    before(function (done) {
      request(app)
        .get('/resources/' + resource._id)
        .end(function (error, response) {
          err = error;
          res = response;
          done();
        });
    });

    it('should respond 200', function () {
      res.statusCode.should.equal(200);
    });

    it('should respond with JSON', function () {
      res.headers['content-type'].should.contain('application/json');
    });

    it('should respond with a resource', function () {
      res.body.name.should.equal('Whatever');
    });

  });


  describe('POST /resources', function () {
    var postError,postResponse;

    before(function (done) {
      Resource.collection.remove(function(err,res){    
        request(app)
          .post('/resources')
          .send({ name: 'New' })
          .end(function (error, response) {
            postError = error;
            postResponse = response;
            done();
          });
        })
    });

    it('should respond 201', function () {
      postResponse.statusCode.should.equal(201);
    });

    it('should respond with JSON', function () {
      postResponse.headers['content-type'].should.contain('application/json');
    });

    it('should create a new resource', function (done) {
      var newID = postResponse.body._id;
      Resource.findById(newID,function(err,res){
        expect(res).to.not.be.null;
        expect(res._id.toString()).to.equal(newID.toString());
        done()
      })

    });

  });


  describe('PUT /resources/:id', function () {
    var instanceID;
    before(function (done) {
      Resource.collection.remove(function(err,res){    

        Resource.create({ name: 'initial' }, function (err, instance) {
          instanceID = instance._id;
          request(app)
            .put('/resources/' + instance._id)
            .send({ name: 'changed' })
            .end(function (error, response) {
              err = error;
              res = response;
              done();
            });
        });

      });
    });

    it('should respond 200', function () {
      res.statusCode.should.equal(200);
    });

    it('should respond with JSON', function () {
      res.headers['content-type'].should.contain('application/json');
    });

    it('should modify an existing resource', function (done) {
      Resource.findById(instanceID,function(err,res){
        expect(res).to.not.be.null;
        expect(res.name).to.equal("changed");
        done()
      })
    });

  });


  describe('DELETE /resources/:id', function () {
    var deleteResponse, deleteError;

    before(function (done) {
      Resource.collection.remove(function(err,res){        
        Resource.create({ name: 'to be deleted' }, function (err, instance) {
          request(app)
            .del('/resources/' + instance._id)
            .end(function (error, response) {
              deleteError = error;
              deleteResponse = response;
              done();
            });
        });
      });
    });

    it('should respond 204', function () {
      deleteResponse.statusCode.should.equal(204);
    });

    it('should destroy the resource resource', function (done) {
      Resource.find({},function(err,response){
        expect(response).to.be.empty;
        done()
      })
    });

  });

  describe('with middleware', function () {

    before(function (done) {
      Resource.collection.remove(function(err,res){    
        request(app)
          .post('/private')
          .send({ name: 'New' })
          .end(function (error, response) {
            err = error;
            res = response;
            done();
          });
      });
    });

    it('should respond 401', function () {
      res.statusCode.should.equal(401);
    });

    it('should respond "Unauthorized"', function () {
      res.text.should.equal('Unauthorized');
    });

  });

});