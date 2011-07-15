/************************
Box layout
************************/

// box

QuiX.ui.Box = function(/*params*/) {
    var params = arguments[0] || {};
    params.overflow = params.overflow || 'hidden';

    QuiX.ui.Widget.call(this, params);

    this.div.className = 'box';
    this.orientation = params.orientation || 'h';
    var spacing = (typeof params.spacing == 'undefined')? 2:params.spacing;
    this.spacing = parseInt(spacing);
    this.childrenAlign = params.childrenalign || '';
    if (this.orientation == 'h') {
        this.div.style.whiteSpace = 'nowrap';
    }
}

QuiX.constructors['box'] = QuiX.ui.Box;
QuiX.ui.Box.prototype = new QuiX.ui.Widget;
QuiX.ui.Box.prototype.__class__ = QuiX.ui.Box;

QuiX.ui.Box._destroy = function() {
    var oBox = this.parent;
    var length_var = (oBox.orientation == 'h')? 'width':'height';

    var idx = oBox.widgets.indexOf(this);
    if (this[length_var] == QuiX.ui.Box._calcWidgetLength
            && oBox.widgets.length == 2) {
        if (idx == 0) {
            oBox.widgets[1][length_var] = '-1';
        }
        else {
            oBox.widgets[idx-1][length_var] = '-1';
        }
    }

    this.__class__.prototype.destroy.apply(this, arguments);
}

QuiX.ui.Box._getAvailableLength = function(memo) {
    var box = this.parent,
        length_var = (box.orientation == 'h')? 'width':'height';

    if (box[length_var] == null || box[length_var] == 'auto') {
        return 0;
    }

    var length_func = (box.orientation == 'h')? 'getWidth':'getHeight',
        l = box[length_func](false, memo);
        attrs = box._getFreeWidgets(memo);
        total_percent = (attrs[4] > 100)? attrs[4]:100,
        calc_percentage = ((100 / total_percent) * this._percentage / 100);

    return (l - attrs[1] - (attrs[2] - 1) * box.spacing) * calc_percentage;
}

QuiX.ui.Box.prototype._getFreeWidgets = function(memo) {
    var tl = 0,
        free_widgets = 0,
        perc_widgets = 0,
        total_percent = 0,
        vw = 0,
        length_var = (this.orientation == 'h')? 'width':'height',
        length_func = (this.orientation == 'h')? 'getWidth':'getHeight';

    this.widgets.each(
        function() {
            if (this.div.style.display == 'none') {
                return;
            }
            if (this[length_var] == QuiX.ui.Box._calcWidgetLength) {
                free_widgets += 1;
            }
            else if (this[length_var] && 
                     this[length_var] == QuiX.ui.Box._getAvailableLength) {
                perc_widgets += 1;
                total_percent += this._percentage;
            }
            else {
                tl += this[length_func](true, memo);
            }
            vw += 1;
        });

    return [free_widgets, tl, vw, perc_widgets, total_percent];
}

QuiX.ui.Box._calcWidgetLength = function(memo) {
    var box = this.parent,
        length_var = (box.orientation == 'h')? 'width':'height';

    if (box[length_var] == null || box[length_var] == 'auto') {
        return 0;
    }

    var tl = 0,
        free_widgets = 0,
        vw = 0,
        length_func = (box.orientation == 'h')? 'getWidth':'getHeight',
        l = box[length_func](false, memo);

    box.widgets.each(
        function() {
            if (this.div.style.display == 'none') {
                return;
            }
            if (this[length_var] == QuiX.ui.Box._calcWidgetLength) {
                free_widgets += 1;
            }
            else {
                tl += this[length_func](true, memo);
            }
            vw += 1;
        });

    var nl = (l - tl - ((vw - 1) * box.spacing)) / free_widgets;

    return nl>0? nl:0;
}

QuiX.ui.Box._getWidgetPos = function(memo) {
    var box = this.parent,
        boxalign =  this.boxAlign || box.childrenAlign,
        w1 = (box.orientation == 'h')?
            box._calcHeight(false, memo):box.getWidth(false, memo),
        w2 = (box.orientation == 'h')?
            this._calcHeight(true, memo):this.getWidth(true, memo);

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
    var w,
        tl = 0,
        box = this.parent,
        min_var = (box.orientation == 'h')? '_calcMinHeight':'_calcMinWidth';

    for (var i=0; i<box.widgets.length; i++) {
        w = box.widgets[i];
        if (w.isHidden()) {
            continue;
        }
        var min = w[min_var]();
        tl = Math.max(tl, min);
    }
    return tl;
}

QuiX.ui.Box.prototype.appendChild = function(w) {
    w.destroy = QuiX.ui.Box._destroy;
    w._i = this.widgets.length;
    this._setChildVars(w);
    QuiX.ui.Widget.prototype.appendChild.apply(this, arguments);
    w.div.style.zIndex = '';
    w._setCommonProps({});
}

