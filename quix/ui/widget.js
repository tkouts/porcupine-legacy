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
        this.div.style.padding = '0px 0px 0px 0px';
    }

    this.div.dir = params.dir || QuiX.dir;

    if (params.display) {
        this.setDisplay(params.display);
    }
    if (params.overflow) {
        this.setOverflow(params.overflow);
    }
    this.setPosition('absolute');

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
    if(params.shadow) {
    	this.setShadow(params.shadow.split(','));
    }
}

QuiX.constructors['rect'] = QuiX.ui.Widget;

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

QuiX.ui.Widget.prototype.parse = function(dom, callback) {
    var parser = new QuiX.Parser();
    parser.oncomplete = callback;
    parser.parse(dom, this);
}

QuiX.ui.Widget.prototype.parseFromString = function(s /*, oncomplete*/) {
    var oncomplete = arguments[1] || null;
    this.parse(QuiX.parsers.domFromString(s), oncomplete);
}

QuiX.ui.Widget.prototype.parseFromUrl = function(url /*, oncomplete*/) {
    var oncomplete = arguments[1] || null;
    var xmlhttp = QuiX.XHRPool.getInstance();
    var self = this;
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
            self.parse(dom, oncomplete);
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
    var w;
    var ws = [];
    for (var i=0; i<this.widgets.length; i++) {
        w = this.widgets[i];
        if (eval_func.apply(w)) {
            ws.push(w);
        }
        if (!shallow) {
            ws = ws.concat(w.query(eval_func, shallow, limit));
        }
        if (limit && ws.length >= limit) {
            break;
        }
    }
    return ws;
}

QuiX.ui.Widget.prototype.getWidgetById = function(sid /*, shallow, limit*/) {
    var shallow = arguments[1] || false,
        limit = arguments[2] || null;
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
        limit = arguments[2] || null;

    return this.query(
        function() {
            return this.div.className == cssName;
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
    var left = this._calcLeft(memo) || 0;
    if (this.parent && QuiX.dir == 'rtl'
            && this.div.style.position == 'absolute' && !this._xformed) {
        // rtl xform
        this.div.style.left = QuiX.transformX(
            left + this.getWidth(true, memo), this.parent) + 'px';
    }
    else {
        this.div.style.left = left + 'px';
    }
    this.div.style.top = (this._calcTop(memo) || 0) + 'px';
}

QuiX.ui.Widget.prototype._setCommonProps = function(memo) {
    if (this.width != null) {
        this.div.style.width = this._calcWidth(false, memo) + 'px';
    }
    else {
        this.div.style.width = '';
    }
    if (this.height != null) {
        this.div.style.height = this._calcHeight(false, memo) + 'px';
    }
    else {
        this.div.style.height = '';
    }
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
        switch (QuiX.utils.BrowserInfo.family) {
            case 'moz':
                this.div.style.backgroundImage = '-moz-linear-gradient(' +
                    bgc[0] + ',' + bgc[1] + ',' + bgc[2] + ')';
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
                }
                this.div.style.backgroundImage = '-webkit-gradient(linear,' +
                    dir + ',from(' + bgc[1] + '),to(' + bgc[2] + '))';
                break;
            case 'ie':
                var types = {left:1, top:0};
                this.div.style.filter =
                    'progid:DXImageTransform.Microsoft.gradient(' +
                    "GradientType=" + types[bgc[0]] + "," +
                    "startColorstr='" + bgc[1] + "'," +
                    "endColorstr='" + bgc[2] + "')";
                break;
            case 'op':
                // fallback to single color
                this.div.style.backgroundColor = bgc[1];
                this._bgc = color;
        }
        this._bgc = bgc;
    }
    else {
        // single color
        this.div.style.backgroundColor = color;
        this._bgc = color;
    }
}
QuiX.ui.Widget.prototype.getBgColor = function() {
    return this._bgc || '';
}

//borderWidth attribute
QuiX.ui.Widget.prototype.setBorderWidth = function(iWidth) {
    this.div.style.borderWidth = iWidth + 'px';
}
QuiX.ui.Widget.prototype.getBorderWidth = function() {
    return parseInt(this.div.style.borderWidth) ||
           parseInt(this.div.style.borderTopWidth);
}

//display attribute
QuiX.ui.Widget.prototype.setDisplay = function(sDispl) {
    this.div.style.display = sDispl || '';
}
QuiX.ui.Widget.prototype.getDisplay = function() {
    return this.div.style.display;
}

//overflow attribute
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

