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
  , LocalStrategy = require('passport-local').Strategy
  , app = express()
  , mongoose = require('mongoose');

var resourceSchema = mongoose.Schema({
  name: { type: 'string', required: true },
    desc: { type: 'string' },
    userID: {type:'string',required:true}
});

var UserResource = mongoose.model('UserResource',resourceSchema);

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

// some basic local auth

var exampleUsers = [
  {_id:"someuserID",username:"bob",password:"bobby"},
  {_id:"someuserID1",username:"sam",password:"sammy"},
  {_id:"someuserID2",username:"nick",password:"nicky"}
];

var exampleDocs = [
  {userID:"someuserID",name:"Bob's Doc"},
  {userID:"someuserID1",name:"Sam's Doc"}
];

passport.use(new LocalStrategy({
    usernameField:"username",
    passwordField:"password"
  },
  function(user, pass, done) {
    
    var foundUser;
    exampleUsers.forEach(function(testUser){
        if (testUser.username === user && testUser.password === pass)
              foundUser = testUser;
    })

    if(foundUser)
      return done(null, foundUser);  
    else
      return done(null, false, { message: 'Bad Credentials' });
      
  }
));

require('../index')(app);

app.userResource('/userresources', UserResource, 'userID','_id',passport.authenticate('local', { session: false }))


/**
 * Spec
 */

