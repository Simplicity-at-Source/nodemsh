var http = require('http');
var msh = require('../lib/msh.js');
var assert = require('assert');
var request = require("superagent");


var mockMshServicePort = 18081;

function httpStartupComplete(service, port) {
    console.log("starting %s service on port %s", service, port);
}


var requestHandler = function(req, res) {
    console.log("MockCallbackee called ");
    res.writeHead(607, {'Content-Type': 'application/json'});
    res.write(JSON.stringify({}));
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
});
    