//position attribute
QuiX.ui.Widget.prototype.setPosition = function(sPos) {
    this.div.style.position = sPos || '';
}
QuiX.ui.Widget.prototype.getPosition = function() {
    return this.div.style.position;
}

//opacity attribute
QuiX.ui.Widget.prototype.setOpacity = function(fOpacity) {
    QuiX.setOpacity(this.div, fOpacity);
}
QuiX.ui.Widget.prototype.getOpacity = function() {
    var opacity = QuiX.getOpacity(this.div);
    return (isNaN(opacity))? 1:opacity;
}

function handleIEBox(w, shadow) {
	
}

//box shadow attribute
QuiX.ui.Widget.prototype.setShadow = function(shadow) {
	this._shadow = shadow;
	QuiX.setShadow(this.div, shadow);
}

QuiX.ui.Widget.prototype.getShadow = function() {
    return this._shadow || null;
}

//padding attribute
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

QuiX.ui.Widget.prototype._mustRedraw = function () {
    return  isNaN(this.left) || isNaN(this.top) || isNaN(this.height)
            || isNaN(this.width);
}

QuiX.ui.Widget.prototype._shallowRedraw = function(memo) {
    var i, w;
    for (i=0; i<this.widgets.length; i++) {
        w = this.widgets[i];
        if (w.div.style.display != 'none') {
            sig = w._getSig(memo);
            if (sig != w._rds) {
                w._setCommonProps(memo);
            }
            if (w.div.style.position != '') {
                w._setAbsProps(memo);
            }
            w._rds = null;
        }
    }
}

QuiX.ui.Widget.prototype.getHeight = function(b /*, memo*/) {
    var memo = arguments[1] || {};
    var hg1, hg2, cached;
    
    if (memo[this._uniqueid + 'gh']) {
        cached = memo[this._uniqueid + 'gh'];
        hg1 = cached[0];
        hg2 = cached[1];
    }
    else {
        var ofs = parseInt(this.div.style.paddingTop) +
                  parseInt(this.div.style.paddingBottom),
            hg1 = this.div.offsetHeight,
            hg2 = this.div.clientHeight - ofs;

        if (this.div.style.overflow == 'auto' ||
                this.div.style.overflowX == 'auto') {
            var ofs2 = parseInt(this.div.style.paddingLeft) +
                       parseInt(this.div.style.paddingRight),
                memo2 = {},
                nhg;

            memo2[this._uniqueid + 'gh'] = [hg1, hg2];
            memo2[this._uniqueid + 'gw'] = [this.div.offsetWidth,
                                            this.div.clientWidth - ofs2];

            // we need to redraw children
            this._shallowRedraw(memo2);

            nhg = this.div.clientHeight - ofs;
            if (hg2 != nhg) {
                hg2 = nhg;
            }
            else {
                for (var v in memo2) {
                    memo[v] = memo2[v];
                }
            }

            memo2 = null;
            memo[this._uniqueid + 'gw'] = [this.div.offsetWidth,
                                           this.div.clientWidth - ofs2];
        }
        memo[this._uniqueid + 'gh'] = [hg1, hg2];
    }
    if (b) {
        return hg1;
    }
    else {
        return hg2;
    }
}

