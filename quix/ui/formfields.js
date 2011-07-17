/************************
Form & Field controls
************************/

// form

QuiX.ui.Form = function(/*params*/) {
    var params = arguments[0] || {};
    params.width = params.width || '100%';
    params.height = params.height || '100%';

    QuiX.ui.Widget.call(this, params);

    //this.files = [];
    this.action = params.action;
    this.method = params.method;
    this.format = params.format || 'json';
}

QuiX.constructors['form'] = QuiX.ui.Form;
QuiX.ui.Form.prototype = new QuiX.ui.Widget;
QuiX.ui.Form.prototype.__class__ = QuiX.ui.Form;

QuiX.ui.Form.prototype.getElements = function() {
    return this.getWidgetsByAttribute('getValue');
}

QuiX.ui.Form.prototype.validate = function() {
    var elements = this.getElements(),
        hasError = false,
        err;

    elements.each(
        function() {
            if (this.validate) {
                err = this.validate();
                hasError = hasError || err;
            }
        });

    return !hasError;
}

QuiX.ui.Form.prototype.getElementByName = function(name) {
    var elements = this.getElements();
    for (var i=0; i<elements.length; i++) {
        if (elements[i].name == name)
            return(elements[i]);
    }
    return null;
}

QuiX.ui.Form.prototype.submit = function(f_callback) {
    function submit_oncomplete(req) {
        var form = req.callback_info;
        if (f_callback)
            f_callback(req.response, form);
    }

    // send data
    var Rpc = (this.format == 'xml')?
              QuiX.rpc.XMLRPCRequest:QuiX.rpc.JSONRPCRequest;
    var rpc = new Rpc(this.action);
    rpc.oncomplete = submit_oncomplete;
    rpc.callback_info = this;
    rpc.callmethod(this.method, this.getData());
}

QuiX.ui.Form.prototype.getData = function() {
    var formData = {},
        elements = this.getElements();

    // build form data
    for (var i=0; i<elements.length; i++) {
        if (elements[i].name && !elements[i]._isDisabled)
            formData[elements[i].name] = elements[i].getValue();
    }
    return formData;
}

// field

QuiX.ui.Field = function(/*params*/) {
    var params = arguments[0] || {},
        textOpacity = params.textopacity || 1,
        readonly = (params.readonly == 'true' || params.readonly == true);

    params.overflow = 'hidden';
    params.height = params.height || 22;
    params.padding = params.padding || '0,0,0,0';

    this.type = params.type || 'text';

    params.border = (typeof params.border == 'undefined')?
                    ((this.type == 'radio' || this.type == 'checkbox')? 0:1):params.border;

    if (this.type == 'radio') {
        this._value = params.value || '';
        params.onclick = QuiX.wrappers.eventWrapper(
                            QuiX.ui.Field._radio_onclick,
                            params.onclick);
        params.overflow = '';
    }
    else if (this.type == 'checkbox') {
        params.onclick = QuiX.wrappers.eventWrapper(
                            QuiX.ui.Field._checkbox_onclick,
                            params.onclick);
    }

    QuiX.ui.Widget.call(this, params);

    this.name = params.name;

    this.align = params.align || 'left';

    var e;
    var self = this;

    if (params.rules) {
        this._validator = new QuiX.ui.Validator({
            widget : this,
            rules : params.rules
        });
        this.attachEvent('onunload',
            function(w){
                if (w._validator.parent) {
                    w._validator.destroy();
                }
            });
    }

    switch (this.type) {
        case 'checkbox':
        case 'radio':
            var val = (this.type == 'checkbox')?'value':'checked';
            var checked = (params[val] == true || params[val] == 'true')?
                          'checked':'';
            this.div.innerHTML = '<input type="' + this.type + '" ' + checked +
                ' style="vertical-align:middle;">';
            this._checked = (checked == 'checked');
            e = this.div.firstChild;

            if (params.caption) {
                this.setCaption(params.caption);
            }
            this.div.style.whiteSpace = 'nowrap';
            break;
        case 'file':
            throw new QuiX.Exception('QuiX.ui.Field', 'Invalid field type');
            break;
        default:
            this.div.className = 'field';
            e = (this.type == 'textarea')? ce('TEXTAREA'):ce('INPUT');
            e.style.position = 'absolute';
            e.style.zIndex = 1;
            e.style.padding = '0px';
            if (this.type != 'textarea') {
                e.type = this.type;
            }
            e.value = (params.value)? params.value:'';
            this.textPadding = (params.textpadding ||
                                QuiX.theme.field.textpadding) + 'px';

            if (params.maxlength) {
                e.maxLength = params.maxlength;
            }

            if (this.type == 'hidden') {
                this.hide();
            }
            this.div.appendChild(e);
            if (params.prompt) {
                this.setPrompt(params.prompt);
            }

            e.onchange = function() {
                self.trigger('onchange');
            }
            e.onblur = function() {
                if (params.rules) {
                    self.validate();
                }
                if (self._prompt && this.value == '') {
                    self._prompt.show();
                    self._prompt.redraw(true);
                }
                self.trigger('onblur');
            }
            e.onfocus = function(evt) {
                if (self._prompt && this.value == '') {
                    self._prompt.hide();
                }
                self.trigger('onfocus');
            }
    }

    if (params.tabindex) {
        e.tabIndex = params.tabindex;
    }

    if (!QuiX.supportTouches) {
        e.onselectstart = QuiX.stopPropag;
    }

    if (textOpacity != 1) {
        this.setTextOpacity(textOpacity);
    }

    this.setReadOnly(readonly);

    if (this._isDisabled) {
        e.disabled = true;
        e.style.backgroundColor = 'menu';
    }
}

