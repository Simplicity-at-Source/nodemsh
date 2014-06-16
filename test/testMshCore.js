var http = require('http');
var msh = require('../lib/msh.js');
var assert = require('assert');
//var request = require("superagent");


var mockMshServicePort = 18081;

function httpStartupComplete(service, port) {
    console.log("starting %s service on port %s", service, port);
}


var requestHandler = function(req, res) {
    console.log("MockCallbackee called ");
    res.writeHead(607, {'Content-Type': 'application/json'});
    res.write(JSON.stringify({message: "some test data"}));
    res.end();
};
http.createServer(requestHandler).listen(mockMshServicePort, httpStartupComplete("mockMshCallbackService", mockMshServicePort));


describe('test msh: ', function(){

    it('basic msh test', function(done){
        
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
                
                assert.equal(607, putStatus);
                assert.equal(607, getStatus);
                assert.equal(607, delStatus);
                //assert.equal('cronjob1', results[0].id);
                
                done();
                
            };
             console.log('msh starting...');
            msh.init(callback, errCallback).put(h, p, url, payload).get(h, p, url).del(h, p, url).end();
        
    });
    
    
    it('test msh with circuit breaking predicate', function(done){
        
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
                assert.equal(607, actions[0].statusCode);
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
                
                
                done();
                
            };
        
        var predicate = function(prevAction) {
            //console.log("predicate prevAction=%s", JSON.stringify(prevAction));
            return true
        };
                                      
        console.log('msh starting...');
        msh.init(callback, errCallback).get(h, p, url, payload).stop(predicate).post(h, p, url).end();
        
    });
    
    
    
    it('test msh carry-on predicate', function(done){
        
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
                assert.equal(607, actions[0].statusCode);
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
                assert.equal(607, actions[2].statusCode);
                
                
                done();
                
            };
        
        var predicate = function(prevAction) {
            //console.log("predicate prevAction=%s", JSON.stringify(prevAction));
            return false;
        };
                                      
        console.log('msh starting...');
        msh.init(callback, errCallback).get(h, p, url, payload).stop(predicate).post(h, p, url).end();
        
    });
});
    


