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

// widget class

QuiX.ui.Widget = function(/*params*/) {
    var params = arguments[0] || {};
    this.left = params.left || 0;
    this.top = params.top || 0;
    this.width = params.width;
    this.height = params.height;
    this.minw = params.minw || 0;
    this.minh = params.minh || 0;
    this.tooltip = params.tooltip;
    this.widgets = [];
    this.attributes = params.attributes || {};
    this.maxz = 0;
    this.minz = 0;
    this._isDisabled = false;
    this.contextMenu = null;
    this.div = ce('DIV');
    if (params.style) {
        QuiX.setStyle(this.div, params.style);
    }
    this.div.widget = this;
    this._uniqueid = QuiX.utils.uid();
    if (params.id) {
        this.setId(params.id);
    }
    if (params.bgcolor) {
        this.setBgColor(params.bgcolor);
    }
    this.setBorderWidth(parseInt(params.border) || 0);
    if (params.padding) {
        var padding = params.padding.split(',');
        this.setPadding(padding);
    }
    else {
        this.div.style.padding = '0px';
    }

    if (params.dir || QuiX.dir) {
        this.div.dir = params.dir || QuiX.dir;
    }

    if (params.display) {
        this.setDisplay(params.display);
    }
    if (params.overflow) {
        this.setOverflow(params.overflow);
    }
    if (params.rotation) {
        this.setRotation(params.rotation);
    }
    this.div.style.position = 'absolute';

    this._buildEventRegistry(params);
    this._attachEvents();

    if (params.tooltip) {
        this.attachEvent('onmouseover', QuiX.ui.Widget._onmouseover);
        this.attachEvent('onmouseout', QuiX.ui.Widget._onmouseout);
    }
    if (typeof params.opacity != 'undefined') {
        this.setOpacity(parseFloat(params.opacity));
    }
    this.dragable = (params.dragable == 'true' || params.dragable == true);
    if (this.dragable) {
        this.attachEvent('onmousedown', QuiX.ui.Widget._startDrag);
    }
    if (params.dropable) {
        this.dropable =
            (params.dropable == 'true' || params.dropable == true)?
            true:QuiX.getEventListener(params.dropable);
    }
    if (params.disabled == 'true' || params.disabled == true) {
        this.disable();
    }
    if (params.shadow) {
        this.setShadow(params.shadow.split(','));
    }
}

QuiX.constructors['rect'] = QuiX.ui.Widget;
QuiX.ui.Widget.prototype.__class__ = QuiX.ui.Widget;

QuiX.ui.Widget.prototype.appendChild = function(w /*, index*/) {
    var index = (typeof arguments[1] != 'undefined')? arguments[1]:null;
    w.parent = this;
    w.bringToFront();

    if (this._isDisabled) {
        w.disable();
    }

    if (index != null && index >= 0 && index < this.widgets.length) {
        this.div.insertBefore(w.div, this.widgets[index].div);
        this.widgets.splice(index, 0, w);
    }
    else {
        this.div.appendChild(w.div);
        this.widgets.push(w);
    }
}

QuiX.ui.Widget.prototype.disable = function() {
    if (!this._isDisabled) {
        this._statecolor = this.div.style.color;
        this.div.style.color = 'GrayText';
        this._statecursor = this.div.style.cursor;
        this.div.style.cursor = 'default';
        this._isDisabled = true;
        if (this.__tooltip || this.__tooltipID) {
            QuiX.ui.Widget._onmouseout(null, this);
        }
        this._detachEvents();
        for (var i=0; i<this.widgets.length; i++) {
            this.widgets[i].disable();
        }
    }
}

QuiX.ui.Widget.prototype.enable = function() {
    if (this._isDisabled) {
        this.div.style.color = this._statecolor;
        this.div.style.cursor = this._statecursor;
        this._isDisabled = false;
        this._attachEvents();
        for (var i=0; i<this.widgets.length; i++) {
            this.widgets[i].enable();
        }
    }
}

QuiX.ui.Widget.prototype.detach = function() {
    this.parent.widgets.removeItem(this);
    this.parent = null;
    this.div = QuiX.removeNode(this.div);
}

QuiX.ui.Widget.prototype.parse = function(dom, callback, preloadImages) {
    var parser = new QuiX.Parser(preloadImages);
    parser.oncomplete = callback;
    parser.parse(dom, this);
}

QuiX.ui.Widget.prototype.parseFromString = function(s /*, oncomplete, preloadImages*/) {
    var oncomplete = arguments[1] || null;
    var preloadImages = arguments[2] || false;

    this.parse(QuiX.parsers.domFromString(s), oncomplete, preloadImages);
}

QuiX.ui.Widget.prototype.parseFromUrl = function(url /*, oncomplete, preloadImages, async */) {
    var oncomplete = arguments[1] || null,
        xmlhttp = QuiX.XHRPool.getInstance(),
        self = this;
    var preloadImages = arguments[2] || false;

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            var dom;
            QuiX.removeLoader();
            if (QuiX.utils.BrowserInfo.family == 'moz' && QuiX.rpc._cache) {
                // mozilla xmlhttp doesn't respect cache
                // use rpc cache for caching responses
                var status = xmlhttp.status;
                if (status == 304) { //Not modified
                    dom = QuiX.parsers.domFromString(xmlhttp._cached);
                }
                else {
                    var etag = xmlhttp.getResponseHeader('Etag');
                    if (etag) {
                        QuiX.rpc._cache.set(url, etag, xmlhttp.responseText);
                    }
                    dom = xmlhttp.responseXML;
                }
            }
            else {
                dom = xmlhttp.responseXML;
            }
            QuiX.XHRPool.release(xmlhttp);
            self.parse(dom, oncomplete, preloadImages);
        }
    }
    QuiX.addLoader();
    xmlhttp.open('GET', url, true);

    if (QuiX.utils.BrowserInfo.family == 'moz' && QuiX.rpc._cache) {
        QuiX.rpc._cache.get(url, function(val) {
            if (val != null) {
                xmlhttp.setRequestHeader("If-None-Match", val[0]);
                xmlhttp._cached = val[1];
            }
            xmlhttp.send('');
        });
    }
    else {
        xmlhttp.send('');
    }
}

QuiX.ui.Widget.prototype.getParentByType = function(wtype) {
    var w = this.parent;
    while (w) {
        if (w instanceof wtype) return w;
        w = w.parent;
    }
    return null;
}

QuiX.ui.Widget.prototype.query = function(eval_func, shallow, limit) {
    var w,
        ws = [];

    if (!shallow) {
        var elems = this.div.getElementsByTagName('div');
        for (var i=0; i<elems.length; i++) {
            if (elems[i].widget && eval_func.apply(elems[i].widget)) {
                ws.push(elems[i].widget);
                if (limit && ws.length >= limit) {
                    break;
                }
            }
        }
    }
    else {
        for (var i=0; i<this.widgets.length; i++) {
            if (eval_func.apply(this.widgets[i])) {
                ws.push(this.widgets[i]);
                if (limit && ws.length >= limit) {
                    break;
                }
            }
        }
    }

    return ws;
}

QuiX.ui.Widget.prototype.getWidgetById = function(sid /*, shallow, limit*/) {
    var shallow = arguments[1] || false,
        limit = arguments[2] || null,
        ws = this.query(
            function() {
                return this._id == sid;
            }, shallow, limit);

    if (ws.length == 0) {
        return null;
    }
    else if (ws.length == 1) {
        return ws[0];
    }
    else {
        return ws;
    }
}

QuiX.ui.Widget.prototype.getWidgetsByType = function(wtype /*, shallow, limit*/) {
    var shallow = arguments[1] || false,
        limit = arguments[2] || null;

    return this.query(
        function() {
            return (this instanceof wtype);
        }, shallow, limit);
}

QuiX.ui.Widget.prototype.getWidgetsByClassName = function(cssName /*, shallow, limit*/) {
    var shallow = arguments[1] || false,
        limit = arguments[2] || null,
        regExp = new RegExp('(\\s|^)' + cssName + '(\\s|$)');

    return this.query(
        function() {
            return this.div.className.match(regExp);
        }, shallow, limit);
} 

QuiX.ui.Widget.prototype.getWidgetsByAttribute = function(attr_name /*, shallow, limit*/) {
    var shallow = arguments[1] || false,
        limit = arguments[2] || null;

    return this.query(
        function() {
            return (typeof this[attr_name] != 'undefined');
        }, shallow, limit);
}

