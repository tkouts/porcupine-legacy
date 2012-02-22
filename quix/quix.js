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

var QuiX = {};
QuiX.version = '1.1 build 20110416';
QuiX.namespace = 'http://www.innoscript.org/quix';
QuiX.root = '';
QuiX.baseUrl = 'quix/';
QuiX.maxz = 999999999;

QuiX.startX = 0;
QuiX.startY = 0;
QuiX.currentX = 0;
QuiX.currentY = 0;
QuiX.widget = null;
QuiX.tmpWidget = null;

QuiX.clipboard = new (function() {
    this.contains = '';
    this.action = '';
    this.items = [];
})();

QuiX.dragable = null;
QuiX.dropTarget = null;
QuiX.dragTimer = 0;
QuiX.dragging = false;
QuiX._imgCache = {},
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
QuiX.desktops = [];
QuiX.ui = {};

QuiX.getCssAttribute = function(a) {
    var style = (document.body)? document.body.style:ce('div').style,
        caped = a.charAt(0).toUpperCase() + a.slice(1);

    if (typeof style[a] != 'undefined') {
        return a;
    }
    else if (typeof style['Moz' + caped] != 'undefined') {
        return 'Moz' + caped;
    }
    else if (typeof style['webkit' + caped] != 'undefined') {
        return 'webkit' + caped;
    }
    else if (typeof style['O' + caped] != 'undefined') {
        return 'O' + caped;
    }
    else if (typeof style['ms' + caped] != 'undefined') {
        return 'ms' + caped;
    }
    else {
        return null;
    }
}

QuiX.css = {
    boxSizing: (function() {
        if (navigator.appVersion.indexOf("MSIE 7.") > -1) {
            return null;
        }
        else {
            return QuiX.getCssAttribute('boxSizing');
        }
    })(),
    boxFlex: (function() {
        if (QuiX.getCssAttribute('MozBoxFlex')) {
            // boxFlex does not work correctly on mozilla
            return false;
        }
        else {
            return QuiX.getCssAttribute('boxFlex');
        }
    })(),
    boxAlign: QuiX.getCssAttribute('boxAlign'),
    transform: QuiX.getCssAttribute('transform')
}

QuiX.supportTouches = (typeof ce('DIV').ontouchstart != 'undefined'
                       && navigator.userAgent.indexOf('hpwOS') == -1);

