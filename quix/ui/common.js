// horizontal rule

QuiX.ui.HR = function(/*params*/) {
    var params = arguments[0] || {};
    params.border = params.border || 1;
    params.height = params.height || 2;
    params.overflow = 'hidden';

    QuiX.ui.Widget.call(this, params);

    this.div.className = 'separator';
}

QuiX.constructors['hr'] = QuiX.ui.HR;
QuiX.ui.HR.prototype = new QuiX.ui.Widget;
QuiX.ui.HR.prototype.__class__ = QuiX.ui.HR;

// iframe

QuiX.ui.IFrame = function(/*params*/) {
    var params = arguments[0] || {};
    params.overflow = params.overflow || 'visible';

    QuiX.ui.Widget.call(this, params);

    this.div.className = 'ifrm';
    this.frame = ce("IFRAME");
    this.frame.frameBorder = 0;
    this.frame.scrolling = params.scrolling || 'auto';
    this.frame.name = params.name || '';
    this.frame.allowTransparency = true;
    QuiX.addEvent(this.frame, 'onload', QuiX.ui.IFrame.prototype._onload);
    this.frame.style.width = "100%";
    this.frame.style.height = "100%";
    this.setSource(params.src);
    this.div.appendChild(this.frame);
}

QuiX.constructors['iframe'] = QuiX.ui.IFrame;
QuiX.ui.IFrame.prototype = new QuiX.ui.Widget;
QuiX.ui.IFrame.prototype.__class__ = QuiX.ui.IFrame;
QuiX.ui.IFrame.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['ondocumentload']);

QuiX.ui.IFrame.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
    this.frame.style.visibility = 'hidden';
    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
    this.frame.style.visibility = '';
}

QuiX.ui.IFrame.prototype.setSource = function(src) {
    this.frame.src = src || 'about:blank';
}

QuiX.ui.IFrame.prototype.getSource = function() {
    return this.frame.src;
}

QuiX.ui.IFrame.prototype.setScrolling = function(scrolling) {
    this.frame.scrolling = scrolling;
    this.frame.src = this.frame.src;
}

QuiX.ui.IFrame.prototype.getScrolling = function() {
    return this.frame.scrolling;
}

QuiX.ui.IFrame.prototype.getDocument = function() {
    return this.frame.contentDocument || this.frame.contentWindow.document;
}

QuiX.ui.IFrame.prototype._onload = function(evt) {
    evt = evt || event;
    var w = QuiX.getTargetWidget(evt);
    w.trigger('ondocumentload');
}

// GroupBox

QuiX.ui.GroupBox = function(/*params*/) {
    var params = arguments[0] || {};
    params.overflow = 'hidden';
    var border = params.border;
    params.border = 0;

    var v = true;
    if (params.checked) {
        v = params.value || true;
        this.caption = new QuiX.ui.Field({
            left : 5,
            width : 'auto',
            bgcolor : params.bgcolor,
            caption : params.caption,
            border : 'thin',
            value : v,
            onclick : QuiX.ui.GroupBox._check_onclick,
            type : 'checkbox'
        });
    }
    else
        this.caption = new QuiX.ui.Label({
            left : 5,
            width : 'auto',
            bgcolor : params.bgcolor,
            caption : params.caption
        });

	QuiX.ui.Widget.call(this, params);

    this.div.className = 'groupbox';

    this.border = new QuiX.ui.Widget({
        top: 8,
        width : '100%',
        padding : '12,12,12,12',
        height : 'this.parent.getHeight(false, memo) - this.top',
        border : border || 2
    });
    this.border.div.className = 'groupboxframe';
    this.appendChild(this.border);

    this.appendChild(this.caption);
    this.caption.div.className = this.div.className;

    this.body = new QuiX.ui.Widget({
        width : '100%',
        height : '100%',
        disabled : !v
    });
    this.border.appendChild(this.body);
}

QuiX.constructors['groupbox'] = QuiX.ui.GroupBox;
QuiX.ui.GroupBox.prototype = new QuiX.ui.Widget;
QuiX.ui.GroupBox.prototype.__class__ = QuiX.ui.GroupBox;

QuiX.ui.GroupBox.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onstatechange']);

QuiX.ui.GroupBox.prototype.setBgColor = function(color) {
    QuiX.ui.Widget.prototype.setBgColor.apply(this, arguments);
    this.caption.setBgColor(color);
}

QuiX.ui.GroupBox.prototype.getValue = function() {
    return (this.caption.getValue)?this.caption.getValue():true;
}

QuiX.ui.GroupBox.prototype.setValue = function(value) {
    if (this.caption.setValue) {
        this.caption.setValue(value);
        QuiX.ui.GroupBox._check_onclick(null, this.caption);
    }
}

