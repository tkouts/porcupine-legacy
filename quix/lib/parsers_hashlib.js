
QuiX.parsers = {};

//=============================================================================
// XML Parsers
//=============================================================================

QuiX.parsers.domFromString = function(s) {
    var dom = null;
    if (window.DOMParser)
        dom = (new DOMParser).parseFromString(s, 'text/xml');
    else if (window.ActiveXObject) {
        dom = new ActiveXObject("msxml2.domdocument");
        dom.loadXML(s);
    }
    return dom;
}

QuiX.parsers.domFromElement = function(el) {
    if (el.XMLDocument)
        return el.XMLDocument;
    else
        return QuiX.parsers.domFromString(el.innerHTML);
}

//=============================================================================
// RPC Parsers
//=============================================================================

// XML-RPC

QuiX.parsers.XMLRPC = {};

QuiX.parsers.XMLRPC.stringify = function(obj) {
    if (obj == null || obj == undefined || (typeof obj == "number" &&
                                            !isFinite(obj)))
        return false.toXMLRPC();
    else {
        if (!obj.toXMLRPC) {
            var retstr = "<struct>";
            for (var prop in obj) {
                if(typeof obj[prop] != "function") {
                    retstr += "<member><name>" + prop + "</name><value>" +
                              QuiX.parsers.XMLRPC.stringify(obj[prop]) +
                              "</value></member>";
                }
            }
            retstr += "</struct>";
            return retstr;
        }
        else {
            return obj.toXMLRPC();
        }
    }
}

