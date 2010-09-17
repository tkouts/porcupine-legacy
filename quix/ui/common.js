// horizontal rule

QuiX.ui.HR = function(/*params*/) {
    var params = arguments[0] || {};
    this.base = QuiX.ui.Widget;
    params.border = params.border || 1;
    params.height = params.height || 2;
    params.overflow = 'hidden';
    this.base(params);
    this._isContainer = false;
    this.div.className = 'separator';
}

QuiX.constructors['hr'] = QuiX.ui.HR;
QuiX.ui.HR.prototype = new QuiX.ui.Widget;

// iframe

QuiX.ui.IFrame = function(/*params*/) {
    var params = arguments[0] || {};
    params.overflow = 'hidden';
    this.base = QuiX.ui.Widget;
    this.base(params);
    this._isContainer = false;
    this.div.className = 'ifrm';
    this.frame = ce("IFRAME");
    this.frame.frameBorder = 0;
    this.frame.name = params.name || '';
    QuiX.addEvent(this.frame, 'onload', QuiX.ui.IFrame.prototype._onload);
    this.frame.src = params.src || "";
    this.frame.style.width = "100%";
    this.frame.style.height = "100%";
    this.div.appendChild(this.frame);
}

QuiX.constructors['iframe'] = QuiX.ui.IFrame;
QuiX.ui.IFrame.prototype = new QuiX.ui.Widget;
QuiX.ui.IFrame.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['ondocumentload']);

QuiX.ui.IFrame.prototype.redraw = function(bForceAll /*, memo*/) {
    this.frame.style.visibility = 'hidden';
    QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
    this.frame.style.visibility = '';
}

QuiX.ui.IFrame.prototype.setSource = function(src) {
    this.frame.src = src;
}

QuiX.ui.IFrame.prototype.getSource = function() {
    return this.frame.src;
}

QuiX.ui.IFrame.prototype.getDocument = function() {
    return this.frame.contentDocument || this.frame.contentWindow.document;
}

QuiX.ui.IFrame.prototype._onload = function(evt) {
    evt = evt || event;
    var w = QuiX.getTargetWidget(evt);
    if (w._customRegistry.ondocumentload)
        w._customRegistry.ondocumentload(w);
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

    this.base = QuiX.ui.Widget;
    this.base(params);
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
    if (w.getValue())
        box.body.enable();
    else
        box.body.disable();
    if (box._customRegistry.onstatechange)
        box._customRegistry.onstatechange(evt, box);
    if (evt)
        QuiX.stopPropag(evt);
}

// slider

QuiX.ui.Slider = function(/*params*/) {
    var params = arguments[0] || {};

    var rl_p = parseInt(QuiX.theme.slider.handle.width / 2);
    params.padding =  rl_p + ',' + rl_p + ',0,0',
    params.height = params.height || 26;
    params.overflow = 'visible';

    this.base = QuiX.ui.Widget;
    this.base(params);
    this.div.className = 'slider';

    this.min = parseInt(params.min) || 0;
    this.max = parseInt(params.max) || 100;
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

    var lbl = new QuiX.ui.Label({
        top: 16,
        left: (QuiX.dir != 'rtl')? -10:16,
        display: 'none'
    });
    this.handle.appendChild(lbl);
    this.label = lbl;

    this.setValue(params.value || this.min);
}

QuiX.constructors['slider'] = QuiX.ui.Slider;
QuiX.ui.Slider.prototype = new QuiX.ui.Widget;

QuiX.ui.Slider.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange']);

QuiX.ui.Slider.prototype.getValue = function() {
    return this._value;
}

QuiX.ui.Slider.prototype.setValue = function(val) {
    this._value = Math.round(parseFloat(val) * Math.pow(10, this.decimals)) /
                  Math.pow(10, this.decimals);
    if (this._value > this.max)
        this._value = this.max;
    if (this._value < this.min)
        this._value = this.min;
    this._update();
}

QuiX.ui.Slider.prototype._update = function() {
    var x = ((this._value - this.min) / +
             (this.max - this.min)) *  +
             this.slot.getWidth(true);
    this.handle.moveTo(x - (QuiX.theme.slider.handle.width / 2), 'center');
    this.label.setCaption(this._value);
}

QuiX.ui.Slider._onmousedown = function(evt, handle) {
    QuiX.startX = evt.clientX;
    QuiX.tmpWidget = handle;
    handle.attributes.__startx = handle.getLeft();
    handle.widgets[0].show();
    handle.widgets[0].redraw();
    document.desktop.attachEvent('onmousemove', QuiX.ui.Slider._onmousemove);
    document.desktop.attachEvent('onmouseup', QuiX.ui.Slider._onmouseup);
    QuiX.cancelDefault(evt);
}

QuiX.ui.Slider._onmousemove = function(evt, desktop) {
    var offsetX = evt.clientX - QuiX.startX;
    if (QuiX.dir == 'rtl')
        offsetX = -offsetX;
    var new_x = QuiX.tmpWidget.attributes.__startx + offsetX +
                (QuiX.theme.slider.handle.width / 2);
    var slider = QuiX.tmpWidget.parent;
    var range_length = slider.max - slider.min;
    var slot_width = slider.slot.getWidth(true);

    new_x = (new_x < 0)? 0:new_x;
    new_x = (new_x > slot_width)? slot_width:new_x;

    var new_value = slider.min + (new_x / slot_width) * range_length;
    slider._value = Math.round(new_value * Math.pow(10, slider.decimals)) /
                    Math.pow(10, slider.decimals);
    slider._update();
}

QuiX.ui.Slider._onmouseup = function(evt, desktop) {
    var slider = QuiX.tmpWidget.parent;
    document.desktop.detachEvent('onmousemove');
    document.desktop.detachEvent('onmouseup');
    slider.label.hide();
    if (slider._customRegistry.onchange && old_value != slider._value)
        slider._customRegistry.onchange(slider);
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
    this.value = parseInt(params.value) || 0;
    this.setValue(this.value);
}

QuiX.constructors['progressbar'] = QuiX.ui.ProgressBar;
QuiX.ui.ProgressBar.prototype = new QuiX.ui.Widget;

QuiX.ui.ProgressBar.prototype._update = function() {
    this.bar.width = parseInt((this.value / this.maxvalue) * 100) + '%';
    this.bar.redraw();
}

QuiX.ui.ProgressBar.prototype.setValue = function(v) {
    this.value = parseInt(v);
    if (this.value>this.maxvalue) this.value = this.maxvalue;
    this._update();
}

QuiX.ui.ProgressBar.prototype.increase = function(amount) {
    this.setValue(this.value + parseInt(amount));
}