QuiX.queryString = function(param) {
    function urlEncodeIfNecessary(s) {
        var regex = /[\\\"<>\.;]/,
            hasBadChars = regex.exec(s) != null;
        return hasBadChars? encodeURIComponent(s):s;
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

QuiX.resolveUrl = function(url) {
    url = url.replace('$THEME_URL$', QuiX.getThemeUrl());
    if (url.slice(0,4) != 'http' && url.slice(0,1) != '/') {
        url = QuiX.root + url;
    }
    return url;
}

QuiX.getThemeUrl = function() {
    var theme = document.theme || QuiX.queryString('_qt') || 'default';
    return QuiX.baseUrl + 'themes/' + theme + '/';
}

// module

QuiX.Module = function(name, file, depends , prio /*, checkTag*/) {
    this.isLoaded = false;
    this.name = name;
    this.file = QuiX.resolveUrl(file);
    this.dependencies = depends;
    this.priority = prio;
    this.checkTag = arguments[4] || null;
    this.type = 'script';
    this.callback = null;
}

QuiX.Module.loadModules = function(modList, oncomplete) {
    var mod,
        counter = modList.length;

    if (counter == 0) {
        oncomplete();
        return;
    }

    function _decrease() {
        counter--;
        if (counter == 0) {
            oncomplete();
        }
    }

    for (var i=0; i<modList.length; i++) {
        modList[i].load(_decrease);
    }
}

QuiX.Module.prototype.load = function(callback) {
    var oElement;
    this.callback = callback;
    if (this.type == 'script') {
        var onload = (document.all)? 'onreadystatechange':'onload';
        oElement = document.createElement('SCRIPT');
        oElement.type = 'text/javascript';
        oElement.defer = true;
        oElement.resource = this;
        oElement[onload] = QuiX.__resource_onstatechange;
        oElement.src = this.file;
    }
    else {
        oElement = document.createElement('LINK');
        oElement.type = 'text/css';
        oElement.href = this.file;
        oElement.rel = 'stylesheet';
    }
    document.getElementsByTagName('HEAD')[0].appendChild(oElement);
    oElement.id = this.file;
    if (this.type == 'stylesheet') {
        this.isLoaded = true;
        if (callback) {
            callback();
        }
    }
}

// image

QuiX.Image = function(url) {
    this.url = QuiX.resolveUrl(url);
    this.isLoaded = false;
    this.callback = null;
    this.width = 0;
    this.height = 0;
}

QuiX.Image.loadImages = function(urlList, progress, oncomplete) {
    var img,
        counter = urlList.length;

    function _decrease() {
        counter--;
        if (progress) {
            progress.increase(1);
        }
        if (counter == 0) {
            oncomplete();
        }
    }

    for (var i=0; i<urlList.length; i++) {
        img = new QuiX.Image(urlList[i]);
        img.load(_decrease);
    }
}

QuiX.Image.prototype.load = function(callback) {
    var img = new Image();
    this.callback = callback;
    img.resource = this;
    img.onload = QuiX.__resource_onstatechange;
    img.onerror = QuiX.__resource_error;
    img.src = this.url;
    //img.style.display = 'none';
    //document.body.appendChild(img);
}

QuiX.__resource_error = function() {
    if (this.resource.callback) {
        if (window.console) {
            console.log('Failed to load image ' + this.src);
        }
        this.resource.callback();
    }
}

QuiX.__resource_onstatechange = function() {
    if (this.tagName.toLowerCase() == 'script' && this.readyState) {
        if (this.readyState == 'loaded' || this.readyState == 'complete') {
            this.resource.isLoaded = true;
            if (this.resource.callback) {
                this.resource.callback();
            }
        }
    }
    else {
        if (this.tagName == 'IMG') {
            this.resource.width = this.width;
            this.resource.height = this.height;
            //QuiX.removeNode(this);
            QuiX._imgCache[this.src] = true;
        }
        this.resource.isLoaded = true;
        if (this.resource.callback) {
            this.resource.callback();
        }
    }
}

QuiX.modules = [
    new QuiX.Module('Windows and Dialogs',  //0
                    QuiX.baseUrl + 'ui/windows.js', [3,13,15], 5, 'window'),
    new QuiX.Module('Menus',                //1
                    QuiX.baseUrl + 'ui/menus.js', [3,13], 5, 'menu'),
    new QuiX.Module('Splitter',             //2
                    QuiX.baseUrl + 'ui/splitter.js', [15], 5, 'splitter'),
    new QuiX.Module('Labels & Buttons',     //3
                    QuiX.baseUrl + 'ui/buttons.js', [], 10, 'label'),
    new QuiX.Module('Tab Pane',             //4
                    QuiX.baseUrl + 'ui/tabpane.js', [3], 5, 'tabpane'),
    new QuiX.Module('List View',            //5
                    QuiX.baseUrl + 'ui/listview.js', [], 10, 'listview'),
    new QuiX.Module('Tree',                 //6
                    QuiX.baseUrl + 'ui/tree.js', [], 10, 'tree'),
    new QuiX.Module('Toolbars',             //7
                    QuiX.baseUrl + 'ui/toolbars.js', [3], 5, 'toolbar'),
    new QuiX.Module('Forms & Fields',       //8
                    QuiX.baseUrl + 'ui/formfields.js', [3,18], 5, 'field'),
    new QuiX.Module('Common Widgets',       //9
                    QuiX.baseUrl + 'ui/common.js', [3,8], 4, 'iframe'),
    new QuiX.Module('Datagrid',             //10
                    QuiX.baseUrl + 'ui/datagrid.js', [5,8,14,17], 4, 'datagrid'),
    new QuiX.Module('File Control',         //11
                    QuiX.baseUrl + 'ui/file.js', [1,3,8,9,14], 4, 'file'),
    new QuiX.Module('Date Picker',          //12
                    QuiX.baseUrl + 'ui/datepicker.js', [14,8], 4, 'datepicker'),
    new QuiX.Module('Timers & Effects',     //13
                    QuiX.baseUrl + 'ui/timers.js', [], 10, 'timer'),
    new QuiX.Module('Forms & Fields 2',     //14
                    QuiX.baseUrl + 'ui/formfields2.js', [3,18], 5, 'combo'),
    new QuiX.Module('VBox & HBox',          //15
                    QuiX.baseUrl + 'ui/box.js', [], 10, 'box'),
    new QuiX.Module('Rich Text Editor',     //16
                    QuiX.baseUrl + 'ui/richtext.js', [8,15,9], 4, 'richtext'),
    new QuiX.Module('Color Picker',         //17
                    QuiX.baseUrl + 'ui/colorpicker.js', [8], 4, 'colorpicker'),
    new QuiX.Module('Validator',            //18
                    QuiX.baseUrl + 'ui/validator.js', [3], 5),
    new QuiX.Module('Mobile',               //19
                    QuiX.baseUrl + 'ui/mobile.js', [13], 5, 'scrollview')
];

QuiX.tags = {
    'desktop':-1, 'xhtml':-1, 'script':-1, 'prop':-1, 'stylesheet':-1,
    'rect':-1, 'module':-1, 'custom':-1,

    'window':0, 'dialog':0,
    'menubar':1, 'menu':1, 'menuoption':1, 'contextmenu':1, 'flatbutton':1,
    'splitter':2,
    'dlgbutton':3, 'button':3, 'label':3, 'icon':3, 'link':3,
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
    'combo':14, 'selectlist':14, 'autocomplete':'14',
    'box':15, 'vbox':15, 'hbox':15, 'flowbox':15,
    'richtext':16,
    'colorpicker':17,
    'scrollview': 19
};

QuiX.bootLibraries = function() {
    return [QuiX.getThemeUrl() + 'theme.css',
            QuiX.getThemeUrl() + 'theme.js'];
}

QuiX.__init__ = function(id /*,params*/) {
    var params = arguments[1] || {},
        boot_loader_url = params.bootLoader || QuiX.getThemeUrl() + 'images/boot_loader.gif',
        preloadImages = (typeof params.preload == 'undefined')? false:params.preload,
        rootCont = (typeof params.container == 'undefined')? document.body:
            (typeof params.container == 'string')? document.getElementById(params.container):params.container;

    var modules = [];
    QuiX.bootLibraries().each(
        function() {
            var m = new QuiX.Module(null, this, []);
            m.type = (this.substring(this.length - 3) == 'css')?
                     'stylesheet':'script';
            if (!document.getElementById(this.toString())) {
                modules.push(m);
            }
        });

    QuiX.Module.loadModules(modules,
        function() {
            var root = document.getElementById(id),
                parser = new QuiX.Parser(preloadImages);

            var desktop = new QuiX.ui.Desktop({
                style: "background: url('" + boot_loader_url + "') no-repeat center"
            }, rootCont);
            parser.progress = new QuiX.ui.ProgressBar({
                width: 170,
                height: 14,
                top: '75%',
                left: 'center',
                padding: '1,1,1,1'
            });
            desktop.appendChild(parser.progress);
            desktop.redraw();

            parser.oncomplete = function() {
                if (!QuiX.supportTouches) {
                    // calculate scrollbars size
                    var w1 = desktop.div.clientWidth;
                    desktop.div.style.overflow = 'scroll';
                    QuiX._scrollbarSize = w1 - desktop.div.clientWidth;
                }
                else {
                    QuiX._scrollbarSize = 0;
                }
                desktop.destroy();
                //document._progress = null;
            }
            parser.parse(QuiX.parsers.domFromString(QuiX.getInnerText(root)), rootCont);
        }
    );
}

QuiX.addLoader = function() {
    if (QuiX._activeLoaders == 0) {
        document.body.style.cursor = 'wait';
    }
    QuiX._activeLoaders++;
}

QuiX.removeLoader = function() {
    if (QuiX._activeLoaders > 0) {
        QuiX._activeLoaders--;
        if (QuiX._activeLoaders == 0) {
            document.body.style.cursor = '';
        }
    }
}

QuiX.Exception = function(name, msg) {
    this.name = name;
    this.message = msg;
}
QuiX.Exception.prototype = new Error;

QuiX.displayError = function(e) {
    var msg = e.name + '\n\n' + e.message;
    if (e.stack) {
        msg += '\n\n' + e.stack;
    }
    if (e.lineNumber && e.fileName) {
        msg += '\nFile: "' + e.fileName + '" Line: ' + e.lineNumber;
    }
    alert(msg);
}

QuiX.getTarget = function(evt) {
    if (evt.target) {
        var node = evt.target;
        while (node.nodeType != node.ELEMENT_NODE) {
            node = node.parentNode;
        }
        return node;
    }
    else {
        return evt.srcElement;
    }
}

QuiX.getTargetWidget = function(evt) {
    var el = QuiX.getTarget(evt);
    return QuiX.getWidget(el);
}

QuiX.getWidget = function(el) {
    while (el && !el.widget) {
        el = QuiX.getParentNode(el);
    }
    return (el)? el.widget:null;
}

QuiX.getWidgetFromPoint = function(x, y) {
    return QuiX.getWidget(document.elementFromPoint(x, y));
}

QuiX.removeNode = function(node) {
    var oNode;
    if (node.removeNode) {
        oNode = node.removeNode(true);
    }
    else {
        oNode = node.parentNode.removeChild(node);
    }
    return oNode;
}

QuiX.getDraggable = function(w) {
    var d = new QuiX.ui.Widget({
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
        if (iButton == 1) { //left
            iButton = 0;
        }
        else if (iButton == 4) { //middle
            iButton = 1;
        }
    }
    return iButton;
}

QuiX.createOutline = function(w) {
    var macff = QuiX.utils.BrowserInfo.family == 'moz' &&
                QuiX.utils.BrowserInfo.OS == 'MacOS';
    var fl = (macff)? 'auto':'hidden';

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

    // calculate size because minw/minh procedure can
    // depend on it's children size
    o.minw = (typeof w.minw == "function")? w.minw(w):w.minw;
    o.minh = (typeof w.minh == "function")? w.minh(w):w.minh;
    o.div.className = 'outline';
    return(o);
}

QuiX.getEventListener = function(f) {
    if (f && typeof(f) != 'function') {
        if (f.charAt(0) == ':') {
            // javascript code
            f = new Function('evt', 'w', f.slice(1));
        }
        else {
            try {
                f = eval(f);
            }
            catch(e) {
                f = null;
            }
        }
    }
    return f;
}

QuiX.handlers = {
    allowFieldFocus: function(evt, w) {
        var target = QuiX.getTarget(evt);
        if (target.tagName != 'INPUT' && target.tagName != 'SELECT' && target.tagName != 'TEXTAREA') {
            QuiX.cancelDefault(evt);
        }
    },
    closeWindow: function(evt, w) {
        w.getParentByType(QuiX.ui.Window).close();
    }
}

QuiX.wrappers = {
    eventWrapper : function(f1, f2) {
        f1 = QuiX.getEventListener(f1);
        f2 = QuiX.getEventListener(f2);
        function wrapper(evt, w) {
            var r1, r2 = null;
            if (f1) r1 = f1(evt, w);
            if (f2) r2 = f2(evt, w);
            return (typeof(r1) != 'undefined')? r1:r1||r2;
        }
        return wrapper;
    },
    onTap: function(f) {
        function wrapper(evt, w) {
            if (Math.abs(QuiX.currentX - QuiX.startX) <= 16 &&
                    Math.abs(QuiX.currentY - QuiX.startY) <= 16) {
                f(evt, w);
                QuiX.cancelDefault(evt);
            }
        }
        f.wrapper = wrapper;
        return wrapper;
    },
    onSwipe: function(f) {
        function wrapper(evt, w) {
            var dx, dy, abx, aby;
            if (QuiX.supportTouches) {
                if (QuiX.currentX == -1 || QuiX.currentY == -1) {
                    return;
                }
                var coords = QuiX.getEventCoordinates(evt);
                dx = QuiX.startX - coords[0];
                dy = QuiX.startY - coords[1];
            }
            else {
                dx = QuiX.startX - QuiX.currentX;
                dy = QuiX.startY - QuiX.currentY;
            }

            abx = Math.abs(dx);
            aby = Math.abs(dy);

            if (abx > 16) {
                if (dx > 0) {
                    evt.dir = 'left';
                }
                else {
                    evt.dir = 'right';
                }
                f(evt, w);
                if (QuiX.supportTouches) {
                    QuiX.currentX = -1;
                }
                QuiX.stopPropag(evt);
            }
            else if (aby > 16) {
                if (dy > 0) {
                    evt.dir = 'top';
                }
                else {
                    evt.dir = 'bottom';
                }
                f(evt, w);
                if (QuiX.supportTouches) {
                    QuiX.currentY = -1;
                }
                QuiX.stopPropag(evt);
            }
        }
        f.wrapper = wrapper;
        return wrapper;
    },
    oneAtAtime : function(f) {
        var lock = false;
        function wrapper(evt, w) {
            function _call() {
                f(evt, w);
                // release lock
                lock = false;
            }
            if (!lock) {
                // acquire lock
                lock = true;
                if (QuiX.utils.BrowserInfo.family == 'ie') {
                    // IE: we need to copy evt
                    var evt_copy = {};
                    for (var v in evt) {
                        evt_copy[v] = evt[v];
                    }
                    evt = evt_copy;
                }
                window.setTimeout(_call, 1);
            }
        }
        f.wrapper = wrapper;
        return wrapper;
    }
};

QuiX.getImage = function(url) {
    var img, cleanUrl;
    cleanUrl = url.split('?')[0];
    url = QuiX.resolveUrl(url);
    img = new Image();
    img.src = (document.imageData && document.imageData[cleanUrl])? document.imageData[cleanUrl]:url;
    return img;
}

QuiX._getTouchEventType = function(type) {
    var touchType;
    switch (type) {
        case 'onclick':
            touchType = 'ontouchend';
            break;
        case 'onmousedown':
            touchType = 'ontouchstart';
            break;
        case 'onmouseup':
            touchType = 'ontouchend';
            break;
        case 'onmouseover':
        case 'onmousemove':
            touchType = 'ontouchmove';
            break;
        default:
            touchType = type;
    }
    return touchType;
}

QuiX.addEvent = function(el, type, proc) {
    var wrapper = null;
    if (QuiX.supportTouches) {
        type = QuiX._getTouchEventType(type);
    }
    if (el.addEventListener) {
        el.addEventListener(type.slice(2, type.length), proc, false);
        return true;
    }
    else if (el.attachEvent) {
        return el.attachEvent(type, proc);
    }
    else {
        return false;
    }
}

QuiX.removeEvent = function(el, type, proc) {
    if (QuiX.supportTouches) {
        type = QuiX._getTouchEventType(type);
    }
    if (el.removeEventListener) {
        el.removeEventListener(type.slice(2,type.length), proc, false);
        return true;
    }
    else if (el.detachEvent) {
        return el.detachEvent(type, proc);
    }
    else {
        return false;
    }
}

QuiX.sendEvent = function(el, module, type /*, args*/) {
    if (el.fireEvent) {
        return el.fireEvent(type);
    }
    else if (el.dispatchEvent) {
        if (!document.implementation.hasFeature(module, "")) {
            return false;
        }
        var e = document.createEvent(module);
        e.initEvent(type.slice(2,type.length), true, false/*, args */);
        el.dispatchEvent(e);
        return true;
    }
    else {
        return false;
    }
}

QuiX.getEventCoordinates = function(evt) {
    if (evt.touches) {
        return [evt.touches[0].clientX, evt.touches[0].clientY];
    }
    else {
        return [evt.clientX, evt.clientY];
    }
}

QuiX.stopPropag = function(evt) {
    if (evt && evt.stopPropagation) {
        evt.stopPropagation();
    }
    else if (window.event) {
        window.event.cancelBubble = true;
        evt = window.event;
    }
    if (evt.type == 'mousedown' || evt.type == 'touchstart') {
        var coords = QuiX.getEventCoordinates(evt);
        QuiX.startX = QuiX.currentX = coords[0];
        QuiX.startY = QuiX.currentY = coords[1];
        QuiX.getDesktop(QuiX.getTarget(evt)).attachEvent('onmousemove', QuiX.ui.Desktop._onmousemove);
    }
}

QuiX.cancelDefault = function(evt) {
    if (evt && evt.preventDefault) {
        evt.preventDefault();
    }
    else if (window.event) {
        window.event.returnValue = false;
    }
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
    var text = '',
        i;

    if (node.text) {
        text = node.text;
    }
    else if (node.contentText) {
        text = node.contentText;
    }
    else if (typeof XMLSerializer != "undefined") {
        var serializer = new XMLSerializer();
        Array.prototype.slice.call(node.childNodes, 0).each(
            function() {
                if (this.nodeType == 4 && this.text) {
                    text += this.text;
                }
                else {
                    text += serializer.serializeToString(this).xmlDecode();
                }
            });
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
    var pe;

    if (w.__tooltip || w.__tooltipID) {
        QuiX.ui.Widget._onmouseout(null, w);
    }

    w.trigger('onunload');

    if (w.parent) {
        w.parent.widgets.removeItem(w);
    }

    while (w.widgets.length > 0) {
        QuiX.removeWidget(w.widgets[0]);
    }

    if (w.contextMenu) {
        if (w.contextMenu.isOpen) {
            w.contextMenu.close();
        }
        QuiX.removeWidget(w.contextMenu);
    }

    w._detachEvents();

    pe = QuiX.getParentNode(w.div);
    if (pe) {
        QuiX.removeNode(w.div);
    }

    w.div.widget = null;
    w = null;
}

QuiX.getParentNode = function(el) {
    if (typeof el.parentElement != 'undefined') {
        return el.parentElement;
    }
    else {
        return el.parentNode;
    }
}

QuiX.elementContains = function(a, b) {
    return a.contains ?
        a != b && a.contains(b) :
        !!(a.compareDocumentPosition(b) & 16);
}

QuiX.getDesktop = function(el) {
    if (document.desktop) {
        return document.desktop;
    }
    else {
        for (var i=0; i<QuiX.desktops.length; i++) {
            if (QuiX.elementContains(QuiX.desktops[i].div, el)) {
                return QuiX.desktops[i];
            }
        }
    }
    return null;
}

QuiX.setOpacity = function(el, op) {
    var cssOpacity = QuiX.getCssAttribute('opacity');
    if (cssOpacity) {
        el.style[cssOpacity] = op;
    }
    else if (QuiX.utils.BrowserInfo.family == 'ie') {
        if (op < 1) {
            opacity = ' alpha(opacity=' + parseInt(op * 100) + ')';
        }
        else {
            opacity = '';
        }
        if (el.style.filter.indexOf('opacity') > -1) {
            el.style.filter = el.style.filter.replace(/ alpha\(opacity=.*?\)/ig, opacity);
        }
        else {
            el.style.filter += opacity;
        }
    }
}

QuiX.getOpacity = function(el) {
    var cssOpacity = QuiX.getCssAttribute('opacity');
    if (cssOpacity) {
        return parseFloat(el.style[cssOpacity]);
    }
    else if (QuiX.utils.BrowserInfo.family == 'ie') {
        var re = /alpha\(opacity=(\d+)\)/i;
        var arrOpacity = re.exec(el.style.filter);
        if (arrOpacity != null && arrOpacity.length > 1) {
            return parseInt(arrOpacity[1]) / 100;
        }
        else {
            return 1;
        }
    }
}

QuiX.setShadow = function(el, shadow) {
    var cssShadow = QuiX.getCssAttribute('boxShadow');
    if (cssShadow) {
        if (shadow) {
            var _shadow = shadow[0] + "px " +
                          shadow[1] + "px " +
                          shadow[2] + "px " +
                          shadow[3];
            el.style[cssShadow] = _shadow;
        }
        else {
            el.style[cssShadow] = '';
        }
    }
}

QuiX._css2Js = function(css) {
    var js = '';
    for (var i=0; i<css.length; i++) {
        if (css.charAt(i) == '-') {
            i++;
            js += css.charAt(i).toUpperCase();
        }
        else {
            js += css.charAt(i);
        }
    }
    return js;
}

QuiX.getStyle = function(el, styleProp) {
    var y;
    if (el.currentStyle) {
        y = el.currentStyle[QuiX._css2Js(styleProp)];
    }
    else if (window.getComputedStyle) {
        y = document.defaultView.getComputedStyle(el, null);
        y = y? y.getPropertyValue(styleProp):'';
    }
    return y;
}

QuiX.setStyle = function(el, cssText) {
    if (QuiX.utils.BrowserInfo.family == 'ie') {
        el.style.cssText = cssText;
    }
    else {
        el.setAttribute('style', cssText);
    }
}

QuiX.detachFrames = function(w) {
    var frms = w.div.getElementsByTagName('IFRAME'),
        df = [];

    for (var i=0; i<frms.length;) {
        var p = QuiX.getParentNode(frms[i]);
        frms[i].p = p;
        df.push(QuiX.removeNode(frms[i]));
    }
    w._df = df;
}

QuiX.attachFrames = function(w) {
    if (w._df) {
        var frm;

        for (var i=0; i<w._df.length; i++) {
            frm = w._df[i];
            frm.p.appendChild(frm);
        }
        w._df = null;
    }
}

QuiX.transformX = function(x , parent) {
    // rtl xform
    return parent.getWidth(false) +
           parseInt(parent.div.style.paddingRight || 0) +
           parseInt(parent.div.style.paddingLeft || 0) -
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
    else {
        return el.scrollLeft;
    }
}

QuiX.measureText = function(sourceEl, text) {
    var span, size,
        st = 'font-size:' + QuiX.getStyle(sourceEl, 'font-size') +
         ';font-family:' + QuiX.getStyle(sourceEl, 'font-family') +
         ';font-weight:' + QuiX.getStyle(sourceEl, 'font-weight');
    span = ce('SPAN');
    QuiX.setStyle(span, st);
    QuiX.setInnerText(span, text);
    span.style.padding = '0px';
    document.body.appendChild(span);
    size = [span.offsetWidth, span.offsetHeight];
    QuiX.removeNode(span);
    return size;
}

QuiX.measureWidget = function(w, dim) {
    var div = ce('DIV'),
        other = (dim == 'height')? 'width':'height',
        other_func = (other == 'height')? '_calcHeight':'_calcWidth',
        measure = (dim == 'height')? 'offsetHeight':'offsetWidth',
        padding_offset = (dim == 'height')? 2:0,
        padding = w.getPadding();

    div.style.position = 'absolute';
    div.id = w.div.id;
    div.style.whiteSpace = w.div.style.whiteSpace;
    div.style.fontSize = QuiX.getStyle(w.div, 'font-size');
    div.style.fontWeight = QuiX.getStyle(w.div, 'font-weight');
    div.style.fontFamily = QuiX.getStyle(w.div, 'font-family');
    div.style.lineHeight = QuiX.getStyle(w.div, 'line-height');

    if (w[other] != 'auto') {
        div.style[other] = w[other_func](true) + 'px';
    }
    div.innerHTML = w.div.innerHTML;
    // required by webkit
    var imgs = div.getElementsByTagName('IMG');
    if (imgs.length > 0) {
        imgs[imgs.length - 1].style.height = '';
    }
    //
    document.body.appendChild(div);
    var value = div[measure] +
                padding[padding_offset] +
                padding[padding_offset + 1] +
                2 * w.getBorderWidth();
    QuiX.removeNode(div);
    return value;
}

// QuiX UI Parser

QuiX.Parser = function(/*preloadImages*/) {
    this.preloadImages = arguments[0] || false;
    this.__modules = [];
    this.__images = [];
    this.__onload = [];
    this.__customPrio = -1;
    this.dom = null;
    this.progress = null;
    this.oncomplete = null;
}

QuiX.Parser.prototype.prepare = function(oNode) {
    if (oNode.nodeType != 1 || oNode.namespaceURI != QuiX.namespace) {
        return;
    }

    var sTag = QuiX.localName(oNode),
        iMod = QuiX.tags[sTag],
        isIE = QuiX.utils.BrowserInfo.family == 'ie',
        isIE8 = isIE && QuiX.utils.BrowserInfo.version <= 8,
        src,
        depends;

    if (!isIE) {
        oNode.params = {};
        for (var i=0; i<oNode.attributes.length; i++) {
            oNode.params[oNode.attributes[i].name] = oNode.attributes[i].value;
        }
    }

    if (iMod > -1 && typeof QuiX.constructors[sTag] == 'undefined') {
        this._addModule(QuiX.modules[iMod]);
    }

    if ((src = oNode.getAttribute('img'))
            && (oNode.getAttribute('preload') == 'true' || this.preloadImages)
            && !isIE8) {
        var cleanSrc = src.split('?')[0];
        if (src != '' && !(QuiX._imgCache[src]) && !(document.imageData && document.imageData[cleanSrc])) {
            this.__images.push(src);
        }
    }
    else if (sTag == 'script' || sTag == 'module' || sTag == 'stylesheet') {
        if (!document.getElementById(oNode.getAttribute('src'))) {
            var oMod = new QuiX.Module(oNode.getAttribute('name'),
                                       oNode.getAttribute('src'),
                                       [],
                                       this.__customPrio);

            if (sTag == 'stylesheet') {
                oMod.type = 'stylesheet';
            }
            else if (depends = oNode.getAttribute('depends')) {
                oMod.dependencies = depends.split(',');
            }

            this._addModule(oMod);
            this.__customPrio--;
        }
    }

    for (var i=0; i<oNode.childNodes.length; i++) {
        if (oNode.childNodes[i].nodeType == 1
                && oNode.childNodes[i].namespaceURI == QuiX.namespace) {
            this.prepare(oNode.childNodes[i]);
        }
    }
}

QuiX.Parser.prototype._addModule = function(oMod) {
    if (!oMod.isLoaded && !this.__modules.hasItem(oMod)) {
        if (oMod.checkTag && typeof QuiX.constructors[oMod.checkTag] != 'undefined') {
            // the module is included in core files
            oMod.isLoaded = true;
            return;
        }
        this.__modules.push(oMod);
        for (var i=0; i<oMod.dependencies.length; i++) {
            this._addModule(QuiX.modules[parseInt(oMod.dependencies[i])]);
        }
    }
}

QuiX.Parser.prototype.loadModules = function() {
    var module,
        url,
        self = this;

    if (this.__modules.length > 0) {
        module = this.__modules.pop();
        if (!document.getElementById(module.file)) {
            module.load(
                function(){
                    if (self.progress) {
                        self.progress.increase(1);
                    }
                    self.loadModules()
                });
        }
        else {
            if (this.progress) {
                this.progress.increase();
            }
            this.loadModules();
        }
    }
    else if (this.__images.length > 0) {
        QuiX.Image.loadImages(this.__images, this.progress,
            function(){
                self.__images = [];
                self.loadModules();
            });
    }
    else {
        var self = this;
        window.setTimeout(function() {
        try {
            self.render();
        }
        finally {
            QuiX.removeLoader();
        }
        }, 0);
    }
}

QuiX.Parser.prototype.onerror = function(e) {
    QuiX.displayError(e);
}

QuiX.Parser.prototype.parse = function(dom, root) {
    this.dom = dom;
    this.root = root;

    if (dom == null || dom.documentElement == null ||
            dom.documentElement.tagName == 'parsererror') {
        this.onerror(new QuiX.Exception(
            'QuiX.Parser.parse',
            'Invalid QuiX XML'));
        return;
    }
    this.prepare(dom.documentElement);

    if (this.__modules.length > 0 || this.__images.length > 0) {
        this.__modules.sortByAttribute('priority');
        if (root instanceof QuiX.ui.Widget) {
            QuiX.addLoader();
        }
        else if (this.progress) {
            this.progress.maxvalue = this.__modules.length + this.__images.length;
        }
        this.loadModules();
    }
    else {
        QuiX.addLoader();
        try {
            this.render();
        }
        finally {
            QuiX.removeLoader();
        }
    }
}

QuiX.Parser.prototype.render = function() {
    var on_load,
        widget,
        parent = this.root,
        frag = document.createDocumentFragment();

    if (parent instanceof QuiX.ui.Widget) {
        var root = parent.div;
        frag.appendChild(root.cloneNode(false));
        parent.div = frag.firstChild;
        widget = this.parseXul(this.dom.documentElement, parent);
        if (!QuiX.elementContains(document.body, widget.div)) {
            root.appendChild(widget.div);
        }
        parent.div = root;
    }
    else {
        frag.appendChild(parent.cloneNode(false));
        widget = this.parseXul(this.dom.documentElement, frag.firstChild);
        parent.appendChild(widget.div);
    }

    frag = null;

    // call onload handlers
    while (this.__onload.length > 0) {
        on_load = this.__onload.shift();
        try {
            on_load[0](on_load[1]);
        }
        catch(e) {
            this.onerror(e);
        }
    }

    this.dom = null;

    if (this.oncomplete) {
        try {
            this.oncomplete(widget);
        }
        catch(e) {
            this.onerror(e);
        }
    }

    // redraw widget
    widget.redraw();
    if (this.root.tagName && this.root.tagName == 'BODY' && QuiX._scrollbarSize > 0) {
        widget.redraw();
    }
}

QuiX.Parser.prototype.getNodeParams = function(node) {
    var params = {};
    for (var i=0; i<node.attributes.length; i++) {
        params[node.attributes[i].name] = node.attributes[i].value;
    }
    return params;
}

QuiX.Parser.prototype.parseXul = function(oNode, parentW) {
    var oWidget = null;
    if (oNode.nodeType == 1 && oNode.namespaceURI == QuiX.namespace) {
        var params = oNode.params || this.getNodeParams(oNode),
            localName = QuiX.localName(oNode).toLowerCase();

        switch(localName) {
            case 'flatbutton':
                oWidget = new QuiX.ui.FlatButton(params);
                if (params.type == 'menu') {
                    parentW.appendChild(oWidget);
                    oWidget = oWidget.contextMenu;
                }
                break;
            case 'field':
                if (params.type == 'textarea') {
                    params.value = QuiX.getInnerText(oNode);
                }
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
                if (params.type == 'optionlist') {
                    var options;
                    options = oNode.childNodes;
                    oCol.options = [];
                    for (var k=0; k<options.length; k++) {
                        if (options[k].nodeType == 1) {
                            oCol.options.push(options[k].params || this.getNodeParams(options[k]));
                        }
                    }
                }
                break;
            case 'tbbutton':
                oWidget = parentW.addButton(params);
                if (params.type == 'menu') {
                    oWidget = oWidget.contextMenu;
                }
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
                oWidget = new (eval(params.classname))(params);
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
                        if (attr_value != '') {
                            attr_value = attr_value.split(delimeter);
                        }
                        else {
                            attr_value = [];
                        }
                        break;
                    case 'json':
                        attr_value = QuiX.parsers.JSON.parse(attr_value);
                }
                if (attr_value!=null) {
                    parentW.attributes[params['name']] = attr_value;
                }
                else {
                    throw new QuiX.Exception('QuiX.Parser.parseXul',
                        'Illegal custom property value. ' +
                        params['name'] + '=' + params['value']);
                }
                break;
            case 'xhtml':
                parentW.div.innerHTML = QuiX.getInnerText(oNode).xmlDecode();
                break;
            default:
                var widget_contructor = QuiX.constructors[localName];
                if (widget_contructor != null) {
                    oWidget = new widget_contructor(params, parentW);
                }
                else if (typeof widget_contructor == 'undefined') {
                    throw new QuiX.Exception(
                        'QuiX.Parser.parseXul',
                        'Uknown widget tag name (' + localName + ')');
                }
        }

        if (oWidget) {
            if (parentW && !oWidget.parent
                    && !oWidget.owner
                    && !(oWidget instanceof QuiX.ui.Desktop)) {
                parentW.appendChild(oWidget);
            }

            // add onload handlers
            if (oWidget._customRegistry.onload) {
                var self = this;
                oWidget._customRegistry.onload.reverse().each(
                    function() {
                        self.__onload.unshift([this, oWidget]);
                    }
                )
            }

            for (var i=0; i<oNode.childNodes.length; i++) {
                if (oNode.childNodes[i].nodeType == 1
                        && oNode.childNodes[i].namespaceURI == QuiX.namespace) {
                    this.parseXul(oNode.childNodes[i], oWidget);
                }
            }
        }
    }
    return oWidget;
}
