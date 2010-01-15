//==============================================================================
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
//==============================================================================

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
QuiX._image_cache = {};
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

QuiX.progress = '<rect xmlns="http://www.innoscript.org/quix" \
    width="18" height="18"><xhtml><![CDATA[\
    <img src="' + QuiX.getThemeUrl() + 'images/loader.gif">\
    ]]></xhtml></rect>';

QuiX.Module = function(sName, sFile, d) {
	this.isLoaded = false;
	this.name = sName;
	this.file = sFile;
	this.dependencies = d;
	this.type = 'script';
	this.callback = null;
}

QuiX.Module.prototype.load = function(callback) {
	var oElement;
	this.callback = callback;
	if (this.type == 'script') {
		oElement = document.createElement('SCRIPT');
		oElement.type = 'text/javascript';
		oElement.defer = true;
		oElement.src = this.file;
		var onload = (document.all)?'onreadystatechange':'onload';
		oElement[onload] = QuiX.__resource_onstatechange;
	}
	else {
		oElement = document.createElement('LINK');
		oElement.type = 'text/css';
		oElement.href = this.file;
		oElement.rel = 'stylesheet';
	}
	oElement.resource = this;
	oElement.id = this.file;
	document.getElementsByTagName('head')[0].appendChild(oElement);
	if (this.type=='stylesheet') {
		this.isLoaded = true;
        if (callback)
            callback();
	}
}

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
		if (this.readyState=='loaded' || this.readyState=='complete') {
			if (this.tagName=='IMG') {
				this.resource.width = this.width;
				this.resource.height = this.height;
				QuiX.removeNode(this);
                QuiX._image_cache[this.resource.url] = this;
			}
			this.resource.isLoaded = true;
            if (this.resource.callback)
                this.resource.callback();
		}
	}
	else {
		if (this.tagName=='IMG') {
			this.resource.width = this.width;
			this.resource.height = this.height;
			QuiX.removeNode(this);
            QuiX._image_cache[this.src] = this;
		}
		this.resource.isLoaded = true;
        if (this.resource.callback)
            this.resource.callback();
	}
}

QuiX.modules = [
    new QuiX.Module('Windows and Dialogs', QuiX.baseUrl + 'ui/windows.js', [3,13,15]),
    new QuiX.Module('Menus', QuiX.baseUrl + 'ui/menus.js', [3,13]),
    new QuiX.Module('Splitter', QuiX.baseUrl + 'ui/splitter.js', [15]),
    new QuiX.Module('Labels & Buttons', QuiX.baseUrl + 'ui/buttons.js', []),
    new QuiX.Module('Tab Pane', QuiX.baseUrl + 'ui/tabpane.js', []),
    new QuiX.Module('List View', QuiX.baseUrl + 'ui/listview.js', []),
    new QuiX.Module('Tree', QuiX.baseUrl + 'ui/tree.js', []),
    new QuiX.Module('Toolbars', QuiX.baseUrl + 'ui/toolbars.js', [3]),
    new QuiX.Module('Forms & Fields', QuiX.baseUrl + 'ui/formfields.js', [3]),
    new QuiX.Module('Common Widgets', QuiX.baseUrl + 'ui/common.js', [3,8]),
    new QuiX.Module('Datagrid', QuiX.baseUrl + 'ui/datagrid.js', [5,8]),
    new QuiX.Module('File Control', QuiX.baseUrl + 'ui/file.js', [1,3,8,9,14]),
    new QuiX.Module('Date Picker', QuiX.baseUrl + 'ui/datepicker.js', [14,8]),
    new QuiX.Module('Timers & Effects', QuiX.baseUrl + 'ui/timers.js', []),
    new QuiX.Module('Forms & Fields 2', QuiX.baseUrl + 'ui/formfields2.js', [3]),
    new QuiX.Module('VBox & HBox', QuiX.baseUrl + 'ui/box.js', []),
    new QuiX.Module('Rich Text Editor', QuiX.baseUrl + 'ui/richtext.js', [8,15,9]),
];

QuiX.tags = {
    'desktop':-1, 'xhtml':-1, 'script':-1, 'prop':-1, 'stylesheet':-1,
    'rect':-1, 'module':-1, 'custom':-1,
    
    'window':0, 'dialog':0,
    'menubar':1, 'menu':1, 'menuoption':1, 'contextmenu':1,
    'splitter':2,
    'dlgbutton':3, 'button':3, 'flatbutton':3, 'label':3, 'icon':3, 'link':3,
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
    // utils
    QuiX.baseUrl + 'utils/utils.js',
    QuiX.baseUrl + 'utils/date.js',
    // base widget
    QuiX.baseUrl + 'ui/widget.js',
    // persistence
    QuiX.baseUrl + 'persist/persist.js',
    // rpc
    QuiX.baseUrl + 'rpc/rpc.js',
    // theme css
    QuiX.getThemeUrl() + 'quix.css'
];