QuiX.constructors['field'] = QuiX.ui.Field;
QuiX.ui.Field.prototype = new QuiX.ui.Widget;
QuiX.ui.Field.prototype.__class__ = QuiX.ui.Field;

QuiX.ui.Field.prototype.validate = function() {
    if (this._validator) {
       return this._validator.validate();
    }
    return false;
}

QuiX.ui.Field.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange', 'onblur',
                                                  'onfocus']);

QuiX.ui.Field.prototype.getValue = function() {
    switch (this.type) {
        case 'checkbox':
            return this.div.firstChild.checked;
        case 'radio':
            var id = this.getId();
            if (id) {
                var radio_group = this.parent.getWidgetById(id);
                for (var i=0; i<radio_group.length; i++) {
                    if (radio_group[i]._checked)
                        return (radio_group[i]._value);
                }
            }
            break;
        default:
            return this.div.firstChild.value;
    }
}

QuiX.ui.Field.prototype.setValue = function(value) {
    switch (this.type) {
        case 'checkbox':
            this.div.firstChild.checked = value;
            break;
        case 'radio':
            var checked, radio_group;
            var id = this.getId();
            if (id) {
                var p = this.parent;
                while (p) {
                    radio_group = p.getWidgetById(id);
                    if (radio_group.length && radio_group.length > 1) {
                        for (var i=0; i<radio_group.length; i++) {
                            checked = (radio_group[i]._value == value);
                            radio_group[i].div.firstChild.checked = checked;
                            radio_group[i]._checked = checked;
                        }
                        break;
                    }
                    p = p.parent;
                }
            }
            break;
        default:
            this.div.firstChild.value = value;
            if (this._prompt) {
                if (value == '') {
                    this._prompt.show();
                    this._prompt.redraw(true);
                }
                else {
                    this._prompt.hide();
                }
            }
    }
}

QuiX.ui.Field.prototype.getCaption = function() {
    if (this.type=='radio' || this.type=='checkbox') {
        var oSpan = this.div.getElementsByTagName('SPAN')[0];
        if (oSpan) {
            return oSpan.innerHTML;
        }
        else {
            return '';
        }
    }
    return null;
}

QuiX.ui.Field.prototype.setCaption = function(caption) {
    if (this.type=='radio' || this.type=='checkbox') {
        var textnode = this.div.getElementsByTagName('SPAN')[0];
        if (!textnode) {
            textnode = ce('SPAN');
            textnode.style.cursor = 'default';
            QuiX.setInnerText(textnode, caption);
            textnode.style.verticalAlign = 'middle';
            this.div.appendChild(textnode);
        }
        else {
            QuiX.setInnerText(textnode, caption);
        }
    }
}

QuiX.ui.Field.prototype.enable = function() {
    if (this.div.firstChild) {
        this.div.firstChild.disabled = false;
        this.div.firstChild.style.backgroundColor = this.getBgColor();
    }
    QuiX.ui.Widget.prototype.enable.apply(this, arguments);
}

