/************************
Splitter
************************/

QuiX.ui.Splitter = function(/*params*/) {
    var params = arguments[0] || {};
    var spacing = parseInt(params.spacing) || 6;
    params.overflow = 'hidden';
    params.spacing = 0;
    this.base = QuiX.ui.Box;
    this.base(params);

    this._spacing = spacing;
    this.div.className = 'splitter';
    this.panes = [];
    this._handles = [];
    this.attachEvent('onresize', QuiX.ui.Splitter._onresize);
}

QuiX.constructors['splitter'] = QuiX.ui.Splitter;
QuiX.ui.Splitter.prototype = new QuiX.ui.Box;

QuiX.ui.Splitter.prototype.appendChild = function(w) {
    if (this.panes.length > 0) {
        this._addHandle();
    }
    QuiX.ui.Box.prototype.appendChild.apply(this, arguments);
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
    QuiX.ui.Box.prototype.appendChild.apply(this, [handle]);
    handle.redraw();
    this._handles.push(handle);
    handle.attachEvent('onmousedown', QuiX.ui.Splitter._onmousedown);
    handle.attachEvent('ondblclick', QuiX.ui.Splitter._ondblclick);
}

QuiX.ui.Splitter.prototype._handleMoving = function(evt, iHandle) {
    var length_var = (this.orientation == 'h')? 'width':'height',
        offset_var = (this.orientation == 'h')? 'X':'Y'
        coord_index = (this.orientation == 'h')? 0:1,
        pane1 = this.panes[iHandle],
        pane2 = this.panes[iHandle + 1];

    var offset = QuiX.getEventCoordinates(evt)[coord_index] -
                 QuiX['start' + offset_var];

    if (QuiX.dir == 'rtl' && this.orientation == 'h') {
        offset = -offset;
    }

    if (-offset < this._l1 && offset < this._l2) {
        var memo = {};

        if (this._w1 + offset < this._m1) {
            pane1[length_var] = this._m1;
            pane2[length_var] = (this._w1 + this._w2) - this._m1;
        }
        else if (this._w2 - offset < this._m2) {
            pane2[length_var] = this._m2;
            pane1[length_var] = (this._w1 + this._w2) - this._m2;
        }
        else {
            pane1[length_var] = this._w1 + offset;
            pane2[length_var] = this._w2 - offset;
        }
        pane1.redraw(false, memo);
        pane2.redraw(false, memo);
    }
}

QuiX.ui.Splitter.prototype._endMoveHandle = function(evt, iHandle) {
    this.detachEvent('onmouseup');
    this.detachEvent('onmousemove');
    this.div.style.cursor = '';
    //QuiX.attachFrames(this);
    QuiX.dragging = false;
}

QuiX.ui.Splitter._destroy = function() {
    var oSplitter = this.parent,
        length_var = (oSplitter.orientation == 'h')? 'width':'height',
        idx = oSplitter.panes.indexOf(this);

    if (this[length_var] == QuiX.ui.Box._calcWidgetLength &&
            oSplitter.panes.length > 1) {
        if (idx == 0) {
            oSplitter.panes[1][length_var] = '-1';
        }
        else {
            oSplitter.panes[idx - 1][length_var] = '-1';
        }
    }

    if (oSplitter.panes.length > 1) {
        if (idx == 0) {
            oSplitter._handles[0].destroy();
            oSplitter._handles.splice(0, 1);
        }
        else {
            oSplitter._handles[idx - 1].destroy();
            oSplitter._handles.splice(idx - 1, 1);
        }
    }

    if (this.base) {
        this.base.prototype.destroy.apply(this, arguments);
    }
    else {
        QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
    }

    oSplitter.panes.splice(idx, 1);
    oSplitter.redraw(true);
}

