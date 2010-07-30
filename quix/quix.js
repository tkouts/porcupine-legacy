//=============================================================================
//  Copyright 2005-2009 Tassos Koutsovassilis and Contributors
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

var QuiX = {};
QuiX.version = '1.0 build 20090402';
QuiX.namespace = 'http://www.innoscript.org/quix';
QuiX.root = (new RegExp(
    "https?://[^/]+(?:/[^/\?]+)?(?:/(?:{|%7B)(?:.*?)(?:}|%7D))?",
    "i")).exec(document.location.href) + '/';
QuiX.baseUrl = '__quix/';
QuiX.maxz = 999999999;
QuiX.startX = 0;
QuiX.startY = 0;
QuiX.clipboard = new (function() {
    this.contains = '';
    this.action = '';
    this.items = [];
})();
QuiX.tmpWidget = null;
QuiX.dragable = null;
QuiX.dropTarget = null;
QuiX.dragTimer = 0;
QuiX.dragging = false;
QuiX._strip_tags_re = /<(.|\n)+?>/gi;
QuiX.constructors = {
    'script' : null,
    'module' : null,
    'stylesheet' : null
};
QuiX._activeLoaders = 0;
QuiX._scrollbarSize = 16;
QuiX.dir = '';
QuiX.effectsEnabled = true;
QuiX.ui = {};

