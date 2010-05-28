//=============================================================================
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
//=============================================================================

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

QuiX.utils.readCookie = function(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ')
            c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0)
            return c.substring(nameEQ.length, c.length);
    }
    return null;
}

//=============================================================================
// browser and os detection utility
//=============================================================================

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
        var ver = dataString.substring(
            index+this.versionSearchString.length+1);
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

//=============================================================================
// SWFObject utility
//=============================================================================

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
                        playerVersion = [parseInt(d[0], 10),
                                         parseInt(d[1], 10),
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
            doc.title = doc.title.slice(0, 47) +
                        " - Flash Player Installation";
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
                        if (!(c[i].nodeType == 1 && c[i].nodeName == "PARAM")
                                && !(c[i].nodeType == 8)) {
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