QuiX.ui.Field.prototype.disable = function() {
    if (this.div.firstChild) {
        this.div.firstChild.disabled = true;
        this.div.firstChild.style.backgroundColor = 'menu';
    }
    QuiX.ui.Widget.prototype.disable.apply(this, arguments);
}

QuiX.ui.Field.prototype.focus = function() {
    this.div.firstChild.focus();
}

QuiX.ui.Field.prototype.blur = function() {
    this.div.firstChild.blur();
}

QuiX.ui.Field.prototype.setPrompt = function(prompt) {
    if (this.type == 'text' || this.type == 'textarea'
            || this.type == 'password') {
        if (prompt) {
            if (this._prompt) {
                this._prompt.setCaption(prompt);
            }
            else {
                this._prompt = new QuiX.ui.Label({
                    id: '_o',
                    width: '100%',
                    height: '100%',
                    caption: prompt,
                    display: 'none',
                    align: (this.type == 'textarea')? 'center':'auto'
                });
                this.appendChild(this._prompt);
                // send to back
                this._prompt.div.style.zIndex = 0;
                this._prompt.redraw(true);
                if (this.getValue() === '') {
                    this._prompt.show();
                }
                if (document.all) {
                    var self = this;
                    this.attachEvent('onmousedown',
                        function(){
                            self.focus();
                        });
                }
            }
        }
        else {
            if (this._prompt) {
                this._prompt.destroy();
                this._prompt = null;
            }
        }
    }
}

QuiX.ui.Field.prototype.getPrompt = function() {
    var prompt = '';
    if (this._prompt) {
        prompt = this._prompt.getCaption();
    }
    return prompt;
}

QuiX.ui.Field.prototype.setReadOnly = function(ro) {
    switch (this.type) {
        case 'checkbox':
        case 'radio':
            this.div.firstChild.disabled = ro;
            break;
        default:
            this.div.firstChild.readOnly = ro;
    }
}

QuiX.ui.Field.prototype.isReadOnly = function(ro) {
    switch (this.type) {
        case 'checkbox':
        case 'radio':
            return this.div.firstChild.disabled;
        default:
            return this.div.firstChild.readOnly;
    }
}

QuiX.ui.Field.prototype.setTextOpacity = function(op) {
    var el;
    if (this.type=='radio' || this.type=='checkbox') {
        el = this.div.getElementsByTagName('SPAN')[0];
    }
    else {
        el = this.div.firstChild;
    }
    if (el) {
        QuiX.setOpacity(el, op);
    }
}

QuiX.ui.Field.prototype.getTextOpacity = function() {
    var el;
    if (this.type=='radio' || this.type=='checkbox') {
        el = this.div.getElementsByTagName('SPAN')[0];
    }
    else {
        el = this.div.firstChild;
    }
    if (el) {
        return QuiX.getOpacity(el) || 1;
    }
    else {
        return 1;
    }
}

QuiX.ui.Field.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {},
        sh = this._sh;
    if (bForceAll || typeof this._rds == 'undefined') {
        if (this.type == 'text' || this.type == 'textarea'
                || this.type == 'password') {
            var input = this.div.firstChild;

            input.style.paddingLeft = 
            input.style.paddingRight = this.textPadding;
        }
        if (this.align == 'auto') {
            this.div.style.textAlign = (QuiX.dir == 'rtl')? 'right':'left';
        }
        else {
            this.div.style.textAlign = this.align;
        }
    }
    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
    if ((!sh || this._sh != sh) && (this.type == 'radio' || this.type == 'checkbox')) {
        if (this.height != 'auto') {
            this.div.style.lineHeight = this.div.style.height;
        }
        else {
            this.div.style.lineHeight = '';
        }
        if (QuiX.utils.BrowserInfo.OS == 'Android') {
            this.div.firstChild.style.verticalAlign = 'top';
            this.div.firstChild.style.position = 'relative';
            this.div.firstChild.style.top =
                ((parseInt(this.div.style.height) / 2) -
                 parseInt((this.div.firstChild.offsetHeight + 8) / 2)) + 'px';
        }
    }
}