QuiX.queryString = function(param) {
    function urlEncodeIfNecessary(s) {
        var regex = /[\\\"<>\.;]/;
        var hasBadChars = regex.exec(s) != null;
        return hasBadChars ? encodeURIComponent(s) : s;
    }
    var q = document.location.search || document.location.hash;
    if (param == null) {
        return urlEncodeIfNecessary(q);
    }
    if (q) {
        var pairs = q.substring(1).split("&");
        for (var i=0; i<pairs.length; i++) {
            if (pairs[i].substring(0, pairs[i].indexOf("=")) == param) {
                return urlEncodeIfNecessary(
                    pairs[i].substring((pairs[i].indexOf("=") + 1)));
            }
        }
    }
    return '';
}

QuiX.getThemeUrl = function() {
    var theme = QuiX.queryString('_qt') || 'default';
    return QuiX.baseUrl + 'themes/' + theme + '/';
}

QuiX.progress = '<image xmlns="http://www.innoscript.org/quix" ' +
    'width="16" height="16" img="' + QuiX.getThemeUrl() +
    'images/loader.gif"></image>';

// module

QuiX.Module = function(sName, sFile, depends, prio) {
    this.isLoaded = false;
    this.name = sName;
    this.file = sFile;
    this.dependencies = depends;
    this.priority = prio;
    this.type = 'script';
    this.callback = null;
}

QuiX.Module.prototype.load = function(callback) {
    var oElement;
    this.callback = callback;
    if (this.type == 'script') {
        var onload = (document.all)?'onreadystatechange':'onload';
        oElement = document.createElement('SCRIPT');
        oElement.type = 'text/javascript';
        oElement.defer = true;
        oElement.src = this.file;
        oElement[onload] = QuiX.__resource_onstatechange;
        document.body.appendChild(oElement);
    }
    else {
        oElement = document.createElement('LINK');
        oElement.type = 'text/css';
        oElement.href = this.file;
        oElement.rel = 'stylesheet';
        document.getElementsByTagName('head')[0].appendChild(oElement);
    }
    oElement.resource = this;
    oElement.id = this.file;
    if (this.type=='stylesheet') {
        this.isLoaded = true;
        if (callback)
            callback();
    }
}

// image

QuiX.Image = function(url) {
    this.url = url.replace('$THEME_URL$', QuiX.getThemeUrl());
    this.isLoaded = false;
    this.callback = null;
    this.width = 0;
    this.height = 0;
}

QuiX.Image.prototype.load = function(callback) {
    this.callback = callback;
    var img = new Image();
    img.resource = this;
    img.onload = QuiX.__resource_onstatechange;
    img.onerror = QuiX.__resource_error;
    img.src = this.url;
    img.style.display = 'none';
    document.body.appendChild(img);
}

QuiX.__resource_error = function() {
    if (this.resource.callback)
        this.resource.callback();
}

QuiX.__resource_onstatechange = function() {
    if (this.readyState) {
        if (this.readyState == 'loaded' || this.readyState == 'complete') {
            if (this.tagName == 'IMG') {
                this.resource.width = this.width;
                this.resource.height = this.height;
                QuiX.removeNode(this);
            }
            this.resource.isLoaded = true;
            if (this.resource.callback)
                this.resource.callback();
        }
    }
    else {
        if (this.tagName == 'IMG') {
            this.resource.width = this.width;
            this.resource.height = this.height;
            QuiX.removeNode(this);
        }
        this.resource.isLoaded = true;
        if (this.resource.callback)
            this.resource.callback();
    }
}

QuiX.modules = [
    new QuiX.Module('Windows and Dialogs',  //0
                    QuiX.baseUrl + 'ui/windows.js', [3,13,15], 5),
    new QuiX.Module('Menus',                //1
                    QuiX.baseUrl + 'ui/menus.js', [3,13], 5),
    new QuiX.Module('Splitter',             //2
                    QuiX.baseUrl + 'ui/splitter.js', [15], 5),
    new QuiX.Module('Labels & Buttons',     //3
                    QuiX.baseUrl + 'ui/buttons.js', [1], 10),
    new QuiX.Module('Tab Pane',             //4
                    QuiX.baseUrl + 'ui/tabpane.js', [3], 5),
    new QuiX.Module('List View',            //5
                    QuiX.baseUrl + 'ui/listview.js', [], 10),
    new QuiX.Module('Tree',                 //6
                    QuiX.baseUrl + 'ui/tree.js', [], 10),
    new QuiX.Module('Toolbars',             //7
                    QuiX.baseUrl + 'ui/toolbars.js', [3], 5),
    new QuiX.Module('Forms & Fields',       //8
                    QuiX.baseUrl + 'ui/formfields.js', [3], 5),
    new QuiX.Module('Common Widgets',       //9
                    QuiX.baseUrl + 'ui/common.js', [3,8], 4),
    new QuiX.Module('Datagrid',             //10
                    QuiX.baseUrl + 'ui/datagrid.js', [5,8], 4),
    new QuiX.Module('File Control',         //11
                    QuiX.baseUrl + 'ui/file.js', [1,3,8,9,14], 4),
    new QuiX.Module('Date Picker',          //12
                    QuiX.baseUrl + 'ui/datepicker.js', [14,8], 4),
    new QuiX.Module('Timers & Effects',     //13
                    QuiX.baseUrl + 'ui/timers.js', [], 10),
    new QuiX.Module('Forms & Fields 2',     //14
                    QuiX.baseUrl + 'ui/formfields2.js', [3], 5),
    new QuiX.Module('VBox & HBox',          //15
                    QuiX.baseUrl + 'ui/box.js', [], 10),
    new QuiX.Module('Rich Text Editor',     //16
                    QuiX.baseUrl + 'ui/richtext.js', [8,15,9], 4),
];

QuiX.tags = {
    'desktop':-1, 'xhtml':-1, 'script':-1, 'prop':-1, 'stylesheet':-1,
    'rect':-1, 'module':-1, 'custom':-1,

    'window':0, 'dialog':0,
    'menubar':1, 'menu':1, 'menuoption':1, 'contextmenu':1,
    'splitter':2,
    'dlgbutton':3, 'button':3, 'flatbutton':3, 'label':3, 'icon':3, 'link':3,
        'spritebutton':3, 'image':3,
    'tabpane':4, 'tab':4,
    'listview':5,
    'tree':6, 'treenode':6, 'foldertree':6,
    'toolbar':7, 'tbbutton':7, 'outlookbar':7, 'tool':7,
    'field':8, 'form':8, 'spinbutton':8,
    'hr':9, 'iframe':9, 'groupbox':9, 'slider':9, 'progressbar':9,
    'datagrid':10,
    'file':11, 'multifile':11,
    'datepicker':12,
    'timer':13, 'effect':13,
    'combo':14, 'selectlist':14,
    'box':15, 'vbox':15, 'hbox':15, 'flowbox':15,
    'richtext':16
};

QuiX.bootLibraries = [
    // theme
    QuiX.getThemeUrl() + 'theme.css',
    QuiX.getThemeUrl() + 'theme.js'
];

QuiX.__init__ = function(id) {
    var boot_loader_url = QuiX.getThemeUrl() + 'images/boot_loader.gif';
    document.body.style.background = "url('" + boot_loader_url +
                                     "') no-repeat center";

    QuiX.load(QuiX.bootLibraries,
        function() {
            var root = document.body.removeChild(
                document.getElementById(id));
            var parser = new QuiX.Parser();
            parser.oncomplete = function() {
                document.body.style.background = '';
                // calculate scrollbars size
                var w1 = document.desktop.div.clientWidth;
                var overflow = document.desktop.getOverflow()
                document.desktop.div.style.overflow = 'scroll';
                QuiX._scrollbarSize = w1 - document.desktop.div.clientWidth;
                document.desktop.setOverflow(overflow);
            }
            parser.parse(QuiX.parsers.domFromString(root.value));
        }
    );
}

QuiX.load = function(modules, callback) {
    function bootstrap() {
        if (modules.length > 0) {
            var r_info = modules.shift();
            var m = new QuiX.Module(null, r_info, []);
            m.type = (r_info.substring(r_info.length - 3) == 'css')?
                     'stylesheet':'script';
            m.load(bootstrap);
        }
        else {
            callback();
        }
    }
    bootstrap();
}

QuiX.addLoader = function() {
    if (QuiX._activeLoaders == 0) {
        document.body.onmousemove = function(evt) {
            evt = evt || event;
            var loader = document.desktop._loader;
            if (loader.div.style.display == 'none')
                loader.show();
            var x = evt.clientX + 16;
            if (QuiX.dir == 'rtl')
                x = QuiX.transformX(x - 16);
            loader.moveTo(x, evt.clientY + 20);
        }
    }
    QuiX._activeLoaders++;
}

QuiX.removeLoader = function() {
    if (QuiX._activeLoaders > 0) {
        QuiX._activeLoaders--;
        if (QuiX._activeLoaders == 0) {
            document.body.onmousemove = null;
            document.desktop._loader.hide();
        }
    }
}

QuiX.cleanupOverlays = function() {
    var ovr = document.desktop.overlays;
    while (ovr.length>0) ovr[0].close();
}

QuiX.Exception = function(name, msg) {
    this.name = name;
    this.message = msg;
}
QuiX.Exception.prototype = new Error

QuiX.displayError = function(e) {
    var msg = e.name + '\n\n' + e.message;
    if (e.stack) {
        msg += '\n\n' + e.stack;
    }
    if (e.lineNumber && e.fileName) {
        msg += '\nFile: "' + e.fileName + '" Line: ' + e.lineNumber;
    }
    document.desktop.parseFromString(
        '<dialog xmlns="http://www.innoscript.org/quix" title="Error" ' +
                'resizable="true" close="true" width="560" height="240" ' +
                'left="center" top="center">'+
            '<wbody>' +
                '<hbox spacing="8" width="100%" height="100%">' +
                    '<icon width="56" height="56" padding="12,12,12,12" ' +
                        'img="$THEME_URL$images/error32.gif"/>' +
                    '<rect padding="4,4,4,4" overflow="auto"><xhtml><![CDATA[' +
                        '<pre style="color:red;font-size:12px;' +
                            'font-family:monospace;padding-left:4px">' + msg +
                        '</pre>]]></xhtml>' +
                    '</rect>' +
                '</hbox>' +
            '</wbody>' +
            '<dlgbutton onclick="__closeDialog__" width="70" height="22" ' +
                'caption="Close"/>' +
        '</dialog>');
}

QuiX.getTarget = function(evt) {
    if (evt.target) {
        var node = evt.target;
        while (node.nodeType != node.ELEMENT_NODE)
            node = node.parentNode;
        return node;
    }
    else
        return evt.srcElement;
}

QuiX.getTargetWidget = function(evt) {
    var el = QuiX.getTarget(evt);
    return QuiX.getWidget(el);
}

QuiX.getWidget = function(el) {
    while (el && !el.widget)
        el = QuiX.getParentNode(el);
    return (el)? el.widget:null;    
}

QuiX.removeNode = function(node) {
    var oNode;
    if (node.removeNode)
        oNode = node.removeNode(true);
    else
        oNode = node.parentNode.removeChild(node);
    return oNode;
}

QuiX.getDraggable = function(w) {
    var d = new QuiX.ui.Widget({
        left : w.getLeft(),
        top : w.getTop(),
        width : w.getWidth(true),
        height : w.getHeight(true),
        border : 1
    });
    d.div.innerHTML = w.div.innerHTML;
    d.div.className = w.div.className;
    d.div.style.cssText = w.div.style.cssText;
    d.div.style.border = '1px solid transparent';
    d.setPosition('absolute');
    return d;
}

QuiX.getMouseButton = function(evt) {
    var iButton = evt.button;
    if (QuiX.utils.BrowserInfo.family == 'ie') {
        if (iButton == 1) //left
            iButton = 0;
        else if (iButton == 4) //middle
            iButton = 1;
    }
    return iButton;
}

QuiX._ieDomUpdate = function(el) {
    if (QuiX.utils.BrowserInfo.family == 'ie' && el.style.visibility == '') {
        // IE: ie 8 requires visibility toggle in order to update DOM
        el.style.visibility = 'hidden';
        el.style.visibility = '';
    }
}

QuiX.createOutline = function(w) {
    var macff = QuiX.utils.BrowserInfo.family == 'moz' &&
                QuiX.utils.BrowserInfo.OS == 'MacOS';
    var fl = (macff)?'auto':'hidden';

    var o = new QuiX.ui.Widget({
        left : w.getLeft(),
        top : w.getTop(),
        width : w.getWidth(true),
        height : w.getHeight(true),
        border : 1,
        overflow : fl
    });

    var inner = new QuiX.ui.Widget({
        width : '100%',
        height : '100%',
        opacity: .1,
        overflow : 'hidden'
    });
    o.appendChild(inner);

    var t = QuiX.getImage(QuiX.baseUrl + 'images/transp.gif');
    t.style.width = '100%';
    t.style.height = '100%';
    ((macff)?inner:o).div.appendChild(t);

    w.parent.appendChild(o);
    o.redraw();

    //calculate size because minw/minh procedure can
    //depend on it's children size
    o.minw = (typeof w.minw == "function")?w.minw(w):w.minw;
    o.minh = (typeof w.minh == "function")?w.minh(w):w.minh;
    o.div.className = 'outline';
    return(o);
}

QuiX.getEventListener = function(f) {
    if (typeof(f) != 'function') {
        try {
            f = eval(f);
        }
        catch(e) {
            f = null;
        }
    }
    return(f);
}

QuiX.wrappers = {
    eventWrapper : function(f1, f2) {
        f1 = QuiX.getEventListener(f1);
        f2 = QuiX.getEventListener(f2);
        function wrapper(evt, w) {
            var r1, r2 = null;
            if (f1) r1 = f1(evt, w);
            if (f2) r2 = f2(evt, w);
            return (typeof(r1) != 'undefined')?r1:r1||r2;
        }
        return wrapper;
    },
    oneAtAtime : function(f1) {
        var lock = false;
        f1 = QuiX.getEventListener(f1);
        function wrapper(evt, w) {
            function _call() {
                f1(evt, w);
                // release lock
                lock = false;
            }
            if (!lock) {
                // acquire lock
                lock = true;
                if (QuiX.utils.BrowserInfo.family == 'ie') {
                    // IE: we need to copy evt
                    var evt_copy = {};
                    for (var v in evt)
                        evt_copy[v] = evt[v];
                    evt = evt_copy;
                }
                window.setTimeout(_call , 1);
            }
        }
        if (f1)
            return wrapper;
        else
            return null;
    }
};

QuiX.getImage = function(url) {
    var img;
    url = url.replace('$THEME_URL$', QuiX.getThemeUrl());
    if (url.slice(0,4) != 'http' && url.slice(0,1) != '/')
        url = QuiX.root + url;
    img = new Image();
    img.src = url;
    return img;
}

QuiX.addEvent = function(el, type, proc) {
    if (el.addEventListener) {
        el.addEventListener(type.slice(2,type.length), proc, false);
        return true;
    }
    else if (el.attachEvent) {
        return el.attachEvent(type, proc);
    }
    else
        return false;
}

QuiX.removeEvent = function(el, type, proc) {
    if (el.removeEventListener) {
        el.removeEventListener(type.slice(2,type.length), proc, false);
        return true;
    }
    else if (el.detachEvent) {
        return el.detachEvent(type, proc);
    }
    else
        return false;
}

QuiX.sendEvent = function(el, module, type /*, args*/) {
    if (el.dispatchEvent) {
        if (!document.implementation.hasFeature(module, ""))
            return false;
        var e = document.createEvent(module);
        e.initEvent(type.slice(2,type.length), true, false/*, args */);
        el.dispatchEvent(e);
        return true;
    }
    else if (el.fireEvent) {
        return el.fireEvent(type);
    }
    else
        return false;
}

QuiX.stopPropag = function(evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    else if (window.event) window.event.cancelBubble = true;
}

QuiX.cancelDefault = function(evt) {
    if (evt && evt.preventDefault)
        evt.preventDefault();
    else if (window.event)
        window.event.returnValue = false;
}

QuiX.XHRPool = (
    function() {
        var stack = [];
        var poolSize = 10;
        var nullFunction = function(){};
        function createXHR() {
            if (window.XMLHttpRequest)
                return new XMLHttpRequest();
            else if (window.ActiveXObject)
                return new ActiveXObject('Microsoft.XMLHTTP');
            else
                return null;
        }
        for (var i = 0; i<poolSize; i++)
            stack.push(createXHR());
        return ({
            release : function(xhr) {
                xhr.onreadystatechange = nullFunction;
                xhr.abort();
                stack.push(xhr);
            },
            getInstance : function() {
                if (stack.length < 1)
                    return createXHR();
                else
                    return stack.pop();
            },
            toString : function() {
                return "stack size = " + stack.length;
            }
        });
    }
)();

QuiX.getTextNodes = function(el){
    var textnodes = [];
    for (var i=0; i<el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType == 3) {
            textnodes.push(el.childNodes[i]);
        }
        else {
            textnodes = textnodes.concat(QuiX.getTextNodes(el.childNodes[i]));
        }
    }
    return textnodes;
}

