//==============================================================================
//  Copyright 2005-2009, Tassos Koutsovassilis
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

function ce(t) {
    return document.createElement(t);
}

QuiX.utils = {};

QuiX.utils.uid = (
    /* uid generator */
    function(){
        var id=0;
        return function(){
            return id++ ;
        };
    })();

//==============================================================================
// Hash functions
//==============================================================================
QuiX.utils.hashlib = (function() {
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
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
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
    function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
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
            output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
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

//==============================================================================
// browser and os detection utility
//==============================================================================
QuiX.utils.BrowserInfo = {
	init: function() {
		this.browser = this.searchString(this.dataBrowser)
            || "Unknown browser";
        this.family = this.families[this.browser] || "Unknown family";
		this.version = this.searchVersion(navigator.userAgent)
			|| this.searchVersion(navigator.appVersion)
			|| "Unknown version";
		this.OS = this.searchString(this.dataOS) || "Unknown OS";
	},
	searchString: function(data) {
		for (var i=0;i<data.length;i++)	{
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch
                || data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			}
			else if (dataProp)
				return data[i].identity;
		}
	},
	searchVersion: function(dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1) return null;
        var ver = dataString.substring(index+this.versionSearchString.length+1);
		return parseFloat(ver);
	},
    families: {
        "Chrome": "saf",
        "Safari": "saf",
        "Explorer": "ie",
        "OmniWeb": "omni",
        "Opera": "op",
        "iCab": "icab",
        "Konqueror": "kon",
        "Firefox": "moz",
        "Camino": "moz",
        "Netscape": "moz",
        "Mozilla": "moz"
    },
	dataBrowser: [
		{
			string: navigator.userAgent,
			subString: "Chrome",
			identity: "Chrome"
		},
		{
            string: navigator.userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/",
			identity: "OmniWeb"
		},
		{
			string: navigator.vendor,
			subString: "Apple",
			identity: "Safari",
			versionSearch: "Version"
		},
		{
			prop: window.opera,
			identity: "Opera",
            family: "op"
		},
		{
			string: navigator.vendor,
			subString: "iCab",
			identity: "iCab"
		},
		{
			string: navigator.vendor,
			subString: "KDE",
			identity: "Konqueror"
		},
		{
			string: navigator.userAgent,
			subString: "Firefox",
			identity: "Firefox"
		},
		{
			string: navigator.vendor,
			subString: "Camino",
			identity: "Camino"
		},
		{	// for newer Netscapes (6+)
			string: navigator.userAgent,
			subString: "Netscape",
			identity: "Netscape"
		},
		{
			string: navigator.userAgent,
			subString: "MSIE",
			identity: "Explorer",
			versionSearch: "MSIE"
		},
		{
			string: navigator.userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},
		{ 	// for older Netscapes (4-)
			string: navigator.userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		}
	],
	dataOS : [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},
		{
			string: navigator.platform,
			subString: "Mac",
			identity: "MacOS"
		},
		{
            string: navigator.userAgent,
            subString: "iPhone",
            identity: "iPhone/iPod"
	    },
		{
			string: navigator.platform,
			subString: "Linux",
			identity: "Linux"
		}
	]
};
QuiX.utils.BrowserInfo.init();