QuiX.ui.Field.prototype._adjustFieldSize = function(memo) {
    if (this.type != 'checkbox' && this.type != 'radio' && this.div.firstChild) {
        var input = this.div.firstChild,
            borders = 2 * QuiX.getStyle(input, 'border-top-width') || 0,
            bf = QuiX.utils.BrowserInfo.family,
            br = QuiX.utils.BrowserInfo.browser,
            bv = QuiX.utils.BrowserInfo.version,
            nw = this._calcWidth(false, memo) || 0,
            nh = this._calcHeight(false, memo) || 0;

        if (nh != this._sh) {
            if (this.type == 'textarea' && bf == 'moz') {
                input.style.top = '-1px';
            }
            this._sh = nh + '#' + borders;
            nh -= parseInt(input.style.paddingTop || 0) +
                  parseInt(input.style.paddingBottom || 0) +
                  borders;
            input.style.height = (nh > 0? nh:0) + 'px';
            if ((this.type == 'text' || this.type == 'password') &&
                    (bf == 'ie' || (br == 'Firefox' && bv <= 3))) {
                // we need to adjust the text vertically
                input.style.lineHeight = input.style.height;
            }
        }

        if (nw != this._sw) {
            this._sw = nw;
            nw -= parseInt(input.style.paddingLeft || 0) +
                  parseInt(input.style.paddingRight || 0) +
                  borders;
            input.style.width = (nw > 0? nw:0) + 'px';
        }
    }
}

QuiX.ui.Field.prototype._setCommonProps = function(/*memo*/) {
    var memo = arguments[0] || {};
    QuiX.ui.Widget.prototype._setCommonProps.apply(this, [memo]);
    this._adjustFieldSize(memo);
}

QuiX.ui.Field.prototype._calcAuto = null;

QuiX.ui.Field._checkbox_onclick = function(evt, w) {
    if (!w.isReadOnly()) {
        if (QuiX.getTarget(evt).tagName != 'INPUT') {
            w.div.firstChild.checked = !w.div.firstChild.checked;
        }
        w.trigger('onchange');
    }
}

QuiX.ui.Field._radio_onclick = function(evt, w) {
    if (!w.isReadOnly()) {
        var id = w.getId();
        if (id) {
            //var checked = w.div.firstChild.checked;
            w.setValue(w._value);
            w.trigger('onchange');
        }
    }
}

// spin button

QuiX.ui.Spin = function(/*params*/) {
    var params = arguments[0] || {};
    params.bgcolor = params.bgcolor || 'white';
    params.border = params.border || QuiX.theme.spinbutton.border;
    params.padding = '0,0,0,0';
    params.overflow = 'hidden';
    params.height = params.height || 22;

    QuiX.ui.Widget.call(this, params);

    this.div.className = 'spin';

    this.name = params.name;
    this.editable = (params.editable == 'true' || params.editable == true);
    this.min = params.min;
    this.max = params.max;
    this.step = parseFloat(params.step) || 1;

    var e = ce('INPUT');
    e.style.padding = '0px ' + (params.textpadding ||
                                QuiX.theme.combo.textpadding) + 'px';
    e.style.position='absolute';
    e.style.textAlign = 'right';

    if (params.tabindex) {
        e.tabIndex = params.tabindex;
    }

    this.div.appendChild(e);

    if (!QuiX.supportTouches) {
        e.onselectstart = QuiX.stopPropag;
    }

    if (params.maxlength) {
        e.maxLength = params.maxlength;
    }

    var self = this;

    var upbutton = QuiX.theme.spinbutton.getUp();
    upbutton.attachEvent('onclick', QuiX.ui.Spin._btnup_onclick);
    this.appendChild(upbutton);

    var downbutton = QuiX.theme.spinbutton.getDown();
    downbutton.attachEvent('onclick', QuiX.ui.Spin._btndown_onclick);
    this.appendChild(downbutton);

    if (!this.editable) {
        e.readOnly = true;
        e.style.cursor = 'default';
        this.div.className += ' noneditable';
    }
    else {
        this.div.className += ' editable';
        this.setBorderWidth(0);
    }

    this.attachEvent('onkeypress', QuiX.ui.Spin._onkeypress);

    if (typeof(params.value) != 'undefined') {
        e.value = parseFloat(params.value);
    }

    e.onchange = function() {
        var v = self.validate(self.getValue());
        if (v == 0) {
            self.trigger('onchange');
        }
        else if (v == 1) {
            self.setValue(self.max);
        }
        else if (v == -1) {
            self.setValue(self.min);
        }
    }

    e.onblur = function() {
        self.trigger('onblur');
    }

    if (this._isDisabled) {
        e.disabled = true;
        e.style.backgroundColor = 'menu';
    }
}