QuiX.contains = function(w, reText) {
    var text = w.div.innerHTML.replace(QuiX._strip_tags_re, '');
    return new RegExp(reText, 'gi').test(text);
}

QuiX.highlight = function(el, reText) {
    QuiX.removeHighlight(el);
    var tn = QuiX.getTextNodes(el),
        re = new RegExp(reText, 'gi'),
        p, span;
    for (var i=0; i<tn.length; i++) {
        if (re.test(tn[i].nodeValue)) {
            p = QuiX.getParentNode(tn[i]);
            span = ce('SPAN');
            span.id = '_hl';
            span.innerHTML = tn[i].nodeValue.replace(re, '<span>$1</span>');
            p.replaceChild(span, tn[i]);
        }
    }
}

QuiX.removeHighlight = function(el) {
    var span, text;
    var spans = el.getElementsByTagName('SPAN');
    for (var i=0; i<spans.length; i++) {
        span = spans[i];
        if (span.id == '_hl') {
            text = span.innerHTML.replace(QuiX._strip_tags_re, '');
            QuiX.getParentNode(span).replaceChild(
                document.createTextNode(text),
                span);
        }
    }
}

QuiX.setInnerText = function(node, text) {
    var textNode = document.createTextNode(text);
    node.innerHTML = '';
    node.appendChild(textNode);
}