//==============================================================================
// SWFObject utility
//==============================================================================
QuiX.utils.swfobject = function() {
    /*! SWFObject v2.1 <http://code.google.com/p/swfobject/>
        Copyright (c) 2007-2008 Geoff Stearns, Michael Williams,
                                and Bobby van der Sluis
        This software is released under the MIT License
        <http://www.opensource.org/licenses/mit-license.php>
    */
	var UNDEF = "undefined",
		OBJECT = "object",
		SHOCKWAVE_FLASH = "Shockwave Flash",
		SHOCKWAVE_FLASH_AX = "ShockwaveFlash.ShockwaveFlash",
		FLASH_MIME_TYPE = "application/x-shockwave-flash",
		EXPRESS_INSTALL_ID = "SWFObjectExprInst",

		win = window,
		doc = document,
		nav = navigator,

		objIdArr = [],
		listenersArr = [],
		storedAltContent = null,
		storedAltContentId = null,
		isExpressInstallActive = false;

	var ua = function() {
		var w3cdom = typeof doc.getElementById != UNDEF &&
                     typeof doc.getElementsByTagName != UNDEF &&
                     typeof doc.createElement != UNDEF,
			playerVersion = [0,0,0],
			d = null;
		if (typeof nav.plugins != UNDEF &&
                typeof nav.plugins[SHOCKWAVE_FLASH] == OBJECT) {
			d = nav.plugins[SHOCKWAVE_FLASH].description;
            // indicates whether plug-ins are enabled or disabled in Safari 3+
			if (d && !(typeof nav.mimeTypes != UNDEF &&
                    nav.mimeTypes[FLASH_MIME_TYPE] &&
                    !nav.mimeTypes[FLASH_MIME_TYPE].enabledPlugin)) {
				d = d.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
				playerVersion[0] = parseInt(d.replace(/^(.*)\..*$/, "$1"), 10);
				playerVersion[1] = parseInt(d.replace(/^.*\.(.*)\s.*$/, "$1"),
                                            10);
				playerVersion[2] = /r/.test(d) ? parseInt(d.replace(
                    /^.*r(.*)$/, "$1"),10) : 0;
			}
		}
		else if (typeof win.ActiveXObject != UNDEF) {
			var a = null, fp6Crash = false;
			try {
				a = new ActiveXObject(SHOCKWAVE_FLASH_AX + ".7");
			}
			catch(e) {
				try {
					a = new ActiveXObject(SHOCKWAVE_FLASH_AX + ".6");
					playerVersion = [6,0,21];
                    // Introduced in fp6.0.47
					a.AllowScriptAccess = "always";
				}
				catch(e) {
					if (playerVersion[0] == 6) {
						fp6Crash = true;
					}
				}
				if (!fp6Crash) {
					try {
						a = new ActiveXObject(SHOCKWAVE_FLASH_AX);
					}
					catch(e) {}
				}
			}
            // a will return null when ActiveX is disabled
			if (!fp6Crash && a) {
				try {
                    // Will crash fp6.0.21/23/29
					d = a.GetVariable("$version");
					if (d) {
						d = d.split(" ")[1].split(",");
						playerVersion = [parseInt(d[0], 10), parseInt(d[1], 10),
                                         parseInt(d[2], 10)];
					}
				}
				catch(e) {}
			}
		}
		var u = nav.userAgent.toLowerCase(),
			p = nav.platform.toLowerCase(),
			webkit = /webkit/.test(u) ? parseFloat(u.replace(
                /^.*webkit\/(\d+(\.\d+)?).*$/, "$1")) : false,
			ie = false,
			windows = p ? /win/.test(p) : /win/.test(u),
			mac = p ? /mac/.test(p) : /mac/.test(u);
		/*@cc_on
			ie = true;
			@if (@_win32)
				windows = true;
			@elif (@_mac)
				mac = true;
			@end
		@*/
		return { w3cdom:w3cdom, pv:playerVersion, webkit:webkit, ie:ie,
                 win:windows, mac:mac };
	}();

	/* Fix nested param elements, which are ignored by older webkit engines
		- This includes Safari up to and including version 1.2.2 on Mac OS 10.3
		- Fall back to the proprietary embed element
	*/
	function fixParams(obj) {
		var nestedObj = obj.getElementsByTagName(OBJECT)[0];
		if (nestedObj) {
			var e = ce("embed"), a = nestedObj.attributes;
			if (a) {
				var al = a.length;
				for (var i = 0; i < al; i++) {
					if (a[i].nodeName == "DATA") {
						e.setAttribute("src", a[i].nodeValue);
					}
					else {
						e.setAttribute(a[i].nodeName, a[i].nodeValue);
					}
				}
			}
			var c = nestedObj.childNodes;
			if (c) {
				var cl = c.length;
				for (var j = 0; j < cl; j++) {
					if (c[j].nodeType == 1 && c[j].nodeName == "PARAM") {
						e.setAttribute(c[j].getAttribute("name"),
                                       c[j].getAttribute("value"));
					}
				}
			}
			obj.parentNode.replaceChild(e, obj);
		}
	}

	function showExpressInstall(regObj) {
		isExpressInstallActive = true;
		var obj = getElementById(regObj.id);
		if (obj) {
			if (regObj.altContentId) {
				var ac = getElementById(regObj.altContentId);
				if (ac) {
					storedAltContent = ac;
					storedAltContentId = regObj.altContentId;
				}
			}
			else {
				storedAltContent = abstractAltContent(obj);
			}
			if (!(/%$/.test(regObj.width)) &&
                    parseInt(regObj.width, 10) < 310) {
				regObj.width = "310";
			}
			if (!(/%$/.test(regObj.height)) &&
                    parseInt(regObj.height, 10) < 137) {
				regObj.height = "137";
			}
			doc.title = doc.title.slice(0, 47) + " - Flash Player Installation";
			var pt = ua.ie && ua.win ? "ActiveX" : "PlugIn",
				dt = doc.title,
				fv = "MMredirectURL=" + win.location + "&MMplayerType=" + pt +
                     "&MMdoctitle=" + dt,
				replaceId = regObj.id;
			// For IE when a SWF is loading (AND: not available in cache)
            // wait for the onload event to fire to remove the original object
            // element
			// In IE you cannot properly cancel a loading SWF file
            // without breaking browser load references, also
            // obj.onreadystatechange doesn't work
			if (ua.ie && ua.win && obj.readyState != 4) {
				var newObj = ce("div");
				replaceId += "SWFObjectNew";
				newObj.setAttribute("id", replaceId);
                // Insert placeholder div that will be replaced by the object
                // element that loads expressinstall.swf
				obj.parentNode.insertBefore(newObj, obj);
				obj.style.display = "none";
				var fn = function() {
					obj.parentNode.removeChild(obj);
				};
				addListener(win, "onload", fn);
			}
			createSWF({data : regObj.expressInstall,
                       id : EXPRESS_INSTALL_ID,
                       width : regObj.width,
                       height : regObj.height },
                       {flashvars:fv}, replaceId);
		}
	}

	/* Functions to abstract and display alternative content
	*/
	function displayAltContent(obj) {
		if (ua.ie && ua.win && obj.readyState != 4) {
			// For IE when a SWF is loading (AND: not available in cache) wait
            // for the onload event to fire to remove the original object
            // element
			// In IE you cannot properly cancel a loading SWF file without
            // breaking browser load references, also obj.onreadystatechange
            // doesn't work
			var el = ce("div");
            // Insert placeholder div that will be replaced by the
            // alternative content
			obj.parentNode.insertBefore(el, obj);
			el.parentNode.replaceChild(abstractAltContent(obj), el);
			obj.style.display = "none";
			var fn = function() {
				obj.parentNode.removeChild(obj);
			};
			addListener(win, "onload", fn);
		}
		else {
			obj.parentNode.replaceChild(abstractAltContent(obj), obj);
		}
	}

	function abstractAltContent(obj) {
		var ac = ce("div");
		if (ua.win && ua.ie) {
			ac.innerHTML = obj.innerHTML;
		}
		else {
			var nestedObj = obj.getElementsByTagName(OBJECT)[0];
			if (nestedObj) {
				var c = nestedObj.childNodes;
				if (c) {
					var cl = c.length;
					for (var i = 0; i < cl; i++) {
						if (!(c[i].nodeType == 1 && c[i].nodeName == "PARAM") &&
                                !(c[i].nodeType == 8)) {
							ac.appendChild(c[i].cloneNode(true));
						}
					}
				}
			}
		}
		return ac;
	}

	function createSWF(attObj, parObj, id) {
		var r, el = getElementById(id);
		if (el) {
			if (typeof attObj.id == UNDEF) {
				attObj.id = id;
			}
            // IE, the object element and W3C DOM methods do not
            // combine: fall back to outerHTML
			if (ua.ie && ua.win) {
				var att = "";
				for (var i in attObj) {
					if (attObj[i] != Object.prototype[i]) {
						if (i.toLowerCase() == "data") {
							parObj.movie = attObj[i];
						}
                        // 'class' is an ECMA4 reserved keyword
						else if (i.toLowerCase() == "styleclass") {
							att += ' class="' + attObj[i] + '"';
						}
						else if (i.toLowerCase() != "classid") {
							att += ' ' + i + '="' + attObj[i] + '"';
						}
					}
				}
				var par = "";
				for (var j in parObj) {
					if (parObj[j] != Object.prototype[j]) {
						par += '<param name="' + j + '" value="' + parObj[j] +
                               '" />';
					}
				}
                el.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-' +
                    '96B8-444553540000"' + att + '>' + par + '</object>';
                // Stored to fix object 'leaks' on unload
                // (dynamic publishing only)
				objIdArr[objIdArr.length] = attObj.id;
				r = getElementById(attObj.id);
			}
            // Older webkit engines ignore the object element's nested
            // param elements: fall back to the proprietary embed element
			else if (ua.webkit && ua.webkit < 312) {
				var e = ce("embed");
				e.setAttribute("type", FLASH_MIME_TYPE);
				for (var k in attObj) {
                    // Filter out prototype additions from other potential
                    // libraries
					if (attObj[k] != Object.prototype[k]) {
						if (k.toLowerCase() == "data") {
							e.setAttribute("src", attObj[k]);
						}
                        // 'class' is an ECMA4 reserved keyword
						else if (k.toLowerCase() == "styleclass") {
							e.setAttribute("class", attObj[k]);
						}
                        // Filter out IE specific attribute
						else if (k.toLowerCase() != "classid") {
							e.setAttribute(k, attObj[k]);
						}
					}
				}
				for (var l in parObj) {
                    // Filter out prototype additions from other potential
                    // libraries
					if (parObj[l] != Object.prototype[l]) {
                        // Filter out IE specific param element
						if (l.toLowerCase() != "movie") {
							e.setAttribute(l, parObj[l]);
						}
					}
				}
				el.parentNode.replaceChild(e, el);
				r = e;
			}
            // Well-behaving browsers
			else {
				var o = ce(OBJECT);
				o.setAttribute("type", FLASH_MIME_TYPE);
				for (var m in attObj) {
                    // Filter out prototype additions from other potential
                    // libraries
					if (attObj[m] != Object.prototype[m]) {
                        // 'class' is an ECMA4 reserved keyword
						if (m.toLowerCase() == "styleclass") {
							o.setAttribute("class", attObj[m]);
						}
                        // Filter out IE specific attribute
						else if (m.toLowerCase() != "classid") {
							o.setAttribute(m, attObj[m]);
						}
					}
				}
				for (var n in parObj) {
                    // Filter out prototype additions from other potential
                    // libraries and IE specific param element
					if (parObj[n] != Object.prototype[n] &&
                            n.toLowerCase() != "movie") {
						createObjParam(o, n, parObj[n]);
					}
				}
				el.parentNode.replaceChild(o, el);
				r = o;
			}
		}
		return r;
	}

	function createObjParam(el, pName, pValue) {
		var p = ce("param");
		p.setAttribute("name", pName);
		p.setAttribute("value", pValue);
		el.appendChild(p);
	}

	function removeSWF(id) {
		var obj = getElementById(id);
		if (obj && (obj.nodeName == "OBJECT" || obj.nodeName == "EMBED")) {
			if (ua.ie && ua.win) {
				if (obj.readyState == 4) {
					removeObjectInIE(id);
				}
				else {
					win.attachEvent("onload", function() {
						removeObjectInIE(id);
					});
				}
			}
			else {
				obj.parentNode.removeChild(obj);
			}
		}
	}

	function removeObjectInIE(id) {
		var obj = getElementById(id);
		if (obj) {
			for (var i in obj) {
				if (typeof obj[i] == "function") {
					obj[i] = null;
				}
			}
			obj.parentNode.removeChild(obj);
		}
	}

	function getElementById(id) {
		var el = null;
		try {
			el = doc.getElementById(id);
		}
		catch (e) {}
		return el;
	}

    /* Updated attachEvent function for Internet Explorer
		- Stores attachEvent information in an Array, so on unload the
          detachEvent functions can be called to avoid memory leaks
	*/
	function addListener(target, eventType, fn) {
		target.attachEvent(eventType, fn);
		listenersArr[listenersArr.length] = [target, eventType, fn];
	}

	function hasPlayerVersion(rv) {
		var pv = ua.pv, v = rv.split(".");
		v[0] = parseInt(v[0], 10);
        // supports short notation, e.g. "9" instead of "9.0.0"
		v[1] = parseInt(v[1], 10) || 0;
		v[2] = parseInt(v[2], 10) || 0;
		return (pv[0] > v[0] || (pv[0] == v[0] && pv[1] > v[1]) ||
                (pv[0] == v[0] && pv[1] == v[1] && pv[2] >= v[2]))?true:false;
	}

	function setVisibility(id, isVisible) {
		var v = isVisible ? "visible" : "hidden";
        getElementById(id).style.visibility = v;
	}

	var cleanup = function() {
		if (ua.ie && ua.win) {
			window.attachEvent("onunload", function() {
				// remove listeners to avoid memory leaks
				var ll = listenersArr.length;
				for (var i = 0; i < ll; i++) {
					listenersArr[i][0].detachEvent(listenersArr[i][1],
                                                   listenersArr[i][2]);
				}
				// cleanup dynamically embedded objects to fix audio/video
                // threads and force open sockets and NetConnections
                // to disconnect
				var il = objIdArr.length;
				for (var j = 0; j < il; j++) {
					removeSWF(objIdArr[j]);
				}
				// cleanup library's main closures to avoid memory leaks
				for (var k in ua) {
					ua[k] = null;
				}
				ua = null;
				for (var l in QuiX.utils.swfobject) {
					QuiX.utils.swfobject[l] = null;
				}
				QuiX.utils.swfobject = null;
			});
		}
	}();

	return {
		embedSWF: function(swfUrlStr, replaceElemIdStr, widthStr, heightStr,
                           swfVersionStr, xiSwfUrlStr, flashvarsObj,
                           parObj, attObj) {
			if (!ua.w3cdom || !swfUrlStr || !replaceElemIdStr || !widthStr ||
                    !heightStr || !swfVersionStr) {
				return;
			}
			widthStr += ""; // Auto-convert to string
			heightStr += "";
			if (hasPlayerVersion(swfVersionStr)) {
				setVisibility(replaceElemIdStr, false);
				var att = {};
				if (attObj && typeof attObj === OBJECT) {
					for (var i in attObj) {
						if (attObj[i] != Object.prototype[i]) {
							att[i] = attObj[i];
						}
					}
				}
				att.data = swfUrlStr;
				att.width = widthStr;
				att.height = heightStr;
				var par = {};
				if (parObj && typeof parObj === OBJECT) {
					for (var j in parObj) {
						if (parObj[j] != Object.prototype[j]) {
							par[j] = parObj[j];
						}
					}
				}
				if (flashvarsObj && typeof flashvarsObj === OBJECT) {
					for (var k in flashvarsObj) {
						if (flashvarsObj[k] != Object.prototype[k]) {
							if (typeof par.flashvars != UNDEF) {
								par.flashvars += "&" + k + "=" +
                                                 flashvarsObj[k];
							}
							else {
								par.flashvars = k + "=" + flashvarsObj[k];
							}
						}
					}
				}
                createSWF(att, par, replaceElemIdStr);
                if (att.id == replaceElemIdStr) {
                    setVisibility(replaceElemIdStr, true);
                }
			}
			else if (xiSwfUrlStr && !isExpressInstallActive &&
                     hasPlayerVersion("6.0.65") && (ua.win || ua.mac)) {
				isExpressInstallActive = true; // deferred execution
				setVisibility(replaceElemIdStr, false);
                var regObj = {};
                regObj.id = regObj.altContentId = replaceElemIdStr;
                regObj.width = widthStr;
                regObj.height = heightStr;
                regObj.expressInstall = xiSwfUrlStr;
                showExpressInstall(regObj);
			}
		},

		getFlashPlayerVersion: function() {
			return { major:ua.pv[0], minor:ua.pv[1], release:ua.pv[2] };
		},

		hasFlashPlayerVersion: hasPlayerVersion,

		createSWF: function(attObj, parObj, replaceElemIdStr) {
			if (ua.w3cdom) {
				return createSWF(attObj, parObj, replaceElemIdStr);
			}
			else {
				return undefined;
			}
		},

		removeSWF: function(objElemIdStr) {
			if (ua.w3cdom) {
				removeSWF(objElemIdStr);
			}
		},

		// For internal usage only
		expressInstallCallback: function() {
			if (isExpressInstallActive && storedAltContent) {
				var obj = getElementById(EXPRESS_INSTALL_ID);
				if (obj) {
					obj.parentNode.replaceChild(storedAltContent, obj);
					if (storedAltContentId) {
						setVisibility(storedAltContentId, true);
						if (ua.ie && ua.win) {
							storedAltContent.style.display = "block";
						}
					}
					storedAltContent = null;
					storedAltContentId = null;
					isExpressInstallActive = false;
				}
			}
		}
	};
}();