QuiX.ui.Splitter._onmousedown = function(evt, w) {
    if (!w._isCollapsed) {
        var splitter = w.parent;

        QuiX.dragging = true;
        //QuiX.detachFrames(splitter);

        var idx = splitter._handles.indexOf(w);

        // store panes initial state info
        var length_var = (splitter.orientation == 'h')? 'width':'height';
        var length_func = (splitter.orientation == 'h')? '_calcWidth':'_calcHeight';
        var min_length_var = (splitter.orientation == 'h')?
                             '_calcMinWidth':'_calcMinHeight';
        var memo = {};
        var pane1 = splitter.panes[idx];
        var pane2 = splitter.panes[idx + 1];
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
    var splitter = w.parent,
        length_var = (splitter.orientation == 'h')? 'width':'height',
        length_func = (splitter.orientation == 'h')? 'getWidth':'getHeight',
        min_func = (splitter.orientation == 'h')? '_calcMinWidth':'_calcMinHeight',
        idx = splitter._handles.indexOf(w),
        ns = 1,
        memo = {};

    if (splitter.panes[idx+1].attributes._collapse) {
        idx = idx + 1;
        ns = -1;
    }

    var pane = splitter.panes[idx],
        pane2 = splitter.panes[idx + ns];

    while (pane2.isHidden()) {
        ns += (ns>0)? 1:-1;
        pane2 = splitter.panes[idx + ns];
    }

    if (pane.isHidden()) {
        var targetLength;

        w._isCollapsed = false;
        w.div.style.cursor = (splitter.orientation == 'h')?
                             'e-resize':'n-resize';
        pane.show();
        targetLength = pane2[length_func](true, memo) - pane[length_func](true, memo);
        pane2[length_var] = Math.max(targetLength, pane2[min_func]());
        if (pane2[length_var] > targetLength) {
            var diff = pane2[length_var] - targetLength;
            splitter.panes.each(
                function() {
                    var length = this[length_func](true),
                        avail = length - this[min_func]();
                    if (avail > 0) {
                        this[length_var] = length - Math.min(avail, diff);
                        diff -= avail;
                        if (diff <= 0) {
                            return false;
                        }
                    }
                    return true;
                });
        }
    }
    else {
        w._isCollapsed = true;
        w.div.style.cursor = 'default';
        if (!pane2.isHidden()) {
            pane2[length_var] = pane[length_func](true, memo) +
                                pane2[length_func](true, memo);
        }
        pane.hide();
    }

    splitter.redraw();
}

QuiX.ui.Splitter._onresize = function(splitter, memo) {
    var length_var = (splitter.orientation == 'h')? 'width':'height',
        length_func = (splitter.orientation == 'h')? 'getWidth':'getHeight',
        min_func = (splitter.orientation == 'h')? '_calcMinWidth':'_calcMinHeight',
        nl = splitter[length_func](false, memo);

    var sum = 0;
    splitter.widgets.each(
        function() {
            if (!this.isHidden()) {
                sum += this[length_func](true, memo);
            }
        });

    if (Math.abs(sum - nl) > 1) {
        // we need to resize panes
        var space1 = nl - ((splitter.panes.length - 1) * splitter._spacing),
            space2 = sum - ((splitter.panes.length - 1) * splitter._spacing);

        splitter.panes.each(
            function(i) {
                if (!this.isHidden()) {
                    var nl = parseInt(Math.round(this[length_func](true, memo) * space1 / space2));
                    space2 -= this[length_func](true, memo);
                    this[length_var] = Math.max(nl, this[min_func]());
                    if (this[length_var] > nl && i == splitter.panes.length - 1) {
                        // the last cannot fit
                        var diff = this[length_var] - nl,
                            previousPane;

                        while (i > 0) {
                            previousPane = splitter.panes[--i];
                            if (previousPane[length_var] - diff >= previousPane[min_func]()) {
                                previousPane[length_var] -= diff;
                                break;
                            }
                        }
                    }
                    space1 -= this[length_var];
                }
            });

        splitter.redraw();
    }
}