describe('RESTful UserResource', function () {

  var res;


  before(function (done) {
    UserResource.collection.remove(function(err,res){    
      UserResource.create(exampleDocs, function (error, instance) {
        resource = instance;
        done();
      });
    });
  });

    var err,res, resource, bob=exampleUsers[0], sam=exampleUsers[1];


    describe('with VALID credentials',function(){

     describe('GET /userresources', function () {
        before(function (done) {
          request(app)
            .get('/userresources/?username='+bob.username+'&password='+bob.password)
            .end(function (error, response) {
              err = error;
              res = response;
              resource = response.body[0];
              done();
            });
        });

        it('should respond 200', function () {
          res.statusCode.should.equal(200);
        });

        it('should respond with JSON', function () {
          res.headers['content-type'].should.contain('application/json');
        });

        it('should respond with an array of bobs resources', function () {
          res.body.forEach(function(resource){
            expect(resource.userID).to.equal(bob._id);
          })
          expect(res.body.length).to.equal(1);
        });

      });

      describe('GET /resources/:id (valid resource, owned by bob)', function () {

        before(function (done) {
          request(app)
            .get('/userresources/?username='+bob.username+'&password='+bob.password)
            .end(function (error, response) {
              err = error;
              res = response;
              resource = response.body[0];

              request(app)
                .get('/userresources/'+resource._id+'?username='+bob.username+'&password='+bob.password)
                .end(function (error, response) {
                  err = error;
                  res = response;
                  done();
                });
              });
        });

        it('should respond 200', function () {
          res.statusCode.should.equal(200);
        });

        it('should respond with JSON', function () {
          res.headers['content-type'].should.contain('application/json');
        });

        it('should respond with the resource', function () {
          expect(res.body.userID).to.equal(bob._id);   
        });

      });

      describe('GET /resources/:id (valid resource, not owned by bob)', function () {

        before(function (done) {
          request(app)
            .get('/userresources/?username='+sam.username+'&password='+sam.password)
            .end(function (error, response) {
              err = error;
              res = response;
              resource = response.body[0];

              request(app)
                .get('/userresources/'+resource._id+'?username='+bob.username+'&password='+bob.password)
                .end(function (error, response) {
                  err = error;
                  res = response;
                  done();
                });
              });
        });

        it('should respond 403', function () {
          res.statusCode.should.equal(403);
        });

        it('should respond with JSON', function () {
          res.headers['content-type'].should.contain('application/json');
        });

        it('should respond with no resource', function () {
          expect(res.body.userID).to.be.empty;   
        });

      });


      describe('POST /userresources', function () {
          var postError,postResponse;

          before(function (done) {
            UserResource.collection.remove(function(err,res){  
              request(app)
                .post('/userresources')
                .send({username:bob.username, password:bob.password, name: 'New' })
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
            var newID = postResponse.body._id.toString();
            
           UserResource.findOne({_id:newID},function(err,res){
              expect(res).to.not.be.null;
              expect(res._id.toString()).to.equal(newID.toString());
              done()
            })

          });

        });

        describe('PUT /resources/:id  (valid resource, owned by bob)', function () {
          var instanceID, putErr, putRes;
          before(function (done) {
          
            UserResource.create({ userID:bob._id, name: 'initial' }, function (err, instance) {
              instanceID = instance._id.toString();
              request(app)
                .put('/userresources/' + instance._id)
                .send({  username:bob.username, password:bob.password, name: 'changed' })
                .end(function (error, response) {
                  putErr = error;
                  putRes = response;
                  done();
                });
          
            });

          });

          it('should respond 200', function () {
            putRes.statusCode.should.equal(200);
          });

          it('should respond with JSON', function () {
            putRes.headers['content-type'].should.contain('application/json');
          });

          it('should modify an existing resource', function (done) {
            UserResource.findById(instanceID,function(err,res){
              expect(res).to.not.be.null;
              expect(res.name).to.equal("changed");
              done()
            })
          });

        });

        describe('PUT /resources/:id   (invalid resource)', function () {
          var instanceID, putErr, putRes;
          before(function (done) {

              request(app)
                .put('/userresources/' + "532f389c9c0b24c05b00000b")
                .send({  username:bob.username, password:bob.password, name: 'changed' })
                .end(function (error, response) {
                  putErr = error;
                  putRes = response;
                  done();
                });

          });

          it('should respond 404', function () {
            putRes.statusCode.should.equal(404);
          });

          it('should respond with JSON', function () {
            putRes.headers['content-type'].should.contain('application/json');
          });

          it('should NOT modify an existing resource', function (done) {
              expect(putRes.body).to.be.empty;
              done()
            
          });

        }); 


        describe('PUT /resources/:id   (valid resource, not owned by bob)', function () {
          var instanceID, putErr, putRes;
          before(function (done) {
          
            UserResource.create({ userID:sam._id, name: 'initial' }, function (err, instance) {
              instanceID = instance._id.toString();
              request(app)
                .put('/userresources/' + instance._id)
                .send({  username:bob.username, password:bob.password, name: 'changed' })
                .end(function (error, response) {
                  putErr = error;
                  putRes = response;
                  done();
                });
          
            });

          });

          it('should respond 403', function () {
            putRes.statusCode.should.equal(403);
          });

          it('should respond with JSON', function () {
            putRes.headers['content-type'].should.contain('application/json');
          });

          it('should NOT modify an existing resource', function (done) {
            UserResource.findById(instanceID,function(err,res){
              expect(res).to.not.be.null;
              expect(res.name).to.equal("initial");
              done()
            })
          });

        }); 

        describe('DELETE /resources/:id (invalid resource)', function () {
          var deleteResponse, deleteError, delInstance;

          before(function (done) {
              request(app)
                .del('/userresources/' + "532f389c9c0b24c05b00000b" + "?username="+bob.username+"&password="+bob.password)
                .end(function (error, response) {
                  deleteError = error;
                  deleteResponse = response;
                  done();
                });
          });

          it('should respond 404', function () {
            deleteResponse.statusCode.should.equal(404);
          });

          it('should NOT destroy the resource resource', function (done) {
              expect(deleteResponse.body).to.be.empty;
              done();
            
          });

        });

        describe('DELETE /resources/:id (valid resource, owned by bob)', function () {
          var deleteResponse, deleteError, delInstance;

          before(function (done) {
            UserResource.create({ userID:bob._id, name: 'to be deleted' }, function (err, instance) {
                delInstance = instance;
                request(app)
                  .del('/userresources/' + instance._id + "?username="+bob.username+"&password="+bob.password)
                  .end(function (error, response) {
                    deleteError = error;
                    deleteResponse = response;
                    done();
                  });
              });
          });

          it('should respond 204', function () {
            deleteResponse.statusCode.should.equal(204);
          });

          it('should destroy the resource resource', function (done) {
            UserResource.find({_id:delInstance._id},function(err,response){
              expect(response).to.be.empty;
              done();
            })
          });

        });

        describe('DELETE /resources/:id (valid resource, NOT owned by bob)', function () {
          var deleteResponse, deleteError, delInstance;

          before(function (done) {
            UserResource.create({ userID:sam._id, name: 'to be deleted' }, function (err, instance) {
                delInstance = instance;
                request(app)
                  .del('/userresources/' + instance._id + "?username="+bob.username+"&password="+bob.password)
                  .end(function (error, response) {
                    deleteError = error;
                    deleteResponse = response;
                    done();
                  });
              });
          });

          it('should respond 403', function () {
            deleteResponse.statusCode.should.equal(403);
          });

          it('should NOT destroy the resource resource', function (done) {
            UserResource.find({_id:delInstance._id},function(err,response){
              expect(response).to.not.be.empty;
              done();
            })
          });

        });

    })
    
    describe('with INVALID credentials',function(){
      var validResource, invalidUser, res;

      before(function(done){

          invalidUser ={username:"XXX",password:"XXX"};

          UserResource.find({},function(err,res){
            validResource = res[0];
            done();
          })

      })

     describe('GET /userresources', function () {
        before(function (done) {
          request(app)
            .get('/userresources/?username='+invalidUser.username+'&password='+invalidUser.password)
            .end(function (error, response) {
              err = error;
              res = response;
              done();
            });
        });

        it('should respond 401', function () {
          res.statusCode.should.equal(401);
        });

      });

      describe('GET /resources/:id', function () {

        before(function (done) {
          
            request(app)
              .get('/userresources/'+validResource._id+'?username='+invalidUser.username+'&password='+invalidUser.password)
              .end(function (error, response) {
                err = error;
                res = response;
                done();
              });
        });

        it('should respond 401', function () {
          res.statusCode.should.equal(401);
        });

    
      });

      describe('POST /userresources', function () {
          var postError,postResponse;

          before(function (done) {
              request(app)
                .post('/userresources')
                .send({username:invalidUser.username, password:invalidUser.password, name: 'New' })
                .end(function (error, response) {
                  postError = error;
                  postResponse = response;
                  done();
                });
          });

          it('should respond 401', function () {
            postResponse.statusCode.should.equal(401);
          });

        });

        describe('PUT /resources/:id', function () {
          var instanceID, putErr, putRes;
          before(function (done) {

              request(app)
                .put('/userresources/' + validResource._id)
                .send({  username:invalidUser.username, password:invalidUser.password, name: 'changed' })
                .end(function (error, response) {
                  putErr = error;
                  putRes = response;
                  done();
                });

          });

          it('should respond 401', function () {
            putRes.statusCode.should.equal(401);
          });

        }); 

    
        describe('DELETE /resources/:id', function () {
          var deleteResponse, deleteError, delInstance;

          before(function (done) {
              request(app)
                .del('/userresources/' + validResource._id + "?username="+invalidUser.username+"&password="+invalidUser.password)
                .end(function (error, response) {
                  deleteError = error;
                  deleteResponse = response;
                  done();
                });
          });

          it('should respond 401', function () {
            deleteResponse.statusCode.should.equal(401);
          });

        });


    })
   
    describe('with MISSING credentials',function(){
      var validResource, res;

      before(function(done){

          UserResource.find({},function(err,res){
            validResource = res[0];
            done();
          })

      })

     describe('GET /userresources', function () {
        before(function (done) {
          request(app)
            .get('/userresources/')
            .end(function (error, response) {
              err = error;
              res = response;
              done();
            });
        });

        it('should respond 401', function () {
          res.statusCode.should.equal(401);
        });

      });

      describe('GET /resources/:id', function () {

        before(function (done) {
          
            request(app)
              .get('/userresources/')
              .end(function (error, response) {
                err = error;
                res = response;
                done();
              });
        });

        it('should respond 401', function () {
          res.statusCode.should.equal(401);
        });

    
      });

      describe('POST /userresources', function () {
          var postError,postResponse;

          before(function (done) {
              request(app)
                .post('/userresources')
                .send({ name: 'New' })
                .end(function (error, response) {
                  postError = error;
                  postResponse = response;
                  done();
                });
          });

          it('should respond 401', function () {
            postResponse.statusCode.should.equal(401);
          });

        });

        describe('PUT /resources/:id', function () {
          var instanceID, putErr, putRes;
          before(function (done) {

              request(app)
                .put('/userresources/' + validResource._id)
                .send({  name: 'changed' })
                .end(function (error, response) {
                  putErr = error;
                  putRes = response;
                  done();
                });

          });

          it('should respond 401', function () {
            putRes.statusCode.should.equal(401);
          });
                   
        }); 

    
        describe('DELETE /resources/:id', function () {
          var deleteResponse, deleteError, delInstance;

          before(function (done) {
              request(app)
                .del('/userresources/' + validResource._id )
                .end(function (error, response) {
                  deleteError = error;
                  deleteResponse = response;
                  done();
                });
          });

          it('should respond 401', function () {
            deleteResponse.statusCode.should.equal(401);
          });

        });


    })

});