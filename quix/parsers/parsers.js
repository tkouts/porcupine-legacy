//==============================================================================
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

QuiX.parsers = {};

//==============================================================================
// XML-RPC Parser
//==============================================================================
QuiX.parsers.XMLRPC = {};

QuiX.parsers.XMLRPC.stringify = function(obj) {
	if (obj == null || obj == undefined || (typeof obj == "number" &&
                                            !isFinite(obj)))
		return false.toXMLRPC();
	else {
		if(!obj.toXMLRPC) {
			var retstr = "<struct>";
			for (prop in obj) {
				if(typeof obj[prop] != "function") {
					retstr += "<member><name>" + prop + "</name><value>" +
							  QuiX.parsers.XMLRPC.stringify(obj[prop]) +
                              "</value></member>";
				}
			}
			retstr += "</struct>";
			return retstr;
		}
		else
			return obj.toXMLRPC();
	}
}

QuiX.parsers.XMLRPC.parse = function(xml) {
    function getNode(data, len) {
        var nc = 0; //nodeCount
        if(data != null) {
            for(var i=0; i<data.childNodes.length; i++) {
                if(data.childNodes[i].nodeType == 1) {
                    if(nc == len)
                        return data.childNodes[i];
                    else
                        nc++
                }
            }
        }
        return false;
    }
    function toObject(data) {
        var ret, i, elem;
        switch(data.tagName) {
            case "string":
                return (data.firstChild)?
                       data.firstChild.nodeValue.toString():"";
                break;
            case "int":
            case "i4":
            case "double":
                return (data.firstChild)?
                       new Number(data.firstChild.nodeValue):0;
                break;
            case "dateTime.iso8601":
                return new Date().parseIso8601(data.firstChild.nodeValue);
                break;
            case "array":
                data = getNode(data, 0);
                if(data && data.tagName == "data") {
                    ret = [];
                    for (i=0; i<data.childNodes.length; ++i) {
                        elem = data.childNodes[i];
                        if (elem.nodeType == 1) ret.push(toObject(elem));
                    }
                    return ret;
                }
                else
                    throw new QuiX.Exception('QuiX.parsers.XMLRPC.parse',
                                             'Bad array.');
                break;
            case "struct":
                ret = {};
                for (i=0; i<data.childNodes.length; ++i) {
                    elem = data.childNodes[i];
                    if (elem.nodeType == 1) {
                        if(elem.tagName == "member")
                            ret[getNode(elem,0).firstChild.nodeValue] =
                                toObject(getNode(elem, 1));
                        else
                            throw new QuiX.Exception(
                                    'QuiX.parsers.XMLRPC.parse',
                                    "'member' element expected, found '" +
                                    elem.tagName + "' instead");
                    }
                }
                return ret;
                break;
            case "boolean":
                return Boolean(isNaN(parseInt(data.firstChild.nodeValue))?
                    (data.firstChild.nodeValue == "true"):
                    parseInt(data.firstChild.nodeValue));
                break;
            case "value":
                var child = getNode(data, 0);
                return (!child)? ((data.firstChild)?
                    data.firstChild.nodeValue.toString():""):toObject(child);
                break;
            default:
                throw new QuiX.Exception('QuiX.parsers.XMLRPC.parse',
                                         'Invalid tag name: ' + data.tagName);
        }
    }

    if (typeof xml === 'string')
        xml = QuiX.domFromString(xml);

    //Check for XMLRPC Errors
    var rpcErr = xml.getElementsByTagName("fault");
    if (rpcErr.length > 0) {
        rpcErr = toObject(getNode(rpcErr[0], 0));
        throw new QuiX.Exception('QuiX.parsers.XMLRPC.parse',
                                 rpcErr.faultCode + ' - ' + rpcErr.faultString);
    }
    //handle result
    var main = xml.getElementsByTagName("param");
    if (main.length == 0) {
        throw new QuiX.Exception('QuiX.parsers.XMLRPC.parse',
                                 '"param" element is missing');
    }
    var data = toObject(getNode(main[0], 0));
    return data;
}