QuiX.getInnerText = function(node) {
    var text = '';
    var i;
    if (typeof XMLSerializer != "undefined") {
        var serializer = new XMLSerializer();
        for (i=0; i<node.childNodes.length; i++) {
            text += serializer.serializeToString(node.childNodes[i]);
        }
    }
    else if (node.xml) {
        for (i=0; i<node.childNodes.length; i++) {
            text += node.childNodes[i].xml;
        }
    }
    if (text.trim().slice(0, 11) == "<!--[CDATA[") {
            text = text.trim().slice(11, text.length - 5);
    }
    else if (text.trim().slice(0, 9) == "<![CDATA[") {
            text = text.trim().slice(9, text.length - 3);
    }
    return text;
}

QuiX.localName = function(node) {
    if (node.localName)
        return node.localName;
    else {
        var tokens = node.tagName.split(':');
        return (tokens.length == 1)? tokens[0]:tokens[1];
    }
}

QuiX.removeWidget = function(w) {
    var parentElement;

    if (w.__tooltip || w.__tooltipID)
        QuiX.ui.Widget._onmouseout(null, w);
    if (w._customRegistry.onunload)
        w._customRegistry.onunload(w);
    while (w.widgets.length>0)
        QuiX.removeWidget(w.widgets[0]);
    if (w.contextMenu) {
        if (w.contextMenu.isOpen)
            w.contextMenu.close();
        QuiX.removeWidget(w.contextMenu);
    }
    if (w.parent)
        w.parent.widgets.removeItem(w);

    w._detachEvents();

    parentElement = QuiX.getParentNode(w.div);
    if (parentElement)
        QuiX.removeNode(w.div);

    w.div.widget = null;
    for (var v in w)
        w[v] = null;
    w = null;
}