QuiX.ui.Widget.prototype.getWidgetsByAttributeValue = function(attr_name, value /*, shallow, limit*/) {
    var shallow = arguments[2] || false,
        limit = arguments[3] || null;

    return this.query(
        function() {
            return this[attr_name] == value;
        }, shallow, limit);
}

QuiX.ui.Widget.prototype.getWidgetsByCustomAttributeValue = function(attr_name, value /*, shallow, limit*/) {
    var shallow = arguments[2] || false,
        limit = arguments[3] || null;

    return this.query(
        function() {
            return this.attributes[attr_name] == value;
        }, shallow, limit);
}

QuiX.ui.Widget.prototype._setAbsProps = function(memo) {
    var left = (typeof memo[this._uniqueid + 'l'] != 'undefined')?
               memo[this._uniqueid + 'l']:this._calcLeft(memo) || 0;

    if (this.parent && QuiX.dir == 'rtl'
            && this.div.style.position == 'absolute' && !this._xformed) {
        // rtl xform
        this.div.style.left = QuiX.transformX(
            left + this.getWidth(true, memo), this.parent) + 'px';
    }
    else {
        this.div.style.left = left + 'px';
    }
    this.div.style.top = ((typeof memo[this._uniqueid + 't'] != 'undefined')?
                          memo[this._uniqueid + 't']:this._calcTop(memo) || 0) + 'px';
}

QuiX.ui.Widget.prototype._setCommonProps = function(/*memo*/) {
    var memo = arguments[0] || {},
        w = '', h = '',
        borders = 2 * this.getBorderWidth(),
        isIE7 = document.all && QuiX.utils.BrowserInfo.version < 8;

    if (((this.width != null && this.width != 'auto') ||
            (this.width == 'auto' && this._calcAuto)) &&
            !(this.width == '100%' && this.div.style.position != 'absolute' && !isIE7)) {
        w = (typeof memo[this._uniqueid + 'cw'] != 'undefined')?
            memo[this._uniqueid + 'cw']:this._calcWidth(false, memo);
        if (this.div.offsetWidth > 0 &&
                (this.div.style.overflow == 'auto' ||
                 this.div.style.overflowY == 'auto')) {
            // include scrollbar width
            w += this.div.offsetWidth - this.div.clientWidth - borders;
        }
        w = w + 'px';
    }
    else if (this.minw) {
        var minw = this._calcMinWidth(memo);
        this.div.style.width = '';
        if (this.div.offsetWidth < minw) {
            w = minw + 'px';
        }
    }

    if ((this.height != null && this.height != 'auto') ||
            (this.height == 'auto' && this._calcAuto)) {
        h = (typeof memo[this._uniqueid + 'ch'] != 'undefined')?
            memo[this._uniqueid + 'ch']:this._calcHeight(false, memo);

        if (this.div.offsetHeight > 0 &&
                (this.div.style.overflow == 'auto' ||
                 this.div.style.overflowX == 'auto')) {
            // include scrollbar width
            h += this.div.offsetHeight - this.div.clientHeight - borders;
        }
        h = h + 'px';
    }
    else if (this.minh) {
        var minh = this._calcMinHeight(memo);
        this.div.style.height = '';
        if (this.div.offsetHeight < minh) {
            h = minh + 'px';
        }
    }

    this.div.style.width = w;
    this.div.style.height = h;
}

// id attribute
QuiX.ui.Widget.prototype.setId = function(id) {
    this._id = id;
    this.div.id = id;
}
QuiX.ui.Widget.prototype.getId = function() {
    return this._id;
}

// bgColor attribute
QuiX.ui.Widget.prototype.setBgColor = function(color) {
    var bgc = color.split(',');
    if (bgc.length > 1 && bgc[0].slice(0,3) != 'rgb') {
        // gradient
        // clear background color
        this.div.style.backgroundColor = '';
        switch (QuiX.utils.BrowserInfo.family) {
            case 'moz':
                if (bgc.length <= 3) {
                    this.div.style.backgroundImage = '-moz-linear-gradient(' + bgc[0] + ',' + bgc[1] + ',' + bgc[2] + ')';
                } else {
                    var grad = '-moz-linear-gradient(' + bgc[0] + ',';
                    for (i = 1; i < bgc.length-1; i++) {
                        grad += bgc[i] + ',';
                    }
                    grad += bgc[bgc.length-1] + ')';
                    this.div.style.backgroundImage = grad;
                }
                break;
            case 'saf':
                var dir;
                switch (bgc[0]) {
                    case 'left':
                        dir = 'left top, right top';
                        break;
                    case 'top':
                        dir = 'left top, left bottom';
                        break;
                    case 'top left':
                        dir = 'left top, right bottom';
                        break;
                    case 'bottom left':
                        dir = 'left bottom, right top';
                        break;
                    default:
                        dir = 'left top, left bottom';
                }
                if (bgc.length <= 3) {
                    this.div.style.backgroundImage = '-webkit-gradient(linear,' + dir + ',from(' + bgc[1] + '),to(' + bgc[2] + '))';
                }
                else {
                    var grad = '-webkit-gradient(linear,' + dir + ',';
                    for (i = 1; i < bgc.length; i++) {
                        var parts = bgc[i].split(" ");
                        if (parts.length > 1) {
                            var pct = parseInt(parts[1]);
                            if (pct < 10) {
                                pct = '0' + pct;
                            }
                            grad += 'color-stop(.'+pct+','+parts[0]+'),';
                        } else {
                            if (i == 1) {
                                grad += 'color-stop(0,'+parts[0]+'),';
                            }
                            if (i == bgc.length-1) {
                                grad += 'color-stop(1,'+parts[0]+'))';
                            }
                            
                        }
                    }
                    this.div.style.backgroundImage = grad;
                }
                break;
            case 'ie':
                var types = {left:1, top:0};
                this.div.style.filter =
                    'progid:DXImageTransform.Microsoft.gradient(' +
                    'GradientType=' + types[bgc[0]] + ',' +
                    "startColorstr='" + bgc[1] + "'," +
                    "endColorstr='" + bgc[2] + "')";
                break;
            case 'op':
                if (QuiX.utils.BrowserInfo.version >= 11.10) {
                    if (bgc.length <= 3) {
                        this.div.style.backgroundImage = '-o-linear-gradient(' + bgc[0] + ',' + bgc[1] + ',' + bgc[2] + ')';
                    } else {
                    var grad = '-o-linear-gradient(' + bgc[0] + ',';
                        for (i = 1; i < bgc.length-1; i++) {
                            grad += bgc[i] + ',';
                        }
                        grad += bgc[bgc.length-1] + ')';
                        this.div.style.backgroundImage = grad;
                    }
                }
                else {
                    // fallback to single color
                    this.div.style.backgroundColor = bgc[1];
                }
        }
    }
    else {
        // single color
        // clear background image if gradient
        if (this.div.style.backgroundImage.indexOf('gradient(') > -1) {
            this.div.style.backgroundImage = '';
        }
        else if (this.div.style.filter && this.div.style.filter.indexOf('gradient') > -1) {
            this.div.style.filter = '';
        }
        if (color.slice(0,4) == 'rgba' && document.all && QuiX.utils.BrowserInfo.version <= 8) {
            // ie versions prior to 9 do not support rgba
            var rgb = color.match(/^rgba\((\d)+,\s*(\d)+,\s*(\d)+,\s*\d\.?\d*\)/);
            this.div.style.backgroundColor = 'rgb(' + rgb[1] + ',' + rgb[2] + ',' + rgb[3] + ')';
        }
        else {
            this.div.style.backgroundColor = color;
        }
    }
    this._bgc = color;
}

QuiX.ui.Widget.prototype.getBgColor = function() {
    return this._bgc || '';
}

// rotation attribute
QuiX.ui.Widget.prototype.setRotation = function(degrees) {
    var transform = QuiX.getCssAttribute('transform');
    if (transform) {
        this.div.style[transform] = "rotate(" + degrees + "deg)";
        this._rot = degrees;
    }
}

QuiX.ui.Widget.prototype.getRotation = function() {
    return (this._rot || 0);
}

// borderWidth attribute
QuiX.ui.Widget.prototype.setBorderWidth = function(iWidth) {
    this.div.style.borderWidth = iWidth + 'px';
}
QuiX.ui.Widget.prototype.getBorderWidth = function() {
    return parseInt(this.div.style.borderWidth) ||
           parseInt(this.div.style.borderTopWidth) || 0;
}

// display attribute
QuiX.ui.Widget.prototype.setDisplay = function(sDispl) {
    this.div.style.display = sDispl || '';
}
QuiX.ui.Widget.prototype.getDisplay = function() {
    return this.div.style.display;
}