QuiX.ui.Widget.prototype.getWidth = function(b /*, memo*/) {
    var memo = arguments[1] || {};
    var wd1, wd2, cached;
    
    if (memo[this._uniqueid + 'gw']) {
        cached = memo[this._uniqueid + 'gw'];
        wd1 = cached[0];
        wd2 = cached[1];
    }
    else {
        var ofs = parseInt(this.div.style.paddingLeft) +
                  parseInt(this.div.style.paddingRight),
            wd1 = this.div.offsetWidth,
            wd2 = this.div.clientWidth - ofs;

        if (this.div.style.overflow == 'auto' ||
                this.div.style.overflowY == 'auto') {
            var ofs2 = parseInt(this.div.style.paddingTop) +
                       parseInt(this.div.style.paddingBottom),
                memo2 = {},
                nwd;

            memo2[this._uniqueid + 'gw'] = [wd1, wd2];
            memo2[this._uniqueid + 'gh'] = [this.div.offsetHeight,
                                            this.div.clientHeight - ofs2];

            // we need to redraw children
            this._shallowRedraw(memo2);

            nwd = this.div.clientWidth - ofs;
            if (wd2 != nwd) {
                wd2 = nwd;
            }
            else {
                for (var v in memo2) {
                    memo[v] = memo2[v];
                }
            }

            memo2 = null;
            memo[this._uniqueid + 'gh'] = [this.div.offsetHeight,
                                           this.div.clientHeight - ofs2];
        }
        memo[this._uniqueid + 'gw'] = [wd1, wd2];
    }
    if (b) {
        return wd1;
    }
    else {
        return wd2;
    }
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

QuiX.ui.Widget.prototype._calcSize = function(height, offset, getHeight, memo) {
    var value = 0;
    if (memo && memo[this._uniqueid + height]) {
        value = memo[this._uniqueid + height];
    }
    else {
        if (this[height] == 'auto') {
            var value = 0, w_length;
            var padding_offset = (height == 'height')? 2:0;
            var padding = this.getPadding();
            var length_func = (height == 'height')? '_calcHeight':'_calcWidth';
            var offset_func = (height == 'height')? '_calcTop':'_calcLeft';

            for (var i = 0; i < this.widgets.length; i++) {
                if (this.widgets[i].div.style.display != 'none') {
                    w_length = this.widgets[i][offset_func](memo) +
                               this.widgets[i][length_func](true, memo);
                    value = Math.max(value, w_length);
                }
            }

            value = value +
                    padding[padding_offset + 1] +
                    2 * this.getBorderWidth();
        }
        else {
            value = (typeof this[height] == 'function')?
                    this[height].apply(this, [memo]):this[height];
            if (value) {
                if (!isNaN(value)) {
                    value = parseInt(value);
                }
                else {
                    if (value.slice(value.length - 1) == '%') {
                        var perc = parseInt(value) / 100;
                        value = parseInt(this.parent[getHeight](false, memo)
                                         * perc) || 0;
                    }
                    else {
                        if (!this['__' + height] ||
                                this['__' + height].expr != value) {
                            // compile expression to a function
                            var func = new Function('memo', 'return ' + value);
                            func.expr = value;
                            this['__' + height] = func;
                        }
                        value = this['__' + height].apply(this, [memo]) || 0;
                    }
                }
            }
        }
        if (typeof memo != 'undefined') {
            memo[this._uniqueid + height] = value;
        }
    }
    return value - offset;
}

QuiX.ui.Widget.prototype._calcPos = function(left, offset, getWidth, memo) {
    var value = 0;
    if (memo && memo[this._uniqueid + left]) {
        value = memo[this._uniqueid + left];
    }
    else {
        value = typeof(this[left]) == 'function'?
                this[left].apply(this, [memo]):this[left];
        if (value) {
            if (!isNaN(value)) {
                value = parseInt(value);
            }
            else if (value.slice(value.length-1) == '%') {
                var perc = parseInt(value) / 100;
                value = (this.parent[getWidth](false, memo) * perc) || 0;
            }
            else if (value == 'center') {
                value = Math.round((this.parent[getWidth](false, memo) / 2) -
                                   (this[getWidth](true, memo) / 2)) || 0;
            }
            else {
                if (!this['__' + left] || this['__' + left].expr != value) {
                    // compile expression to a function
                    var func = new Function('memo', 'return ' + value);
                    func.expr = value;
                    this['__' + left] = func;
                }
                value = this['__' + left].apply(this, [memo]) || 0;
            }

            if (typeof memo != 'undefined') {
                memo[this._uniqueid + left] = value;
            }
        }
    }
    return value + offset;
}

QuiX.ui.Widget.prototype._calcHeight = function(b, memo) {
    var offset = 0;
    if (!b) offset = parseInt(this.div.style.paddingTop) +
                     parseInt(this.div.style.paddingBottom) +
                     2 * this.getBorderWidth();
    var s = this._calcSize('height', offset, 'getHeight', memo);
    var ms = this._calcMinHeight() - offset;
    if (s < ms) s = ms;
    return s>0? s:0;
}

QuiX.ui.Widget.prototype._calcWidth = function(b, memo) {
    var offset = 0;
    if (!b) offset = parseInt(this.div.style.paddingLeft) +
                     parseInt(this.div.style.paddingRight) +
                     2 * this.getBorderWidth();
    var s = this._calcSize('width', offset, 'getWidth', memo);
    var ms = this._calcMinWidth() - offset;
    if (s < ms) s = ms;
    return s>0? s:0;
}

QuiX.ui.Widget.prototype._calcLeft = function(memo) {
    var offset;
    if (this.parent && this.div.style.position == 'absolute') {
        var near = (QuiX.dir == 'rtl')? 'paddingRight':'paddingLeft';
        offset = parseInt(this.parent.div.style[near]);
    }
    else {
        offset = 0;
    }
    return this._calcPos('left', offset, 'getWidth', memo);
}

QuiX.ui.Widget.prototype._calcTop = function(memo) {
    var offset;
    if (this.parent && this.div.style.position == 'absolute') {
        offset = parseInt(this.parent.div.style.paddingTop);
    }
    else {
        offset = 0;
    }
    return this._calcPos('top', offset, 'getHeight', memo);
}

QuiX.ui.Widget.prototype._calcMinWidth = function() {
    return (typeof(this.minw) == 'function')? this.minw(this):this.minw;
}

QuiX.ui.Widget.prototype._calcMinHeight = function() {
    return (typeof(this.minh) == 'function')? this.minh(this):this.minh;
}

QuiX.ui.Widget.prototype.getScreenLeft = function() {
    var curleft = 0,
        bf = QuiX.utils.BrowserInfo.family,
        bv = QuiX.utils.BrowserInfo.version,
        el = this.div,
        includeBorders = !(bf == 'op' || (bf == 'ie' && bv > 7));

    if (el.offsetParent) {
        curleft += el.offsetLeft;
        while (el = el.offsetParent) {
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
        curleft = QuiX.transformX(curleft + this.div.offsetWidth);
    }
    return curleft;
}

QuiX.ui.Widget.prototype.getScreenTop = function() {
    var curtop = 0,
        bf = QuiX.utils.BrowserInfo.family,
        bv = QuiX.utils.BrowserInfo.version,
        el = this.div,
        includeBorders = !(bf == 'op' || (bf == 'ie' && bv > 7));

    if (el.offsetParent) {
        curtop += el.offsetTop;
        while (el = el.offsetParent) {
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
    }
}

QuiX.ui.Widget.prototype.click = function() {
    QuiX.sendEvent(this.div, 'MouseEvents', 'onclick');
}

QuiX.ui.Widget.prototype.moveTo = function(x, y) {
    var memo = {}
    this.left = x;
    this.top = y;
    var padding = this.parent.getPadding();
    if (isNaN(x)) {
        x = this._calcLeft(memo);
    }
    else {
        x += padding[0];
        if (QuiX.dir == 'rtl') {
            x = QuiX.transformX(x + this.getWidth(true, memo), this.parent);
        }
    }
    y = (isNaN(y))? this._calcTop(memo):y + padding[2];
    this.div.style.left = x + 'px';
    this.div.style.top = y + 'px';
}

QuiX.ui.Widget.prototype.resize = function(x, y) {
    var minw = this._calcMinWidth();
    var minh = this._calcMinHeight();
    this.width = (x > minw)? x:minw;
    this.height = (y > minh)? y:minh;
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
    var coords = QuiX.getEventCoordinates(evt);

    QuiX.startX = coords[0];
    QuiX.startY = coords[1];
    QuiX.widget = this;

    if (QuiX.utils.BrowserInfo.family == 'op') {
        // required to avoid scrollbars trap
        QuiX.sendEvent(this.div, 'MouseEvents', 'onmouseup');
    }

    QuiX.tmpWidget = QuiX.createOutline(this);
    QuiX.tmpWidget.bringToFront();

    document.desktop.attachEvent('onmouseup', QuiX.ui.Widget._endResize);
    document.desktop.attachEvent('onmousemove', QuiX.ui.Widget._resizing);
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

QuiX.ui.Widget._endResize = function(evt) {
    document.desktop.detachEvent('onmouseup', QuiX.ui.Widget._endResize);
    document.desktop.detachEvent('onmousemove', QuiX.ui.Widget._resizing);

    QuiX.widget.resize(QuiX.tmpWidget.getWidth(true),
                       QuiX.tmpWidget.getHeight(true));

    QuiX.tmpWidget.destroy();
    QuiX.tmpWidget = null;
    QuiX.widget.bringToFront();

    QuiX.widget.parent.div.style.cursor = '';
}

QuiX.ui.Widget.prototype._startMove = function(evt) {
    var coords = QuiX.getEventCoordinates(evt);

    if (QuiX.dir == 'rtl') {
        coords[0] = QuiX.transformX(coords[0]);
    }

    QuiX.startX = coords[0] - this.getLeft();
    QuiX.startY = coords[1] - this.getTop();
    QuiX.widget = this;

    document.desktop.attachEvent('onmouseup', QuiX.ui.Widget._endMove);
    document.desktop.attachEvent('onmousemove', QuiX.ui.Widget._moving);
    this.parent.div.style.cursor = 'move';
}

QuiX.ui.Widget._moving = function(evt) {
    var coords = QuiX.getEventCoordinates(evt);
    if (QuiX.dir == 'rtl') {
        coords[0] = QuiX.transformX(coords[0]);
    }
    QuiX.widget.moveTo(coords[0] - QuiX.startX,
                       coords[1] - QuiX.startY);
}

QuiX.ui.Widget._endMove = function(evt) {
    document.desktop.detachEvent('onmouseup', QuiX.ui.Widget._endMove);
    document.desktop.detachEvent('onmousemove', QuiX.ui.Widget._moving);
    QuiX.widget.parent.div.style.cursor = '';
}

QuiX.ui.Widget.prototype._startDrag = function(x, y) {
    var dragable = QuiX.getDraggable(this);
    dragable.left = x + 2;
    dragable.top = y + 2;
    dragable.setOpacity(.5);
    document.desktop.appendChild(dragable);
    dragable.div.style.zIndex = QuiX.maxz;
    dragable.redraw();

    QuiX.tmpWidget = dragable;
    QuiX.dragable = this;

    document.desktop.attachEvent('onmousemove', QuiX.ui.Widget._drag);
}

QuiX.ui.Widget.prototype._getSig = function(memo) {
    return ((this.width == null)?
                this.div.clientWidth:this._calcWidth(true, memo)) +
           ((this.height == null)?
                this.div.clientHeight:this._calcHeight(true, memo));
}

QuiX.ui.Widget.prototype.redraw = function(bForceAll /*, memo*/) {
    var container = QuiX.getParentNode(this.div);
    if (container && this.div.style.display != 'none') {
        var memo = arguments[1] || {},
            wdth = this.div.style.width,
            hght = this.div.style.height,
            w,
            sig;

        this._setCommonProps(memo);
        if (this.div.style.position != '') {
            this._setAbsProps(memo);
        }

        for (var i=0; i<this.widgets.length; i++) {
            w = this.widgets[i];
            if (w.div.style.display != 'none') {
                if (bForceAll || typeof w._rds == 'undefined') {
                    w.redraw(true, memo);
                    w._rds = w._getSig(memo);
                }
                else if (w._mustRedraw()){
                    sig = w._getSig(memo);
                    if (sig != w._rds) {
                        w.redraw(false, memo);
                        w._rds = sig;
                    }
                    else if (w.div.style.position != '') {
                        w._setAbsProps(memo);
                    }
                }
            }
        }

        if ((wdth && wdth != this.div.style.width) ||
                (hght && hght != this.div.style.height)) {
            if (this._customRegistry.onresize) {
                this._customRegistry.onresize(this, parseInt(wdth),
                                              parseInt(hght));
            }
        }
    }
    return memo;
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

//events sub-system
QuiX.ui.Widget.prototype.supportedEvents = [
    'onmousedown', 'onmouseup', 'onmousemove', 'onmouseover', 'onmouseout',
    'onkeypress', 'onkeyup', 'onkeydown', 'onclick', 'ondblclick', 'onscroll',
    'oncontextmenu', 'onswipe'];

QuiX.ui.Widget.prototype.customEvents = ['onload', 'onunload',
    'onresize', 'ondrop'];

QuiX.ui.Widget.prototype._registerHandler = function(evt_type, handler, isCustom) {
    if (!isCustom) {
        if (typeof this._registry[evt_type] == 'undefined') {
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
        this._customRegistry[evt_type] = handler;
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
        for (var evt_type in this._registry) {
            for (var i=0; i<this._registry[evt_type].length; i++) {
                QuiX.addEvent(this.div, evt_type, this._registry[evt_type][i]);
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
                    QuiX.removeEvent(this.div, 'onclick', f);
                    this._registry['onclick'].removeItem(f);
                }
                else {
                    QuiX.removeEvent(this.div, eventType, f);
                    this._registry[eventType].removeItem(f);
                }
            }
        }
    }
    else if (this._customRegistry[eventType]
             && f == this._customRegistry[eventType]) {
        delete this._customRegistry[eventType];
    }
}

QuiX.ui.Widget.prototype._showTooltip = function(x, y) {
    var tooltip = new QuiX.ui.Label({
        left : x,
        top : y,
        caption : this.tooltip,
        border : QuiX.theme.tooltip.border,
        bgcolor : QuiX.theme.tooltip.bgcolor,
        color: QuiX.theme.tooltip.color,
        padding: QuiX.theme.tooltip.padding,
        wrap : true
    });
    tooltip.div.className = 'tooltip';
    document.desktop.appendChild(tooltip);
    tooltip.redraw();
    this.__tooltip  = tooltip;
}

QuiX.ui.Widget._onmouseover = function(evt, w) {
    if (!QuiX.dragging) {
        var x1 = evt.clientX;
        if (QuiX.dir == 'rtl') {
            x1 = QuiX.transformX(x1);
        }
        var availHeight = document.desktop.getHeight(true),
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
    if (QuiX.supportTouches ||
            (QuiX.getMouseButton(evt) == 0 && !evt.ctrlKey)) {
        var coords = QuiX.getEventCoordinates(evt);
        if (QuiX.dir == 'rtl') {
            coords[0] = QuiX.transformX(coords[0]);
        }
        var el = QuiX.getTarget(evt);
        document.desktop.attachEvent('onmouseup', QuiX.ui.Widget._enddrag);
        QuiX.dragTimer = window.setTimeout(
            function _draghandler() {
                w._startDrag(coords[0], coords[1], el);
            }, 400);
        QuiX.cancelDefault(evt);
        QuiX.dragging = true;
    }
}

QuiX.ui.Widget._drag = function(evt, desktop) {
    if (QuiX.tmpWidget) {
        var coords = QuiX.getEventCoordinates(evt),
            w = null,
            dropable;

        coords[0] += 2;
        if (QuiX.dir == 'rtl') {
            coords[0] = QuiX.transformX(coords[0]);
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
            if (QuiX.dropTarget && QuiX.dropTarget._customRegistry['ondrop']) {
                QuiX.dropTarget._customRegistry['ondrop'](
                    evt, QuiX.dropTarget, QuiX.dragable);
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
    this.base = QuiX.ui.Widget;
    params.id = 'desktop';
    params.width = params.width || 'document.body.clientWidth';
    params.height = params.height || 'document.body.clientHeight';
    params.overflow = params.overflow  || 'hidden';
    params.onmousedown = QuiX.ui.Desktop._onmousedown;

    if (QuiX.utils.BrowserInfo.family != 'op') {
        params.oncontextmenu = QuiX.ui.Desktop._oncontextmenu;
    }
    this.base(params);
    if (QuiX.utils.BrowserInfo.family == 'ie') {
        this.div.onselectstart = QuiX.cancelDefault;
    }
    //this.setPosition('relative');
    this._setCommonProps();
    root.appendChild(this.div);
    this.div.className = 'desktop';
    document.desktop = this;
    window.onresize = function() {
        if (QuiX.utils.BrowserInfo.family == 'ie') {
            if (typeof document.desktop.width != 'number' ||
                    typeof document.desktop.height != 'number') {
                var container = QuiX.getParentNode(document.desktop.div);
                var dw = document.desktop.div.clientWidth;
                var dh = document.desktop.div.clientHeight;
                if (dw != container.clientWidth ||
                        dh != container.clientHeight) {
                    document.desktop.redraw();
                }
            }
        }
        else {
            document.desktop.redraw();
        }
    };
    this.overlays = [];
    this.parseFromString(QuiX.progress,
        function(loader){
            loader.setPosition('fixed');
            loader.div.style.zIndex = QuiX.maxz + 1;
            loader.hide();
            document.desktop._loader = loader;
        });
}

QuiX.constructors['desktop'] = QuiX.ui.Desktop;
QuiX.ui.Desktop.prototype = new QuiX.ui.Widget;

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
    desktop.attachEvent('onmouseup', QuiX.ui.Desktop._onmouseup);

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
        QuiX.cleanupOverlays();
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

    if ((!QuiX.supportTouches || QuiX.utils.BrowserInfo.OS == 'iPad') &&
            (el.tagName != 'INPUT' && el.tagName != 'TEXTAREA')) {
        QuiX.cancelDefault(evt);
        return false;
    }
}

QuiX.ui.Desktop._onmouseup = function(evt, desktop) {
    desktop.detachEvent('onmousemove', QuiX.ui.Desktop._onmousemove);
    desktop.detachEvent('onmouseup', QuiX.ui.Desktop._onmouseup);
}

QuiX.ui.Desktop._onmousemove = function(evt, desktop) {
    var coords = QuiX.getEventCoordinates(evt);
    QuiX.currentX = coords[0];
    QuiX.currentY = coords[1];
}

QuiX.ui.Desktop._oncontextmenu = function(evt, w) {
    QuiX.cancelDefault(evt);
}
