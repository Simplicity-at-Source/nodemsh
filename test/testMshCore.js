var http = require('http');
var msh = require('../lib/msh.js');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var channel = new EventEmitter();
var uuid = require('node-uuid');

//var request = require("superagent");


channel.on('ECONNRESET', function() {        
        console.log('testMshCore.js event emitted');
});

var mockMshServicePort = 18081;

function httpStartupComplete(service, port) {
    console.log("starting %s service on port %s", service, port);
}

var mockHttpCallCounter = 0;
var returnStatusCode = 200;

var requestHandler = function(req, res) {
    var requestId = uuid.v4();
    console.log("MockCallbackee called requestId=" + requestId);
    res.writeHead(returnStatusCode, {'Content-Type': 'application/json'});
    res.write(JSON.stringify({requestId: requestId, message: "mock test data " + mockHttpCallCounter++}));
    res.end();
};
http.createServer(requestHandler).listen(mockMshServicePort, httpStartupComplete("mockMshCallbackService", mockMshServicePort));


describe('core msh tests: ', function(){

    it('basic msh test', function(done){
         returnStatusCode =  200;
             mockHttpCallCounter = 0;   
            var h = 'localhost';
            var p = mockMshServicePort;
            var url = '/some/path';
            
           var payload = {"id":"sentiment","image":"sp_platform/uber-any","env":{"GIT_REPO_URL":"https://github.com/fuzzy-logic/sentiment.git", "DNS": "sentiment.muoncore.io"}};
            
            var errCallback = function(status, host, data) {
                console.log('errCallback status=%s, host=%s data=%s', status, host, data);
            };
            
            var callback = function(actions) {
                console.log('msh callback...');
               // console.dir(actions);
                
                var putStatus = actions[0].statusCode;
                var getStatus = actions[1].statusCode;
                var delStatus = actions[2].statusCode;
                //var get1results = JSON.parse(actions[1].response);
                //var get2results = JSON.parse(actions[2].response);
                
                assert.equal(returnStatusCode, putStatus);
                assert.equal(returnStatusCode, getStatus);
                assert.equal(returnStatusCode, delStatus);
                //assert.equal('cronjob1', results[0].id);
                 assert.equal(true, actions.allOk());
                done();
                
            };
             console.log('msh starting...');
            msh.init(callback, errCallback).put(h, p, url, payload).get(h, p, url).del(h, p, url).end();
        
    });
    
     it('msh timeout', function(done){
             returnStatusCode =  200;
             mockHttpCallCounter = 0;   
                var h = '127.0.254.8';
                var p = 46000;
                var url = '/some/path';
         
                var errCallback = function(status, host, data) {
                    console.log('errCallback status=%s, host=%s data=%s', status, host, data);
                };

                var callback = function(actions) {
                    console.log('msh callback...');
                   // console.dir(actions);
                    assert.equal(undefined, actions[1]);
                     assert.equal(false, actions.allOk());
                    done();

                };
                 console.log('msh starting...');
         
         try {
             msh.init(callback, errCallback).get(h, p, url).end();
         }catch (err) {
            console.log('testMshCore.js there was an error');  
         }
                

        });    
    
    

    
    

});
    

