QuiX.parsers.XMLRPC.parse = function(xml) {
    function getNode(data, len) {
        var nc = 0; //nodeCount
        if (data != null) {
            for (var i=0; i<data.childNodes.length; i++) {
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
        switch (data.tagName) {
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
                return Date.parseIso8601(data.firstChild.nodeValue);
                break;
            case "array":
                data = getNode(data, 0);
                if (data && data.tagName == "data") {
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
            case "nil":
                return null;
            default:
                throw new QuiX.Exception('QuiX.parsers.XMLRPC.parse',
                                         'Invalid tag name: ' + data.tagName);
        }
    }

    if (typeof xml === 'string')
        xml = QuiX.parsers.domFromString(xml);

    //Check for XMLRPC Errors
    var rpcErr = xml.getElementsByTagName("fault");
    if (rpcErr.length > 0) {
        rpcErr = toObject(getNode(rpcErr[0], 0));
        throw new QuiX.Exception(
            'QuiX.parsers.XMLRPC.parse',
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

QuiX.parsers.XMLRPC.packRequest = function(rid, method, args) {
    var request = '<?xml version="1.0"?><methodCall><methodName>' +
                  method + '</methodName><params>';
    for (var i=0; i<args.length; i++) {
        request += '<param><value>' +
                   QuiX.parsers.XMLRPC.stringify(args[i]) +
                   '</value></param>';
    }
    request += '</params></methodCall>';
    return request;
}

QuiX.parsers.XMLRPC.parseResponse = function(str /*, rid*/) {
    var dom;
    if (typeof str == 'string') {
        dom = QuiX.parsers.domFromString(arguments[0]);
    }
    else {
        dom = str;
    }
    if (dom) {
        return QuiX.parsers.XMLRPC.parse(dom);
    }
    else {
        throw new QuiX.Exception('QuiX.parsers.XMLRPC.parseResponse',
                                 'Malformed XMLRPC response');
    }
}

String.prototype.toXMLRPC = function() {
    return "<string>" + this.xmlEncode() + "</string>";
}

Number.prototype.toXMLRPC = function() {
    if (this == parseInt(this)) {
        return "<int>" + this + "</int>";
    }
    else if (this == parseFloat(this)) {
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

// JSON Parser

QuiX.parsers.JSON = {};

(function() {
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap, indent,
        meta = { // table of character substitutions
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
                                partial.push(quote(k) + (gap ? ': ':':') + v);
                            }
                        }
                    }
                }
                else {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ':':') + v);
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

    function dateReviver(key, value) {
        if (typeof value === 'string') {
            if (Date._iso8601Re.test(value)) {
                return Date.parseIso8601(value);
            }
        }
        else if (value && value.__date__ == true) {
            return Date.parseIso8601(value.value);
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
    // normally this should be used: return this.toIso8601();
    // but in order to accomodate the Python
    // json parser using an object hook
    // we encode dates in a somehow different way
    return {
        __date__ : true,
        value : this.toIso8601()
    }
};

String.prototype.toJSON =
Number.prototype.toJSON =
Boolean.prototype.toJSON = function (key) {
    return this.valueOf();
};

// JSON-RPC 2.0 Parser

QuiX.parsers.JSONRPC2 = {};

QuiX.parsers.JSONRPC2.packRequest = function(rid, method, args) {
    var request = {jsonrpc: '2.0',
                   method: method,
                   params: args,
                   id: rid}
    return QuiX.parsers.JSON.stringify(request);
}

QuiX.parsers.JSONRPC2.parseResponse = function(str /*, rid*/) {
    var rid = arguments[1] || null;
    var response = QuiX.parsers.JSON.parse(str);
    if (response.jsonrpc != '2.0')
        throw new QuiX.Exception('QuiX.parsers.JSONRPC2.parseResponse',
                                 'Invalid JSON response');
    // check for errors
    if (response.error) {
        var message = response.error.message;
        if (response.error.data)
            message += '\n\n' + response.error.data
        throw new QuiX.Exception('QuiX.parsers.JSONRPC2.parseResponse',
                                 response.error.code + ' - ' +
                                 message);
    }
    if (rid && rid != response.id) {
        throw new QuiX.Exception('QuiX.parsers.JSONRPC2.parseResponse',
                                 'Invalid response ID');
    }
    return response.result;
}

//=============================================================================
// Hash functions
//=============================================================================

QuiX.hashlib = (function() {
    /* A JavaScript implementation of the Secure Hash Standard
     * Version 0.3 Copyright Angel Marin 2003-2004 - http://anmar.eu.org/
     * Distributed under the BSD License
     * Some bits taken from Paul Johnston's SHA-1 implementation
     */
    var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode */
    var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase */

    function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    function S(X, n) {
        return ( X >>> n ) | (X << (32 - n));
    }

    function R(X, n) {
        return ( X >>> n );
    }

    function Ch(x, y, z) {
        return ((x & y) ^ ((~x) & z));
    }

    function Maj(x, y, z) {
        return ((x & y) ^ (x & z) ^ (y & z));
    }

    function Sigma0256(x) {
        return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
    }

    function Sigma1256(x) {
        return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
    }

    function Gamma0256(x) {
        return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
    }

    function Gamma1256(x) {
        return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
    }

    function core_sha256 (m, l) {
        var K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B,
                 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01,
                 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7,
                 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC,
                 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152,
                 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147,
                 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC,
                 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
                 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819,
                 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08,
                 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F,
                 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
                 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
        var HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F,
                    0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
        var W = new Array(64);
        var a, b, c, d, e, f, g, h, i, j;
        var T1, T2;

        /* append padding */
        m[l >> 5] |= 0x80 << (24 - l % 32);
        m[((l + 64 >> 9) << 4) + 15] = l;

        for (i = 0; i < m.length; i += 16 ) {
            a = HASH[0];
            b = HASH[1];
            c = HASH[2];
            d = HASH[3];
            e = HASH[4];
            f = HASH[5];
            g = HASH[6];
            h = HASH[7];

            for (j = 0; j<64; j++) {
                if (j < 16)
                    W[j] = m[j + i];
                else
                    W[j] = safe_add(safe_add(safe_add(
                           Gamma1256(W[j - 2]), W[j - 7]),
                           Gamma0256(W[j - 15])), W[j - 16]);

                T1 = safe_add(safe_add(safe_add(
                     safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
                T2 = safe_add(Sigma0256(a), Maj(a, b, c));

                h = g;
                g = f;
                f = e;
                e = safe_add(d, T1);
                d = c;
                c = b;
                b = a;
                a = safe_add(T1, T2);
            }
            HASH[0] = safe_add(a, HASH[0]);
            HASH[1] = safe_add(b, HASH[1]);
            HASH[2] = safe_add(c, HASH[2]);
            HASH[3] = safe_add(d, HASH[3]);
            HASH[4] = safe_add(e, HASH[4]);
            HASH[5] = safe_add(f, HASH[5]);
            HASH[6] = safe_add(g, HASH[6]);
            HASH[7] = safe_add(h, HASH[7]);
        }
        return HASH;
    }

    /* A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
     * Digest Algorithm, as defined in RFC 1321.
     * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * Distributed under the BSD License
     * See http://pajhome.org.uk/crypt/md5 for more info.
     */
    function rstr_md5(s) {
        return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
    }

    function binl_md5(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;

            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return Array(a, b, c, d);
    }

    function md5_cmn(q, a, b, x, s, t) {
        return safe_add(
            bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
    }
    function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    }
    function bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    // conversion functions
    function str2binb(str) {
        var bin = [];
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < str.length * chrsz; i += chrsz)
            bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
        return bin;
    }
    function binb2str(bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < bin.length * 32; i += chrsz)
            str += String.fromCharCode((bin[i>>5] >>> (24 - i%32)) & mask);
        return str;
    }
    function binb2hex(binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for (var i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
            hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
        }
        return str;
    }
    function rstr2hex(input) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var output = "";
        var x;
        for (var i=0; i < input.length; i++) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt((x >>> 4) & 0x0F)
            +  hex_tab.charAt( x        & 0x0F);
        }
        return output;
    }
    function str2rstr_utf8(input) {
        var output = "";
        var i = -1;
        var x, y;

        while (++i < input.length) {
            /* Decode utf-16 surrogate pairs */
            x = input.charCodeAt(i);
            y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
            if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
                x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
                i++;
            }
            /* Encode output as utf-8 */
            if (x <= 0x7F)
                output += String.fromCharCode(x);
            else if (x <= 0x7FF)
                output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                    0x80 | ( x         & 0x3F));
            else if (x <= 0xFFFF)
                output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                    0x80 | ((x >>> 6 ) & 0x3F),
                    0x80 | ( x         & 0x3F));
            else if (x <= 0x1FFFFF)
                output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                    0x80 | ((x >>> 12) & 0x3F),
                    0x80 | ((x >>> 6 ) & 0x3F),
                    0x80 | ( x         & 0x3F));
        }
        return output;
    }
    function rstr2binl(input) {
        var i;
        var output = Array(input.length >> 2);
        for (i = 0; i < output.length; i++)
            output[i] = 0;
        for (i = 0; i < input.length * 8; i += 8)
            output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
        return output;
    }
    function binl2rstr(input) {
        var output = "";
        for (var i = 0; i < input.length * 32; i += 8)
            output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
        return output;
    }

    return {
        hex_sha256 : function(s){
            return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
        },
        str_sha256 : function(s) {
            return binb2str(core_sha256(str2binb(s), s.length * chrsz));
        },
        hex_md5 : function(s) {
            return rstr2hex(rstr_md5(str2rstr_utf8(s)));
        },
        str_md5 : function(s) {
            return rstr_md5(str2rstr_utf8(s))
        }
    }
})();
