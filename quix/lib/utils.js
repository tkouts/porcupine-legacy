//=============================================================================
//  Copyright (c) 2005-2010 Tassos Koutsovassilis and Contributors
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
    /*! SWFObject v2.2 <http://code.google.com/p/swfobject/> 
        is released under the MIT License
        <http://www.opensource.org/licenses/mit-license.php> 
    */

    var UNDEF = "undefined",
        OBJECT = "object",
        SHOCKWAVE_FLASH = "Shockwave Flash",
        SHOCKWAVE_FLASH_AX = "ShockwaveFlash.ShockwaveFlash",
        FLASH_MIME_TYPE = "application/x-shockwave-flash",
        EXPRESS_INSTALL_ID = "SWFObjectExprInst",
        ON_READY_STATE_CHANGE = "onreadystatechange",
        
        win = window,
        doc = document,
        nav = navigator,
        
        plugin = false,
        domLoadFnArr = [main],
        regObjArr = [],
        objIdArr = [],
        listenersArr = [],
        storedAltContent,
        storedAltContentId,
        storedCallbackFn,
        storedCallbackObj,
        isDomLoaded = false,
        isExpressInstallActive = false,
        dynamicStylesheet,
        dynamicStylesheetMedia,
        autoHideShow = true,

    /* Centralized function for browser feature detection
        - User agent string detection is only used when no
          good alternative is possible
        - Is executed directly for optimal performance
    */
    ua = function() {
        var w3cdom = typeof doc.getElementById != UNDEF
                && typeof doc.getElementsByTagName != UNDEF
                && typeof doc.createElement != UNDEF,
            u = nav.userAgent.toLowerCase(),
            p = nav.platform.toLowerCase(),
            windows = p ? /win/.test(p) : /win/.test(u),
            mac = p ? /mac/.test(p) : /mac/.test(u),
            // returns either the webkit version or false if not webkit
            webkit = /webkit/.test(u)?
              parseFloat(u.replace(/^.*webkit\/(\d+(\.\d+)?).*$/, "$1")):false,
            // feature detection based on Andrea Giammarchi's solution:
            // http://webreflection.blogspot.com/2009/01/
            // 32-bytes-to-know-if-your-browser-is-ie.html
            ie = !+"\v1",
            playerVersion = [0,0,0],
            d = null;
        if (typeof nav.plugins != UNDEF
                && typeof nav.plugins[SHOCKWAVE_FLASH] == OBJECT) {
            d = nav.plugins[SHOCKWAVE_FLASH].description;
            // navigator.mimeTypes["application/x-shockwave-flash"]
            // .enabledPlugin indicates whether plug-ins are enabled
            // or disabled in Safari 3+
            if (d && !(typeof nav.mimeTypes != UNDEF
                       && nav.mimeTypes[FLASH_MIME_TYPE]
                       && !nav.mimeTypes[FLASH_MIME_TYPE].enabledPlugin)) {
                plugin = true;
                ie = false; // cascaded feature detection for Internet Explorer
                d = d.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
                playerVersion[0] = parseInt(d.replace(/^(.*)\..*$/, "$1"), 10);
                playerVersion[1] = parseInt(d.replace(/^.*\.(.*)\s.*$/, "$1"),
                                            10);
                playerVersion[2] = /[a-zA-Z]/.test(d)?
                    parseInt(d.replace(/^.*[a-zA-Z]+(.*)$/, "$1"), 10) : 0;
            }
        }
        else if (typeof win.ActiveXObject != UNDEF) {
            try {
                var a = new ActiveXObject(SHOCKWAVE_FLASH_AX);
                if (a) { // a will return null when ActiveX is disabled
                    d = a.GetVariable("$version");
                    if (d) {
                        // cascaded feature detection for Internet Explorer
                        ie = true;
                        d = d.split(" ")[1].split(",");
                        playerVersion = [parseInt(d[0], 10),
                                         parseInt(d[1], 10),
                                         parseInt(d[2], 10)];
                    }
                }
            }
            catch(e) {}
        }
        return {w3:w3cdom, pv:playerVersion, wk:webkit, ie:ie, win:windows,
                mac:mac};
    }(),

    /* Cross-browser onDomLoad
        - Will fire an event as soon as the DOM of a web page is loaded
        - Internet Explorer workaround based on Diego Perini's solution: http://javascript.nwbox.com/IEContentLoaded/
        - Regular onload serves as fallback
    */ 
    onDomLoad = function() {
        if (!ua.w3) { return; }
        if ((typeof doc.readyState != UNDEF && doc.readyState == "complete") ||
            (typeof doc.readyState == UNDEF
                && (doc.getElementsByTagName("body")[0] || doc.body))) {
            // function is fired after onload,
            // e.g. when script is inserted dynamically 
            callDomLoadFunctions();
        }
        if (!isDomLoaded) {
            if (typeof doc.addEventListener != UNDEF) {
                doc.addEventListener("DOMContentLoaded",
                                     callDomLoadFunctions, false);
            }
            if (ua.ie && ua.win) {
                doc.attachEvent(ON_READY_STATE_CHANGE, function() {
                    if (doc.readyState == "complete") {
                        doc.detachEvent(ON_READY_STATE_CHANGE,
                                        arguments.callee);
                        callDomLoadFunctions();
                    }
                });
                if (win == top) { // if not inside an iframe
                    (function(){
                        if (isDomLoaded) { return; }
                        try {
                            doc.documentElement.doScroll("left");
                        }
                        catch(e) {
                            setTimeout(arguments.callee, 0);
                            return;
                        }
                        callDomLoadFunctions();
                    })();
                }
            }
            if (ua.wk) {
                (function(){
                    if (isDomLoaded) { return; }
                    if (!/loaded|complete/.test(doc.readyState)) {
                        setTimeout(arguments.callee, 0);
                        return;
                    }
                    callDomLoadFunctions();
                })();
            }
            addLoadEvent(callDomLoadFunctions);
        }
    }();

    function callDomLoadFunctions() {
        if (isDomLoaded) { return; }
        try {
            // test if we can really add/remove elements to/from the DOM;
            // we don't want to fire it too early
            var t = doc.getElementsByTagName("body")[0]
                    .appendChild(createElement("span"));
            t.parentNode.removeChild(t);
        }
        catch (e) { return; }
        isDomLoaded = true;
        var dl = domLoadFnArr.length;
        for (var i = 0; i < dl; i++) {
            domLoadFnArr[i]();
        }
    }

    function addDomLoadEvent(fn) {
        if (isDomLoaded) {
            fn();
        }
        else {
            // Array.push() is only available in IE5.5+
            domLoadFnArr[domLoadFnArr.length] = fn;
        }
    }

    /* Cross-browser onload
        - Based on James Edwards' solution:
          http://brothercake.com/site/resources/scripts/onload/
        - Will fire an event as soon as a web page including all of its
          assets are loaded 
     */
    function addLoadEvent(fn) {
        if (typeof win.addEventListener != UNDEF) {
            win.addEventListener("load", fn, false);
        }
        else if (typeof doc.addEventListener != UNDEF) {
            doc.addEventListener("load", fn, false);
        }
        else if (typeof win.attachEvent != UNDEF) {
            addListener(win, "onload", fn);
        }
        else if (typeof win.onload == "function") {
            var fnOld = win.onload;
            win.onload = function() {
                fnOld();
                fn();
            };
        }
        else {
            win.onload = fn;
        }
    }

    /* Main function
        - Will preferably execute onDomLoad, otherwise onload (as a fallback)
    */
    function main() { 
        if (plugin) {
            testPlayerVersion();
        }
        else {
            matchVersions();
        }
    }

    /* Detect the Flash Player version for non-Internet Explorer browsers
        - Detecting the plug-in version via the object element is more precise
          than using the plugins collection item's description:
          a. Both release and build numbers can be detected
          b. Avoid wrong descriptions by corrupt installers provided by Adobe
          c. Avoid wrong descriptions by multiple Flash Player entries in the
             plugin Array, caused by incorrect browser imports
        - Disadvantage of this method is that it depends on the availability
          of the DOM, while the plugins collection is immediately available
    */
    function testPlayerVersion() {
        var b = doc.getElementsByTagName("body")[0];
        var o = createElement(OBJECT);
        o.setAttribute("type", FLASH_MIME_TYPE);
        var t = b.appendChild(o);
        if (t) {
            var counter = 0;
            (function(){
                if (typeof t.GetVariable != UNDEF) {
                    var d = t.GetVariable("$version");
                    if (d) {
                        d = d.split(" ")[1].split(",");
                        ua.pv = [parseInt(d[0], 10),
                                 parseInt(d[1], 10),
                                 parseInt(d[2], 10)];
                    }
                }
                else if (counter < 10) {
                    counter++;
                    setTimeout(arguments.callee, 10);
                    return;
                }
                b.removeChild(o);
                t = null;
                matchVersions();
            })();
        }
        else {
            matchVersions();
        }
    }

    /* Perform Flash Player and SWF version matching; static publishing only
    */
    function matchVersions() {
        var rl = regObjArr.length;
        if (rl > 0) {
            for (var i = 0; i < rl; i++) {
                // for each registered object element
                var id = regObjArr[i].id;
                var cb = regObjArr[i].callbackFn;
                var cbObj = {success:false, id:id};
                if (ua.pv[0] > 0) {
                    var obj = getElementById(id);
                    if (obj) {
                        if (hasPlayerVersion(regObjArr[i].swfVersion)
                                && !(ua.wk && ua.wk < 312)) {
                            // Flash Player version >= published SWF
                            // version: Houston, we have a match!
                            setVisibility(id, true);
                            if (cb) {
                                cbObj.success = true;
                                cbObj.ref = getObjectById(id);
                                cb(cbObj);
                            }
                        }
                        else if (regObjArr[i].expressInstall
                                 && canExpressInstall()) {
                            // show the Adobe Express Install dialog if set
                            // by the web page author and if supported
                            var att = {};
                            att.data = regObjArr[i].expressInstall;
                            att.width = obj.getAttribute("width") || "0";
                            att.height = obj.getAttribute("height") || "0";
                            if (obj.getAttribute("class")) {
                                att.styleclass = obj.getAttribute("class");
                            }
                            if (obj.getAttribute("align")) {
                                att.align = obj.getAttribute("align");
                            }
                            // parse HTML object param element's
                            // name-value pairs
                            var par = {};
                            var p = obj.getElementsByTagName("param");
                            var pl = p.length;
                            for (var j = 0; j < pl; j++) {
                                if (p[j].getAttribute("name").toLowerCase() !=
                                        "movie") {
                                    par[p[j].getAttribute("name")] =
                                        p[j].getAttribute("value");
                                }
                            }
                            showExpressInstall(att, par, id, cb);
                        }
                        else {
                            // Flash Player and SWF version mismatch or an
                            // older Webkit engine that ignores the HTML object
                            // element's nested param elements: display
                            // alternative content instead of SWF
                            displayAltContent(obj);
                            if (cb) { cb(cbObj); }
                        }
                    }
                }
                else {
                    // if no Flash Player is installed or the fp version
                    // cannot be detected we let the HTML object element do
                    // its job (either show a SWF or alternative content)
                    setVisibility(id, true);
                    if (cb) {
                        var o = getObjectById(id);
                        // test whether there is an HTML object element or not
                        if (o && typeof o.SetVariable != UNDEF) { 
                            cbObj.success = true;
                            cbObj.ref = o;
                        }
                        cb(cbObj);
                    }
                }
            }
        }
    }

    function getObjectById(objectIdStr) {
        var r = null;
        var o = getElementById(objectIdStr);
        if (o && o.nodeName == "OBJECT") {
            if (typeof o.SetVariable != UNDEF) {
                r = o;
            }
            else {
                var n = o.getElementsByTagName(OBJECT)[0];
                if (n) {
                    r = n;
                }
            }
        }
        return r;
    }

    /* Requirements for Adobe Express Install
        - only one instance can be active at a time
        - fp 6.0.65 or higher
        - Win/Mac OS only
        - no Webkit engines older than version 312
    */
    function canExpressInstall() {
        return !isExpressInstallActive && hasPlayerVersion("6.0.65")
                && (ua.win || ua.mac) && !(ua.wk && ua.wk < 312);
    }

    /* Show the Adobe Express Install dialog
        - Reference:
          http://www.adobe.com/cfusion/knowledgebase/index.cfm?id=6a253b75
    */
    function showExpressInstall(att, par, replaceElemIdStr, callbackFn) {
        isExpressInstallActive = true;
        storedCallbackFn = callbackFn || null;
        storedCallbackObj = {success:false, id:replaceElemIdStr};
        var obj = getElementById(replaceElemIdStr);
        if (obj) {
            if (obj.nodeName == "OBJECT") { // static publishing
                storedAltContent = abstractAltContent(obj);
                storedAltContentId = null;
            }
            else { // dynamic publishing
                storedAltContent = obj;
                storedAltContentId = replaceElemIdStr;
            }
            att.id = EXPRESS_INSTALL_ID;
            if (typeof att.width == UNDEF
                    || (!/%$/.test(att.width)
                        && parseInt(att.width, 10) < 310)) {
                att.width = "310";
            }
            if (typeof att.height == UNDEF
                    || (!/%$/.test(att.height)
                        && parseInt(att.height, 10) < 137)) {
                att.height = "137";
            }
            doc.title = doc.title.slice(0, 47) +
                        " - Flash Player Installation";
            var pt = ua.ie && ua.win ? "ActiveX" : "PlugIn",
                fv = "MMredirectURL=" +
                     win.location.toString().replace(/&/g,"%26") +
                     "&MMplayerType=" + pt + "&MMdoctitle=" + doc.title;
            if (typeof par.flashvars != UNDEF) {
                par.flashvars += "&" + fv;
            }
            else {
                par.flashvars = fv;
            }
            // IE only: when a SWF is loading (AND: not available in cache)
            // wait for the readyState of the object element to become 4
            // before removing it, because you cannot properly cancel
            // a loading SWF file without breaking browser load references,
            // also obj.onreadystatechange doesn't work
            if (ua.ie && ua.win && obj.readyState != 4) {
                var newObj = createElement("div");
                replaceElemIdStr += "SWFObjectNew";
                newObj.setAttribute("id", replaceElemIdStr);
                // insert placeholder div that will be replaced by the
                // object element that loads expressinstall.swf
                obj.parentNode.insertBefore(newObj, obj);
                obj.style.display = "none";
                (function(){
                    if (obj.readyState == 4) {
                        obj.parentNode.removeChild(obj);
                    }
                    else {
                        setTimeout(arguments.callee, 10);
                    }
                })();
            }
            createSWF(att, par, replaceElemIdStr);
        }
    }

    /* Functions to abstract and display alternative content
    */
    function displayAltContent(obj) {
        if (ua.ie && ua.win && obj.readyState != 4) {
            // IE only: when a SWF is loading (AND: not available in cache)
            // wait for the readyState of the object element
            // to become 4 before removing it, because you cannot properly
            // cancel a loading SWF file without breaking browser load
            // references, also obj.onreadystatechange doesn't work
            var el = createElement("div");
            // insert placeholder div that will be
            // replaced by the alternative content
            obj.parentNode.insertBefore(el, obj);
            el.parentNode.replaceChild(abstractAltContent(obj), el);
            obj.style.display = "none";
            (function(){
                if (obj.readyState == 4) {
                    obj.parentNode.removeChild(obj);
                }
                else {
                    setTimeout(arguments.callee, 10);
                }
            })();
        }
        else {
            obj.parentNode.replaceChild(abstractAltContent(obj), obj);
        }
    } 

    function abstractAltContent(obj) {
        var ac = createElement("div");
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

    /* Cross-browser dynamic SWF creation
    */
    function createSWF(attObj, parObj, id) {
        var r, el = getElementById(id);
        if (ua.wk && ua.wk < 312) { return r; }
        if (el) {
            // if no 'id' is defined for the object element,
            // it will inherit the 'id' from the alternative content
            if (typeof attObj.id == UNDEF) {
                attObj.id = id;
            }
            // Internet Explorer + the HTML object element + W3C DOM methods
            // do not combine: fall back to outerHTML
            if (ua.ie && ua.win) {
                var att = "";
                for (var i in attObj) {
                    // filter out prototype additions from other potential
                    // libraries
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
                    // filter out prototype additions from other
                    // potential libraries
                    if (parObj[j] != Object.prototype[j]) {
                        par += '<param name="' + j + '" value="' + parObj[j] + '" />';
                    }
                }
                el.outerHTML = '<object classid="' +
                    'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' +
                    att + '>' + par + '</object>';
                // stored to fix object 'leaks'
                // on unload (dynamic publishing only)
                objIdArr[objIdArr.length] = attObj.id;
                r = getElementById(attObj.id);
            }
            else { // well-behaving browsers
                var o = createElement(OBJECT);
                o.setAttribute("type", FLASH_MIME_TYPE);
                for (var m in attObj) {
                    // filter out prototype additions from
                    // other potential libraries
                    if (attObj[m] != Object.prototype[m]) {
                        // 'class' is an ECMA4 reserved keyword
                        if (m.toLowerCase() == "styleclass") {
                            o.setAttribute("class", attObj[m]);
                        }
                        // filter out IE specific attribute
                        else if (m.toLowerCase() != "classid") {
                            o.setAttribute(m, attObj[m]);
                        }
                    }
                }
                for (var n in parObj) {
                    // filter out prototype additions from other potential
                    // libraries and IE specific param element
                    if (parObj[n] != Object.prototype[n]
                            && n.toLowerCase() != "movie") {
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
        var p = createElement("param");
        p.setAttribute("name", pName);	
        p.setAttribute("value", pValue);
        el.appendChild(p);
    }
    
    /* Cross-browser SWF removal
        - Especially needed to safely and completely remove a SWF
          in Internet Explorer
    */
    function removeSWF(id) {
        var obj = getElementById(id);
        if (obj && obj.nodeName == "OBJECT") {
            if (ua.ie && ua.win) {
                obj.style.display = "none";
                (function(){
                    if (obj.readyState == 4) {
                        removeObjectInIE(id);
                    }
                    else {
                        setTimeout(arguments.callee, 10);
                    }
                })();
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
    
    /* Functions to optimize JavaScript compression
    */
    function getElementById(id) {
        var el = null;
        try {
            el = doc.getElementById(id);
        }
        catch (e) {}
        return el;
    }
    
    function createElement(el) {
        return doc.createElement(el);
    }
    
    /* Updated attachEvent function for Internet Explorer
        - Stores attachEvent information in an Array, so on unload the
          detachEvent functions can be called to avoid memory leaks
    */
    function addListener(target, eventType, fn) {
        target.attachEvent(eventType, fn);
        listenersArr[listenersArr.length] = [target, eventType, fn];
    }
    
    /* Flash Player and SWF content version matching
    */
    function hasPlayerVersion(rv) {
        var pv = ua.pv, v = rv.split(".");
        v[0] = parseInt(v[0], 10);
        // supports short notation, e.g. "9" instead of "9.0.0"
        v[1] = parseInt(v[1], 10) || 0;
        v[2] = parseInt(v[2], 10) || 0;
        return (pv[0] > v[0] || (pv[0] == v[0] && pv[1] > v[1]) ||
                (pv[0] == v[0] && pv[1] == v[1] && pv[2] >= v[2]))?
                true : false;
    }
    
    /* Cross-browser dynamic CSS creation
        - Based on Bobby van der Sluis'
          solution: http://www.bobbyvandersluis.com/articles/dynamicCSS.php
    */
    function createCSS(sel, decl, media, newStyle) {
        if (ua.ie && ua.mac) { return; }
        var h = doc.getElementsByTagName("head")[0];
        if (!h) { return; }
        // to also support badly authored HTML pages that lack a head element
        var m = (media && typeof media == "string") ? media : "screen";
        if (newStyle) {
            dynamicStylesheet = null;
            dynamicStylesheetMedia = null;
        }
        if (!dynamicStylesheet || dynamicStylesheetMedia != m) { 
            // create dynamic stylesheet + get a global reference to it
            var s = createElement("style");
            s.setAttribute("type", "text/css");
            s.setAttribute("media", m);
            dynamicStylesheet = h.appendChild(s);
            if (ua.ie && ua.win && typeof doc.styleSheets != UNDEF
                    && doc.styleSheets.length > 0) {
                dynamicStylesheet =
                    doc.styleSheets[doc.styleSheets.length - 1];
            }
            dynamicStylesheetMedia = m;
        }
        // add style rule
        if (ua.ie && ua.win) {
            if (dynamicStylesheet
                    && typeof dynamicStylesheet.addRule == OBJECT) {
                dynamicStylesheet.addRule(sel, decl);
            }
        }
        else {
            if (dynamicStylesheet && typeof doc.createTextNode != UNDEF) {
                dynamicStylesheet.appendChild(
                    doc.createTextNode(sel + " {" + decl + "}"));
            }
        }
    }
    
    function setVisibility(id, isVisible) {
        if (!autoHideShow) { return; }
        var v = isVisible ? "visible" : "hidden";
        if (isDomLoaded && getElementById(id)) {
            getElementById(id).style.visibility = v;
        }
        else {
            createCSS("#" + id, "visibility:" + v);
        }
    }

    /* Filter to avoid XSS attacks
    */
    function urlEncodeIfNecessary(s) {
        var regex = /[\\\"<>\.;]/;
        var hasBadChars = regex.exec(s) != null;
        return hasBadChars && typeof encodeURIComponent != UNDEF?
               encodeURIComponent(s) : s;
    }
    
    /* Release memory to avoid memory leaks caused by closures,
       fix hanging audio/video threads and force open sockets/NetConnections
       to disconnect (Internet Explorer only)
    */
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
        /* Public API
            - Reference: http://code.google.com/p/swfobject/wiki/documentation
        */ 
        registerObject: function(objectIdStr, swfVersionStr,
                                 xiSwfUrlStr, callbackFn) {
            if (ua.w3 && objectIdStr && swfVersionStr) {
                var regObj = {};
                regObj.id = objectIdStr;
                regObj.swfVersion = swfVersionStr;
                regObj.expressInstall = xiSwfUrlStr;
                regObj.callbackFn = callbackFn;
                regObjArr[regObjArr.length] = regObj;
                setVisibility(objectIdStr, false);
            }
            else if (callbackFn) {
                callbackFn({success:false, id:objectIdStr});
            }
        },
        
        getObjectById: function(objectIdStr) {
            if (ua.w3) {
                return getObjectById(objectIdStr);
            }
        },
        
        embedSWF: function(swfUrlStr, replaceElemIdStr, widthStr, heightStr,
                           swfVersionStr, xiSwfUrlStr, flashvarsObj,
                           parObj, attObj, callbackFn) {
            var callbackObj = {success:false, id:replaceElemIdStr};
            if (ua.w3 && !(ua.wk && ua.wk < 312) && swfUrlStr
                    && replaceElemIdStr && widthStr && heightStr
                    && swfVersionStr) {
                setVisibility(replaceElemIdStr, false);
                addDomLoadEvent(function() {
                    widthStr += ""; // auto-convert to string
                    heightStr += "";
                    var att = {};
                    if (attObj && typeof attObj === OBJECT) {
                        // copy object to avoid the use of references,
                        // because web authors often reuse attObj for
                        // multiple SWFs
                        for (var i in attObj) {
                            att[i] = attObj[i];
                        }
                    }
                    att.data = swfUrlStr;
                    att.width = widthStr;
                    att.height = heightStr;
                    var par = {}; 
                    if (parObj && typeof parObj === OBJECT) {
                        // copy object to avoid the use of references, because
                        // web authors often reuse parObj for multiple SWFs
                        for (var j in parObj) {
                            par[j] = parObj[j];
                        }
                    }
                    if (flashvarsObj && typeof flashvarsObj === OBJECT) {
                        // copy object to avoid the use of references, because
                        // web authors often reuse flashvarsObj
                        // for multiple SWFs
                        for (var k in flashvarsObj) {
                            if (typeof par.flashvars != UNDEF) {
                                par.flashvars += "&" + k + "=" + flashvarsObj[k];
                            }
                            else {
                                par.flashvars = k + "=" + flashvarsObj[k];
                            }
                        }
                    }
                    if (hasPlayerVersion(swfVersionStr)) { // create SWF
                        var obj = createSWF(att, par, replaceElemIdStr);
                        if (att.id == replaceElemIdStr) {
                            setVisibility(replaceElemIdStr, true);
                        }
                        callbackObj.success = true;
                        callbackObj.ref = obj;
                    }
                    // show Adobe Express Install
                    else if (xiSwfUrlStr && canExpressInstall()) {
                        att.data = xiSwfUrlStr;
                        showExpressInstall(att, par, replaceElemIdStr,
                                           callbackFn);
                        return;
                    }
                    else { // show alternative content
                        setVisibility(replaceElemIdStr, true);
                    }
                    if (callbackFn) { callbackFn(callbackObj); }
                });
            }
            else if (callbackFn) { callbackFn(callbackObj); }
        },
        
        switchOffAutoHideShow: function() {
            autoHideShow = false;
        },
        
        ua: ua,
        
        getFlashPlayerVersion: function() {
            return { major:ua.pv[0], minor:ua.pv[1], release:ua.pv[2] };
        },
        
        hasFlashPlayerVersion: hasPlayerVersion,
        
        createSWF: function(attObj, parObj, replaceElemIdStr) {
            if (ua.w3) {
                return createSWF(attObj, parObj, replaceElemIdStr);
            }
            else {
                return undefined;
            }
        },
        
        showExpressInstall: function(att, par, replaceElemIdStr, callbackFn) {
            if (ua.w3 && canExpressInstall()) {
                showExpressInstall(att, par, replaceElemIdStr, callbackFn);
            }
        },
        
        removeSWF: function(objElemIdStr) {
            if (ua.w3) {
                removeSWF(objElemIdStr);
            }
        },
        
        createCSS: function(selStr, declStr, mediaStr, newStyleBoolean) {
            if (ua.w3) {
                createCSS(selStr, declStr, mediaStr, newStyleBoolean);
            }
        },
        
        addDomLoadEvent: addDomLoadEvent,
        
        addLoadEvent: addLoadEvent,
        
        getQueryParamValue: function(param) {
            var q = doc.location.search || doc.location.hash;
            if (q) {
                // strip question mark
                if (/\?/.test(q)) { q = q.split("?")[1]; }
                if (param == null) {
                    return urlEncodeIfNecessary(q);
                }
                var pairs = q.split("&");
                for (var i = 0; i < pairs.length; i++) {
                    if (pairs[i].substring(0, pairs[i].indexOf("="))
                            == param) {
                        return urlEncodeIfNecessary(
                            pairs[i].substring((pairs[i].indexOf("=") + 1)));
                    }
                }
            }
            return "";
        },
        
        // For internal usage only
        expressInstallCallback: function() {
            if (isExpressInstallActive) {
                var obj = getElementById(EXPRESS_INSTALL_ID);
                if (obj && storedAltContent) {
                    obj.parentNode.replaceChild(storedAltContent, obj);
                    if (storedAltContentId) {
                        setVisibility(storedAltContentId, true);
                        if (ua.ie && ua.win) {
                            storedAltContent.style.display = "block";
                        }
                    }
                    if (storedCallbackFn) {
                        storedCallbackFn(storedCallbackObj);
                    }
                }
                isExpressInstallActive = false;
            } 
        }
    };
}();