describe('extra msh tests: ', function(){
       
         
    it('test urltemplating', function(done){
        
         returnStatusCode =  200;
        mockHttpCallCounter = 0;   
        
            var h = 'localhost';
            var p = mockMshServicePort;
            var url = '/some/path';
            var url2 = '/{first}/{second}/{third}';
            
            var errCallback = function(status, host, data) {
                console.log('errCallback status=%s, host=%s data=%s', status, host, data);
            };
            
            var callback = function(actions) {
                console.log('msh callback...');
                var get1Status = actions[0].statusCode;
                var get1RequestId = actions[0].response.requestId;
                var get2Status = actions[2].statusCode;
                
                assert.equal(returnStatusCode, get1Status);
                assert.equal(returnStatusCode, get2Status);
                
                
                assert.equal(url2,  actions[2].pathTemplate);
                
                assert.equal('/foo/bar/' + get1RequestId,  actions[2].path);
                assert.equal(true, actions.allOk());
                done();
                
            };
        
            var processor = function (lastAction, queue) {
                return {    
                    first: "foo",
                    second: "bar",
                    third: lastAction.response.requestId
                }
            }
             console.log('msh starting...');
            msh.init(callback, errCallback).get(h, p, url).template(processor).get(h, p, url2).end();
    });
    
    
 it('test msh piping bewteen actions', function(done) {
          returnStatusCode =  201;
              mockHttpCallCounter = 0;   
        
            var h = 'localhost';
            var p = mockMshServicePort;
            var url = '/some/path';
            var pipeTransformerCalled = false;

            var callback = function(actions) {
                      // Great, msh finished successfully now what?
                    console.log("action 0" + JSON.stringify(actions[0]));
                    console.log("action 1" + JSON.stringify(actions[1]));
                    console.log("action 2" + JSON.stringify(actions[2]));
                    console.log("action 3" + JSON.stringify(actions[3]));
                    console.log("action 4" + JSON.stringify(actions[4]));
                    console.log("action 5" + JSON.stringify(actions[5]));
                             
                      assert.equal(actions[0].type, 'http'); // every action has a type
                      assert.equal(actions[0].method, 'GET'); // every http type has a method
                      assert.equal(actions[1].type, 'pipe'); // this means we piped data from one action to another
                      assert.equal(actions[2].statusCode, returnStatusCode); // get http response status codes
                      assert.equal(actions[2].payload.message, 'this was transformed'); // check transformation
                      assert.equal(actions[2].payload.oldmessage.message, 'mock test data 0'); // check transformation
                      assert.equal(actions[5].response.message, 'mock test data 4'); // put payload/response data
                
                      assert.ok(pipeTransformerCalled);
                      assert.equal(true, actions.allOk());
                      done();
              };

              var errCallback = function(status, host, data) {
                // Oh noes! An error! Do something good to restore your Karma
              };

              var testTransformer = function(data) {
                  console.log('Transformer Called');
                  pipeTransformerCalled = true; 
                  return {message: 'this was transformed', oldmessage: data };
              };
              var putData = '{"data": "putData"}';

              var host = "localhost";
              var port = 8080;

              // Here's the magic... 
              // Eh? what happened to all the nested callbacks?
              msh.init(callback, errCallback)
              .get(h, p, '/path1')
              .pipe(testTransformer)
              .post(h, p, '/path2')
              .del(h, p, '/path3')
              .get(h, p, '/path4')
              .put(h, p, '/path5', putData)
              .end();

    });    
    
 
    
    
    it('test msh carry-on predicate', function(done){
          returnStatusCode =  607; //use a silly return tpye to make sure nothing untoward is happening
              mockHttpCallCounter = 0;   
            var h = 'localhost';
            var p = mockMshServicePort;
            var url = '/some/path';
            
           var payload = {"id":"sentiment","image":"sp_platform/uber-any","env":{"GIT_REPO_URL":"https://github.com/fuzzy-logic/sentiment.git", "DNS": "sentiment.muoncore.io"}};
            
            var errCallback = function(status, host, data) {
                console.log('errCallback status=%s, host=%s data=%s', status, host, data);
                 assert.ok(false);
            };
            
            var callback = function(actions) {
                console.log('msh callback...');
               // console.dir(actions);
                
                var getStatus = actions[0].statusCode;
                var postStatus = actions[2].statusCode;
                
                console.log('action0: ' + JSON.stringify(actions[0]));
                assert.equal(returnStatusCode, actions[0].statusCode);
                assert.equal('http', actions[0].type);
                assert.equal('GET', actions[0].method);
                assert.ok(actions[0].response);
                
                
                console.log('action1: ' + JSON.stringify(actions[1]));
                assert.equal('stopPredicate', actions[1].type);
                assert.equal(false, actions[1].response); //predicate returned false
                
                
                console.log('action2: ' + JSON.stringify(actions[2]));
                assert.equal('http', actions[2].type);
                assert.equal('POST', actions[2].method);
                assert.ok(actions[2].response);
                assert.equal(returnStatusCode, actions[2].statusCode);
                
                assert.equal(false, actions.allOk());
                done();
                
            };
        
        var predicate = function(prevAction) {
            //console.log("predicate prevAction=%s", JSON.stringify(prevAction));
            return false;
        };
                                      
        console.log('msh starting...');
        msh.init(callback, errCallback).get(h, p, url, payload).stop(predicate).post(h, p, url).end();
        
    });
    

        it('test msh with circuit breaking predicate', function(done){
              returnStatusCode =  201;
          mockHttpCallCounter = 0;   
            var h = 'localhost';
            var p = mockMshServicePort;
            var url = '/some/path';
            
           var payload = {"id":"sentiment","image":"sp_platform/uber-any","env":{"GIT_REPO_URL":"https://github.com/fuzzy-logic/sentiment.git", "DNS": "sentiment.muoncore.io"}};
            
            var errCallback = function(status, host, data) {
                console.log('errCallback status=%s, host=%s data=%s', status, host, data);
                 assert.ok(false);
            };
            
            var callback = function(actions) {
                console.log('msh callback...');
               // console.dir(actions);
                
                var getStatus = actions[0].statusCode;
                var postStatus = actions[2].statusCode;
                
                console.log('action0: ' + JSON.stringify(actions[0]));
                assert.equal(returnStatusCode, actions[0].statusCode);
                assert.equal('http', actions[0].type);
                assert.equal('GET', actions[0].method);
                assert.ok(actions[0].response);
                
                
                console.log('action1: ' + JSON.stringify(actions[1]));
                assert.equal('stopPredicate', actions[1].type);
                assert.equal(true, actions[1].response); //predicate returned false
                
                
                console.log('action2: ' + JSON.stringify(actions[2]));
                assert.equal('http', actions[2].type);
                assert.equal('POST', actions[2].method);
                assert.equal(undefined, actions[2].response);
                assert.equal(false, actions.allOk());
                
                done();
                
            };
        
        var predicate = function(prevAction) {
            //console.log("predicate prevAction=%s", JSON.stringify(prevAction));
            return true
        };
                                      
        console.log('msh starting...');
        msh.init(callback, errCallback).get(h, p, url, payload).stop(predicate).post(h, p, url).end();
        
    });
    
    
    it('test msh with multiple stop predicates', function(done){
              returnStatusCode =  203;
          mockHttpCallCounter = 0;   
            var h = 'localhost';
            var p = mockMshServicePort;
            var url = '/some/path';
            
           var payload = {"id":"sentiment","image":"sp_platform/uber-any","env":{"GIT_REPO_URL":"https://github.com/fuzzy-logic/sentiment.git", "DNS": "sentiment.muoncore.io"}};
            
            var errCallback = function(status, host, data) {
                console.log('errCallback status=%s, host=%s data=%s', status, host, data);
                 assert.ok(false);
            };
            
            var callback = function(actions) {
                console.log('msh callback...');
               // console.dir(actions);
                
                var getStatus = actions[0].statusCode;
                var postStatus = actions[2].statusCode;
                
                console.log('action0: ' + JSON.stringify(actions[0]));
                assert.equal(returnStatusCode, actions[0].statusCode);
                assert.equal('http', actions[0].type);
                assert.equal('GET', actions[0].method);
                assert.ok(actions[0].response);
                
                
                console.log('action1: ' + JSON.stringify(actions[1]));
                assert.equal('stopPredicate', actions[1].type);
                assert.equal(false, actions[1].response); //predicate returned false
                
                console.log('action2: ' + JSON.stringify(actions[2]));
                assert.equal('pipe', actions[2].type);

              

                console.log('action3: ' + JSON.stringify(actions[3]));
                assert.equal('http', actions[3].type);
                assert.equal('POST', actions[3].method);
                assert.ok('POST', actions[3].payload.test); // ensure the previous pipe transforms the payload
                assert.ok(actions[3].response);
                
                console.log('action4: ' + JSON.stringify(actions[4]));
                assert.equal('stopPredicate', actions[4].type);
                assert.equal(false, actions[4].response); //predicate returned false
                
                console.log('action5: ' + JSON.stringify(actions[5]));
                assert.equal('http', actions[5].type);
                assert.equal('PUT', actions[5].method);
                assert.ok(actions[5].response);

                assert.equal(true, actions.allOk());
                done();
                
            };
        
        var predicate = function(prevAction) {
            //console.log("predicate prevAction=%s", JSON.stringify(prevAction));
            return false;
        };
            
         var transformer = function(prevAction) {
            //console.log("predicate prevAction=%s", JSON.stringify(prevAction));
            return {test: true};
        };
                                      
        console.log('msh starting...');
        msh.init(callback, errCallback).get(h, p, url, payload).stop(predicate).pipe(transformer).post(h, p, url).stop(predicate).put(h, p, url).end();
        
    });    
    
    
    
});