QuiX.ui.GroupBox._check_onclick = function(evt ,w) {
    var box = w.parent;
    if (w.getValue()) {
        box.body.enable();
    }
    else {
        box.body.disable();
    }
    box.trigger('onstatechange', evt, box);
}

// slider

QuiX.ui.Slider = function(/*params*/) {
    var params = arguments[0] || {};

    var rl_p = parseInt(QuiX.theme.slider.handle.width / 2);
    params.padding =  rl_p + ',' + rl_p + ',0,0',
    params.height = params.height || 26;
    params.overflow = 'visible';

    QuiX.ui.Widget.call(this, params);

    this.div.className = 'slider';

    this.min = parseFloat(params.min) || 0;
    this.max = parseFloat(params.max) || 100;
    this.decimals = parseInt(params.decimals) || 0;
    this.name = params.name;

    this.slot = QuiX.theme.slider.slot.get();
    this.slot.div.className = 'slot';
    this.appendChild(this.slot);

    var handle = QuiX.theme.slider.handle.get();
    handle.div.className = 'handle';
    this.appendChild(handle);
    this.handle = handle;

    this.handle.attachEvent('onmousedown', QuiX.ui.Slider._onmousedown);

    if (!(params.labeled == false || params.labeled == 'false')) {
        var lbl = new QuiX.ui.Label({
            top: 16,
            left: (QuiX.dir != 'rtl')? -10:16,
            display: 'none'
        });
        this.handle.appendChild(lbl);
        this.label = lbl;
    }

    this.setValue(params.value || this.min);
}

QuiX.constructors['slider'] = QuiX.ui.Slider;
QuiX.ui.Slider.prototype = new QuiX.ui.Widget;
QuiX.ui.Slider.prototype.__class__ = QuiX.ui.Slider;

QuiX.ui.Slider.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange']);

QuiX.ui.Slider.prototype.getValue = function() {
    return this._value;
}

QuiX.ui.Slider.prototype.setValue = function(val) {
    this._value = Math.round(parseFloat(val) * Math.pow(10, this.decimals)) /
                  Math.pow(10, this.decimals);
    if (this._value > this.max) {
        this._value = this.max;
    }
    if (this._value < this.min) {
        this._value = this.min;
    }
    this._update();
}

QuiX.ui.Slider.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
    this._update(memo);
}

QuiX.ui.Slider.prototype._update = function(/*memo*/) {
    var memo = arguments[1] || {},
        x = ((this._value - this.min) / +
             (this.max - this.min)) *  +
             this.slot.getWidth(true, memo);
    this.handle.moveTo(x - (QuiX.theme.slider.handle.width / 2), 'center');
    if (this.label) {
        this.label.setCaption(this._value);
    }
}

QuiX.ui.Slider._onmousedown = function(evt, handle) {
    QuiX.startX = evt.clientX;
    QuiX.tmpWidget = handle;
    handle.attributes.__startx = handle.getLeft();
    if (handle.widgets.length > 0) {
        handle.widgets[0].show();
        handle.widgets[0].redraw();
    }
    document.desktop.attachEvent('onmousemove', QuiX.ui.Slider._onmousemove);
    document.desktop.attachEvent('onmouseup', QuiX.ui.Slider._onmouseup);
    QuiX.cancelDefault(evt);
}

QuiX.ui.Slider._onmousemove = function(evt, desktop) {
    var offsetX = evt.clientX - QuiX.startX;
    if (QuiX.dir == 'rtl') {
        offsetX = -offsetX;
    }
    var new_x = QuiX.tmpWidget.attributes.__startx + offsetX +
                (QuiX.theme.slider.handle.width / 2),
        slider = QuiX.tmpWidget.parent,
        range_length = slider.max - slider.min,
        memo = {},
        slot_width = slider.slot.getWidth(true, memo),
        old_value = this._value,
        new_value;

    new_x = (new_x < 0)? 0:new_x;
    new_x = (new_x > slot_width)? slot_width:new_x;

    new_value = slider.min + (new_x / slot_width) * range_length;
    slider._value = Math.round(new_value * Math.pow(10, slider.decimals)) /
                    Math.pow(10, slider.decimals);
    slider._update(memo);

    if (old_value != new_value) {
        slider.trigger('onchange');
    }
}

QuiX.ui.Slider._onmouseup = function(evt, desktop) {
    var slider = QuiX.tmpWidget.parent;
    document.desktop.detachEvent('onmousemove', QuiX.ui.Slider._onmousemove);
    document.desktop.detachEvent('onmouseup', QuiX.ui.Slider._onmouseup);
    if (slider.label) {
        slider.label.hide();
    }
}
