//=============================================================================
//  Copyright (c) 2005-2011 Tassos Koutsovassilis and Contributors
//
//  This file is part of Porcupine.
//  Porcupine is free software; you can redistribute it and/or modify
//  it under the terms of the GNU Lesser General Public License as published by
//  the Free Software Foundation; either version 2.1 of the License, or
//  (at your option) any later version.
//  Porcupine is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Lesser General Public License for more details.
//  You should have received a copy of the GNU Lesser General Public License
//  along with Porcupine; if not, write to the Free Software
//  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
//=============================================================================

QuiX.rpc = {};

QuiX.rpc._cache = (function() {
    if (QuiX.persist && QuiX.persist.type) {
        try {
            var cache = new QuiX.persist.Store('rpccache');
        }
        catch(e) {
            return null;
        }
        return {
            get : function(key, callback) {
                cache.get(key,
                    function(ok, value){
                        if (value) {
                            value = unescape(value);
                            var _pos = value.indexOf('_');
                            callback([value.substring(0, _pos),
                                      value.substring(_pos + 1)]);
                        }
                        else
                            callback(null);
                    });
            },
            set : function(key, etag, response) {
                var value = escape(etag + '_' + response);
                if (!QuiX.persist.size || QuiX.persist.size < 0 ||
                        QuiX.persist.size > value.length) {
                    cache.set(key, value);
                }
            }
        }
    }
    else
        return null;
})();

QuiX.rpc._requestId = 0;
QuiX.rpc._requests = {};

// base rpc request

QuiX.rpc.BaseRPCRequest = function(url /*, async*/) {
    if (typeof url != 'undefined') {
        this.async = (typeof arguments[1] != 'undefined')? arguments[1] : true;
        this.url = url || '.';
        this.response = null;
        this.use_cache = true;
        this.id = ++QuiX.rpc._requestId;
        this._xmlhttp = null;

        // events
        this.onreadystatechange = null;
        this.oncomplete = null;
        this.callback_info = null;

        this._cached = null;
        this._contentType = 'text/plain';
        this._parser = null;
    }
}

QuiX.rpc.BaseRPCRequest._onstatechange = function() {
    var request = QuiX.rpc._requests[this.id];
    if (this.readyState == 4) {
        var response = null;
        var status = this.status;
        // parse response...
        try {
            if (status == 304 ||(status == 0 && QuiX.utils.BrowserInfo.family == 'op') ) { //Not modfied
                response = request._parser.parseResponse(request._cached);
            }
            else if (status!=0 && this.responseText != "") {
                response = request._parser.parseResponse(
                    (this.responseXML && this.responseXML.documentElement)?
                    this.responseXML:this.responseText, request.id);
                var etag = this.getResponseHeader('Etag');
                if (QuiX.rpc._cache && etag) {
                    QuiX.rpc._cache.set(request.key, etag, this.responseText);
                }
            }
            if (response != null && request.oncomplete) {
                request.response = response;
                request.oncomplete(request);
            }
        }
        catch(e) {
            request.onerror(e);
        }
        finally {
            QuiX.removeLoader();
            request._cached = null;
            QuiX.XHRPool.release(this);
            delete QuiX.rpc._requests[request.id];
        }
    }
    else {
        if (request.onreadystatechange)
            request.onreadystatechange(request);
    }
}

QuiX.rpc.BaseRPCRequest.prototype._validateMethodName = function(mname) {
    return true;
}

QuiX.rpc.BaseRPCRequest.prototype.onerror = function(e) {
    QuiX.displayError(e);
}

QuiX.rpc.BaseRPCRequest.prototype._getResponse = function() {
	var xmlhttp = this._xmlhttp;
    return this._parser.parseResponse(
                    (xmlhttp.responseXML && xmlhttp.responseXML.documentElement)?
                     xmlhttp.responseXML:xmlhttp.responseText, xmlhttp.id);
}

QuiX.rpc.BaseRPCRequest.prototype.abort = function() {
	if(this._xmlhttp != null) {
		this._xmlhttp.abort();
		QuiX.XHRPool.release(this._xmlhttp);
        delete QuiX.rpc._requests[this.id];
		this._xmlhttp = null;
		QuiX.removeLoader();
	}
}

QuiX.rpc.BaseRPCRequest.prototype.callmethod =
function(method_name /*, arg1, arg2, ...*/) {
    if (this._validateMethodName(method_name)) {
        var args = Array.prototype.slice.call(arguments);
        var request = this._parser.packRequest(this.id, method_name,
                                               args.slice(1, args.length));
        this._xmlhttp = QuiX.XHRPool.getInstance();

        this._xmlhttp.id = this.id;
        this._xmlhttp.open('POST', this.url, this.async);
        this._xmlhttp.setRequestHeader('Content-Type', this._contentType);

        if (this.async) {
            this._xmlhttp.onreadystatechange = function() {
                QuiX.rpc.BaseRPCRequest._onstatechange.apply(this);
            }
        }

        if (this.use_cache) {
            this.key = QuiX.hashlib.hex_md5(
                this.type + this.url + QuiX.parsers.JSON.stringify(args));
        }

        QuiX.rpc._requests[this.id] = this;
        QuiX.addLoader();

        if (QuiX.rpc._cache && this.use_cache && this.async) {
            var self = this;
            QuiX.rpc._cache.get(this.key, function(val) {
                if (val != null) {
                    self._xmlhttp.setRequestHeader("If-None-Match", val[0]);
                    self._cached = val[1];
                }
                self._xmlhttp.send(request);
            });
        }
        else {
            this._xmlhttp.send(request);
            if (!this.async) {
                try {
                    return this._getResponse();
                }
                finally {
                    QuiX.removeLoader();
                    QuiX.XHRPool.release(this._xmlhttp);
                    delete QuiX.rpc._requests[this.id];
                }
            }
        }
    }
    else {
        throw new QuiX.Exception('QuiX.rpc.BaseRPCRequest.callMethod',
                                 'Invalid RPC method name "' +
                                 method_name + '"');
    }
}

// XML-RPC request

QuiX.rpc.XMLRPCRequest = function(url /*, async*/) {
    var async = (typeof arguments[1] != 'undefined')? arguments[1]:true;

    QuiX.rpc.BaseRPCRequest.call(this, url, async);

    this.type = 'xml-rpc';
    this._contentType = 'text/xml';
    this._parser = QuiX.parsers.XMLRPC;
}

QuiX.rpc.XMLRPCRequest.prototype = new QuiX.rpc.BaseRPCRequest;

QuiX.rpc.XMLRPCRequest.prototype._validateMethodName = function(mname) {
    if(/^[A-Za-z0-9\._\/:]+$/.test(mname)) {
        return true
    }
    else {
        return false
    }
}

// JSON-RPC 2.0 request

QuiX.rpc.JSONRPCRequest = function(url /*, async*/) {
    var async = (typeof arguments[1] != 'undefined')? arguments[1]:true;

    QuiX.rpc.BaseRPCRequest.call(this, url, async);

    this.type = 'json-rpc';
    this._contentType = 'application/json';
    this._parser = QuiX.parsers.JSONRPC2;
}

QuiX.rpc.JSONRPCRequest.prototype = new QuiX.rpc.BaseRPCRequest;