// overflow attribute
QuiX.ui.Widget.prototype.setOverflow = function(sOverflow) {
    if (sOverflow.indexOf(" ") == -1) {
        this.div.style.overflow = sOverflow;
    }
    else {
        var value = sOverflow.split(" ");
        this.div.style.overflowX = value[0];
        this.div.style.overflowY = value[1];
    }
    if (QuiX.utils.BrowserInfo.family == 'moz'
            && QuiX.utils.BrowserInfo.OS == 'MacOS') {
        this._overflow = sOverflow;
    }
}
QuiX.ui.Widget.prototype.getOverflow = function() {
    if (QuiX.utils.BrowserInfo.family == 'saf') {
        if (this.div.style.overflowX == this.div.style.overflowY) {
            return this.div.style.overflowX;
        }
        else {
            return this.div.style.overflowX + " " + this.div.style.overflowY;
        }
    }
    else {
        if (this.div.style.overflow != '') {
            return this.div.style.overflow;
        }
        else {
            return (this.div.style.overflowX + " " +
                    this.div.style.overflowY).trim();
        }
    }
}

// position attribute
QuiX.ui.Widget.prototype.setPosition = function(sPos) {
    this.div.style.position = sPos || '';
}
QuiX.ui.Widget.prototype.getPosition = function() {
    return this.div.style.position;
}

// opacity attribute
QuiX.ui.Widget.prototype.setOpacity = function(fOpacity) {
    QuiX.setOpacity(this.div, fOpacity);
}
QuiX.ui.Widget.prototype.getOpacity = function() {
    var opacity = QuiX.getOpacity(this.div);
    return (isNaN(opacity))? 1:opacity;
}

// box shadow attribute
QuiX.ui.Widget.prototype.setShadow = function(shadow) {
    this._shadow = shadow;
    QuiX.setShadow(this.div, shadow);
}
QuiX.ui.Widget.prototype.getShadow = function() {
    return this._shadow || null;
}

// padding attribute
QuiX.ui.Widget.prototype.setPadding = function(arrPadding) {
    var near = (QuiX.dir != 'rtl')?'paddingLeft':'paddingRight';
    var far = (QuiX.dir != 'rtl')?'paddingRight':'paddingLeft';
    this.div.style[near] = arrPadding[0] + 'px';
    this.div.style[far] = arrPadding[1] + 'px';
    this.div.style.paddingTop = arrPadding[2] + 'px';
    this.div.style.paddingBottom = arrPadding[3] + 'px';
}
QuiX.ui.Widget.prototype.getPadding = function() {
    var near = (QuiX.dir != 'rtl')? 'paddingLeft':'paddingRight',
        far = (QuiX.dir != 'rtl')? 'paddingRight':'paddingLeft';
    var padding = [
        parseInt(this.div.style[near]),
        parseInt(this.div.style[far]),
        parseInt(this.div.style.paddingTop),
        parseInt(this.div.style.paddingBottom)
    ];
    return padding;
}

QuiX.ui.Widget.prototype.addPaddingOffset = function(where, iOffset) {
    var old_offset = parseInt(this.div.style['padding' + where]);
    var new_offset = old_offset + iOffset;
    if (new_offset < 0) {
        new_offset = 0;
    }
    this.div.style['padding' + where] = new_offset + 'px';
}