QuiX.getParentNode = function(el) {
    if (typeof el.parentElement != 'undefined')
        return el.parentElement;
    else
        return el.parentNode;
}

QuiX.setOpacity = function(el, op) {
    if (QuiX.utils.BrowserInfo.family == 'moz')
        el.style.MozOpacity = op;
    else if (QuiX.utils.BrowserInfo.family == 'ie')
        el.style.filter = 'alpha(opacity=' + op * 100 + ')';
    else
        el.style.opacity = op;
}

QuiX.getOpacity = function(el) {
    if (QuiX.utils.BrowserInfo.family == 'moz')
        return parseFloat(el.style.MozOpacity);
    else if (QuiX.utils.BrowserInfo.family == 'ie') {
        var re = /alpha\(opacity=(\d+)\)/;
        var arrOpacity = re.exec(el.style.filter);
        if (arrOpacity.length > 1)
            return parseInt(arrOpacity[1]) / 100;
        else
            return 1;
    }
    else
        return parseFloat(el.style.opacity);
}

QuiX.setStyle = function(el, cssText) {
    if (QuiX.utils.BrowserInfo.family == 'ie')
        el.style.cssText = cssText;
    else
        el.setAttribute('style', cssText);
}

QuiX.detachFrames = function(w) {
    if (QuiX.modules[9].isLoaded) {
        var frms = w.getWidgetsByType(QuiX.ui.IFrame);
        for (var i=0; i<frms.length; i++) {
            if (QuiX.getParentNode(frms[i].frame))
                QuiX.removeNode(frms[i].frame);
        }
    }
}

