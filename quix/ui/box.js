/************************
Box layout
************************/

// box

QuiX.ui.Box = function(/*params*/) {
    var params = arguments[0] || {};
    params.overflow = params.overflow || 'hidden';
    this.base = QuiX.ui.Widget;
    this.base(params);
    this.div.className = 'box';
    this.orientation = params.orientation || 'h';
    var spacing = (typeof params.spacing == 'undefined')? 2:params.spacing;
    this.spacing = parseInt(spacing);
    this.childrenAlign = params.childrenalign;
}

QuiX.constructors['box'] = QuiX.ui.Box;
QuiX.ui.Box.prototype = new QuiX.ui.Widget;

QuiX.ui.Box._destroy = function() {
    var oBox = this.parent;
    var length_var = (oBox.orientation == 'h')? 'width':'height';

    var idx = oBox.widgets.indexOf(this);
    if (this[length_var] == QuiX.ui.Box._calcWidgetLength
            && oBox.widgets.length == 2) {
        if (idx == 0)
            oBox.widgets[1][length_var] = '-1';
        else
            oBox.widgets[idx-1][length_var] = '-1';
    }
    if (this.base)
        this.base.prototype.destroy.apply(this, arguments);
    else
        QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
}

QuiX.ui.Box._calcWidgetLength = function(memo) {
    var box = this.parent;
    var tl = 0;
    var free_widgets = 0, vw = 0;
    var length_var = (box.orientation == 'h')? 'width':'height';
    var length_func = (box.orientation == 'h')? '_calcWidth':'_calcHeight';

    for (var i=0; i<box.widgets.length; i++) {
        if (box.widgets[i].isHidden())
            continue;
        if (box.widgets[i][length_var] == QuiX.ui.Box._calcWidgetLength) {
            free_widgets += 1;
        }
        else {
            tl += box.widgets[i][length_func](true, memo);
        }
        vw += 1;
    }
    var l = (box.orientation == 'h')?
        box._calcWidth(false, memo):box._calcHeight(false, memo);

    var nl = (l - tl - ((vw - 1) * box.spacing)) / free_widgets;

    return nl>0? nl:0;
}

QuiX.ui.Box._getWidgetOffset = function(memo) {
    var iPane = this._i;
    var offset = 0;
    var box = this.parent;

    if (iPane > 0) {
        iPane--;
        var ow = box.widgets[iPane];
        while (ow.isHidden()) {
            if (iPane == 0)
                return 0;
            else {
                iPane--;
                ow = box.widgets[iPane];
            }
        }
        if (box.orientation == 'h')
            offset = ow._calcLeft(memo) + ow._calcWidth(true, memo) +
                box.spacing - box.getPadding()[0];
        else
            offset = ow._calcTop(memo) + ow._calcHeight(true, memo) +
                box.spacing - box.getPadding()[2];
    }
    return offset;
}

QuiX.ui.Box._getWidgetPos = function(memo) {
    var box = this.parent;
    var boxalign =  this.boxAlign || box.childrenAlign;
    var w1 = (box.orientation == 'h')?
        box._calcHeight(false, memo):box._calcWidth(false, memo);
    var w2 = (box.orientation == 'h')?
        this._calcHeight(true, memo):this._calcWidth(true, memo);

    switch (boxalign) {
        case 'center':
            return (w1 - w2) / 2;
        case 'right':
        case 'bottom':
            return (w1 - w2);
        default: 	
            return 0;
    }
}

QuiX.ui.Box._calcWidgetMinSize = function() {
    var w;
    var tl = 0;
    var box = this.parent;
    var min_var = (box.orientation == 'h')? '_calcMinHeight':'_calcMinWidth';

    for (var i=0; i<box.widgets.length; i++) {
        w = box.widgets[i];
        if (w.isHidden())
            continue;
        var min = w[min_var]();
        tl = Math.max(tl,min);
    }
    return tl;
}

QuiX.ui.Box.prototype.appendChild = function(w) {
    var offset_var;
    w.destroy = QuiX.ui.Box._destroy;
    w._i = this.widgets.length;
    this._setChildVars(w);
    QuiX.ui.Widget.prototype.appendChild.apply(this, arguments);
}