// css class helpers
QuiX.ui.Widget.prototype.removeClass = function(cls) {
    if (this.hasClass(cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        this.div.className = this.div.className.replace(reg, '');
    }
}

QuiX.ui.Widget.prototype.hasClass = function(cls) {
    return this.div.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
}

QuiX.ui.Widget.prototype.addClass = function(cls) {
    if (!this.hasClass(cls)) {
        this.div.className += ' ' + cls;
    }
}

QuiX.ui.Widget.prototype._mustRedraw = function () {
    return  isNaN(this.left) || isNaN(this.top) || (isNaN(this.height) && this.height != null)
            || (isNaN(this.width) && this.width != null);
}

QuiX.ui.Widget.prototype.getLeft = function() {
    var lf = this.div.offsetLeft;
    if (this.div.style.position == 'absolute') {
        lf -= parseInt(this.parent.div.style.paddingLeft);
    }
    if (QuiX.dir == 'rtl') {
        lf = QuiX.transformX(lf + this.getWidth(true), this.parent);
    }
    return lf;
}

QuiX.ui.Widget.prototype.getTop = function() {
    var top = this.div.offsetTop;
    if (this.div.style.position == 'absolute') {
        top -= parseInt(this.parent.div.style.paddingTop);
    }
    return top;
}

QuiX.ui.Widget._funCache = {};

QuiX.ui.Widget.prototype._calcAuto = function(dim, memo /*, offset*/) {
    var padding_offset = (dim == 'height')? 2:0,
        padding = this.getPadding(),
        offset = arguments[2] || '_calc',
        offset_func = (dim == 'height')? offset + 'Top': offset + 'Left',
        min_size = (dim == 'height')? 'minh':'minw',
        offset_var = (dim == 'height')? 'top':'left',
        length_func = (dim == 'height')? '_calcHeight':'_calcWidth',
        value = 0,
        old_dim = this[dim];

    if (this[min_size]) {
        value = (dim == 'height')? this._calcMinHeight(memo):this._calcMinWidth(memo);
        this[dim] = value;
    }
    else {
        this[dim] = 0;
    }

    var memo2 = {};

    for (var i=0; i<this.widgets.length; i++) {
        var w = this.widgets[i],
            w_length;

        if (w.div.style.display != 'none') {
            if (w[dim] == 'auto') {
                w.redraw(false, memo2);
            }
            if (!isNaN(w[dim]) || w[dim] == 'auto' || this[min_size]) {
                var offs = 0;
                if (!isNaN(w[offset_var])) {
                    offs = w[offset_func](memo);
                }
                w_length = offs + w[length_func](true, memo);
                value = Math.max(value, w_length);
            }
        }
    }

    this[dim] = old_dim;

    value = value +
            padding[padding_offset] +
            padding[padding_offset + 1] +
            2 * this.getBorderWidth();
    return value;
}

QuiX.ui.Widget.prototype._calcSize = function(height, memo) {
    var value = 0,
        length_func = (height == 'height')? '_calcHeight':'_calcWidth';

    if (this[height] == 'auto' && this._calcAuto) {
        value = this._calcAuto(height, memo);
    }
    else if (this[height] == null || this[height] == 'auto') {
        value = this.div['offset' + height.charAt(0).toUpperCase() + height.slice(1)];
    }
    else {
        value = (typeof this[height] == 'function')?
                this[height].apply(this, [memo]):this[height];
        if (value) {
            if (!isNaN(value)) {
                value = Math.floor(value);
            }
            else {
                if (value.slice(value.length - 1) == '%') {
                    if (this.parent) {
                        var perc = parseInt(value) / 100;
                        value = Math.round(this.parent[length_func](false, memo)
                                           * perc) || 0;
                    }
                    else {
                        return 0;
                    }
                }
                else {
                    try {
                        if (!QuiX.ui.Widget._funCache[value]) {
                            QuiX.ui.Widget._funCache[value] = new Function('memo', 'return ' + value);
                        }
                        value = QuiX.ui.Widget._funCache[value].apply(this, [memo]) || 0;
                    }
                    catch (e) {
                        return 0;
                    }
                }
            }
        }
    }
    return value;
}

QuiX.ui.Widget.prototype._calcPos = function(left, memo) {
    var value = 0,
        length_func = (left == 'left')? '_calcWidth':'_calcHeight';

    value = (typeof(this[left]) == 'function')?
            this[left].apply(this, [memo]):this[left];

    if (value) {
        if (!isNaN(value)) {
            value = Math.floor(value);
        }
        else if (value.slice(value.length - 1) == '%') {
            if (this.parent) {
                var perc = parseInt(value) / 100;
                value = Math.round(this.parent[length_func](false, memo) * perc) || 0;
            }
            else {
                return 0;
            }
        }
        else if (value == 'center') {
            if (this.parent) {
                value = Math.round((this.parent[length_func](false, memo) / 2) -
                                   (this[length_func](true, memo) / 2)) || 0;
            }
            else {
                return 0;
            }
        }
        else {
            try {
                if (!QuiX.ui.Widget._funCache[value]) {
                    QuiX.ui.Widget._funCache[value] = new Function('memo', 'return ' + value);
                }
                value = QuiX.ui.Widget._funCache[value].call(this, memo) || 0;
            }
            catch (e) {
                return 0;
            }
        }
    }
    return value;
}

QuiX.ui.Widget.prototype._calcHeight = function(b /*, memo*/) {
    var offset,
        memo = arguments[1] || {},
        cacheKey = (b? '':'c') + 'h';

    if (typeof memo[this._uniqueid + cacheKey] != 'undefined') {
        return memo[this._uniqueid + cacheKey];
    }

    var fs;

    if (typeof memo[this._uniqueid + 'h'] == 'undefined') {
        var ms = (this.minh)? this._calcMinHeight(memo):0;
        fs = this._calcSize('height', memo);
        if (fs < ms) {
            fs = ms;
        }
        memo[this._uniqueid + 'h'] = (fs > 0)? fs:0;
    }
    else {
        fs = memo[this._uniqueid + 'h'];
    }

    if (!b) {
        var borders = 2 * this.getBorderWidth();

        offset = parseInt(this.div.style.paddingTop) +
                 parseInt(this.div.style.paddingBottom) +
                 borders;
    
        if (this.div.offsetHeight > 0 &&
                (this.div.style.overflow == 'auto' ||
                 this.div.style.overflowX == 'auto')) {
            // include scrollbar width
            offset += this.div.offsetHeight - this.div.clientHeight - borders;
        }
        memo[this._uniqueid + 'ch'] = (fs - offset > 0)? fs - offset:0;
    }

    return memo[this._uniqueid + cacheKey];
}

QuiX.ui.Widget.prototype._calcWidth = function(b /*, memo*/) {
    var offset,
        memo = arguments[1] || {},
        cacheKey = (b? '':'c') + 'w';

    if (typeof memo[this._uniqueid + cacheKey] != 'undefined') {
        return memo[this._uniqueid + cacheKey];
    }

    var fs;

    if (typeof memo[this._uniqueid + 'w'] == 'undefined') {
        var ms = (this.minw)? this._calcMinWidth(memo):0;
        fs = this._calcSize('width', memo);
        if (fs < ms) {
            fs = ms;
        }
        memo[this._uniqueid + 'w'] = (fs > 0)? fs:0;
    }
    else {
        fs = memo[this._uniqueid + 'w'];
    }

    if (!b) {
        var borders = 2 * this.getBorderWidth();

        offset = parseInt(this.div.style.paddingLeft) +
                 parseInt(this.div.style.paddingRight) +
                 borders;

        if (this.div.offsetWidth > 0 &&
                (this.div.style.overflow == 'auto' ||
                 this.div.style.overflowY == 'auto')) {
            // include scrollbar width
            offset += this.div.offsetWidth - this.div.clientWidth - borders;
        }
        memo[this._uniqueid + 'cw'] = (fs - offset > 0)? fs - offset:0;
    }

    return memo[this._uniqueid + cacheKey];
}

QuiX.ui.Widget.prototype._calcLeft = function(/*memo*/) {
    var offset = 0,
        memo = arguments[0] || {},
        left;

    if (typeof memo[this._uniqueid + 'l'] != 'undefined') {
        return memo[this._uniqueid + 'l'];
    }

    if (this.parent && this.div.style.position == 'absolute') {
        var near = (QuiX.dir == 'rtl')? 'paddingRight':'paddingLeft';
        offset = parseInt(this.parent.div.style[near]);
    }
    left = this._calcPos('left', memo) + offset;
    memo[this._uniqueid + 'l'] = left;

    return left;
}

QuiX.ui.Widget.prototype._calcTop = function(/*memo*/) {
    var offset = 0,
        memo = arguments[0] || {},
        top;

    if (typeof memo[this._uniqueid + 't'] != 'undefined') {
        return memo[this._uniqueid + 't'];
    }

    if (this.parent && this.div.style.position == 'absolute') {
        offset = parseInt(this.parent.div.style.paddingTop);
    }
    top = this._calcPos('top', memo) + offset;
    memo[this._uniqueid + 't'] = top;

    return top;
}

QuiX.ui.Widget.prototype._calcMinWidth = function(/*memo*/) {
    var memo = arguments[0] || {};
    if (!isNaN(this.minw)) {
        return Math.floor(this.minw);
    }
    else if (typeof(this.minw) == 'function') {
        return this.minw.call(this, this);
    }
    else {
        if (!QuiX.ui.Widget._funCache[this.minw]) {
            QuiX.ui.Widget._funCache[this.minw] = new Function('memo', 'return ' + this.minw);
        }
        try {
            return QuiX.ui.Widget._funCache[this.minw].call(this, memo) || 0;
        }
        catch (e) {
            return 0;
        }
    }
}

QuiX.ui.Widget.prototype._calcMinHeight = function(/*memo*/) {
    var memo = arguments[0] || {};
    if (!isNaN(this.minh)) {
        return Math.floor(this.minh);
    }
    else if (typeof(this.minw) == 'function') {
        return this.minh.call(this, this, memo);
    }
    else {
        if (!QuiX.ui.Widget._funCache[this.minh]) {
            QuiX.ui.Widget._funCache[this.minh] = new Function('memo', 'return ' + this.minh);
        }
        try {
            return QuiX.ui.Widget._funCache[this.minh].call(this, memo) || 0;
        }
        catch (e) {
            return 0;
        }
    }
}

QuiX.ui.Widget.prototype.getWidth = QuiX.ui.Widget.prototype._calcWidth;

QuiX.ui.Widget.prototype.getHeight = QuiX.ui.Widget.prototype._calcHeight;

QuiX.ui.Widget.prototype.getLeftOffsetFrom = function(/*w*/) {
    var desktop = this.getDesktop(),
        w = arguments[0] || desktop,
        curleft = 0,
        bf = QuiX.utils.BrowserInfo.family,
        bv = QuiX.utils.BrowserInfo.version,
        el = this.div,
        includeBorders = !(bf == 'op' || (bf == 'ie' && bv == 8));

    if (el.offsetParent) {
        if (bf == 'moz' && el.style.position == 'absolute') {
            curleft += (parseInt(el.style.left) || 0);
        }
        else {
            curleft += el.offsetLeft;
        }
        while (el = el.offsetParent) {
            if (w && el == w.div) {
                break;
            }
            if (el.tagName != 'TR') {
                curleft -= QuiX.getScrollLeft(el);
                if (bf == 'moz' && el.style.position == 'absolute') {
                    curleft += (parseInt(el.style.left) || 0);
                }
                else {
                    curleft += el.offsetLeft;
                }
                if (includeBorders) {
                    curleft += parseInt(el.style.borderWidth) || 0;
                }
            }
        }
    }
    if (QuiX.dir == 'rtl') {
        curleft = QuiX.transformX(curleft + this.div.offsetWidth, desktop);
    }
    return curleft;
}

QuiX.ui.Widget.prototype.getTopOffsetFrom = function(/*w*/) {
    var w = arguments[0] || this.getDesktop(),
        curtop = 0,
        bf = QuiX.utils.BrowserInfo.family,
        bv = QuiX.utils.BrowserInfo.version,
        el = this.div,
        includeBorders = !(bf == 'op' || (bf == 'ie' && bv == 8));

    if (el.offsetParent) {
        if (bf == 'moz' && el.style.position == 'absolute') {
            curtop += (parseInt(el.style.top) || 0);
        }
        else {
            curtop += el.offsetTop;
        }
        while (el = el.offsetParent) {
            if (w && el == w.div) {
                break;
            }
            if (el.tagName != 'TR') {
                curtop -= el.scrollTop;
                if (bf == 'moz' && el.style.position == 'absolute') {
                    curtop += (parseInt(el.style.top) || 0);
                }
                else {
                    curtop += el.offsetTop;
                }
                if (includeBorders) {
                    curtop += parseInt(el.style.borderWidth) || 0;
                }
            }
        }
    }
    return curtop;
}

QuiX.ui.Widget.prototype.getScreenLeft = function() {
    return this.getLeftOffsetFrom(null);
}

QuiX.ui.Widget.prototype.getScreenTop = function() {
    return this.getTopOffsetFrom(null);
}

// layering

QuiX.ui.Widget.prototype.moveForward = function() {
    if (this != this.parent.widgets[this.parent.widgets.length - 1]) {
        var ind = this.parent.widgets.indexOf(this),
            zindex = this.div.style.zIndex;

        this.parent.widgets.splice(ind, 1);
        this.parent.widgets.splice(ind + 1, 0, this);

        this.div.style.zIndex = this.parent.widgets[ind].div.style.zIndex;
        this.parent.widgets[ind].div.style.zIndex = zindex;

        if (this.div.style.position != 'absolute') {
            // reposition div
            QuiX.removeNode(this.div);
            this.parent.div.insertBefore(this.div, this.parent.widgets[ind].div.nextSibling);
        }
    }
}

QuiX.ui.Widget.prototype.moveBackward = function() {
    if (this != this.parent.widgets[0]) {
        var ind = this.parent.widgets.indexOf(this),
            zindex = this.div.style.zIndex;

        this.parent.widgets.splice(ind, 1);
        this.parent.widgets.splice(ind - 1, 0, this);

        this.div.style.zIndex = this.parent.widgets[ind].div.style.zIndex;
        this.parent.widgets[ind].div.style.zIndex = zindex;

        if (this.div.style.position != 'absolute') {
            // reposition div
            QuiX.removeNode(this.div);
            this.parent.div.insertBefore(this.div, this.parent.widgets[ind].div);
        }
    }
}

QuiX.ui.Widget.prototype.bringToFront = function() {
    if (this != this.parent.widgets[this.parent.widgets.length - 1]) {
        var ind = this.parent.widgets.indexOf(this);
        if (ind > -1) {
            this.parent.widgets.splice(ind, 1);
            this.parent.widgets.push(this);
        }
        this.div.style.zIndex = ++this.parent.maxz;
        if (QuiX.getParentNode(this.div) && this.div.style.position != 'absolute') {
            // reposition div
            QuiX.removeNode(this.div);
            this.parent.div.appendChild(this.div);
        }
    }
}

QuiX.ui.Widget.prototype.sendToBack = function() {
    if (this != this.parent.widgets[0]) {
        var ind = this.parent.widgets.indexOf(this);
        if (ind > -1) {
            this.parent.widgets.splice(ind, 1);
            this.parent.widgets.splice(0, 0, this);
        }
        this.div.style.zIndex = --this.parent.minz;
        if (QuiX.getParentNode(this.div) && this.div.style.position != 'absolute') {
            // reposition div
            QuiX.removeNode(this.div);
            this.parent.div.insertBefore(this.div, this.parent.widgets[1].div);
        }
    }
}

QuiX.ui.Widget.prototype.setOrder = function(order) {
    this.parent.widgets.removeItem(this);
    this.parent.widgets.splice(order, 0, this);

    // re-order z-index
    this.parent.maxz = 0;
    this.parent.minz = 0;
    for (var i=0; i<this.parent.widgets.length; i++) {
        this.parent.widgets[i].div.style.zIndex = ++this.parent.maxz;
    }
}

QuiX.ui.Widget.prototype.click = function() {
    QuiX.sendEvent(this.div, 'MouseEvents', 'onclick');
}

QuiX.ui.Widget.prototype.moveTo = function(x, y) {
    if (x != this.left || y != this.top) {
        var memo = {},
            padding = this.parent.getPadding();

        if (x != this.left) {
            this.left = x;
            if (isNaN(x)) {
                x = this._calcLeft(memo);
            }
            else {
                x = parseInt(x) + padding[0];
                if (QuiX.dir == 'rtl') {
                    x = QuiX.transformX(x + this.getWidth(true, memo), this.parent);
                }
            }
            this.div.style.left = (x || 0) + 'px';
        }

        if (y != this.top) {
            this.top = y;
            y = (isNaN(y))? this._calcTop(memo):parseInt(y) + padding[2];
            this.div.style.top = (y || 0) + 'px';
        }
    }
}

QuiX.ui.Widget.prototype.resize = function(x, y) {
    if (this.minw != 0) {
        var minw = this._calcMinWidth();
        this.width = (x > minw)? x:minw;
    }
    else {
        this.width = x;
    }
    if (this.minh != 0) {
        var minh = this._calcMinHeight();
        this.height = (y > minh)? y:minh;
    }
    else {
        this.height = y;
    }
    this.redraw();
}

QuiX.ui.Widget.prototype.destroy = function() {
    QuiX.removeWidget(this);
}

QuiX.ui.Widget.prototype.clear = function() {
    while (this.widgets.length > 0) this.widgets[0].destroy();
}

QuiX.ui.Widget.prototype.hide = function() {
    if (!this.isHidden()) {
        QuiX.detachFrames(this);
        this._statedisplay = this.div.style.display;
        this.div.style.display = 'none';
    }
}

QuiX.ui.Widget.prototype.show = function() {
    QuiX.attachFrames(this);
    this.div.style.display = this._statedisplay || '';
}

QuiX.ui.Widget.prototype.isHidden = function() {
    return (this.div.style.display == 'none');
}

QuiX.ui.Widget.prototype._startResize = function(evt) {
    var coords = QuiX.getEventCoordinates(evt),
        desktop = this.getDesktop();

    QuiX.startX = coords[0];
    QuiX.startY = coords[1];
    QuiX.widget = this;

    if (QuiX.utils.BrowserInfo.family == 'op') {
        // required to avoid scrollbars trap
        QuiX.sendEvent(this.div, 'MouseEvents', 'onmouseup');
    }

    QuiX.tmpWidget = QuiX.createOutline(this);
    QuiX.tmpWidget.div.style.zIndex = QuiX.maxz;

    desktop.attachEvent('onmouseup', QuiX.ui.Widget._endResize);
    desktop.attachEvent('onmousemove', QuiX.ui.Widget._resizing);
    this.parent.div.style.cursor = (QuiX.dir!='rtl')? 'se-resize':'sw-resize';

    QuiX.cancelDefault(evt);
}

QuiX.ui.Widget._resizing = function(evt) {
    var coords = QuiX.getEventCoordinates(evt),
        offsetX = coords[0] - QuiX.startX,
        offsetY = coords[1] - QuiX.startY;

    if (QuiX.dir == 'rtl') {
        offsetX = -offsetX;
    }

    if (QuiX.tmpWidget) {
        QuiX.tmpWidget.resize(QuiX.widget.getWidth(true) + offsetX,
                              QuiX.widget.getHeight(true) + offsetY);
    }
}

QuiX.ui.Widget._endResize = function(evt, desktop) {
    desktop.detachEvent('onmouseup', QuiX.ui.Widget._endResize);
    desktop.detachEvent('onmousemove', QuiX.ui.Widget._resizing);

    QuiX.widget.resize(QuiX.tmpWidget.getWidth(true),
                       QuiX.tmpWidget.getHeight(true));

    QuiX.tmpWidget.destroy();
    QuiX.tmpWidget = null;
    QuiX.widget.bringToFront();

    QuiX.widget.parent.div.style.cursor = '';
}

QuiX.ui.Widget.prototype._startMove = function(evt) {
    var coords = QuiX.getEventCoordinates(evt),
        desktop = this.getDesktop();

    if (QuiX.dir == 'rtl') {
        coords[0] = QuiX.transformX(coords[0], desktop);
    }

    QuiX.startX = coords[0] - this.getLeft();
    QuiX.startY = coords[1] - this.getTop();
    QuiX.widget = this;

    desktop.attachEvent('onmouseup', QuiX.ui.Widget._endMove);
    desktop.attachEvent('onmousemove', QuiX.ui.Widget._moving);
    this.parent.div.style.cursor = 'move';
}

QuiX.ui.Widget._moving = function(evt, desktop) {
    var coords = QuiX.getEventCoordinates(evt);
    if (QuiX.dir == 'rtl') {
        coords[0] = QuiX.transformX(coords[0], desktop);
    }
    QuiX.widget.moveTo(coords[0] - QuiX.startX,
                       coords[1] - QuiX.startY);
}

QuiX.ui.Widget._endMove = function(evt, desktop) {
    desktop.detachEvent('onmouseup', QuiX.ui.Widget._endMove);
    desktop.detachEvent('onmousemove', QuiX.ui.Widget._moving);
    QuiX.widget.parent.div.style.cursor = '';
}

QuiX.ui.Widget.prototype._startDrag = function(x, y) {
    var dragable = QuiX.getDraggable(this),
        desktop = this.getDesktop();

    dragable.left = x + 2;
    dragable.top = y + 2;
    dragable.setOpacity(.5);
    desktop.appendChild(dragable);
    dragable.div.style.zIndex = QuiX.maxz;
    dragable.redraw();

    QuiX.tmpWidget = dragable;
    QuiX.dragable = this;

    desktop.attachEvent('onmousemove', QuiX.ui.Widget._drag);
}

QuiX.ui.Widget.prototype._getSig = function(memo) {
    return memo[this._uniqueid + 's'] || (memo[this._uniqueid + 's'] = (this._calcWidth(true, memo) << 16) | (this._calcHeight(true, memo)));
}

QuiX.ui.Widget.prototype.redraw = function(bForceAll /*, memo*/) {
    var container = this.div.parentNode || this.div.parentElement;
    if (container && this.div.style.display != 'none') {
        var memo = arguments[1] || {},
            sig = this._rds,
            overflAuto = !QuiX.supportTouches &&
                         (this.div.style.overflow == 'auto' ||
                          this.div.style.overflowY == 'auto' ||
                          this.div.style.overflowX == 'auto'),
            scrollX, scrollY, borders;

        if (this.div.style.position != '') {
            this._setAbsProps(memo);
        }
        this._setCommonProps(memo);

        if (bForceAll || this.div.style.visibility != 'hidden') {
            var w_sig, w;

            if (overflAuto) {
                borders = 2 * this.getBorderWidth();
                scrollY = this.div.offsetWidth - this.div.clientWidth - borders;
                scrollX = this.div.offsetHeight - this.div.clientHeight - borders;
                delete memo[this._uniqueid + 'cw'];
                delete memo[this._uniqueid + 'ch'];
            }

            for (var i=0; i<this.widgets.length; i++) {
                w = this.widgets[i];
                if (w.div.style.display != 'none') {
                    if (bForceAll) {
                        w.redraw(true, memo);
                    }
                    else if (w._mustRedraw() ||
                             (typeof w._rds == 'undefined')) {
                        w_sig = w._getSig(memo);
                        if (!w_sig || w_sig != w._rds) {
                            w.redraw(false, memo);
                        }
                        else if (w.div.style.position != '') {
                            w._setAbsProps(memo);
                        }
                    }
                }
            }

            if (overflAuto &&
                (this.div.offsetWidth - this.div.clientWidth - borders != scrollY ||
                 this.div.offsetHeight - this.div.clientHeight - borders != scrollX)) {
                // scrollbar state has changed
                var memo2 = {};
                this.widgets.each(
                    function() {
                        this.redraw(false, memo2);
                    });
            }

            this._rds = this._getSig(memo);

            if (sig && sig != this._rds) {
                this.trigger('onresize', this, memo);
            }
        }
    }
}

QuiX.ui.Widget.prototype.print = function(/*expand*/) {
    var self = this;
    var expand = arguments[0] || false;
    var iframe = document.getElementById('_print');
    var browserFamily = QuiX.utils.BrowserInfo.family;
    if (!iframe) {
        iframe = ce('IFRAME');
        iframe.name = '_print';
        iframe.id = '_print';
        if (browserFamily == 'ie') {
            iframe.style.width = '0px';
            iframe.style.height = '0px';
        }
        document.body.appendChild(iframe);
        function _onload() {
            var win = iframe.contentWindow || iframe,
                body, ss, sse, head;
            body = win.document.body;
            head = win.document.getElementsByTagName('HEAD')[0];

            // add stylesheets
            var ss = document.getElementsByTagName('HEAD')[0]
                     .getElementsByTagName('LINK');
            var links = ss.length;
            for (var i=0; i<links; i++) {
                if (ss[i].type == 'text/css') {
                    sse = ss[i].cloneNode(false);
                    sse.href = sse.href;
                    head.appendChild(sse);
                }
            }

            // add widget element
            var n = self.div.cloneNode(true);
            n.style.position = '';

            if (expand) {
                n.style.width = '';
                n.style.height = '';
            }

            if (browserFamily == 'ie') {
                body.innerHTML = n.outerHTML;
                win.focus();
                win.print();
            }
            else {
                body.appendChild(n);
                win.print();
            }
        }
        if (browserFamily == 'ie') {
            iframe.attachEvent('onload', _onload);
        }
        else {
            iframe.onload = _onload;
        }
        iframe.src = QuiX.baseUrl + 'ui/print.htm';
    }
    else {
        iframe.contentWindow.location.reload();
    }
}

QuiX.ui.Widget.prototype.nextSibling = function() {
    var p = this.parent;
    var ns = null;
    if (p) {
        var idx = p.widgets.indexOf(this);
        if (idx < p.widgets.length - 1)
            ns = p.widgets[idx + 1];
    }
    return ns;
}

QuiX.ui.Widget.prototype.previousSibling = function() {
    var p = this.parent;
    var ns = null;
    if (p) {
        var idx = p.widgets.indexOf(this);
        if (idx > 0) {
            ns = p.widgets[idx - 1];
        }
    }
    return ns;
}

QuiX.ui.Widget.prototype.getDesktop = function() {
    return QuiX.getDesktop(this.div);
}

//events sub-system
QuiX.ui.Widget.prototype.supportedEvents = [
    'onmousedown', 'onmouseup', 'onmousemove', 'onmouseover', 'onmouseout',
    'onkeypress', 'onkeyup', 'onkeydown', 'onclick', 'ondblclick', 'onscroll',
    'oncontextmenu', 'onswipe'];

QuiX.ui.Widget.prototype.customEvents = ['onload', 'onunload',
    'onresize', 'ondrop'];

QuiX.ui.Widget.prototype._registerHandler = function(evt_type, handler, isCustom) {
    if (!isCustom) {
        if (typeof this._registry[evt_type] === 'undefined') {
            this._registry[evt_type] = [];
        }
        if (QuiX.utils.BrowserInfo.family != 'ie') {
            // this works as expected
            if (!handler.wrapper) {
                handler.wrapper = function(evt) {
                        return handler(evt, this.widget);
                    }
            }
        }
        else {
            var self = this;
            handler.wrapper = function() {
                    return handler(window.event, self);
                }
        }
        this._registry[evt_type].push(handler.wrapper);
    }
    else {
        if (typeof this._customRegistry[evt_type] === 'undefined') {
            this._customRegistry[evt_type] = [];
        }
        this._customRegistry[evt_type].push(handler);
    }
}

QuiX.ui.Widget.prototype._buildEventRegistry = function(params) {
    var i,
        evt_type,
        func;

    this._registry = {};
    this._customRegistry = {};

    // register DOM events
    for (i=0; i<this.supportedEvents.length; i++) {
        evt_type = this.supportedEvents[i];
        if (params[evt_type]) {
            func = QuiX.getEventListener(params[evt_type]);
            func = this._getHandler(evt_type, func);
            this._registerHandler(evt_type, func, false);
        }
    }

    // register custom events
    for (i=0; i<this.customEvents.length; i++) {
        evt_type = this.customEvents[i];
        if (params[evt_type]) {
            func = QuiX.getEventListener(params[evt_type]);
            this._registerHandler(evt_type, func, true);
        }
    }

}

QuiX.ui.Widget.prototype._attachEvents = function() {
    if (!this._isDisabled) {
        var domEvent;
        for (var evt_type in this._registry) {
            domEvent = (evt_type == 'onswipe')? 'onmouseup':evt_type;
            for (var i=0; i<this._registry[evt_type].length; i++) {
                QuiX.addEvent(this.div, domEvent, this._registry[evt_type][i]);
            }
        }
    }
}

QuiX.ui.Widget.prototype._detachEvents = function(/*deep*/) {
    var deep = arguments[0] || false,
        domEvent;
    for (var evt_type in this._registry) {
        for (var i=0; i<this._registry[evt_type].length; i++) {
            if (evt_type == 'oncontextmenu' &&
                    QuiX.utils.BrowserInfo.family == 'op') {
                // opera context menu patch
                domEvent = 'onclick';
            }
            else if (evt_type == 'onswipe') {
                domEvent = 'onmouseup';
            }
            else {
                domEvent = evt_type;
            }
            QuiX.removeEvent(this.div, domEvent, this._registry[evt_type][i]);
        }
    }
    if (deep) {
        for (var i=0; i<this.widgets.length; i++) {
            this.widgets[i]._detachEvents(true);
        }
    }
}

QuiX.ui.Widget.prototype._getHandler = function(eventType, f) {
    var func;
    if (QuiX.supportTouches && eventType == 'onclick') {
        func = QuiX.wrappers.onTap(f);
    }
    else if (eventType == 'onswipe') {
        func = QuiX.wrappers.onSwipe(f);
    }
    else if (eventType == 'oncontextmenu' &&
             QuiX.utils.BrowserInfo.family == 'op') {
        // opera context menu wrapper
        func = function(evt) {
            if (evt.ctrlKey) {
                f.apply(this, arguments);
            }
        }
    }
    else {
        if (QuiX.utils.BrowserInfo.family == 'ie') {
            // we need to wrap it in order of .wrapper to be assigned
            // to different functions due to "this" not working as expected
            // inside DOM event handlers
            func = function() {
                f.apply(this, arguments);
            }
            f.wrapper = func;
        }
        else {
            func = f;
        }
    }
    return func;
}

QuiX.ui.Widget.prototype.attachEvent = function(eventType , f) {
    var isCustom = this.customEvents.hasItem(eventType),
        registry = (isCustom)? this._customRegistry:this._registry;

    f = QuiX.getEventListener(f);
    if (!isCustom) {
        f = this._getHandler(eventType, f);
    }

    this._registerHandler(eventType, f, isCustom);

    if (eventType == 'oncontextmenu' &&
            QuiX.utils.BrowserInfo.family == 'op') {
        // opera context menu patch
        eventType = 'onclick';
    }
    else if (eventType == 'onswipe') {
        eventType = 'onmouseup';
        this.attachEvent('onmousedown', QuiX.handlers.allowFieldFocus);
    }

    if (!this._isDisabled && !isCustom) {
        QuiX.addEvent(this.div, eventType, f.wrapper);
    }
}

QuiX.ui.Widget.prototype.detachEvent = function(eventType /*, f*/) {
    var f = arguments[1] || null,
        isCustom = this.customEvents.hasItem(eventType);

    if (!isCustom) {
        if (f == null) {
            // detach all events with deregistering
            for (var i=0; i<this._registry[eventType].length; i++) {
                if (eventType == 'oncontextmenu' &&
                        QuiX.utils.BrowserInfo.family == 'op') {
                    QuiX.removeEvent(this.div, 'onclick', this._registry[eventType][i]);
                }
                else {
                    QuiX.removeEvent(this.div, eventType, this._registry[eventType][i]);
                }
            }
            this._registry[eventType] = [];
        }
        else if (this._registry[eventType] && this._registry[eventType].length > 0) {
            while (f.wrapper) {
                f = f.wrapper;
            }
            if (this._registry[eventType].indexOf(f) > -1) {
                if (eventType == 'oncontextmenu' &&
                        QuiX.utils.BrowserInfo.family == 'op') {
                    // opera context menu patch
                    eventType = 'onclick';
                }
                else if (eventType == 'onswipe') {
                    eventType = 'onmouseup';
                    this.detachEvent('onmousedown', QuiX.handlers.allowFieldFocus);
                }
                QuiX.removeEvent(this.div, eventType, f);
                this._registry[eventType].removeItem(f);
            }
        }
    }
    else if (this._customRegistry[eventType]
             && this._customRegistry[eventType].indexOf(f) > -1) {
        this._customRegistry[eventType].removeItem(f);
    }
}

QuiX.ui.Widget.prototype.trigger = function(eventType /*, arg1, arg2, ...*/) {
    var args = Array.prototype.slice.call(arguments, 1),
        r = true, val;

    if (this._customRegistry[eventType]) {
        if (args.length == 0) {
            args.push(this);
        }
        for (var i=0; this._customRegistry && i<this._customRegistry[eventType].length; i++) {
            val = this._customRegistry[eventType][i].apply(null, args);
            if (typeof val !== 'undefined') {
                r = r && val;
            }
        }
    }
    else if (this._registry[eventType]) {
        if (args.length == 0) {
            // evt, w
            args = [null, this];
        }
        for (var i=0; this._registry && i<this._registry[eventType].length; i++) {
            val = this._registry[eventType][i].apply(null, args);
            if (typeof val !== 'undefined') {
                r = r && val;
            }
        }
    }
    return r;
}

QuiX.ui.Widget.prototype._showTooltip = function(x, y) {
    var tooltip = new QuiX.ui.Label({
        left: x,
        top: y,
        caption: this.tooltip,
        border: QuiX.theme.tooltip.border,
        bgcolor: QuiX.theme.tooltip.bgcolor,
        color: QuiX.theme.tooltip.color,
        padding: QuiX.theme.tooltip.padding,
        wrap: true
    });
    tooltip.div.className = 'tooltip';
    this.getDesktop().appendChild(tooltip);
    tooltip.redraw();
    this.__tooltip  = tooltip;
}

QuiX.ui.Widget._onmouseover = function(evt, w) {
    if (!QuiX.dragging) {
        var x1 = evt.clientX,
            desktop = w.getDesktop();

        if (QuiX.dir == 'rtl') {
            x1 = QuiX.transformX(x1, desktop);
        }
        var availHeight = desktop.getHeight(true),
            y1;
        if (evt.clientY + 30 > availHeight) {
            y1 = evt.clientY - 30;
        }
        else {
            y1 = evt.clientY + 18;
        }

        if (!w.__tooltipID) {
            w.__tooltipID = window.setTimeout(
                function _tooltiphandler() {
                    w._showTooltip(x1, y1);
                }, 1000);
        }
    }
}

QuiX.ui.Widget._onmouseout = function(evt, w) {
    window.clearTimeout(w.__tooltipID);
    w.__tooltipID = 0;
    if (w.__tooltip) {
        w.__tooltip.destroy();
        w.__tooltip = null;
    }
}

QuiX.ui.Widget._startDrag = function(evt, w) {
    if (QuiX.supportTouches || (QuiX.getMouseButton(evt) == 0 && !evt.ctrlKey)) {
        var coords = QuiX.getEventCoordinates(evt),
            el = QuiX.getTarget(evt),
            desktop = w.getDesktop();

        if (el.tagName != 'INPUT' && el.tagName != 'TEXTAREA') {
            if (QuiX.dir == 'rtl') {
                coords[0] = QuiX.transformX(coords[0], desktop);
            }
            desktop.attachEvent('onmouseup', QuiX.ui.Widget._enddrag);
            QuiX.dragTimer = window.setTimeout(
                function _draghandler() {
                    w._startDrag(coords[0], coords[1], el);
                }, 400);
            
            QuiX.cancelDefault(evt);
            QuiX.dragging = true;
        }
    }
}

QuiX.ui.Widget._drag = function(evt, desktop) {
    if (QuiX.tmpWidget) {
        var coords = QuiX.getEventCoordinates(evt),
            w = null,
            dropable;

        coords[0] += 2;
        if (QuiX.dir == 'rtl') {
            coords[0] = QuiX.transformX(coords[0], desktop);
        }

        QuiX.tmpWidget.moveTo(coords[0], coords[1] + 2);

        // detect target
        if (!QuiX.supportTouches) {
            w = QuiX.getTargetWidget(evt);
        }
        else {
            var coords = QuiX.getEventCoordinates(evt);
            w = QuiX.getWidgetFromPoint(coords[0], coords[1]);
        }

        while (w) {
            if (typeof w.dropable == 'function') {
                dropable = w.dropable.apply(w, [QuiX.dragable]);
            }
            else {
                dropable = w.dropable;
            }
            if (dropable) break;
            w = w.parent;
        }

        if (w && w != QuiX.dragable && w != QuiX.dragable.parent) {
            QuiX.tmpWidget.div.style.borderColor = 'red';
            QuiX.dropTarget = w;
        }
        else {
            QuiX.tmpWidget.div.style.borderColor = 'transparent';
            QuiX.dropTarget = null;
        }

    }
}

QuiX.ui.Widget._enddrag = function(evt, desktop) {
    if (QuiX.dragTimer != 0) {
        window.clearTimeout(QuiX.dragTimer);
        QuiX.dragTimer = 0;
    }
    desktop.detachEvent('onmouseup', QuiX.ui.Widget._enddrag);
    QuiX.dragging = false;
    if (QuiX.dragable) {
        desktop.detachEvent('onmousemove', QuiX.ui.Widget._drag);
        QuiX.tmpWidget.destroy();
        QuiX.tmpWidget = null;
        try {
            if (QuiX.dropTarget) {
                QuiX.dropTarget.trigger('ondrop', evt, QuiX.dropTarget, QuiX.dragable);
            }
        }
        finally {
            QuiX.dropTarget = null;
            QuiX.dragable = null;
        }
    }
}

// desktop

QuiX.ui.Desktop = function(params, root) {
    QuiX.dir = params.dir || '';
    params.id = 'desktop';
    params.width = params.width || null;
    if (!params.height) {
        params.height = 'QuiX.getParentNode(this.div).clientHeight';
    }
    params.overflow = params.overflow || 'hidden';

    if (QuiX.utils.BrowserInfo.family != 'op') {
        params.oncontextmenu = QuiX.ui.Desktop._oncontextmenu;
    }

    QuiX.ui.Widget.call(this, params);

    if (document.all) {
        this.div.onselectstart = QuiX.cancelDefault;
    }

    this.setPosition('');
    root.appendChild(this.div);
    this.div.className = 'desktop';

    if (root == document.body) {
        document.body.style.height = '100%';
        document.documentElement.style.height = '100%';
        document.body.style.margin = '0px';
        document.desktop = this;
    }
    else {
        QuiX.desktops.push(this);
    }

    this.attachEvent('onmousedown', QuiX.ui.Desktop._onmousedown);
    this.attachEvent('onmouseup', QuiX.ui.Desktop._onmouseup);

    var self = this;
    this._resizeHandler = function() {
        self._onresize();
    }
    if (!QuiX.supportTouches) {
        QuiX.addEvent(window, 'onresize', this._resizeHandler);
    }
    else {
        QuiX.addEvent(window, 'onorientationchange', this._resizeHandler);
    }

    this.overlays = [];
}

QuiX.constructors['desktop'] = QuiX.ui.Desktop;
QuiX.ui.Desktop.prototype = new QuiX.ui.Widget;
QuiX.ui.Desktop.prototype.__class__ = QuiX.ui.Desktop;

QuiX.ui.Desktop.prototype.cleanupOverlays = function() {
    var ovr = this.overlays;
    while (ovr.length > 0) {
        ovr[0].close();
    }
    if (QuiX.ui.DataGrid) {
        QuiX.ui.DataGrid._removeEditWidget();
    }
}

QuiX.ui.Desktop.prototype.destroy = function() {
    QuiX.removeEvent(window, QuiX.supportTouches?
                     'onorientationchange':'onresize', this._resizeHandler);
    QuiX.desktops.removeItem(this);
    QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
}

QuiX.ui.Desktop.prototype._onresize = function() {
    var timeout = 100,
        self = this;

    if (QuiX.utils.BrowserInfo.OS == 'Android') {
        timeout = 500;
    }
    if (this._rt) {
        window.clearTimeout(this._rt);
        this._rt = null;
    }
    this._rt = window.setTimeout(
        function() {
            self.redraw();
            if (QuiX._scrollbarSize > 0) {
                self.redraw();
            }
            self._rt = null;
        }, timeout);
}

QuiX.ui.Desktop.prototype.msgbox = function(mtitle, message, buttons, image,
        mleft, mtop /*, mwidth, mheight, container*/) {
    var sButtons = '',
        handler,
        oButton,
        innHTML,
        mwidth = arguments[6] || 240,
        mheight = arguments[7] || 120,
        container = arguments[8] || this;

    if (image) {
        QuiX.getImage(image);
        innHTML = '<td><img src="' + image + '"></img></td><td>' +
        message + '</td>';
    }
    else
        innHTML = '<td>' + message + '</td>';

    if (typeof buttons == 'object') {
        for (var i=0; i<buttons.length; i++) {
            oButton = buttons[i];
            sButtons += '<dlgbutton width="' + oButton[1] +
                        '" height="22" caption="' + oButton[0] + '"/>';
        }
    }
    else {
        sButtons = '<dlgbutton onclick="__closeDialog__" caption="' +
                   buttons + '" width="80" height="22"/>';
    }

    container.parseFromString(
        '<dialog xmlns="http://www.innoscript.org/quix" ' +
        'title="' + mtitle + '" close="true" ' +
        'width="' + mwidth + '" height="' + mheight + '" left="' + mleft +
        '" top="' + mtop + '">' +
        '<wbody><xhtml><![CDATA[<table cellpadding="4"><tr>' + innHTML +
        '</tr></table>]]></xhtml></wbody>' + sButtons + '</dialog>',

        function(w) {
            //attach buttons click events
            if (typeof buttons == 'object') {
                for (var i=0; i<buttons.length; i++) {
                    oButton = buttons[i];
                    handler = '__closeDialog__';
                    if (oButton.length > 2) {
                        handler = oButton[2];
                    };
                    w.buttons[i].attachEvent('onclick', handler);
                }
            }
        }
    );
}

QuiX.ui.Desktop._onmousedown = function(evt, desktop) {
    var coords = QuiX.getEventCoordinates(evt);
    QuiX.startX = QuiX.currentX = coords[0];
    QuiX.startY = QuiX.currentY = coords[1];

    desktop.attachEvent('onmousemove', QuiX.ui.Desktop._onmousemove);

    // check if the widget is inside an overlay
    var w = QuiX.getTargetWidget(evt),
        el = QuiX.getTarget(evt),
        overlays = [];

    while (w) {
        if (desktop.overlays.hasItem(w)) {
            overlays.push(w);
            if (w.combo) {
                w = w.combo;
            }
            else if (w.owner) {
                w = w.owner;
            }
        }
        else if (w.dropdown) {
            overlays.push(w.dropdown);
        }
        else if (QuiX.ui.DataGrid && QuiX.ui.DataGrid.__editwidget == w) {
            overlays.push(QuiX.ui.DataGrid.__editwidget)
        }
        w = w.parent;
    }

    if (overlays.length == 0) {
        // not inside an overlay
        desktop.cleanupOverlays();
    }
    else {
        // inside an overlay; clear all others
        var inactive = [],
            active = desktop.overlays;
        for (var i=0; i<active.length; i++) {
            if (!overlays.hasItem(active[i])) {
                inactive.push(active[i]);
            }
        }
        for (i=0; i<inactive.length; i++) {
            inactive[i].close();
        }
    }

    if (!QuiX.supportTouches && el.tagName != 'INPUT' && el.tagName != 'TEXTAREA') {
        QuiX.cancelDefault(evt);
        if (window.getSelection && window.getSelection()) {
            window.getSelection().removeAllRanges();
        }
        if (!(el.contentEditable.toString() == "true")
                // required by IE
                && QuiX.getWidget(el).getId() != '_o') {
            if (document.activeElement && document.activeElement != document.body) {
                document.activeElement.blur();
            }
        }
    }
}

QuiX.ui.Desktop._onmouseup = function(evt, desktop) {
    desktop.detachEvent('onmousemove', QuiX.ui.Desktop._onmousemove);
}

QuiX.ui.Desktop._onmousemove = function(evt, desktop) {
    var coords = QuiX.getEventCoordinates(evt);
    QuiX.currentX = coords[0];
    QuiX.currentY = coords[1];
}

QuiX.ui.Desktop._oncontextmenu = function(evt, w) {
    QuiX.cancelDefault(evt);
}

// progress bar

QuiX.ui.ProgressBar = function(/*params*/) {
    var params = arguments[0] || {};
    this.base = QuiX.ui.Widget;
    params.border = 1;
    params.overflow = 'hidden';
    this.base(params);
    this.div.className = 'progressbar';
    this.bar = new QuiX.ui.Widget({height:"100%", overflow:'hidden'});
    this.appendChild(this.bar);
    this.bar.div.className = 'bar';
    this.maxvalue = parseInt(params.maxvalue) || 100;
    this.minvalue = parseInt(params.minvalue) || 0;
    this.value = parseInt(params.value) || this.minvalue;
    this.setValue(this.value);
    if ((params.labeled == true || params.labeled == 'true')) {
       var lbl = new QuiX.ui.Label({
          width: '100%',
          height:'100%',
          align: 'center',
          caption:'0%'
       });
       this.appendChild(lbl);
       this.label = lbl;
    }
}


QuiX.constructors['progressbar'] = QuiX.ui.ProgressBar;
QuiX.ui.ProgressBar.prototype = new QuiX.ui.Widget;
QuiX.ui.ProgressBar.prototype.__class__ = QuiX.ui.ProgressBar;
QuiX.ui.ProgressBar.prototype.customEvents = QuiX.ui.Widget.prototype.customEvents.concat(['onchange']);

QuiX.ui.ProgressBar.prototype._update = function() {
    var percentage = parseInt(((this.value - this.minvalue) / (this.maxvalue - this.minvalue)) * 100) + '%';
    this.bar.width = percentage ;
    this.bar.redraw();
    if (this.label) {
        this.label.setCaption(percentage);
    }
}

QuiX.ui.ProgressBar.prototype.setValue = function(v) {
    var oldValue = this.value; 
    this.value = parseInt(v);
    if (this.value>this.maxvalue) this.value = this.maxvalue;
    if (this.value<this.minvalue) this.value = this.minvalue;
    if (oldValue != this.value){
        this.trigger('onchange', this);
        this._update();
    }
}

QuiX.ui.ProgressBar.prototype.increase = function(amount) {
    this.setValue(this.value + parseInt(amount));
}