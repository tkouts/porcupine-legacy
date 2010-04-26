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

//Widget class
QuiX.ui.Widget = function(/*params*/) {
    var params = arguments[0] || {};
    this.left = params.left || 0;
    this.top = params.top || 0;
    this.width = params.width || null;
    this.height = params.height || null;
    this.minw = params.minw || 0;
    this.minh = params.minh || 0;
    this.tooltip = params.tooltip;
    this.widgets = [];
    this.attributes = params.attributes || {};
    this.maxz = 0;
    this._isDisabled = false;
    this._isContainer = true;
    this.contextMenu = null;
    this.div = ce('DIV');
    if (params.style)
        QuiX.setStyle(this.div, params.style);
    this.div.widget = this;
    this._uniqueid = QuiX.utils.uid();
    if (params.id) {
        this.setId(params.id)
    }
    if (params.bgcolor)
        this.setBgColor(params.bgcolor);
    this.setBorderWidth(parseInt(params.border) || 0);
    if (params.padding) {
        var padding = params.padding.split(',');
        this.setPadding(padding);
    }
    else
        this.div.style.padding = '0px 0px 0px 0px';

    this.div.dir = params.dir || QuiX.dir;

    if (params.display)
        this.setDisplay(params.display);
    if (params.overflow)
        this.setOverflow(params.overflow);
    this.setPosition('absolute');

    if (params.tooltip) {
        params.onmouseover = QuiX.wrappers.eventWrapper(
            QuiX.ui.Widget._onmouseover,
            params.onmouseover);
        params.onmouseout = QuiX.wrappers.eventWrapper(
            QuiX.ui.Widget._onmouseout,
            params.onmouseout);
    }
    if (typeof params.opacity != 'undefined') {
        this.setOpacity(parseFloat(params.opacity));
    }
    this.dragable = (params.dragable == 'true' || params.dragable == true);
    if (this.dragable) {
        params.onmousedown = QuiX.wrappers.eventWrapper(
            QuiX.ui.Widget._startDrag,
            params.onmousedown);
    }
    this.dropable = (params.dropable == 'true' || params.dropable == true);

    this._buildEventRegistry(params);
    this._attachEvents();

    if (params.disabled=='true' || params.disabled==true)
        this.disable();
}

QuiX.constructors['rect'] = QuiX.ui.Widget;
// backwards compatibility
var Widget = QuiX.ui.Widget;

QuiX.ui.Widget.prototype.appendChild = function(w /*, p, index*/) {
    var p = arguments[1] || this;
    var index = arguments[2] || null;
    p.widgets.push(w);
    w.parent = p;
    if (index != null)
        p.div.insertBefore(w.div, p.div.childNodes[index]);
    else
        p.div.appendChild(w.div);
    if (QuiX.utils.BrowserInfo.family == 'ie' && w.height=='100%' &&
            w.width=='100%')
        p.setOverflow('hidden');
    w.bringToFront();
    if (p._isDisabled)
        w.disable();
}

QuiX.ui.Widget.prototype.disable = function() {
    if (!this._isDisabled) {
        this._statecolor = this.div.style.color;
        this.div.style.color = 'GrayText';
        this._statecursor = this.div.style.cursor;
        this.div.style.cursor = 'default';
        this._isDisabled = true;
        if (this.__tooltip || this.__tooltipID)
            QuiX.ui.Widget._onmouseout(null, this);
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
    this.parse(QuiX.domFromString(s), oncomplete);
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
                    dom = QuiX.domFromString(xmlhttp._cached);
                }
                else {
                    var etag = xmlhttp.getResponseHeader('Etag');
                    if (etag) {
                        QuiX.rpc._cache.set(url, etag, xmlhttp.responseText);
                    }
                    dom = xmlhttp.responseXML;
                }
            }
            else
                dom = xmlhttp.responseXML;
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
    else
        xmlhttp.send('');
}

QuiX.ui.Widget.prototype.getParentByType = function(wtype) {
    var w = this.parent;
    while (w) {
        if (w instanceof wtype) return w;
        w = w.parent;
    }
    return null;
}

QuiX.ui.Widget.prototype.getWidgetById = function(sid /*, shallow*/) {
    var shallow = arguments[1] || false;
    var ws = this.query('w._id==param', sid, shallow);
    if (ws.length == 0)
        return null;
    else if (ws.length==1)
        return ws[0];
    else
        return ws;
}