QuiX.constructors['spinbutton'] = QuiX.ui.Spin;
QuiX.ui.Spin.prototype = new QuiX.ui.Widget;
QuiX.ui.Spin.prototype.__class__ = QuiX.ui.Spin;
QuiX.ui.Spin.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange', 'onblur']);

QuiX.ui.Spin.prototype._adjustFieldSize = function(memo) {
    if (this.div.firstChild) {
        var input = this.div.firstChild,
            borders = 2 * parseInt(QuiX.getStyle(input, 'border-top-width')) || 0,
            nw = this._calcWidth(false, memo) || 0,
            nh = this._calcHeight(false, memo) || 0,
            bf = QuiX.utils.BrowserInfo.family,
            br = QuiX.utils.BrowserInfo.browser,
            bv = QuiX.utils.BrowserInfo.version;

        if (nh != this._sh) {
            this._sh = nh + '#' + borders;
            nh -= parseInt(input.style.paddingTop || 0) +
                  parseInt(input.style.paddingBottom || 0) +
                  borders;
            input.style.height = (nh > 0? nh:0) + 'px';
            if (bf == 'ie' || (br == 'Firefox' && bv <= 3)) {
                // we need to adjust the text vertically
                input.style.lineHeight = input.style.height;
            }
        }

        if (nw != this._sw) {
            this._sw = nw;
            nw -= QuiX.theme.spinbutton.btnWidth +
                  parseInt(input.style.paddingLeft || 0) +
                  parseInt(input.style.paddingRight || 0) +
                  borders;
            input.style.width = (nw > 0? nw:0) + 'px';
        }
    }
}

QuiX.ui.Spin.prototype.enable = function() {
    if (this.div.firstChild) {
        this.div.firstChild.disabled = false;
        this.div.firstChild.style.backgroundColor = this.getBgColor();
    }
    QuiX.ui.Widget.prototype.enable.apply(this, arguments);
}

QuiX.ui.Spin.prototype.disable = function() {
    if (this.div.firstChild) {
        this.div.firstChild.disabled = true;
        this.div.firstChild.style.backgroundColor = 'menu';
    }
    QuiX.ui.Widget.prototype.disable.apply(this, arguments);
}

QuiX.ui.Spin.prototype._setCommonProps = function(/*memo*/) {
    var memo = arguments[0] || {};
    QuiX.ui.Widget.prototype._setCommonProps.apply(this, [memo]);
    this._adjustFieldSize(memo);
}

QuiX.ui.Spin.prototype.validate = function(val) {
    var min = this.min,
        max = this.max;
    if ((typeof max != 'undefined') && val > max) {
        return 1;
    }
    if ((typeof min != 'undefined') && val < min) {
        return -1;
    }
    return 0;
}

QuiX.ui.Spin.prototype.setBgColor = function(color) {
    this.div.style.backgroundColor = color;
    if (this.div.firstChild) {
        this.div.firstChild.style.backgroundColor = color;
    }
}

QuiX.ui.Spin.prototype.getValue = function() {
    return parseFloat(this.div.firstChild.value);
}

QuiX.ui.Spin.prototype.setValue = function(value) {
    this.div.firstChild.value = parseFloat(value);
}

QuiX.ui.Spin.prototype.focus = function() {
    this.div.firstChild.focus();
}

QuiX.ui.Spin.prototype.blur = function() {
    this.div.firstChild.blur();
}

QuiX.ui.Spin._onkeypress = function(evt, w) {
    var keycode = (QuiX.utils.BrowserInfo.family == 'ie' ||
                   QuiX.utils.BrowserInfo.family == 'op')?
        evt.keyCode:evt.charCode;

    if (!(keycode < 58) && keycode != 0) {
        QuiX.cancelDefault(evt);
    }
}

QuiX.ui.Spin._btnup_onclick = function(evt, w) {
    var oSpin = w.parent;
    var val = oSpin.getValue() + oSpin.step;
    if (!isNaN(val)) {
        if (oSpin.validate(val) == 0) {
            oSpin.setValue(val);
            oSpin.trigger('onchange');
        }
    }
}

QuiX.ui.Spin._btndown_onclick = function(evt, w) {
    var oSpin = w.parent;
    var val = oSpin.getValue() - oSpin.step;
    if (!isNaN(val)) {
        if (oSpin.validate(val) == 0) {
            oSpin.setValue(val);
            oSpin.trigger('onchange');
        }
    }
}
