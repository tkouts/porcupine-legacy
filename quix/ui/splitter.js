/************************
Splitter
************************/

QuiX.ui.Splitter = function(/*params*/) {
    var params = arguments[0] || {};
    var spacing = parseInt(params.spacing) || 6;
    params.overflow = 'hidden';
    params.spacing = 0;
    params.onresize = QuiX.ui.Splitter._onresize;
    this.base = QuiX.ui.Box;
    this.base(params);

    this._spacing = spacing;
    this.div.className = 'splitter';
    this.panes = [];
    this._handles = [];
}

QuiX.constructors['splitter'] = QuiX.ui.Splitter;
QuiX.ui.Splitter.prototype = new QuiX.ui.Box;

QuiX.ui.Splitter.prototype.appendChild = function(w) {
    if (this.panes.length > 0) {
        this._addHandle();
    }
    QuiX.ui.Box.prototype.appendChild(w, this);
    w.destroy = QuiX.ui.Splitter._destroy;
    this.panes.push(w);
}

QuiX.ui.Splitter.prototype._addHandle = function() {
    var handle = QuiX.theme.splitter.separator.get(this.orientation,
                                                   this._spacing);
    if (this.orientation == 'h') {
        handle.div.style.cursor = 'e-resize';
        handle.div.className = 'handleV';
    }
    else {
        handle.div.style.cursor = 'n-resize';
        handle.div.className = 'handleH';
    }
    QuiX.ui.Box.prototype.appendChild(handle, this);
    handle.redraw();
    this._handles.push(handle);
    handle.attachEvent('onmousedown', QuiX.ui.Splitter._onmousedown);
    handle.attachEvent('ondblclick', QuiX.ui.Splitter._ondblclick);
}

QuiX.ui.Splitter.prototype._handleMoving = function(evt, iHandle) {
    var length_var = (this.orientation == 'h')? 'width':'height';
    var offset_var = (this.orientation == 'h')? 'X':'Y';

    var offset = evt['client' + offset_var] - QuiX['start' + offset_var];

    if (QuiX.dir == 'rtl' && this.orientation == 'h')
        offset = -offset;

    var	pane1 = this.panes[iHandle];
    var	pane2 = this.panes[iHandle + 1];

    if (-offset < this._l1 && offset < this._l2) {
        var fc = this._getFillersCount();
        if (!this._f1 || (this._f1 && this._f2) || fc > 1)
            pane1[length_var] = Math.max(this._w1 + offset, this._m1);
        if (!this._f2 || (fc > 1 && !(this._f1 && this._f2)))
            pane2[length_var] = Math.max(this._w2 - offset, this._m2);
        this.redraw();
    }
}

QuiX.ui.Splitter.prototype._endMoveHandle = function(evt, iHandle) {
    this.detachEvent('onmouseup');
    this.detachEvent('onmousemove');
    this.div.style.cursor = '';
    QuiX.attachFrames(this);
    QuiX.dragging = false;
}

QuiX.ui.Splitter.prototype._getFillersCount = function() {
    var c = 0;
    var length_var = (this.orientation == 'h')?'width':'height';
    for (var i=0; i< this.panes.length; i++) {
        if (this.panes[i][length_var] == QuiX.ui.Box._calcWidgetLength
                && !this.panes[i].isHidden())
            c += 1;
    }
    return c;
}

QuiX.ui.Splitter._destroy = function() {
    var oSplitter = this.parent;
    var length_var = (oSplitter.orientation == 'h')?'width':'height';
    var idx = oSplitter.panes.indexOf(this);
    if (this[length_var] == QuiX.ui.Box._calcWidgetLength &&
            oSplitter.panes.length > 1) {
        if (idx == 0)
            oSplitter.panes[1][length_var] = '-1';
        else
            oSplitter.panes[idx-1][length_var] = '-1';
    }
    if (oSplitter.panes.length > 1) {
        if (idx == 0) {
            oSplitter._handles[0].destroy();
            oSplitter._handles.splice(0, 1);			
        }
        else {
            oSplitter._handles[idx-1].destroy();
            oSplitter._handles.splice(idx-1, 1);
        }
    }
    if (this.base)
        this.base.prototype.destroy.apply(this, arguments);
    else
        QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
    oSplitter.panes.splice(idx, 1);
    oSplitter.redraw(true);
}