QuiX.ui.Widget.prototype.query = function(eval_condition, param, shallow) {
    var w;
    var ws = [];
    for (var i=0; i<this.widgets.length; i++) {
        w = this.widgets[i];
        if (eval(eval_condition)) {
            ws.push(w);
        }
        if (!shallow)
            ws = ws.concat(w.query(eval_condition, param, shallow));
    }
    return ws;
}

QuiX.ui.Widget.prototype.getWidgetsByType = function(wtype, shallow) {
    return this.query('w instanceof param', wtype, shallow);
}

QuiX.ui.Widget.prototype.getWidgetsByClassName = function(cssName, shallow) {
    return this.query('w.div.className == param', cssName, shallow);
} 

QuiX.ui.Widget.prototype.getWidgetsByAttribute = function(attr_name, shallow) {
    return this.query('w[param] != undefined', attr_name, shallow);
}

QuiX.ui.Widget.prototype.getWidgetsByAttributeValue = function(attr_name, value,
        shallow) {
    return this.query('w[param[0]] == param[1]', [attr_name, value], shallow);
}

QuiX.ui.Widget.prototype._setAbsProps = function(memo) {
    var left = this._calcLeft(memo);
    if (this.parent && QuiX.dir == 'rtl'
            && this.div.style.position == 'absolute' && !this._xformed)
        // rtl xform
        this.div.style.left = QuiX.transformX(
            left + this.getWidth(true), this.parent) + 'px';
    else
        this.div.style.left = left + 'px';
    this.div.style.top = this._calcTop(memo) + 'px';
}

QuiX.ui.Widget.prototype._setCommonProps = function(memo) {
    if (this.height!=null)
        this.div.style.height = this._calcHeight(false, memo) + 'px';
    if (this.width!=null)
        this.div.style.width = this._calcWidth(false, memo) + 'px';
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
    this.div.style.backgroundColor = color;
}
QuiX.ui.Widget.prototype.getBgColor = function() {
    return this.div.style.backgroundColor;
}

