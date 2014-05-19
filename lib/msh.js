var agent = require('superagent');
var http = require('http');
var async = require('async');



var proxyPort = process.env.SP_PROXY_PORT || 8888;
var proxyHost = process.env.SP_PROXY_HOST || 'localhost';
var proxyurl = 'http://' + proxyHost + ':' + proxyPort ;

var useProxy = true;



/*

{
  method: GET/POST/DELETE,
  payload: {} // somedata,
  hostname: "sp-riak_node",
  success: function(res.status, payload),
  fail: function(res.status, payload),
  transformer: function(payload),
  criteria: boolean function(res),

*/



exports.init = function(callback, errCallback) {
    var queue = [];
    var self = this;
    var counter = 0;
    var asyncTasks = [];
    
    //console.log("httpio.chain()...");
      
    var httpChain = {
        noproxy: function() {
          useProxy = false;
          return this;
        },
        get: function(host, port, path){
            queue.push({type: 'http', method: "GET", host: host, port: port, path: path});
            return this;
        },
        post: function(host, port, path, data){
            var action = {type: 'http', method: "POST", host: host, port: port, path: path, payload: data};
            queue.push(action);
            return this;
        },
        put: function(host, port, path, data){
            var action = {type: 'http', method: "PUT", host: host, port: port, path: path, payload: data};
            queue.push(action);
            return this;
        },
        del: function(host, port, path){
            var action = {type: 'http', method: "DELETE", host: host, port: port, path: path};
            queue.push(action);
            return this;
        },
        pipe: function(transformer) {
            var action = {type: 'pipe', transformer: transformer};
             queue.push(action);
            return this;
        },
        end: function() {
            //console.log('end() queue size=' + queue.length);
            for (; counter < queue.length ; counter++ ) {

                    var action = queue[counter];
                    action.counter = counter;

                    if (isPostOrPut(action)) {
                        if (action.transformer != undefined) {
                            action.payload = action.transformer(action.payload);
                        };        
                    }

                    var asyncTask;
                    if (action.type == 'pipe') {    
                      asyncTask = createPipe(action, queue);
                    } else {
                       asyncTask = createHttpRequest(action, errCallback); 
                    }
                    asyncTasks.push(asyncTask);     
            }
            console.log("adding " + asyncTasks.length + " tasks to aysnc");
            async.series(asyncTasks, function(err){
                   console.log("HTTP chain complete err=" + err);
                   callback(queue);
            });
        }
    };
    return httpChain;
}



function createHttpRequest(action, errCallback) {
    //console.log('creating asyncTask http request for request ' + JSON.stringify(action)  ); 
    
    return  function(asyncCallback) {

        var cookie = 'something=anything'
        
        var headers = {
            'Host': action.host,
            'Cookie': cookie,
          
        };
        
        var data = '';
        
        if (action.payload != undefined) {
            
            var data = action.payload;
            if (typeof data == 'object') {
              var data = JSON.stringify(data);   
            }
            //console.log("creating http request payload data = " + data);
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(data,'utf8');
        }
                
        
         var options = {
                method: action.method,
                hostname: action.host,
                host: action.host,
                port: action.port,
                path: action.path,
                headers: headers,
         };
        
        if (useProxy) {
            options.host = proxyHost;
            options.hostname = proxyHost;
            options.port = proxyPort;
            headers['Host'] = action.host;
            action.port = proxyPort;
        }
        
        action.options = options;

        
          reqCallback = function(response) {
              var str = '';
              response.on('error', function (error) {
                errCallback(error)
              });
              response.on('data', function (chunk) {
                str += chunk;
              });

              response.on('end', function () {
                //console.log("setting response for action " + action.path + " to " + str);
                action.response = str;
                action.statusCode = response.statusCode;
                log(action);
                //console.log("calling asyncCallback()");
                asyncCallback();
              });
          }

          var req = http.request(options, reqCallback);
        
          //req.data = data;
          //var payload = action.payload;
          //console.log("creating http request, options: " + JSON.stringify(options) );
          //console.dir(payload);
          if (action.payload != undefined) {
              console.log(action.method + ' writing payload: ' + data);
              //req.writeHead('Accept: application/json');
              //req.writeHead('Content-Type: application/json');
              req.write(data, 'utf8');
          }
          req.end();                 
           
    }
}





function createPipe(action, queue) {
    console.log('creating asyncTask pipe task for request ' + JSON.stringify(action)  ); 
    return  function(asyncCallback) {
            //console.log('running pipe task for action=' + JSON.stringify(action));
            var prevAction = queue[action.counter - 1];
            var nextAction = queue[action.counter +1 ];  
            if (nextAction.payload != undefined) {
               throw "payload for alerady set, cannot pipe payload in to it: " + log(nextAction) ;  
            } 
            nextAction.payload = prevAction.response;
            nextAction.transformer = action.transformer;
            asyncCallback();
    }    
}







function isPostOrPut(action) {
    if (action.method == 'POST' || action.method == 'PUT') {
        return true;
    } else {
        return false; 
    }
}

function isGetOrDel(action) {
    if (action.method == 'GET' || action.method == 'DELETE') {
        return true;
    } else {
        return false; 
    }
}



function log(action) {
    if (isGetOrDel(action)) {
        console.log("%s %s http://%s:%s%s response = %s", action.counter, action.method, action.host, action.port, action.path, action.response);     
    } else if (isPostOrPut(action)) {
         console.log("%s %s http://%s:%s%s payload = %s, response=%s", action.counter, action.method, action.host, action.port, action.path, action.payload, action.response);   

    } else {
        console.log("action=" + action);   
    }
}