QuiX.attachFrames = function(w) {
    if (QuiX.modules[9].isLoaded) {
        var frms = w.getWidgetsByType(QuiX.ui.IFrame);
        for (var i=0; i<frms.length; i++)
            if (!QuiX.getParentNode(frms[i].frame))
                frms[i].div.appendChild(frms[i].frame);
    }
}

QuiX.transformX = function(x /*, parent*/) {
    var parent = arguments[1] || document.desktop;
    // rtl xform
    return parent.getWidth(false) +
           parseInt(parent.div.style.paddingRight) +
           parseInt(parent.div.style.paddingLeft) -
           x;
}

QuiX.getScrollLeft = function(el) {
    if (QuiX.dir == 'rtl') {
        var fm = QuiX.utils.BrowserInfo.family;
        switch (fm) {
            case 'ie':
                return -el.scrollLeft;
            case 'saf':
                return el.scrollLeft - (el.scrollWidth - el.clientWidth);
            case 'op':
                var offset = 0;
                if (el.scrollHeight > el.offsetHeight)
                    offset = QuiX._scrollbarSize;
                return el.scrollLeft - offset;
            default:
                return el.scrollLeft;
        }
    }
    else
        return el.scrollLeft;
}

QuiX.measureWidget = function(w, dim) {
    var div = ce('DIV');
    div.style.position = 'absolute';
    div.id = w.div.id;
    div.style.whiteSpace = w.div.style.whiteSpace;
    div.style.fontSize = w.div.style.fontSize;
    div.style.fontWeight = w.div.style.fontWeight;
    var other = (dim == 'height')?'width':'height';
    var other_func = (other == 'height')?'_calcHeight':'_calcWidth';
    var measure = (dim == 'height')?'offsetHeight':'offsetWidth';
    var padding_offset = (dim == 'height')?2:0;
    var padding = w.getPadding();
    if (w[other] != 'auto')
        div.style[other] = w[other_func](true) + 'px';
    div.innerHTML = w.div.innerHTML;
    // required by webkit
    var imgs = div.getElementsByTagName('IMG');
    if (imgs.length > 0)
        imgs[imgs.length - 1].style.height = '';
    //
    document.body.appendChild(div);
    var value = div[measure] +
                padding[padding_offset] +
                padding[padding_offset + 1] +
                2 * w.getBorderWidth();
    QuiX.removeNode(div);
    return value
}