//borderWidth attribute
QuiX.ui.Widget.prototype.setBorderWidth = function(iWidth) {
    this.div.style.borderWidth = iWidth + 'px';
}
QuiX.ui.Widget.prototype.getBorderWidth = function() {
    return parseInt(this.div.style.borderWidth);
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
            && QuiX.utils.BrowserInfo.OS == 'MacOS')
        this._overflow = sOverflow;
}
QuiX.ui.Widget.prototype.getOverflow = function() {
    if (QuiX.utils.BrowserInfo.family == 'saf') {
        if (this.div.style.overflowX == this.div.style.overflowY)
            return this.div.style.overflowX;
        else
            return this.div.style.overflowX + " " + this.div.style.overflowY;
    }
    else {
        if (this.div.style.overflow != '')
            return this.div.style.overflow;
        else
            return this.div.style.overflowX + " " + this.div.style.overflowY;
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
    return QuiX.getOpacity(this.div);
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
    var near = (QuiX.dir != 'rtl')?'paddingLeft':'paddingRight';
    var far = (QuiX.dir != 'rtl')?'paddingRight':'paddingLeft';
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
    if (new_offset < 0)
        new_offset = 0;
    this.div.style['padding' + where] = new_offset + 'px';
}

QuiX.ui.Widget.prototype._mustRedraw = function () {
    return  isNaN(this.left)||isNaN(this.top)
            ||isNaN(this.height)||isNaN(this.width);
}

QuiX.ui.Widget.prototype.getScrollWidth = function(/*memo*/) {
    var memo = arguments[0] || {},
        sw;
    if (memo[this._uniqueid + 'sw']) {
        sw = memo[this._uniqueid + 'sw'];
    }
    else {
        var lengths = [];
        for (var i=0; i<this.widgets.length; i++)
            lengths.push(this.widgets[i]._calcLeft(memo) +
                         this.widgets[i]._calcWidth(true, memo));
        sw = Math.max.apply(Math, lengths);
        memo[this._uniqueid + 'sw'] = sw;
    }
    return sw;
}

QuiX.ui.Widget.prototype.getScrollHeight = function(/*memo*/) {
    var memo = arguments[0] || {},
        sh;
    if (memo[this._uniqueid + 'sh']) {
        sh = memo[this._uniqueid + 'sh'];
    }
    else {
        var lengths = [];
        for (var i=0; i<this.widgets.length; i++) {
            lengths.push(this.widgets[i]._calcTop(memo) +
                         this.widgets[i]._calcHeight(true, memo));
        }
        sh = Math.max.apply(Math, lengths);
        memo[this._uniqueid + 'sh'] = sh;
    }
    return sh;
}

QuiX.ui.Widget.prototype.getHeight = function(b /*, memo*/) {
    var memo = arguments[1] || {};
    var ofs, hg, has_scrollbar, cached;
    
    if (memo[this._uniqueid + 'gh']) {
        cached = memo[this._uniqueid + 'gh'];
        hg = cached[0];
        ofs = cached[1];
        has_scrollbar = cached[2];
    }
    else {
        hg = parseInt(this.div.style.height);
        if (isNaN(hg)) return 0;
        ofs = parseInt(this.div.style.paddingTop) +
              parseInt(this.div.style.paddingBottom) +
              2 * this.getBorderWidth();
        memo[this._uniqueid + 'gh'] = [hg, ofs, false];

        has_scrollbar = this.div.style.overflowX == 'scroll' ||
                        this.div.style.overflow == 'scroll';
        if (!has_scrollbar && (this.div.style.overflowX == 'auto'
                               || this.div.style.overflow == 'auto')
               && this._calcWidth(true, memo) < this.getScrollWidth(memo)) {
            has_scrollbar = true;
        }
        memo[this._uniqueid + 'gh'][2] = has_scrollbar;
    }
    if (b)
        hg += ofs;
    else if (!b && has_scrollbar)
        hg -= QuiX._scrollbarSize;
    return hg;
}

QuiX.ui.Widget.prototype.getWidth = function(b /*, memo*/) {
    var memo = arguments[1] || {};
    var wd, ofs, has_scrollbar, cached;

    if (memo[this._uniqueid + 'gw']) {
        cached = memo[this._uniqueid + 'gw'];
        wd = cached[0];
        ofs = cached[1];
        has_scrollbar = cached[2];
    }
    else {
        wd = parseInt(this.div.style.width);
        if (isNaN(wd)) return 0;
        ofs = parseInt(this.div.style.paddingLeft) +
              parseInt(this.div.style.paddingRight) +
              2 * this.getBorderWidth();
        memo[this._uniqueid + 'gw'] = [wd, ofs, false];

        has_scrollbar = this.div.style.overflowY == 'scroll' ||
                        this.div.style.overflow == 'scroll';
        if (!has_scrollbar
                 && (this.div.style.overflowY == 'auto'
                     || this.div.style.overflow == 'auto')
                 && this._calcHeight(true, memo) < this.getScrollHeight(memo)) {
            has_scrollbar = true;
        }
        memo[this._uniqueid + 'gw'][2] = has_scrollbar;
    }
    if (b)
        wd += ofs;
    else if (!b && has_scrollbar)
        wd -= QuiX._scrollbarSize;
    return wd;
}

QuiX.ui.Widget.prototype.getLeft = function() {
    var ofs, lf;
    lf = parseInt(this.div.style.left);
    if (isNaN(lf)) return 0;
    ofs = this.parent.getPadding()[0];
    lf -= ofs
    if (QuiX.dir == 'rtl')
        lf = QuiX.transformX(lf + this.getWidth(true), this.parent);
    return lf;
}

QuiX.ui.Widget.prototype.getTop = function() {
    var ofs, rg;
    rg = parseInt(this.div.style.top);
    if (isNaN(rg)) return 0;
    ofs = this.parent.getPadding()[2];
    rg -= ofs
    return rg;
}

QuiX.ui.Widget.prototype._calcSize = function(height, offset, getHeight, memo) {
    var value;
    if (memo && memo[this._uniqueid + height]) {
        value = memo[this._uniqueid + height];
    }
    else {
        value = typeof(this[height]) == 'function'?
                this[height].apply(this, [memo]):this[height];
        if (value) {
            if (!isNaN(value))
                value =  parseInt(value);
            else if (value.slice(value.length-1) == '%') {
                var perc = parseInt(value) / 100;
                value = (parseInt(this.parent[getHeight](false, memo) * perc)) || 0;
            }
            else {
                if (!this['__' + height] || this['__' + height].expr != value) {
                    // compile expression to a function
                    var func = new Function('memo', 'return ' + value);
                    func.expr = value;
                    this['__' + height] = func;
                }
                value = this['__' + height].apply(this, [memo]) || 0;
            }
            if (typeof memo != 'undefined') {
                memo[this._uniqueid + height] = value;
            }
        }
    }
    return value - offset;
}

QuiX.ui.Widget.prototype._calcPos = function(left, offset, getWidth, memo) {
    var value;
    if (memo && memo[this._uniqueid + left]) {
        value = memo[this._uniqueid + left];
    }
    else {
        value = typeof(this[left]) == 'function'?
            this[left].apply(this, [memo]):this[left];
        if (value) {
            if (!isNaN(value))
                value = parseInt(value);
            else if (value.slice(value.length-1) == '%') {
                var perc = parseInt(value) / 100;
                value = (this.parent[getWidth](false, memo) * perc) || 0;
            }
            else if (value == 'center')
                value = parseInt((this.parent[getWidth](false, memo) / 2) -
                        (this[getWidth](true, memo) / 2)) || 0;
            else {
                if (!this['__' + left] || this['__' + left].expr != value) {
                    // compile expression to a function
                    var func = new Function('memo', 'return ' + value);
                    func.expr = value;
                    this['__' + left] = func;
                }
                value = this['__' + left].apply(this, [memo]) || 0;
            }

            if (typeof memo != 'undefined')
                memo[this._uniqueid + left] = value;
        }
    }
    return value + offset;
}

QuiX.ui.Widget.prototype._calcHeight = function(b, memo) {
    var offset = 0;
    if (!b) offset = parseInt(this.div.style.paddingTop) +
                     parseInt(this.div.style.paddingBottom) +
                     2*this.getBorderWidth();
    var s = this._calcSize("height", offset, "getHeight", memo);
    var ms = this._calcMinHeight() - offset;
    if (s < ms) s = ms;
    return s>0?s:0;
}

QuiX.ui.Widget.prototype._calcWidth = function(b, memo) {
    var offset = 0;
    if (!b) offset = parseInt(this.div.style.paddingLeft) +
                     parseInt(this.div.style.paddingRight) +
                     2*this.getBorderWidth();
    var s = this._calcSize("width", offset, "getWidth", memo);
    var ms = this._calcMinWidth() - offset;
    if (s < ms) s = ms;
    return s>0?s:0;
}

QuiX.ui.Widget.prototype._calcLeft = function(memo) {
    return this._calcPos("left",
        (this.parent? this.parent.getPadding()[0]:0),
        "getWidth",
        memo);
}

QuiX.ui.Widget.prototype._calcTop = function(memo) {
    return this._calcPos("top",
        (this.parent? this.parent.getPadding()[2]:0),
        "getHeight",
        memo);
}

QuiX.ui.Widget.prototype._calcMinWidth = function() {
    return (typeof(this.minw)=='function')?this.minw(this):this.minw;
}

QuiX.ui.Widget.prototype._calcMinHeight = function() {
    return (typeof(this.minh)=='function')?this.minh(this):this.minh;
}

QuiX.ui.Widget.prototype.getScreenLeft = function() {
    var oElement = this.div;
    var iX = 0, b;
    with (QuiX.utils.BrowserInfo) {
        var includeBorders = !(family == 'op' ||
            (family == 'ie' && version > 7));
        var offset = (family == 'saf' ||
            (family == 'ie' && version < 8))? 1 : 0;
    }
    while(oElement && oElement.tagName && oElement.tagName != 'HTML') {
        if (oElement.tagName!='TR') {
            iX += oElement.offsetLeft - QuiX.getScrollLeft(oElement);
            if (includeBorders) {
                b = parseInt(oElement.style.borderWidth);
                if (b)
                    iX += b;
            }
        }
        oElement = QuiX.getParentNode(oElement);
    }
    if (QuiX.dir == 'rtl')
        iX = QuiX.transformX(iX + this.div.offsetWidth);
    return iX - offset;
}

QuiX.ui.Widget.prototype.getScreenTop = function() {
    var oElement = this.div;
    var iY = 0, b;
    with (QuiX.utils.BrowserInfo) {
        var includeBorders = !(family == 'op' ||
            (family == 'ie' && version > 7));
        var offset = (family == 'saf' ||
            (family == 'ie' && version < 8))?1:0;
    }
    while(oElement && oElement.tagName && oElement.tagName!='HTML') {
        if (oElement.tagName!='TR') {
            iY += oElement.offsetTop - oElement.scrollTop;
            if (includeBorders) {
                b = parseInt(oElement.style.borderWidth);
                if (b)
                    iY += b;
            }
        }
        oElement = QuiX.getParentNode(oElement);
    }
    return iY - offset;
}

QuiX.ui.Widget.prototype.bringToFront = function() {
    if (this.div.style.zIndex==0 || this.div.style.zIndex < this.parent.maxz) {
        this.div.style.zIndex = ++this.parent.maxz;
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
    if (isNaN(x))
        x = this._calcLeft(memo);
    else {
        x += padding[0];
        if (QuiX.dir == 'rtl')
            x = QuiX.transformX(x + this.getWidth(true, memo), this.parent)
    }
    y = (isNaN(y))? this._calcTop(memo) : y + padding[2];
    this.div.style.left = x + 'px';
    this.div.style.top = y + 'px';
    QuiX._ieDomUpdate(this.div);
}

QuiX.ui.Widget.prototype.resize = function(x, y) {
    var minw = this._calcMinWidth();
    var minh = this._calcMinHeight();
    this.width = (x>minw)?x:minw;
    this.height = (y>minh)?y:minh;
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

QuiX.ui.Widget.prototype._startResize = function (evt) {
    var self = this;
    evt = evt || event;
    QuiX.startX = evt.clientX;
    QuiX.startY = evt.clientY;

    if (QuiX.utils.BrowserInfo.family == 'op')
        // required to avoid scrollbars trap
        QuiX.sendEvent(this.div, 'MouseEvents', 'onmouseup');

    QuiX.tmpWidget = QuiX.createOutline(this);
    QuiX.tmpWidget.bringToFront();

    document.desktop.attachEvent('onmouseup',
        function(evt){
            self._endResize(evt)
        });
    document.desktop.attachEvent('onmousemove',
        function(evt){
            self._resizing(evt)
        });
    this.parent.div.style.cursor = (QuiX.dir!='rtl')?'se-resize':'sw-resize';
}

QuiX.ui.Widget.prototype._resizing = function(evt) {
    var offsetX = evt.clientX - QuiX.startX;
    if (QuiX.dir == 'rtl')
        offsetX = -offsetX;
    var offsetY = evt.clientY - QuiX.startY;
    if (QuiX.tmpWidget)
        QuiX.tmpWidget.resize(this.getWidth(true) + offsetX,
                              this.getHeight(true) + offsetY);
}

QuiX.ui.Widget.prototype._endResize = function(evt) {
    QuiX.tmpWidget.destroy();
    var offsetX = evt.clientX - QuiX.startX;
    if (QuiX.dir == 'rtl')
        offsetX = -offsetX;
    var offsetY = evt.clientY - QuiX.startY;
    this.resize(this.getWidth(true) + offsetX,
                this.getHeight(true) + offsetY);
    this.bringToFront();
    document.desktop.detachEvent('onmouseup');
    document.desktop.detachEvent('onmousemove');
    this.parent.div.style.cursor = '';
}

QuiX.ui.Widget.prototype._startMove = function(evt) {
    var self = this;
    var clientX = evt.clientX;
    if (QuiX.dir == 'rtl')
        clientX = QuiX.transformX(clientX);
    QuiX.startX = clientX - this.getLeft();
    QuiX.startY = evt.clientY - this.getTop();
    document.desktop.attachEvent('onmouseup',
        function(evt){
            self._endMove(evt)
        });
    document.desktop.attachEvent('onmousemove',
        function(evt){
            self._moving(evt)
        });
    this.parent.div.style.cursor = 'move';
}

QuiX.ui.Widget.prototype._moving = function(evt) {
    var clientX = evt.clientX;
    if (QuiX.dir == 'rtl')
        clientX = QuiX.transformX(clientX);
    this.moveTo(clientX - QuiX.startX,
        evt.clientY - QuiX.startY);
}

QuiX.ui.Widget.prototype._endMove = function(evt) {
    document.desktop.detachEvent('onmouseup');
    document.desktop.detachEvent('onmousemove');
    this.parent.div.style.cursor = '';
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

    document.desktop.attachEvent('onmouseover', QuiX.ui.Widget._detectTarget);
    document.desktop.attachEvent('onmousemove', QuiX.ui.Widget._drag);
}

QuiX.ui.Widget.prototype.redraw = function(bForceAll /*, memo*/) {
    var container = QuiX.getParentNode(this.div);
    if (container && this.div.style.display != 'none') {
        var memo = arguments[1] || {};
        var wdth = this.div.style.width;
        var hght = this.div.style.height;

        this._setCommonProps(memo);
        if (this.div.style.position != '')
            this._setAbsProps(memo);

        for (var i=0; i<this.widgets.length; i++) {
            if (bForceAll || this.widgets[i]._mustRedraw())
                this.widgets[i].redraw(bForceAll, memo);
        }

        if ((wdth && wdth != this.div.style.width) ||
            (hght && hght != this.div.style.height)) {
            if (this._customRegistry.onresize)
                this._customRegistry.onresize(this,
                    parseInt(wdth),
                    parseInt(hght));
        }
        QuiX._ieDomUpdate(this.div);
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
            var body;
            if (browserFamily == 'ie')
                body = iframe.document.body;
            else
                body = iframe.contentWindow.document.body;
            var n = self.div.cloneNode(true);
            n.style.position = '';
            if (expand) {
                n.style.width = '';
                n.style.height = '';
            }
            if (browserFamily == 'ie') {
                body.innerHTML = n.outerHTML;
                iframe.focus();
                iframe.print();
            }
            else {
                body.appendChild(n);
                iframe.contentWindow.print();
            }
        }
        if (browserFamily == 'ie')
            iframe.attachEvent('onload', _onload);
        else
            iframe.onload = _onload;
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
        if (idx > 0)
            ns = p.widgets[idx - 1];
    }
    return ns;
}

//events sub-system
QuiX.ui.Widget.prototype.supportedEvents = [
    'onmousedown', 'onmouseup', 'onmousemove', 'onmouseover', 'onmouseout',
    'onkeypress', 'onkeyup', 'onkeydown', 'onclick', 'ondblclick', 'onscroll'];

QuiX.ui.Widget.prototype.customEvents = ['onload', 'onunload',
    'onresize', 'ondrop'];

if (QuiX.utils.BrowserInfo.family != 'op')
    QuiX.ui.Widget.prototype.supportedEvents.push('oncontextmenu');
else
    QuiX.ui.Widget.prototype.customEvents.push('oncontextmenu');

QuiX.ui.Widget.prototype._registerHandler = function(evt_type, handler,
        isCustom) {
    var self = this;
    var chr = (this._isDisabled)?'*':'';
    if (!isCustom)
        this._registry[chr + evt_type] = function(evt) {
            return handler(evt || event, self);
        };
    else
        this._customRegistry[chr + evt_type] = handler;
}

QuiX.ui.Widget.prototype._buildEventRegistry = function(params) {
    var i, evt_type;
    this._registry = {};
    this._customRegistry = {};
    // register DOM events
    for (i=0; i<this.supportedEvents.length; i++) {
        evt_type = this.supportedEvents[i];
        if (params[evt_type])
            this._registerHandler(evt_type,
                QuiX.getEventListener(params[evt_type]), false);
    }
    //register custom events
    for (i=0; i<this.customEvents.length; i++) {
        evt_type = this.customEvents[i];
        if (params[evt_type])
            this._registerHandler(evt_type,
                QuiX.getEventListener(params[evt_type]), true);
    }
}

QuiX.ui.Widget.prototype._attachEvents = function() {
    for (var evt_type in this._registry) {
        if (evt_type.slice(0,1)!='_') {
            if (evt_type.slice(0,1)=='*')
                evt_type=evt_type.slice(1, evt_type.length);
            //restore events directly from registry
            this.attachEvent(evt_type, null);
        }
    }
    // opera oncontextmenu patch
    if (this.customEvents.hasItem('oncontextmenu')
        && this._customRegistry['*oncontextmenu']) {
        this.attachEvent('oncontextmenu', null);
    }
    //
}

QuiX.ui.Widget.prototype._detachEvents = function() {
    var first_char;
    for (var evt_type in this._registry) {
        first_char = evt_type.slice(0,1);
        if (first_char!='_' && first_char!='*')
            this.detachEvent(evt_type, '*');
    }
}

QuiX.ui.Widget.prototype._getHandler = function(eventType, f) {
    if (eventType == 'onmousemove' || eventType == 'onscroll')
        f = QuiX.wrappers.oneAtAtime(f);
    else
        f = QuiX.getEventListener(f);
    if (!f) { //restore from registry
        f = this._registry[eventType] ||
            this._registry['_' + eventType] ||
            this._registry['*' + eventType] ||
            this._customRegistry[eventType] ||
            this._customRegistry['_' + eventType] ||
            this._customRegistry['*' + eventType];
    }
    return f;
}

QuiX.ui.Widget.prototype.attachEvent = function(eventType, f) {
    var isCustom = this.customEvents.hasItem(eventType);
    var registry = (isCustom)?this._customRegistry:this._registry;
    // opera oncontextmenu patch
    if (eventType == 'onclick'
            && this.customEvents.hasItem('oncontextmenu')
            && this._getHandler('onclick_')) {
        eventType = 'onclick_';
        isCustom = true;
    }
    //
    f = this._getHandler(eventType, f);
    if (f) {
        if (!this._isDisabled && !isCustom)
            this.detachEvent(eventType);
        // opera oncontextmenu patch
        if (eventType == 'oncontextmenu'
                && isCustom
                && !this._getHandler('oncontextmenu')
                && !this._getHandler('onclick_')) {
            this._customRegistry.onclick_ = this._registry.onclick;
            this.attachEvent('onclick',
                function(evt, w) {
                    var r;
                    if (w._customRegistry.onclick_)
                        r = w._customRegistry.onclick(evt, w);
                    if (evt.ctrlKey && w._customRegistry.oncontextmenu)
                        w._customRegistry.oncontextmenu(evt, w);
                    return r;
                });
        }
        //
        if (f != registry[eventType])
            this._registerHandler(eventType, f, isCustom);
    }

    if (registry['_' + eventType])
        delete registry['_' + eventType];

    if (!this._isDisabled && registry['*' + eventType])
        delete registry['*' + eventType];

    if (!this._isDisabled && !isCustom)
        QuiX.addEvent(this.div, eventType, this._registry[eventType]);
}

QuiX.ui.Widget.prototype.detachEvent = function(eventType /*, chr*/) {
    var registry = null;
    var chr = arguments[1] || '_';
    // opera on contextmenu patch
    if (eventType == 'onclick'
            && this.customEvents.hasItem('oncontextmenu')
            && this._getHandler('onclick_')) {
        eventType = 'onclick_';
    }
    //
    if (this._registry[eventType]) {
        QuiX.removeEvent(this.div, eventType, this._registry[eventType]);
        registry = this._registry;
    }
    else if (this._customRegistry[eventType]) {
        registry = this._customRegistry;
    }
    if (registry) {
        registry[chr + eventType] = registry[eventType];
        delete registry[eventType];
    }
}

QuiX.ui.Widget.prototype._showTooltip = function(x, y) {
    var tooltip = new QuiX.ui.Label({
        left : x,
        top : y,
        caption : this.tooltip,
        border : 1,
        bgcolor : 'lightyellow',
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
        if (QuiX.dir == 'rtl')
            x1 = QuiX.transformX(x1);

        var availHeight = document.desktop.getHeight(true);
        var y1;
        if (evt.clientY + 30 > availHeight)
        	y1 = evt.clientY - 30;
        else
       		y1 = evt.clientY + 18;

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
    if (QuiX.getMouseButton(evt) == 0) {
        var x = evt.clientX;
        if (QuiX.dir == 'rtl')
            x = QuiX.transformX(x);
        var y = evt.clientY;
        var el = QuiX.getTarget(evt);
        document.desktop.attachEvent('onmouseup', QuiX.ui.Widget._enddrag);
        QuiX.dragTimer = window.setTimeout(
            function _draghandler() {
                w._startDrag(x, y, el)
            }, 200);
        QuiX.cancelDefault(evt);
        QuiX.stopPropag(evt);
        QuiX.cleanupOverlays();
        QuiX.dragging = true;
    }
}

QuiX.ui.Widget._drag = function(evt, desktop) {
    var x = evt.clientX + 2;
    if (QuiX.dir == 'rtl')
        x = QuiX.transformX(x)
    if (QuiX.tmpWidget)
        QuiX.tmpWidget.moveTo(x, evt.clientY + 2);
}

QuiX.ui.Widget._enddrag = function(evt, desktop) {
    if (QuiX.dragTimer != 0) {
        window.clearTimeout(QuiX.dragTimer);
        QuiX.dragTimer = 0;
    }
    desktop.detachEvent('onmouseup');
    QuiX.dragging = false;
    if (QuiX.dragable) {
        desktop.detachEvent('onmouseover');
        desktop.detachEvent('onmousemove');
        QuiX.tmpWidget.destroy();
        QuiX.tmpWidget = null;
        try {
            if (QuiX.dropTarget && QuiX.dropTarget._customRegistry['ondrop']) {
                QuiX.dropTarget._customRegistry['ondrop'](evt, QuiX.dropTarget,
                    QuiX.dragable);
            }
        }
        finally {
            QuiX.dropTarget = null;
            QuiX.dragable = null;
        }
    }
}

QuiX.ui.Widget._detectTarget = function(evt, desktop) {
    var w = QuiX.getTargetWidget(evt);
    while (w && !w.dropable)
        w = w.parent;
    if (w && w != QuiX.dragable && w != QuiX.dragable.parent) {
        QuiX.tmpWidget.div.style.borderColor = 'red';
        QuiX.dropTarget = w;
    }
    else {
        QuiX.tmpWidget.div.style.borderColor = 'transparent';
        QuiX.dropTarget = null;
    }
}

//Desktop class
QuiX.ui.Desktop = function(params, root) {
    QuiX.dir = params.dir || '';
    this.base = QuiX.ui.Widget;
    params.id = 'desktop';
    params.width = 'document.documentElement.clientWidth';
    params.height = 'document.documentElement.clientHeight';
    params.overflow = params.overflow  || 'hidden';
    params.onmousedown = QuiX.ui.Desktop._onmousedown;
    if (QuiX.utils.BrowserInfo.family != 'op')
        params.oncontextmenu = QuiX.ui.Desktop._oncontextmenu;
    this.base(params);
    if (QuiX.utils.BrowserInfo.family == 'ie') {
        this.setPosition();
        this.div.onselectstart = function() {
            return false
        };
    }
    this._setCommonProps();
    this.div.innerHTML =
        '<p align="right" style="color:#666666;margin:0px;">QuiX v' +
        QuiX.version + '</p>';
    root.appendChild(this.div);
    this.div.className = 'desktop';
    document.desktop = this;
    window.onresize = function() {
        if (QuiX.utils.BrowserInfo.family == 'ie') {
            var dw = document.desktop.getWidth(true);
            var dh = document.desktop.getHeight(true);
            if (dw != document.documentElement.clientWidth ||
                dh != document.documentElement.clientHeight) {
                document.desktop.redraw();
            }
        }
        else
            document.desktop.redraw();
    };
    this.overlays = [];
    this.parseFromString(QuiX.progress,
        function(loader){
            loader.div.style.zIndex = QuiX.maxz + 1;
            loader.hide();
            document.desktop._loader = loader;
        });
}

QuiX.constructors['desktop'] = QuiX.ui.Desktop;
QuiX.ui.Desktop.prototype = new QuiX.ui.Widget;
// backwards compatibility
var Desktop = QuiX.ui.Desktop;

QuiX.ui.Desktop.prototype.msgbox = function(mtitle, message, buttons, image,
        mleft, mtop /*, mwidth, mheight, container*/) {
    var sButtons = '';
    var handler;
    var oButton;
    var innHTML;
    var mwidth = arguments[6] || 240;
    var mheight = arguments[7] || 120;
    var container = arguments[8] || this;

    if (image) {
        QuiX.getImage(image);
        innHTML = '<td><img src="' + image + '"></img></td><td>' +
        message + '</td>';
    }
    else
        innHTML = '<td>' + message + '</td>';

    if (typeof buttons=='object') {
        for (var i=0; i<buttons.length; i++) {
            oButton = buttons[i];
            sButtons += '<dlgbutton width="' + oButton[1] +
            '" height="22" caption="' + oButton[0] + '"/>';
        }
    }
    else
        sButtons = '<dlgbutton onclick="__closeDialog__" caption="' +
        buttons + '" width="80" height="22"/>';

    container.parseFromString(
        '<dialog xmlns="http://www.innoscript.org/quix" ' +
        'title="' + mtitle + '" close="true" ' +
        'width="' + mwidth + '" height="' + mheight + '" left="' + mleft +
        '" top="' + mtop + '">' +
        '<wbody><xhtml><![CDATA[<table cellpadding="4"><tr>' + innHTML +
        '</tr></table>]]></xhtml></wbody>' + sButtons + '</dialog>',
        function(w) {
            //attach buttons click events
            if (typeof buttons=='object') {
                for (var i=0; i<buttons.length; i++) {
                    oButton = buttons[i];
                    handler = '__closeDialog__';
                    if (oButton.length > 2) handler = oButton[2];
                    w.buttons[i].attachEvent('onclick', handler);
                }
            }
        }
    );
}

QuiX.ui.Desktop._onmousedown = function(evt, w) {
    QuiX.cleanupOverlays();
    QuiX.cancelDefault(evt);
    return false;
}

QuiX.ui.Desktop._oncontextmenu = function(evt, w) {
    QuiX.cancelDefault(evt);
}
