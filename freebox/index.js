var http = require('http');
var crypto = require('crypto');
var conf = require('../config.json');


var app_id = conf.freebox.app_id;
var app_token = conf.freebox.app_token; // getted through askToken() the first time only, set as constant after
var host = conf.freebox.host;

var session = null;
var dtsessionstart = null;


var cache = null;
var dtcache = null;

// if cache is ok use cache
// else get data and fill cache
exports.getcomputerlistwithcache = function (callback, cachedelaymaxsecond) {
    if ((cache) && (dtcache) && ((new Date().getTime() - dtcache.getTime()) < (cachedelaymaxsecond * 1000)))
        return callback(cache);
    exports.getcomputerlist(callback);
}

// get data without cache but fill cache
exports.getcomputerlist = function (callback) {
    getSession(getcomputerlist, function (resfreebox) {
        var body = '';
        resfreebox.on('data', function (chunk) {
            body += chunk;
        });
        resfreebox.on('end', function () {
            var computers = JSON.parse(body);
            
            cache = computers;
            dtcache = new Date();
            callback(computers);
        });
    });
};


exports.getcomputerlistasstream = function (callback) {
    getSession(getcomputerlist, function (computers) {
        cache = computers;
        dtcache = new Date();
        callback(computers);
    });
};


function getcomputerlist(callback) {
  var getcomputerlist_options = {
      host: host,
      port: '80',
      path: '/api/v1/lan/browser/pub/',
      method: 'GET',
      headers: { 'X-Fbx-App-Auth': session}
  };

  http.get(getcomputerlist_options, callback);
  
}

function getSession(fn, sfn) {

    if ((session)&&((new Date().getTime() - dtsessionstart.getTime()) < 300000))
        return fn(sfn);

    var getchallenge_options = {
      host: host,
      port: '80',
      path: '/api/v1/login/',
      method: 'GET'
      };

  http.get(getchallenge_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          var data = JSON.parse(chunk);
          var password = getPassword(data.result.challenge);
            var login_data = '{ "app_id": "'+app_id+'","password": "'+password+'"}';

              // An object of options to indicate where to post to
              var login_options = {
                  host: host,
                  port: '80',
                  path: '/api/v1/login/session/',
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                      'Content-Length': login_data.length
                  }
              };

              // Set up the request
              var post_req = http.request(login_options, function(res) {
                  res.setEncoding('utf8');
                  res.on('data', function (chunk) {
                      var data = JSON.parse(chunk);
                      session = data.result.session_token;
                      dtsessionstart = new Date();

                      return fn(sfn);
                  });
              });

              post_req.write(login_data);
              post_req.end();
      });
  });
}


function getPassword(challenge) {
    shasum = crypto.createHmac('sha1', app_token);
    shasum.update(challenge);

    return shasum.digest('hex');
}

function askAppToken(fn) {
  var post_data = '{ "app_id": "'+app_id+'","app_name": "desktop_nodejs","app_version": "0.9.1","device_name": "Desktop"}';

  // An object of options to indicate where to post to
  var post_options = {
      host: host,
      port: '80',
      path: '/api/v1/login/authorize/',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': post_data.length
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
      });
  });

  post_req.write(post_data);
  post_req.end();

}