QuiX.ui.Box.prototype._calcAuto = null;

QuiX.ui.Box.prototype._setChildVars = function(w /*, ffloat*/) {
    var center_var = (this.orientation == 'h')? 'top':'left',
        length_var = (this.orientation == 'h')? 'width':'height',
        width_var = (this.orientation == 'h')? 'height':'width',
        ffloat = arguments[1] || false;

    w.setPosition('relative');

    if (this.orientation == 'h') {
        var margin = 'margin' + ((QuiX.dir == 'rtl')?'Right':'Left');
        if (ffloat) {
            w.div.style[QuiX.utils.BrowserInfo.family == 'ie'?
                'styleFloat':'cssFloat'] = (QuiX.dir == 'rtl')?'right':'left';
        }
        else {
            var isIE7 = document.all && QuiX.utils.BrowserInfo.version < 8,
                display = isIE7? 'inline':'inline-block';

            if (w.isHidden()) {
                w._statedisplay = display;
            }
            else {
                w.setDisplay(display);
            }
            if (isIE7) {
                w.div.style.zoom = 1;
            }
            w.div.style.verticalAlign = 'top';
        }
        if (w._i > 0) {
            w.div.style[margin] = this.spacing + 'px';
        }
        else {
            w.div.style[margin] = '0px';
        }
        w.left = 0;
    }
    else {
        if (w._i > 0) {
            w.div.style.marginTop = this.spacing + 'px';
        }
        else {
            w.div.style.marginTop = '0px';
        }
        w.top = 0;
    }

    if (isNaN(parseInt(w[center_var]))) {
        if (w[center_var] == 'center') {
            w.boxAlign = 'center';
        }
        w[center_var] = QuiX.ui.Box._getWidgetPos;
    }
    else if (w[center_var] == 0 && this.childrenAlign) {
        w[center_var] = QuiX.ui.Box._getWidgetPos;
    }
    //else {
    //    w[center_var] = 0;
    //}

    if (typeof(w[length_var]) == 'undefined' || w[length_var] == '-1') {
        w[length_var] = QuiX.ui.Box._calcWidgetLength;
    }

    if (typeof(w[length_var]) == 'string' && w[length_var].indexOf('@') == 0 
            && w[length_var].match('%$')) {
        w._percentage = parseInt(w[length_var].slice(1));
        w[length_var] = QuiX.ui.Box._getAvailableLength;
    }

    if (w[width_var] == '-1') {
        w[width_var] = QuiX.ui.Box._calcWidgetMinSize;
    }
    else {
        w[width_var] = (typeof w[width_var] == 'undefined')? '100%':w[width_var];
    }
}

QuiX.ui.Box.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] | {},
        rds = this._rds;

    if (bForceAll) {
        for (var i=0; i<this.widgets.length; i++) {
            this.widgets[i]._i = i;
            this._setChildVars(this.widgets[i]);
        }
    }

    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

// horizontal box

QuiX.ui.HBox = function(/*params*/) {
    var params = arguments[0] || {};
    params.orientation = 'h';

    QuiX.ui.Box.call(this, params);
}
QuiX.constructors['hbox'] = QuiX.ui.HBox;
QuiX.ui.HBox.prototype = new QuiX.ui.Box;
QuiX.ui.HBox.prototype.__class__ = QuiX.ui.HBox;

// vertical box

QuiX.ui.VBox = function(/*params*/) {
    var params = arguments[0] || {};
    params.orientation = 'v';

    QuiX.ui.Box.call(this, params);
}
QuiX.constructors['vbox'] = QuiX.ui.VBox;
QuiX.ui.VBox.prototype = new QuiX.ui.Box;
QuiX.ui.VBox.prototype.__class__ = QuiX.ui.VBox;

// flow box

QuiX.ui.FlowBox = function(/*params*/) {
    var params = arguments[0] || {};
    params.spacing = params.spacing || 8;
    params.overflow = params.overflow || 'auto';

    QuiX.ui.HBox.call(this, params);
    this.div.className = 'flowbox';

    this.select = (params.select == true || params.select == 'true');
    this.multiple = (params.multiple == true || params.multiple == 'true');
    this._filter = null;
    this._appliedFilter = null;
    if (this.select) {
        if (this.multiple) {
            this._selection = [];
        }
        else {
            this._selection = null;
        }
    }
}

QuiX.constructors['flowbox'] = QuiX.ui.FlowBox;
QuiX.ui.FlowBox.prototype = new QuiX.ui.HBox;
QuiX.ui.FlowBox.prototype.__class__ = QuiX.ui.FlowBox;

QuiX.ui.FlowBox._destroy = function() {
    var fb = this.parent;
    if (this.parent.multiple) {
        if (fb._selection.hasItem(this)) {
            fb._selection.removeItem(this);
        }
    }
    else {
        if (fb._selection == this) {
            fb._selection = null;
        }
    }
    QuiX.ui.Box._destroy.apply(this, arguments);
}

