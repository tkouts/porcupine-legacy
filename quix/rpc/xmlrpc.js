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

QuiX.rpc.XMLRPCRequest = function(sUrl /*, async*/) {
    var async = arguments[1] || true;
    this.base = QuiX.rpc.BaseRPCRequest;
    this.base(sUrl, async);
}

QuiX.rpc.XMLRPCRequest.prototype = new QuiX.rpc.BaseRPCRequest;

QuiX.rpc.XMLRPCRequest.prototype._contentType = 'text/xml';

QuiX.rpc.XMLRPCRequest.prototype._processResult = function(/*xmlrpcstr*/) {
    try {
        var dom;
        if (arguments[0]) {
            dom = QuiX.domFromString(arguments[0]);
        }
        else {
            dom = this.xmlhttp.responseXML;
        }
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

QuiX.rpc.XMLRPCRequest.prototype._buildRequestBody = function(method_name
                                                       /*, arg1, arg2, ...*/) {
    var message = '<?xml version="1.0"?><methodCall><methodName>' +
                  method_name + '</methodName><params>';
    for (var i=1; i<arguments.length; i++)
            message += '<param><value>' +
               QuiX.parsers.XMLRPC.stringify(arguments[i]) +
               '</value></param>';
    message += '</params></methodCall>';
    return message;
}

QuiX.rpc.XMLRPCRequest.prototype._validateMethodName = function(mname) {
    if( /^[A-Za-z0-9\._\/:]+$/.test(mname) )
        return true
    else
        return false
}