QuiX.__init__ = function() {
    var boot_loader_url = QuiX.getThemeUrl() + 'images/boot_loader.gif';
    var boot_loader = new QuiX.Image(boot_loader_url);
    boot_loader.load(function() {
        boot_loader = QuiX.getImage(boot_loader_url);
        boot_loader.style.margin = '100px auto';
        boot_loader.style.display = 'block';
        boot_loader.style.textAlign = 'center';
        boot_loader.style.border = '1px solid silver';
        document.body.appendChild(boot_loader);
    });

    QuiX.load(QuiX.bootLibraries,
        function() {
            var root = document.body.removeChild(
                document.getElementById("quix"));
            var parser = new QuiX.Parser();
            parser.oncomplete = function() {
                // calculate scrollbars size
                QuiX.removeNode(boot_loader);
                var w1 = document.desktop.div.clientWidth;
                var overflow = document.desktop.getOverflow()
                document.desktop.div.style.overflow = 'scroll';
                QuiX._scrollbarSize = w1 - document.desktop.div.clientWidth;
                document.desktop.setOverflow(overflow);
            }
            parser.parse(QuiX.domFromElement(root));
        }
    );
}

QuiX.load = function(modules, callback) {
    function bootstrap() {
        if (modules.length > 0) {
            var r_info = modules.shift();
            var m = new QuiX.Module(null, r_info, []);
            m.type = (r_info.substring(r_info.length-3)=='css')?
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
	document.desktop.parseFromString(
        '<dialog xmlns="http://www.innoscript.org/quix" title="Error" \
                resizable="true" close="true" width="560" height="240" \
                left="center" top="center"> \
            <wbody> \
                <hbox spacing="8" width="100%" height="100%"> \
                    <icon width="56" height="56" padding="12,12,12,12" \
                        img="$THEME_URL$images/error32.gif"/> \
                    <rect padding="4,4,4,4" overflow="auto"><xhtml><![CDATA[ \
                        <pre style="color:red;font-size:12px; \
                            font-family:monospace;padding-left:4px">' +
                            e.name + '\n\n' + e.message +
                        '</pre>]]></xhtml> \
                    </rect> \
                </hbox> \
            </wbody> \
            <dlgbutton onclick="__closeDialog__" width="70" height="22" \
                caption="Close"/> \
        </dialog>');
}

QuiX.getTarget = function(evt) {
	if (evt.target) {
		var node = evt.target;
		while(node.nodeType != node.ELEMENT_NODE)
			node = node.parentNode;
		return node;
	}
	else
		return evt.srcElement;
}

QuiX.getTargetWidget = function(evt) {
	var el = QuiX.getTarget(evt);
	while (el && !el.widget)
		el = QuiX.getParentNode(el);
	return (el)?el.widget:null;
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

QuiX.createOutline = function(w) {
	var macff = QuiX.utils.BrowserInfo.family == 'moz'
        && QuiX.utils.BrowserInfo.OS == 'MacOS';
	var fl = (macff)?'auto':'hidden';
	
	var o = new QuiX.ui.Widget({
		left : w.getLeft(),
		top : w.getTop(),
		width : w.getWidth(true),
		height : w.getHeight(true),
		border : 2,
		overflow : fl
	});
	
	if (macff) {
		var inner = new QuiX.ui.Widget({
			width : '100%',
			height : '100%',
			overflow : 'hidden'
		});
		o.appendChild(inner);
	}
	
	var t = QuiX.getImage(QuiX.getThemeUrl() + 'images/transp.gif');
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
                window.setTimeout(function() {
                    f1(evt, w);
                    // release lock
                    lock = false;
                } ,1);
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
    if (QuiX._image_cache[url]) {
        img = QuiX._image_cache[url].cloneNode(false);
        img.style.display = '';
        img.width = QuiX._image_cache[url].width;
        img.height = QuiX._image_cache[url].height;
    }
    else {
        img = new Image();
        img.src = url;
    }
    return img;
}

QuiX.addEvent = function(el, type, proc) {
	if (el.addEventListener) {
		el.addEventListener(type.slice(2,type.length), proc, false);
		return true;
	} else if (el.attachEvent) {
		return el.attachEvent(type, proc);
	} else
        return false;
}

QuiX.removeEvent = function(el, type, proc) {
	if (el.removeEventListener) {
		el.removeEventListener(type.slice(2,type.length), proc, false);
		return true;
	} else if (el.detachEvent) {
		return el.detachEvent(type, proc);
	} else
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
	} else if (el.fireEvent) {
		return el.fireEvent(type);
	} else
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

QuiX.domFromString = function(s) {
	var dom = null;
	if (window.DOMParser)
		dom = (new DOMParser).parseFromString(s, 'text/xml');
	else if (window.ActiveXObject) {
		dom = new ActiveXObject("msxml2.domdocument");
		dom.loadXML(s);
	}
	return dom;
}

QuiX.domFromElement = function(el) {
	if (el.XMLDocument)
		return el.XMLDocument;
	else
		return QuiX.domFromString(el.innerHTML);
}

QuiX.localName = function(node) {
	if (node.localName)
		return node.localName;
	else {
		var tokens = node.tagName.split(':');
		return (tokens.length==1)?tokens[0]:tokens[1];
	}
}

QuiX.removeWidget = function(w) {
	var parentElement;
	
	if (w.__tooltip || w.__tooltipID)
		Widget__tooltipout(null, w);
	if (w._customRegistry.onunload)
		w._customRegistry.onunload(w);
	while (w.widgets.length>0)
		QuiX.removeWidget(w.widgets[0]);
    if (w.contextMenu)
        QuiX.removeWidget(w.contextMenu);
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
		var frms = w.getWidgetsByType(IFrame);
		for (var i=0; i<frms.length; i++) {
			if (QuiX.getParentNode(frms[i].frame))
				QuiX.removeNode(frms[i].frame);
		}
	}
}

QuiX.attachFrames = function(w) {
	if (QuiX.modules[9].isLoaded) {
		var frms = w.getWidgetsByType(IFrame);
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
    // required by safari
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
	this.dom = null;
	this.oncomplete = null;
}

QuiX.Parser.prototype.detectModules = function(oNode) {
	if (oNode.nodeType!=1) return;
	var sTag = QuiX.localName(oNode);
	var iMod = QuiX.tags[sTag];
    var i;
	this._addModule(iMod);
	
	if (sTag == 'script' || sTag == 'module' || sTag == 'stylesheet') {
		var params = this.getNodeParams(oNode);
		if (!document.getElementById(params.src)) {
			var oMod = new QuiX.Module(params.name, params.src, []);
			if (sTag == 'stylesheet')
				oMod.type = 'stylesheet';
			else if (params.depends) {
				var depends = params.depends.split(",");
				for (i=0; i<depends.length; i++) {
					this._addModule(parseInt(depends[i]));
				}
			}
			this.__modulesToLoad.push(oMod);
		}
	}
	for (i=0; i<oNode.childNodes.length; i++) {
		this.detectModules(oNode.childNodes[i]);
	}
}

QuiX.Parser.prototype._addModule = function(iMod) {
	var dependency;
	if (iMod>-1 && !QuiX.modules[iMod].isLoaded) {
		var oMod = QuiX.modules[iMod];
		if(!this.__modulesToLoad.hasItem(oMod)) {
			for (var i=0; i<oMod.dependencies.length; i++) {
				dependency = QuiX.modules[oMod.dependencies[i]];
				if (!this.__modulesToLoad.hasItem(dependency) && !dependency.isLoaded) {
					this._addModule(oMod.dependencies[i]);
				}
			}
			this.__modulesToLoad.push(oMod);
		}
	}
}

QuiX.Parser.prototype.loadModules = function() {
	var module, imgurl, img;
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
        this.__modulesToLoad.reverse();
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
		on_load[0](on_load[1]);
	}
	widget.redraw(true);
    this.dom = null;
	if (this.oncomplete)
		this.oncomplete(widget);
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
                            attr_value = new Boolean(parseInt(attr_value)).valueOf();
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
                    this.__onload.push([oWidget._customRegistry.onload, oWidget]);
            }
        }
    }
	return oWidget;
}

//==============================================================================
// RPC Parsers
//==============================================================================
QuiX.parsers = {};

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
        else
            return obj.toXMLRPC();
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
    if (this == parseInt(this)) {
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
            if (Date._iso8601Re.test(value)) {
                return Date.parseIso8601(value);
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
    // normally this should be used
    // return this.toIso8601();
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