//==============================================================================
//  String extensions
//==============================================================================
String.prototype.xmlDecode = function() {
    var s = this.replace(/&amp;/g, '&').replace(/&gt;/g , '>').
            replace(/&lt;/g, '<').replace(/&quot;/g, '"');
    return s;
}

String.prototype.xmlEncode = function() {
    var s = this.replace(/&/g, '&amp;').replace(/</g, '&lt;').
            replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return s;
}

String.prototype.trim = function() {
    var s = this.replace(/^\s+/, '').replace(/\s+$/, '');
    return s;
}

String.prototype.reverse = function() {
    var theString = "";
    for (var i=this.length-1; i>=0; i--)
        theString += this.charAt(i);
    return theString;
}

//==============================================================================
//  Array extensions
//==============================================================================
Array.prototype.hasItem = function(item) {
    for (var i=0; i<this.length; i++) {
        if (this[i]==item) return(true);
    }
    return(false);
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(elt /*, from*/) {
        var len = this.length;
        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0)
            from += len;

        for (; from < len; from++)
            if (from in this && this[from] === elt)
                return from;
        return -1;
    }
}

Array.prototype.removeItem = function(item) {
    for (var i=0; i<this.length; i++) {
        if (this[i]==item) {
            this.splice(i,1);
            return(true);
        }
    }
    return(false);
}

Array.prototype.sortByAttribute = function(prop) {
    function sortfunc(a,b) {
        var prop1 = a[prop];
        var prop2 = b[prop];
        if (prop1<prop2 || !prop1) return -1
        else if (prop1>prop2 || !prop2) return 1
        else return 0
    }
    this.sort(sortfunc);
}