QuiX.ui.FlowBox.prototype.clearSelection = function() {
    var selection = [];
    if (this.multiple) {
        selection = this._selection;
    }
    else if (this._selection) {
        selection = [this._selection];
    }
    for (var i=0; i<selection.length; i++) {
        selection[i].div.className = selection[i].div.className.replace(' selected', '');
    }
    if (this.multiple) {
        this._selection = [];
    }
    else {
        this._selection = null;
    }
}

QuiX.ui.FlowBox._selectItem = function(evt, w) {
    var fb = w.parent;

    if (!fb.multiple) {
        fb.clearSelection();
        fb._selection = w;
        w.div.className += ' selected';
    }
    else {
        if (evt.shiftKey) {
            var start,
                end = fb.widgets.indexOf(w);

            if (fb._selection.length == 0) {
                // first widget
                start = 0;
            }
            else {
                start = fb.widgets.indexOf(fb._selection[0]);
            }

            fb.clearSelection();
            for (var i=start; i!=end + ((start<end)? 1:-1); (start<end)? i++:i--) {
                if (!fb.widgets[i].isHidden()) {
                    fb.widgets[i].div.className += ' selected';
                    fb._selection.push(fb.widgets[i]);
                }
            }
        }
        else if (evt.ctrlKey) {
            if (fb._selection.hasItem(w)) {
                w.div.className = w.div.className.replace(' selected', '');
                fb._selection.removeItem(w);
            }
            else {
                w.div.className += ' selected';
                fb._selection.push(w);
            }
        }
        else {
            if (fb._selection.hasItem(w) && evt.type == 'mousedown') {
                // the widget is already selected
                w.attachEvent('onmouseup', QuiX.ui.FlowBox._selectItem);
            }
            else {
                fb.clearSelection();
                w.div.className += ' selected';
                fb._selection = [w];
                w.detachEvent('onmouseup', QuiX.ui.FlowBox._selectItem);
            }
        }
    }
}

QuiX.ui.FlowBox.prototype.appendChild = function(w) {
    var show = false;

    QuiX.ui.HBox.prototype.appendChild.apply(this, arguments);

    w.destroy = QuiX.ui.FlowBox._destroy;

    if (this.select) {
        w.attachEvent('onmousedown', QuiX.ui.FlowBox._selectItem);
    }

    if (!w.isHidden()) {
        w.hide();
        show = (this._filter)?
               QuiX.contains(w, this._filter):true;
    }

    if (show) {
        w.show();
        if (this._filter) {
            QuiX.highlight(w.div, this._filter);
        }
    }
}

QuiX.ui.FlowBox.prototype._setChildVars = function(w) {
    QuiX.ui.HBox.prototype._setChildVars.call(this, w, true);
    w.div.style['margin' +
        ((QuiX.dir == 'rtl')?'Right':'Left')] = '0px';
    w.div.style['margin' +
        ((QuiX.dir == 'rtl')?'Left':'Right')] = this.spacing + 'px';
    w.div.style.marginBottom = this.spacing + 'px';
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
    else {
        this._filter = null;
    }
}

QuiX.ui.FlowBox.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};

    QuiX.ui.HBox.prototype.redraw.apply(this, [bForceAll, memo]);

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
    if (this.select) {
        return this._selection;
    }
    else {
        return null;
    }
}

QuiX.ui.FlowBox.prototype._startDrag = function(x, y, el) {
    if (el == this.div) {
        return;
    }
    if (this._selection) {
        var selected,
            dragable,
            d;

        if (this.multiple) {
            selected = this._selection;
        }
        else {
            selected = [this._selection];
        }

        dragable = new QuiX.ui.Widget({
            width : 'auto',
            height : 'auto',
            border : 1,
            style : 'border:1px solid transparent'
        });
        with (dragable) {
            left = x + 2;
            top = y + 2;
        }

        for (var i=0; i<selected.length && i<3; i++) {
            d = QuiX.getDraggable(selected[i]);
            d.setBorderWidth(0);
            d.left = d.top = i * 8;
            d.setOpacity(.5);
            dragable.appendChild(d);
        }

        if (selected.length > 1) {
            dragable.appendChild(
                new QuiX.ui.Label({
                    width: 'auto',
                    height: 24,
                    top: 'center',
                    left: 'center',
                    padding: '4,4,4,4',
                    bgcolor: '#EDEDED',
                    color: '#666',
                    caption: selected.length + ' items'
                })
            );
        }

        document.desktop.appendChild(dragable);
        dragable.div.style.zIndex = QuiX.maxz;
        dragable.redraw(true);

        QuiX.tmpWidget = dragable;
        QuiX.dragable = this;

        document.desktop.attachEvent('onmousemove', QuiX.ui.Widget._drag);
    }
}
