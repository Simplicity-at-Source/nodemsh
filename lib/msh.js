var agent = require('superagent');
var http = require('http');
var async = require('async');
var urlTemplate = require('url-template');


var useProxy = process.env.MSH_PROXY_ENABLED || false;
var proxyPort = process.env.SP_PROXY_PORT || 8888;
var proxyHost = process.env.SP_PROXY_HOST || 'localhost';
var proxyurl = 'http://' + proxyHost + ':' + proxyPort ;
var debug = process.env.DEBUG || true;

var timeout = process.env.MSH_TIMEOUT || 1500;



/*
{
  method: GET/POST/DELETE,
  type: http/pipe/predicate
  payload: {} // somedata,
  hostname: "sp-riak_node",
  success: function(res.status, payload),
  fail: function(res.status, payload),
  transformer: function(payload),
  criteria: boolean function(res),
  predicate: function(action),
}
*/

console.log('***** MSH debug=%s', debug);





exports.init = function(callback, errCallback) {
    var self = this;
    var queue = createQueue(self);
    var counter = 0;
    var asyncTasks = [];
    
   
      
   
    
    
    //console.log("httpio.chain()...");
      
    var httpChain = {
        setProxy: function(host, port) {
          useProxy = true;
          if (host && port ) {
             proxyPort =  port;
             proxyHost = host;
             proxyurl = 'http://' + proxyHost + ':' + proxyPort ;
          }
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
        template: function(processor) {
            var action = {type: 'template', processor: processor};
            queue.push(action);
            return this;
        },
        pipe: function(transformer) {
            var action = {type: 'pipe', transformer: transformer};
             queue.push(action);
            return this;
        },
        stop: function(predicate) {
            var action = {type: 'stopPredicate', predicate: predicate};
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
                    } else if (action.type == 'template') {    
                      asyncTask = createUrlTemplater(action, queue);
                    }  else if (action.type == 'stopPredicate') {    
                      asyncTask = createPredicate(action, queue);
                    } else {
                       asyncTask = createHttpRequest(action, errCallback); 
                    }
                    asyncTasks.push(asyncTask);     
            }
            console.log("adding " + asyncTasks.length + " tasks to aysnc");
            async.series(asyncTasks, function(err){
                   if (err) { 
                       console.log("MSH chain completed with error: " + err);
                   } else {
                       console.log("MSH chain completed");
                   }
                   
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
                   console.log('****************** request error');
                errCallback(error)
              });
              response.on('data', function (chunk) {
                str += chunk;
              });

              response.on('end', function () {
                //console.log("setting response for action " + action.path + " to " + str);
                try {
                    var obj = JSON.parse(str);
                    action.response = obj;
                } catch (err) {
                   action.response = str; 
                }
                
                action.statusCode = response.statusCode;
                log(action);
                //console.log("calling asyncCallback()");
                asyncCallback();
              });
          }

          var req = http.request(options, reqCallback);
        
          //req.setTimeout(timeout, asyncCallback());
        
        
        
            req.setTimeout(timeout, function () {
              req.end();
              console.log("msh timeout: %s http://%s:%s%s", action.method, action.host, action.port, action.path );
              //this.emit('pass',message);
                asyncCallback();
            });
        
  
        
          //req.data = data;
          //var payload = action.payload;
          //console.log("creating http request, options: " + JSON.stringify(options) );
          //console.dir(payload);
        
            var dataStr = data;
              if (dataStr == undefined) dataStr = '';
              if (dataStr.length > 250) {
                  dataStr = dataStr.substring(0, 250);
              }
              if (debug) {
                  console.log('PRELOG %s http://%s:%s%s payload: "%s"', action.method, action.host, action.port, action.path, dataStr);
              } 
          if (action.payload != undefined) {
              //req.writeHead('Accept: application/json');
              //req.writeHead('Content-Type: application/json');
              req.write(data, 'utf8');
          } else {
              
          }
          req.end();                 
           
    }
}






function createUrlTemplater(action, queue) {
    //console.log('creating asyncTask sustitue task for request ' + JSON.stringify(action)  ); 
    return  function(asyncCallback) {
            //console.log('running pipe task for action=' + JSON.stringify(action));
            lastHttpAction = queue.getLastHttpAction(action);
            nextHttpAction = queue.getNextHttpAction(action);
            processorTemplate = action.processor(lastHttpAction, queue);
            nextHttpAction.pathTemplate = nextHttpAction.path;
            var nextUrlTemplate = urlTemplate.parse(nextHttpAction.path);
            var nextUrl = nextUrlTemplate.expand(processorTemplate);
            action.template = processorTemplate;
            action.nextUrlTemplate = nextHttpAction.path;
            action.nextUrl = nextUrl;
            nextHttpAction.path = nextUrl;
            log(action);  
            asyncCallback();
    }    
}