QuiX.ui.Box.prototype._setChildVars = function(w) {
    var offset_var = (this.orientation == 'h')? 'left':'top',
        center_var = (this.orientation == 'h')? 'top':'left',
        length_var = (this.orientation == 'h')? 'width':'height',
        width_var = (this.orientation == 'h')? 'height':'width';

    w[offset_var] = QuiX.ui.Box._getWidgetOffset;

    if (w[center_var] == 'center') {
        w.boxAlign = 'center';
    }
    w[center_var] = QuiX.ui.Box._getWidgetPos;

    if (w[length_var] == null || w[length_var] == '-1') {
        w[length_var] = QuiX.ui.Box._calcWidgetLength;
    }

    if (w[width_var] == '-1') {
        w[width_var] = QuiX.ui.Box._calcWidgetMinSize;
    }
    else {
        w[width_var] = w[width_var] || '100%';
    }
}

QuiX.ui.Box.prototype.redraw = function(bForceAll /*, memo*/) {
    if (bForceAll) {
        var w;
        for (var i=0; i<this.widgets.length; i++) {
            w = this.widgets[i];
            w._i = i;
            this._setChildVars(w);
        }
    }
    return QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
}

QuiX.ui.Box.prototype._calcSize = function(height, offset, getHeight, memo) {
    if (this[height] == 'auto' &&
            (!memo || (memo && !memo[this._uniqueid + height]))) {
        // auto sized box
        var length_func = (height == 'height')? '_calcHeight':'_calcWidth',
            padding_offset = (height == 'height')? 2:0,
            padding = this.getPadding(),
            is_additive = this.orientation == 'h' && height == 'width' ||
                          this.orientation == 'v' && height == 'height',
            value = 0,
            w_length;

        if (is_additive) {
            if (this.widgets.length > 0) {
                var offset_func = (height == 'height') ? '_calcTop' : '_calcLeft';
                var last = this.widgets[this.widgets.length - 1];
                value = last[offset_func](memo) + last[length_func](true, memo);
            }
            else {
                value = 0;
            }
            value = value +
                    padding[padding_offset + 1] +
                    2 * this.getBorderWidth();
        }
        else {
            for (var i=0; i<this.widgets.length; i++) {
                w_length = this.widgets[i][length_func](true, memo);
                value = Math.max(value, w_length);
            }
            value = value +
                    padding[padding_offset] +
                    padding[padding_offset + 1] +
                    2 * this.getBorderWidth();
        }
        if (typeof memo != 'undefined') {
            memo[this._uniqueid + height] = value;
        }
        return value - offset;
    }
    else {
        return QuiX.ui.Widget.prototype._calcSize.apply(this, arguments);
    }
}

// horizontal box

QuiX.ui.HBox = function(/*params*/) {
    var params = arguments[0] || {};
    params.orientation = 'h';
    this.base = QuiX.ui.Box;
    this.base(params);
}
QuiX.constructors['hbox'] = QuiX.ui.HBox;
QuiX.ui.HBox.prototype = new QuiX.ui.Box;

// vertical box

QuiX.ui.VBox = function(/*params*/) {
    var params = arguments[0] || {};
    params.orientation = 'v';
    this.base = QuiX.ui.Box;
    this.base(params);
}
QuiX.constructors['vbox'] = QuiX.ui.VBox;
QuiX.ui.VBox.prototype = new QuiX.ui.Box;

// flow box

QuiX.ui.FlowBox = function(/*params*/) {
    var params = arguments[0] || {};
    params.overflow = params.overflow || 'auto';
    this.base = QuiX.ui.Widget;
    this.base(params);
    this.div.className = 'flowbox';
    var iSpacing = params.spacing || 8;
    this.spacing = parseInt(iSpacing);
    this.select = (params.select == true || params.select == 'true');
    this.multiple = (params.multiple == true || params.multiple == 'true');
    this._filter = null;
    this._appliedFilter = null;
    if (this.select)
        if (this.multiple)
            this._selection = [];
        else
            this._selection = null;
}

QuiX.constructors['flowbox'] = QuiX.ui.FlowBox;
QuiX.ui.FlowBox.prototype = new QuiX.ui.Widget;

QuiX.ui.FlowBox._destroy = function() {
    var fb = this.parent;
    if (this.parent.multiple) {
        if (fb._selection.hasItem(this))
            fb._selection.removeItem(this);
    }
    else {
        if (fb._selection == this)
            fb._selection = null;
    }
    var i = fb.widgets.indexOf(this);
    if (this.base)
        this.base.prototype.destroy.apply(this, arguments);
    else
        QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
    if (i < fb.widgets.length)
        fb._rearrange(i);
}

