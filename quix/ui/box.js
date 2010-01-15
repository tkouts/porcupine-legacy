/************************
Box layout
************************/

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
// backwards compatibility
var Box = QuiX.ui.Box;

QuiX.ui.Box.prototype.free_length = 'this.parent._calcWidgetLength(memo)';

QuiX.ui.Box.prototype.appendChild = function(w /*, p*/) {
	var p = arguments[1] || this;
	w.destroy = BoxWidget__destroy;
	if (p.orientation == 'h')
		w.height = w.height || '100%';
	else
		w.width = w.width || '100%';
	QuiX.ui.Widget.prototype.appendChild(w, p);
}

QuiX.ui.Box.prototype.redraw = function(bForceAll /*, memo*/) {
	if (bForceAll) {
		var oWidget;
		var offset_var = (this.orientation=='h')?'left':'top';
		var center_var = (this.orientation=='h')?'top':'left';
		var length_var = (this.orientation=='h')?'width':'height';
		var width_var = (this.orientation=='h')?'height':'width';
		for (var i=0; i<this.widgets.length; i++) {
			oWidget = this.widgets[i];
			oWidget[offset_var] = 'this.parent._getWidgetOffset(' + i + ', memo)';
			oWidget[center_var] = 'this.parent._getWidgetPos(' + i + ', memo)';

			if (oWidget[length_var] == null || oWidget[length_var] == '-1')
				oWidget[length_var] = this.free_length;
			if (oWidget[width_var] == '-1')
				oWidget[width_var] = 'this.parent._calcWidgetWidth()';
		}
	}
	return QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
}

QuiX.ui.Box.prototype._calcSize = function(height, offset, getHeight, memo) {
    if (this[height] == 'auto' &&
            (!memo || (memo && !memo[this._uniqueid + height]))) {
        var value = 0,
            w_length;
        var is_additive = this.orientation == 'h' && height == 'width' ||
                          this.orientation == 'v' && height == 'height';
        var padding_offset = (height == 'height')?2:0;
        var padding = this.getPadding();
        var length_func = (height=='height')?'_calcHeight':'_calcWidth';
        for (var i=0; i<this.widgets.length; i++) {
            w_length = this.widgets[i][length_func](true, memo);
            if (is_additive)
                value += w_length;
            else
                value = Math.max(value, w_length);
        }
        if (is_additive && this.widgets.length > 0)
            value += (this.widgets.length - 1) * this.spacing;
        value = value +
                padding[padding_offset] +
                padding[padding_offset + 1] +
                2 * this.getBorderWidth();
        if (typeof memo != 'undefined')
            memo[this._uniqueid + height] = value;
        return value - offset;
    }
    else
        return Widget.prototype._calcSize.apply(this, arguments);
}

QuiX.ui.Box.prototype._getWidgetPos = function(iPane, memo) {
	var oWidget = this.widgets[iPane];
	var boxalign =  oWidget.boxAlign || this.childrenAlign;
	var w1 = (this.orientation=='h')?
        this.getHeight(false, memo):this.getWidth(false, memo);
	var w2 = (this.orientation=='h')?
        oWidget.getHeight(true, memo):oWidget.getWidth(true, memo);
	switch (boxalign) {
		case 'center':
			return (w1 - w2)/2;
		case 'right':
		case 'bottom':
			return (w1 - w2);
		default: 	
			return 0;
	}
}

QuiX.ui.Box.prototype._getWidgetOffset = function(iPane, memo) {
    var offset = 0;
    if (iPane > 0) {
        iPane--;
        var ow = this.widgets[iPane];
        while (ow.isHidden()) {
            if (iPane == 0)
                return 0;
            else {
                iPane--;
                ow = this.widgets[iPane];
            }
        }
		if (this.orientation == 'h')
			offset = ow._calcLeft(memo) + ow._calcWidth(true, memo) +
                this.spacing - this.getPadding()[0];
		else
			offset = ow._calcTop(memo) + ow._calcHeight(true, memo) +
                this.spacing - this.getPadding()[2];
    }
    return offset;
}

QuiX.ui.Box.prototype._calcWidgetLength = function(memo) {
	var tl = 0;
	var free_widgets = 0;
	var length_var = (this.orientation=='h')?'width':'height';
	
	for (var i=0; i<this.widgets.length; i++) {
		if (this.widgets[i].isHidden()) continue;
		if (this.widgets[i][length_var] != this.free_length) {
			if (this.orientation=='h')
				tl += this.widgets[i]._calcWidth(true, memo);
			else
				tl += this.widgets[i]._calcHeight(true, memo);
		}
		else
			free_widgets += 1;
	}
	var l = (this.orientation=='h')?
        this.getWidth(false, memo):this.getHeight(false, memo);
	
	var nl = (l - tl - ((this.widgets.length-1)*this.spacing)) / free_widgets;
	return(nl>0?nl:0);
}

