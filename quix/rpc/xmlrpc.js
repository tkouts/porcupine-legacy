//==============================================================================
//  Copyright 2000, 2001, 2002 Virtual Cowboys (info@virtualcowboys.nl)
//  Copyright 2005-2009 Tassos Koutsovassilis and contributors
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
//==============================================================================

QuiX.rpc.XMLRPCRequest = function(sUrl, async) {
	this.async = ((typeof async) == "undefined")?true:async;
	this.url = sUrl;
	this.xmlhttp = QuiX.XHRPool.getInstance();
	
	this.onreadystatechange = null;
	this.oncomplete = null;
    this._cached = null;
	
	this.callback_info = null;
	this.response = null;
	this.use_cache = true;
	
	this.onerror = null;
}

// backwards compatibility
var XMLRPCRequest = QuiX.rpc.XMLRPCRequest;

QuiX.rpc.XMLRPCRequest.prototype.processResult = function(dom) {
	try {
		dom = dom || this.xmlhttp.responseXML;
		if (dom) {
            return QuiX.parsers.XMLRPC.parse(dom);
		}
		else {
			throw new QuiX.Exception('QuiX.rpc.XMLRPCRequest',
									 'Malformed XMLRPC response');
		}
	}
	catch (e) {
		QuiX.rpc.handleError(this, e);
	}
}

QuiX.rpc.XMLRPCRequest.prototype.callmethod = function(method_name) {
	try {
		if (this._validateMethodName(method_name)) {
            var argsArray, key;
			var message = '<?xml version="1.0"?><methodCall><methodName>' +
						  method_name + '</methodName><params>';
		   	for (var i=1; i<arguments.length; i++)
		   		message += '<param><value>' +
                           QuiX.parsers.XMLRPC.stringify(arguments[i]) +
		   				   '</value></param>';
			message += '</params></methodCall>';

			if (this.use_cache) {
            	argsArray = Array.prototype.concat.apply([], arguments);
            	key = QuiX.utils.hashlib.hex_sha256(
                	this.url + QuiX.parsers.JSON.stringify(argsArray));
			}

			QuiX.addLoader();	
			this.xmlhttp.open('POST', this.url, this.async);
			this.xmlhttp.setRequestHeader("Content-type", "text/xml");
			
			var self = this;
			this.xmlhttp.onreadystatechange = function() {
				if (self.xmlhttp.readyState==4) {
                    var retVal = null;
                    var dom = null;
                    var status = self.xmlhttp.status;
					// parse response...
                    try {
                        if (status == 304) { //Not modified
                            dom = QuiX.domFromString(self._cached)
                            retVal = self.processResult(dom);
                        }
                        else {
                            retVal = self.processResult();
                            var etag = self.xmlhttp.getResponseHeader('Etag');
                            if (QuiX.rpc._cache && etag) {
                                QuiX.rpc._cache.set(key,
                                    etag, self.xmlhttp.responseText);
                            }
                        }
                        if (retVal != null && self.oncomplete) {
                            self.response = retVal;
                            self.oncomplete(self);
                        }
                    }
                    finally {
                        QuiX.removeLoader();
                        QuiX.XHRPool.release(self.xmlhttp);
                        self._cached = null;
                    }
				}
				else {
					if (self.onreadystatechange)
						self.onreadystatechange(self);
				}
			}

            if (QuiX.rpc._cache && this.use_cache) {
                QuiX.rpc._cache.get(key, function(val) {
                    if (val != null) {
                        self.xmlhttp.setRequestHeader("If-None-Match", val[0]);
                        self._cached = val[1];
                    }
                    self.xmlhttp.send(message);
                });
            }
            else
                self.xmlhttp.send(message);
		}
		else
			throw new QuiX.Exception('QuiX.rpc.XMLRPCRequest.callMethod',
									 'Invalid XMLRPC method name "' +
									 method_name + '"');
	}
	catch (e) {
		QuiX.rpc.handleError(this, e);
	}
}

QuiX.rpc.XMLRPCRequest.prototype._validateMethodName = function(mname) {
	if( /^[A-Za-z0-9\._\/:]+$/.test(mname) )
		return true
	else
		return false
}