QuiX.ui.FlowBox._selectItem = function(evt ,w) {
    var fb = w.parent;

    function _unselectWidget(w) {
        var tok = w.div.className.split(' ');
        tok.pop();
        w.div.className = tok.join(' ');
    }

    if (!fb.multiple) {
        if (fb._selection)
            _unselectWidget(fb._selection)
        fb._selection = w;
    }
    else {
        if (!evt.shiftKey) {
            for (var i=0; i<fb._selection.length; i++)
                _unselectWidget(fb._selection[i]);
            fb._selection = [];
        }
        if (fb._selection.hasItem(w)) {
            fb._selection.removeItem(w);
            _unselectWidget(w);
            return;
        }
        else
            fb._selection.push(w);
    }
    w.div.className += ' selected';
}

QuiX.ui.FlowBox.prototype.appendChild = function(w) {
    var show = false;
    w.destroy = QuiX.ui.FlowBox._destroy;
    if (this.select) {
        w.attachEvent(
            'onmousedown',
            QuiX.wrappers.eventWrapper(QuiX.ui.FlowBox._selectItem,
                                       w._getHandler('onmousedown')));
    }
    w._setCommonProps();
    if (!w.isHidden()) {
        w.hide();
        show = (this._filter)?
               QuiX.contains(w, this._filter):true;
    }
    QuiX.ui.Widget.prototype.appendChild.apply(this, arguments);
    this._rearrange(this.widgets.length - 1);
    if (show) {
        w.show();
        if (this._filter)
            QuiX.highlight(w.div, this._filter);
    }
}

QuiX.ui.FlowBox.prototype.setFilter = function(filter) {
    var words = filter.split(' ');
    var re_filter = '';

    for (var i=0; i<words.length; i++) {
        if (words[i] != '') {
            re_filter += words[i] + '|';
        }
    }
    if (re_filter != '') {
        re_filter = re_filter.slice(0, re_filter.length - 1);
        this._filter = '(' + re_filter + ')';
    }
    else
        this._filter = null;
}

QuiX.ui.FlowBox.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
    this._rearrange(0, memo);
    if (this._appliedFilter != this._filter) {
        if (this._filter != null) {
            QuiX.highlight(this.div, this._filter);
        }
        else {
            QuiX.removeHighlight(this.div);
        }
        this._appliedFilter = this._filter;
    }
}

QuiX.ui.FlowBox.prototype.getSelection = function() {
    if (this.select)
        return this._selection;
    else
        return null;
}

QuiX.ui.FlowBox.prototype._rearrange = function(iStart /*, memo*/) {
    var x = 0,
        y = 0,
        rowHeight = 0,
        icWidth,
        icHeight,
        last,
        memo = arguments[1] || {},
        iWidth = this._calcWidth(false, memo);

    if (iStart > 0) {
        last = this.widgets[iStart - 1];
        while (last && last.isHidden()) {
            last = last.previousSibling();
        }
        if (last) {
            x = last._calcLeft(memo) +
                last._calcWidth(true, memo);
            y = last.top;
            rowHeight = this._calcRowHeight(iStart, memo);
        }
    }

    for (var i=iStart; i<this.widgets.length; i++) {
        if (this._filter && !QuiX.contains(this.widgets[i], this._filter)) {
            this.widgets[i].hide();
            continue;
        }
        else {
            this.widgets[i].show();
        }
        with (this.widgets[i]) {
            icWidth = _calcWidth(true, memo);
            icHeight = _calcHeight(true, memo)
            if (x + icWidth + this.spacing > iWidth - QuiX._scrollbarSize
                    && x != 0) {
                x = 0;
                y += rowHeight + this.spacing;
                rowHeight = 0;
            }
            moveTo(x, y);
            x += icWidth + this.spacing;
            rowHeight = Math.max(rowHeight, icHeight);
        }
    }
}

QuiX.ui.FlowBox.prototype._calcRowHeight = function(iStart, memo) {
    var rowHeight = 0;
    var iCount = iStart - 1;
    var prev;
    do {
        prev = this.widgets[iCount];
        rowHeight = Math.max(rowHeight, prev._calcHeight(true, memo));
        iCount -= 1;
    } while (iCount >= 0 && prev.left != 0)
    return rowHeight;
}