QuiX.ui.Box.prototype._calcWidgetWidth = function() {
	var w;
	var tl = 0;
	var min_var = (this.orientation=='h')?'_calcMinHeight':'_calcMinWidth';
	
	for (var i=0; i<this.widgets.length; i++) {
		w = this.widgets[i];
		if (w.isHidden()) continue;
		var min = w[min_var]();
		tl = Math.max(tl,min);
	}
	return tl;
}

function BoxWidget__destroy() {
	var oBox = this.parent;
	var length_var = (oBox.orientation=='h')?'width':'height';
	
	var idx = oBox.widgets.indexOf(this);
	if (this[length_var] == this.free_length && oBox.widgets.length == 2) {
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

QuiX.ui.HBox = function(/*params*/) {
	var params = arguments[0] || {};
	params.orientation = 'h';
	this.base = QuiX.ui.Box;
	this.base(params);
}
QuiX.constructors['hbox'] = QuiX.ui.HBox;
QuiX.ui.HBox.prototype = new QuiX.ui.Box;

QuiX.ui.VBox = function(/*params*/) {
	var params = arguments[0] || {};
	params.orientation = 'v';
	this.base = QuiX.ui.Box;
	this.base(params);
}
QuiX.constructors['vbox'] = QuiX.ui.VBox;
QuiX.ui.VBox.prototype = new QuiX.ui.Box;

QuiX.ui.FlowBox = function(/*params*/) {
	var params = arguments[0] || {};
	params.overflow = params.overflow || 'auto';
	this.base = QuiX.ui.Widget;
	this.base(params);
	this.div.className = 'flowbox';
	var iSpacing = params.spacing || 8;
	this.spacing = parseInt(iSpacing);
	this.select = (params.select == true || params.select == 'true')?
					true:false;
	this.multiple = (params.multiple == true || params.multiple == 'true')?
					true:false;
	if (this.select)
		if (this.multiple)
			this._selection = [];
		else
			this._selection = null;
}

QuiX.constructors['flowbox'] = QuiX.ui.FlowBox;
QuiX.ui.FlowBox.prototype = new QuiX.ui.Widget;
// backwards compatibility
var FlowBox = QuiX.ui.FlowBox;

QuiX.ui.FlowBox.prototype.appendChild = function(w) {
	var show = false;
	w.destroy = FlowBoxWidget__destroy;
	if (this.select) {
		w.attachEvent('onmousedown',
                      QuiX.wrappers.eventWrapper(FlowBox__selectItem,
                                                 w._getHandler('onmousedown')));
	}
	w._setCommonProps();
	if (!w.isHidden()) {
		w.hide();
		show = true;
	}
	QuiX.ui.Widget.prototype.appendChild(w, this);
	this._rearrange(this.widgets.length - 1);
	if (show)
		w.show();
}

QuiX.ui.FlowBox.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
	QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
	this._rearrange(0, memo);
}

QuiX.ui.FlowBox.prototype.getSelection = function() {
	if (this.select)
		return this._selection;
    else
        return null;
}

QuiX.ui.FlowBox.prototype._rearrange = function(iStart, memo) {
	var x = 0;
	var y = 0;
	var rowHeight = 0;
	var icWidth;
    memo = memo || {};
	var iWidth = this.getWidth(false, memo);
	
	if (iStart > 0) {
		x = this.widgets[iStart - 1]._calcLeft(memo) +
			this.widgets[iStart-1]._calcWidth(true, memo);
		y = this.widgets[iStart - 1].top;
		rowHeight = this._calcRowHeight(iStart, memo);
	}
	
	for (var i=iStart; i<this.widgets.length; i++) {
		with (this.widgets[i]) {
			icWidth = _calcWidth(true, memo);
			if (x + icWidth + this.spacing > iWidth && x != 0) {
				x = 0;
				y += rowHeight + this.spacing;
				rowHeight = 0;
			}
			moveTo(x, y);
			x += icWidth + this.spacing;
			rowHeight = Math.max(rowHeight, _calcHeight(true));
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

function FlowBoxWidget__destroy() {
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

function FlowBox__selectItem(evt ,w) {
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
			var s, tok;
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
