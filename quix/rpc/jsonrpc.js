//==============================================================================
//  Copyright 2009 Tassos Koutsovassilis
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

QuiX.rpc.JSONRPCRequest = function(sUrl /*, async*/) {
    var async = arguments[1] || true;
    this.base = QuiX.rpc.BaseRPCRequest;
    this.base(sUrl, async);
}

QuiX.rpc.JSONRPCRequest.prototype = new QuiX.rpc.BaseRPCRequest;

QuiX.rpc.JSONRPCRequest.prototype._contentType = 'application/json';
QuiX.rpc.JSONRPCRequest._requestId = 0;

QuiX.rpc.JSONRPCRequest.prototype._processResult = function(/*jsonstr*/) {
    var response;
    try {
        var jsonstr = arguments[0] || this.xmlhttp.responseText;
        response = QuiX.parsers.JSON.parse(jsonstr);
        if (response.jsonrpc != '2.0')
            throw new QuiX.Exception('QuiX.rpc.JSONRPCRequest',
                                     'Invalid JSON response');
        // check for errors
        if (response.error) {
            var message = response.error.message;
            if (response.error.data)
                message += '\n\n' + response.error.data
            throw new QuiX.Exception('QuiX.rpc.JSONRPCRequest',
                                     response.error.code + ' - ' +
                                     message);
        }
        if (arguments.length == 0 && response.id != this.id)
            throw new QuiX.Exception('QuiX.rpc.JSONRPCRequest',
                                     'Invalid response ID');
        return response.result;
    }
    catch (e) {
        QuiX.rpc.handleError(this, e);
    }
}

QuiX.rpc.JSONRPCRequest.prototype._buildRequestBody = function(method_name
                                                        /*, arg1, arg2, ...*/) {
    this.id = ++QuiX.rpc.JSONRPCRequest._requestId;
    var request = {
        'jsonrpc' : '2.0',
        'method' : method_name,
        'params' : Array.prototype.concat.apply([], arguments).
                   splice(1, arguments.length - 1),
        'id' : this.id
    }
    return QuiX.parsers.JSON.stringify(request);
}