function createPipe(action, queue) {
    //console.log('creating asyncTask pipe task for request ' + JSON.stringify(action)  ); 
    return  function(asyncCallback) {
            //console.log('running pipe task for action=' + JSON.stringify(action));
            log(action);  
            copyPayloadForward(action, queue);
            asyncCallback();
    }    
}


function createPredicate(action, queue) {
    //console.log('creating asyncTask predicate task for request ' + JSON.stringify(action)  ); 
    return  function(asyncCallback) {
            //console.log('running pipe task for action=' + JSON.stringify(action));
            var prevAction =queue.getLastHttpAction(action);
            action.response = action.predicate(prevAction);     
            log(action);
            if (action.response) {
                 //console.log('predicate halting execution of msh queue');
                asyncCallback(true); // stop processing
            } else {
                 asyncCallback();
            }            
    }    
}

function copyPayloadForward(action, queue) {
      var prev = queue.getLastHttpAction(action);
      var next = queue.getNextHttpAction(action);
    
        if (! next ||  ! next ) {
             throw new Error( "unable to copy payload forward in action " + action.counter + " as unable to find relevant http action. prev=" + prev + ", next=" + next);
        }
    
         //console.log('copying payload forward... from action %s %s %s %s to action %s %s %s', 
         //             prev.counter, prev.type, prev.statusCode,prev.response, next.type, next.counter, next.payload  );
    
       if (next.payload == undefined) {
          //console.dir(action);
           if (action.transformer) {
                next.payload = action.transformer(prev.response);    
           } else {
                next.payload = prev.response;
           }
           
       } else {
           throw new Error("payload already set for action "  + next.counter + ", cannot forward payload in to it: " + log(next)) ;  
       }

    
}

function getPayloadFromAction(action) {  
    var payload = action.response;
    if (action.transformer) {
        payload = action.transformer(payload);
    }
    return payload;
}







function createQueue(msh) {
    
    
    var queue = [];
    
     queue.allOk = function () {
        var httpErrs = false;
        for (var i = 0 ; i < queue.length ; i++) {
            var action = queue[i];
            if (action.type == 'http') {
                //console.log('msh queue.allOk() action%s %s %s', action.counter, action.type, action.statusCode);
                if (action.statusCode > 399 || action.statusCode == undefined) {
                    httpErrs = true;
                }
            }
        }
        //if (msh.asyncTasks.length != queue.length) httpErrs = true;
        
        return ! httpErrs;
    };
    
    
    
    queue.getLastHttpAction = function(thisAction) {
        for (var i = thisAction.counter ; i > -1 ; --i) {
            var prevAction = queue[i];
            //console.log('lastHttpAction() for ' + i + ' prevAction=' + JSON.stringify(prevAction));
            if (prevAction.type == 'http') {
                return prevAction;
            }
        }
         throw new Error( "for action " + thisAction.type + ":" + thisAction.counter + " no previous action of type http");
    }
    
    
    queue.getNextHttpAction = function(thisAction) {
        for (var i = thisAction.counter ; i <  queue.length; i++) {
            var nextAction = queue[i];
            //console.log('nextHttpAction() for ' + i + ' nextAction=' + JSON.stringify(nextAction));
            if (nextAction.type == 'http') {
                console.log();
                return nextAction;
            }
        }
        throw "for action " + thisAction.type + ":" + thisAction.counter + " no next action of type http";
    }

    
    return queue;
    
    
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
    
    var responseStr = '';
    
    try {
       responseStr = JSON.stringify(action.response);
    } catch (err) {
        responseStr = action.response;
    }
    
     if (responseStr == undefined ) {
         responseStr = '';
     }
    
    if (responseStr.length > 250) {
        responseStr = responseStr.substring(0, 250);
    }
    
    if (isGetOrDel(action)) {
        console.log("%s %s http://%s:%s%s response = %s", action.counter, action.method, action.host, action.port, action.path, responseStr);     
    } else if (isPostOrPut(action)) {
         console.log("%s %s http://%s:%s%s payload = %s, response=%s", 
                     action.counter, action.method, action.host, action.port, action.path, JSON.stringify(action.payload), responseStr);   

    } else {
        console.log("%s %s action=%s",action.counter, action.type, JSON.stringify(action));   
    }
}