// QuiX UI Parser

QuiX.Parser = function() {
    this.__modulesToLoad = [];
    this.__onload = [];
    this.__customPrio = -1;
    this.dom = null;
    this.oncomplete = null;
}

QuiX.Parser.prototype.detectModules = function(oNode) {
    if (oNode.nodeType != 1)
        return;
    var sTag = QuiX.localName(oNode),
        iMod = QuiX.tags[sTag],
        i;
    if (iMod > -1) {
        this._addModule(QuiX.modules[iMod]);
    }
    else if (sTag == 'script' || sTag == 'module' || sTag == 'stylesheet') {
        var params = this.getNodeParams(oNode);
        if (!document.getElementById(params.src)) {
            var oMod = new QuiX.Module(params.name, params.src, [],
                                       this.__customPrio);
            if (sTag == 'stylesheet')
                oMod.type = 'stylesheet';
            else if (params.depends)
                oMod.dependencies = params.depends.split(',');
            this._addModule(oMod);
            this.__customPrio--;
        }
    }

    for (i=0; i<oNode.childNodes.length; i++) {
        this.detectModules(oNode.childNodes[i]);
    }
}

QuiX.Parser.prototype._addModule = function(oMod) {
    if (!oMod.isLoaded && !this.__modulesToLoad.hasItem(oMod)) {
        this.__modulesToLoad.push(oMod);
        for (var i=0; i<oMod.dependencies.length; i++) {
            this._addModule(QuiX.modules[parseInt(oMod.dependencies[i])]);
        }
    }
}

QuiX.Parser.prototype.loadModules = function() {
    var module;
    var self = this;
    if (this.__modulesToLoad.length > 0) {
        module = this.__modulesToLoad.pop();
        module.load(function(){self.loadModules()});
    } else {
        QuiX.removeLoader();
        this.beginRender();
    }
}

QuiX.Parser.prototype.onerror = function(e) {
    QuiX.displayError(e);
}

QuiX.Parser.prototype.parse = function(dom, parentW) {
    this.dom = dom;
    this.parentWidget = parentW;
    if (dom == null || dom.documentElement == null ||
            dom.documentElement.tagName == 'parsererror') {
        this.onerror(new QuiX.Exception(
            'QuiX.Parser.parse',
            'Invalid QuiX XML'));
        return;
    }
    this.detectModules(dom.documentElement);
    if (this.__modulesToLoad.length > 0) {
        this.__modulesToLoad.sortByAttribute('priority');
        if (parentW)
            QuiX.addLoader();
        this.loadModules();
    }
    else {
        this.beginRender();
    }
}

QuiX.Parser.prototype.beginRender = function() {
    var on_load;
    var widget = this.render();
    this.__onload.reverse();
    while (this.__onload.length > 0) {
        on_load = this.__onload.pop();
        try {
            on_load[0](on_load[1]);
        }
        catch(e) {
            this.onerror(e);
        }
    }
    widget.redraw(true);
    this.dom = null;
    if (this.oncomplete) {
        try {
            this.oncomplete(widget);
        }
        catch(e) {
            this.onerror(e);
        }
    }
}

QuiX.Parser.prototype.render = function() {
    var widget;
    var parentW = this.parentWidget;
    var frag = document.createDocumentFragment();
    if (parentW) {
        var root = parentW.div;
        frag.appendChild(root.cloneNode(false));
        parentW.div = frag.firstChild;
        widget = this.parseXul(this.dom.documentElement, parentW);
        root.appendChild(widget.div);
        parentW.div = root;
    }
    else {
        widget = this.parseXul(this.dom.documentElement, frag);
        document.body.appendChild(frag);
    }
    frag = null;
    return(widget);
}

QuiX.Parser.prototype.getNodeParams = function(oNode) {
    var params = {};
    for (var i=0; i<oNode.attributes.length; i++)
        params[oNode.attributes[i].name] = oNode.attributes[i].value;
    return(params);
}