String.prototype.toXMLRPC = function() {
	return "<string>" + this.xmlEncode() + "</string>";
}

Number.prototype.toXMLRPC = function() {
	if(this == parseInt(this)){
		return "<int>" + this + "</int>";
	}
	else if(this == parseFloat(this)) {
		return "<double>" + this + "</double>";
	}
	else {
		return false.toXMLRPC();
	}
}

Boolean.prototype.toXMLRPC = function() {
	if (this==true) return "<boolean>1</boolean>";
	else return "<boolean>0</boolean>";
}

Date.prototype.toXMLRPC = function() {
	var d = "<dateTime.iso8601>" + this.toIso8601() + "</dateTime.iso8601>";
	return(d);
}

Array.prototype.toXMLRPC = function() {
	var retstr = "<array><data>";
	for (var i=0; i<this.length; i++) {
		retstr += "<value>" + QuiX.parsers.XMLRPC.stringify(this[i]) +
                  "</value>";
	}
	return retstr + "</data></array>";
}

//==============================================================================
// JSON Parser
//==============================================================================
QuiX.parsers.JSON = {};

(function() {
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap, indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;

    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }

    function str(key, holder) {
        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];
        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }
        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }
        switch (typeof value) {
            case 'string':
                return quote(value);
            case 'number':
                return isFinite(value) ? String(value) : 'null';
            case 'boolean':
            case 'null':
                return String(value);
            case 'object':
                if (!value) {
                    return 'null';
                }
                gap += indent;
                partial = [];
                if (Object.prototype.toString.apply(value)==='[object Array]') {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }
                    v = partial.length === 0 ? '[]' :
                        gap ? '[\n' + gap +
                                partial.join(',\n' + gap) + '\n' +
                                    mind + ']' :
                              '[' + partial.join(',') + ']';
                    gap = mind;
                    return v;
                }
                if (rep && typeof rep === 'object') {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        k = rep[i];
                        if (typeof k === 'string') {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                }
                else {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                }
                v = partial.length === 0 ? '{}' :
                    gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                            mind + '}' : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
        }
    }

    function dateReviver (key, value) {
        if (typeof value === 'string') {
            if(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.test(value)) {
                return new Date(RegExp.$1,RegExp.$2-1,RegExp.$3,
                                RegExp.$4,RegExp.$5,RegExp.$6);
            }
        }
        return value;
    }

    QuiX.parsers.JSON.stringify = function (value, replacer, space) {
        var i;
        gap = '';
        indent = '';
        if (typeof space === 'number') {
            for (i=0; i<space; i+=1) {
                indent += ' ';
            }
        }
        else if (typeof space === 'string') {
            indent = space;
        }
        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                 typeof replacer.length !== 'number')) {
            throw new QuiX.Exception('QuiX.parsers.JSON.stringify',
                                     'Invalid replacer');
        }
        return str('', {'': value});
    }

    QuiX.parsers.JSON.parse = function (text, reviver) {
        var j;
        if (typeof reviver === 'undefined')
            reviver = dateReviver;
        function walk(holder, key) {
            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (v !== undefined) {
                            value[k] = v;
                        }
                        else {
                            delete value[k];
                        }
                    }
                }
            }
            return reviver.call(holder, key, value);
        }
        cx.lastIndex = 0;
        if (cx.test(text)) {
            text = text.replace(cx, function (a) {
                return '\\u' +
                    ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }
        if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
            j = eval('(' + text + ')');
            return typeof reviver === 'function' ?
                walk({'': j}, '') : j;
        }
        throw new QuiX.Exception('QuiX.parsers.JSON.stringify',
                                 'Invalid JSON string');
    }
})();


Date.prototype.toJSON = function (key) {
    return this.toIso8601();
};

String.prototype.toJSON =
Number.prototype.toJSON =
Boolean.prototype.toJSON = function (key) {
    return this.valueOf();
};