QuiX.ui.Splitter._onmousedown = function(evt, w) {
    if (!w._isCollapsed) {
        var splitter = w.parent;
        QuiX.startX = evt.clientX;
        QuiX.startY = evt.clientY;
        QuiX.cancelDefault(evt);
        QuiX.dragging = true;
        QuiX.detachFrames(splitter);

        var idx = splitter._handles.indexOf(w);
        // store panes initial state info
        var length_var = (splitter.orientation == 'h')? 'width':'height';
        var length_func = (splitter.orientation == 'h')? '_calcWidth':'_calcHeight';
        var min_length_var = (splitter.orientation == 'h')?
                             '_calcMinWidth':'_calcMinHeight';
        var memo = {};
        var	pane1 = splitter.panes[idx];
        var	pane2 = splitter.panes[idx + 1];
        splitter._w1 = pane1[length_func](true, memo);
        splitter._w2 = pane2[length_func](true, memo);
        splitter._l1 = pane1[length_func](false, memo);
        splitter._l2 = pane2[length_func](false, memo);
        splitter._m1 = pane1[min_length_var]();
        splitter._m2 = pane2[min_length_var]();
        splitter._f1 = (pane1[length_var] == QuiX.ui.Box._calcWidgetLength);
        splitter._f2 = (pane2[length_var] == QuiX.ui.Box._calcWidgetLength);

        splitter.attachEvent('onmouseup',
            function(evt, w){w._endMoveHandle(evt, idx)});
        splitter.attachEvent('onmousemove',
            function(evt, w){w._handleMoving(evt, idx)});
        splitter.div.style.cursor = (w.parent.orientation == "h")?
                                    'e-resize':'n-resize';
    }
}

QuiX.ui.Splitter._ondblclick = function(evt, w) {
    var splitter = w.parent;
    var length_var = (splitter.orientation == 'h')? 'width':'height';
    var length_func = (splitter.orientation == 'h')? 'getWidth':'getHeight';
    var idx = splitter._handles.indexOf(w);
    var ns = 1;
    if (splitter.panes[idx+1].attributes._collapse) {
        idx = idx + 1;
        ns = -1;
    }
    var pane = splitter.panes[idx];
    var pane2 = splitter.panes[idx + ns];
    
    while (pane2.isHidden()) {
        ns += (ns>0)?1:-1;
        pane2 = splitter.panes[idx + ns];
    }
    
    if (pane.isHidden()) {
        w._isCollapsed = false;
        w.div.style.cursor = (splitter.orientation == "h")?
                             'e-resize':'n-resize';
        if (pane2._statelength) {
            pane2[length_var] = pane2._statelength;
            pane2._statelength = null;
        }
        if (splitter._getFillersCount() == 0)
            pane[length_var] = QuiX.ui.Box._calcWidgetLength;
        pane.show();
    }
    else {
        w._isCollapsed = true;
        w.div.style.cursor = 'default';
        pane.hide();
        var fc = splitter._getFillersCount();
        var islastfree = (fc == 1 &&
                          pane2[length_var] == QuiX.ui.Box._calcWidgetLength);
        if (!pane2.isHidden()) {
            if (!pane2._statelength && !islastfree)
                pane2._statelength = pane2[length_func](true);
            if (fc == 0) {
                pane2[length_var] = QuiX.ui.Box._calcWidgetLength;
            }
            else if (!islastfree) {
                pane2[length_var] = pane[length_func](true) +
                                    pane2[length_func](true);
            }
        }
    }
    splitter.redraw();
}

QuiX.ui.Splitter._onresize = function(splitter, w, h) {
    var length_var = (splitter.orientation == 'h')? 'width':'height';
    var ol = (splitter.orientation == 'h')? w:h;
    var nl = parseInt(splitter.div.style[length_var]);
    var pane;
    var perc = nl / ol;
    for (var i=0; i<splitter.panes.length; i++) {
        pane = splitter.panes[i];
        if (pane._statelength) {
            pane._statelength = Math.round(perc * pane._statelength);
        }
        if (typeof pane[length_var] != 'string' &&
                typeof pane[length_var] != 'function') {
            pane[length_var] = Math.round(perc * pane[length_var]);
        }
    }
    splitter.redraw();
}