QuiX.Parser.prototype.parseXul = function(oNode, parentW) {
    var oWidget = null;
    if (oNode.nodeType == 1) {
        var params = this.getNodeParams(oNode);
        if (oNode.namespaceURI == QuiX.namespace) {
            var localName = QuiX.localName(oNode).toLowerCase();
            switch(localName) {
                case 'flatbutton':
                    oWidget = new QuiX.ui.FlatButton(params);
                    if (params.type=='menu') {
                        parentW.appendChild(oWidget);
                        oWidget = oWidget.contextMenu;
                    }
                    break;
                case 'field':
                    if (params.type=='textarea')
                        params.value = QuiX.getInnerText(oNode);
                    oWidget = new QuiX.ui.Field(params);
                    break;
                case 'richtext':
                    params.value = QuiX.getInnerText(oNode);
                    oWidget = new QuiX.ui.RichText(params);
                    break;
                case 'mfile':
                    parentW.addFile(params);
                    break;
                case 'option':
                    oWidget = parentW.addOption(params);
                    break;
                case 'dlgbutton':
                    oWidget = parentW.addButton(params);
                    break;
                case 'wbody':
                    oWidget = parentW.body;
                    break;
                case 'tab':
                    oWidget = parentW.addTab(params);
                    break;
                case 'listheader':
                    oWidget = parentW.addHeader(params);
                    break;
                case 'column':
                    var oCol = parentW.parent.addColumn(params);
                    if (params.type=='optionlist') {
                        var options, p;
                        options = oNode.childNodes;
                        oCol.options = [];
                        for (var k=0; k<options.length; k++) {
                            if (options[k].nodeType == 1) {
                                p = this.getNodeParams(options[k]);
                                oCol.options.push(p);
                            }
                        }
                    }
                    break;
                case 'tbbutton':
                    oWidget = parentW.addButton(params);
                    if (params.type=='menu') oWidget = oWidget.contextMenu;
                    break;
                case 'tbsep':
                    oWidget = parentW.addSeparator();
                    break;
                case 'tool':
                    oWidget = parentW.addPane(params);
                    break;
                case 'menu':
                    oWidget = parentW.addRootMenu(params);
                    break;
                case 'menuoption':
                    oWidget = parentW.addOption(params);
                    break;
                case 'sep':
                    oWidget = parentW.addOption(-1);
                    break;
                case 'groupbox':
                    oWidget = new QuiX.ui.GroupBox(params);
                    parentW.appendChild(oWidget);
                    oWidget = oWidget.body;
                    break;
                case 'custom':
                    oWidget = eval('new ' + params.classname + '(params)');
                    break;
                case 'prop':
                    var attr_value = params['value'] || '';
                    switch (params.type) {
                        case 'int':
                            attr_value = parseInt(attr_value);
                            attr_value = (isNaN(attr_value))?null:attr_value;
                            break;
                        case 'bool':
                            attr_value = new Boolean(parseInt(attr_value)).
                                         valueOf();
                            break;
                        case 'float':
                            attr_value = parseFloat(attr_value);
                            attr_value = (isNaN(attr_value))?null:attr_value;
                            break;
                        case 'strlist':
                            var delimeter = params['delimeter'] || ';';
                            if (attr_value != '')
                                attr_value = attr_value.split(delimeter);
                            else
                                attr_value = [];
                            break;
                        case 'json':
                            attr_value = QuiX.parsers.JSON.parse(attr_value);
                    }
                    if (attr_value!=null)
                        parentW.attributes[params['name']] = attr_value;
                    else
                        throw new QuiX.Exception('QuiX.Parser.parseXul',
                            'Illegal custom property value. ' +
                            params['name'] + '=' + params['value']);
                    break;
                case 'xhtml':
                    parentW.div.innerHTML = QuiX.getInnerText(oNode);
                    break;
                default:
                    var widget_contructor = QuiX.constructors[localName];
                    if (widget_contructor != null)
                        oWidget = new widget_contructor(params, parentW);
                    else if (typeof widget_contructor == 'undefined')
                        throw new QuiX.Exception('QuiX.Parser.parseXul',
                            'Uknown widget tag name (' + localName + ')');
            }

            if (oWidget) {
                if (parentW && !oWidget.parent &&
                        !oWidget.owner && oWidget != document.desktop)
                    parentW.appendChild(oWidget);

                if (oWidget._isContainer)
                    for (var i=0; i<oNode.childNodes.length; i++)
                        this.parseXul(oNode.childNodes[i], oWidget);

                if (oWidget._customRegistry.onload)
                    this.__onload.push([oWidget._customRegistry.onload,
                                        oWidget]);
            }
        }
    }
    return oWidget;
}
