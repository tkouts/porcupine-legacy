/************************
Form & Field controls
************************/
QuiX.ui.Form = function(/*params*/) {
	var params = arguments[0] || {};
	params.width = params.width || '100%';
	params.height = params.height || '100%';
	this.base = QuiX.ui.Widget;
	this.base(params);
	this.files = [];
	this.action = params.action;
	this.method = params.method;
    this.format = params.format || 'json';
}

QuiX.constructors['form'] = QuiX.ui.Form;
QuiX.ui.Form.prototype = new QuiX.ui.Widget;
// backwards compatibility
var Form = QuiX.ui.Form;

QuiX.ui.Form.prototype.getElements = function() {
	return this.getWidgetsByAttribute('getValue');
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

QuiX.ui.Form.prototype.getData = function()
{
	var formData = {};
	var elements = this.getElements();
	// build form data
	for (var i=0; i<elements.length; i++) {
		if (elements[i].name && !elements[i]._isDisabled)
			formData[elements[i].name] = elements[i].getValue();
	}
	return formData;	
}

QuiX.ui.Field = function(/*params*/) {
	var params = arguments[0] || {};
	this.base = QuiX.ui.Widget;
	params.border = (typeof params.border == 'undefined')?1:params.border;
	params.overflow = 'hidden';
	this.type = params.type || 'text';
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
	params.height = params.height || 22;
	params.padding = '0,0,0,0';
	this.base(params);
	this.name = params.name;
	this.readonly = (params.readonly=='true' || params.readonly==true);
	this.textAlign = params.textalign || 'left';
	
	var e;
	var self = this;
	
	switch (this.type) {
		case 'checkbox':
		case 'radio':
			var val = (this.type=='checkbox')?'value':'checked';
			var checked = (params[val]==true || params[val] == 'true')?'checked':'';
			this.div.innerHTML = '<input type="' + this.type + '" ' + checked +
				' style="vertical-align:middle">';
			this._checked = (checked == 'checked');
			e = this.div.firstChild;
			if (this.readonly) e.disabled = true;
			if (params.caption) this.setCaption(params.caption);
			break;
		case 'file':
			throw new QuiX.Exception('QuiX.ui.Field', 'Invalid field type');
			break;
		default:
			this.div.className = 'field';
			e = (this.type=='textarea')?ce('TEXTAREA'):ce('INPUT');
			e.style.borderWidth = '1px';
			e.style.position='absolute';
            e.style.left = '0px';
			e.style.textAlign = this.textAlign;
			if (this.readonly) e.readOnly = true;
			if (this.type!='textarea') e.type = this.type;
			e.value = (params.value)?params.value:'';
			this.textPadding = params.textpadding || 1;
			if (params.maxlength)
				e.maxLength = params.maxlength;
			
			if (this.type=='hidden') this.hide();
			this.div.appendChild(e);

			e.onchange = function() {
				if (self._customRegistry.onchange)
					self._customRegistry.onchange(self);
			}
            e.onblur = function() {
				if (self._customRegistry.onblur)
					self._customRegistry.onblur(self);
            }
	}

	e.onmousedown = QuiX.stopPropag;
	e.onselectstart = QuiX.stopPropag;
	
	this._adjustFieldSize();
	if (this._isDisabled) {
		e.disabled = true;
		e.style.backgroundColor = 'menu';
	}
}

QuiX.constructors['field'] = QuiX.ui.Field;
QuiX.ui.Field.prototype = new QuiX.ui.Widget;
// backwards compatibility
var Field = QuiX.ui.Field;

QuiX.ui.Field.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange', 'onblur']);

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
				radio_group = this.parent.getWidgetById(id);
				for (var i=0; i<radio_group.length; i++) {
					checked = (radio_group[i]._value == value);
					radio_group[i].div.firstChild.checked = checked;
					radio_group[i]._checked = checked;
				}
			}
			break;
		default:
			this.div.firstChild.value = value;
	}
}

QuiX.ui.Field.prototype.getCaption = function() {
	if (this.type=='radio' || this.type=='checkbox') {
		var oSpan = this.div.getElementsByTagName('SPAN')[0];
		if (oSpan)
			return oSpan.innerHTML;
		else
			return '';
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

QuiX.ui.Field.prototype.setBgColor = function(color) {
	this.div.style.backgroundColor = color;
	if (this.type == 'text' || this.type == 'textarea' || this.type == 'password')
		this.div.firstChild.style.backgroundColor = color;
}

QuiX.ui.Field.prototype.redraw = function(bForceAll /*, memo*/) {
	if (this.type == 'text' || this.type == 'textarea' || this.type == 'password')
		this.div.firstChild.style.padding = this.textPadding + 'px';
	QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
}

QuiX.ui.Field.prototype._adjustFieldSize = function(memo) {
	if (this.type!='checkbox' && this.type!='radio' && this.div.firstChild) {
		var nw = this.getWidth(false, memo) || 0;
		var nh = this.getHeight(false, memo) || 0;
		if (this.type == 'textarea' && QuiX.utils.BrowserInfo.family == 'moz')
			this.div.firstChild.style.top = '-1px';
		nw = nw - 2 * this.textPadding;
		nh = nh - 2 * this.textPadding;
		if (nw < 0) nw = 0;
		if (nh < 0) nh = 0;
		this.div.firstChild.style.width = nw + 'px';
		this.div.firstChild.style.height = nh + 'px';
	}
}

QuiX.ui.Field.prototype._setCommonProps = function(memo) {
	QuiX.ui.Widget.prototype._setCommonProps.apply(this, arguments);
	this._adjustFieldSize(memo);
}

QuiX.ui.Field.prototype._calcSize = function(height, offset, getHeight, memo) {
    if (this[height] == 'auto' &&
            (!memo || (memo && !memo[this._uniqueid + height]))) {
        // we need to measure
        var value = QuiX.measureWidget(this, height);
        if (typeof memo != 'undefined')
            memo[this._uniqueid + height] = value;
        return value - offset;
    }
    else
        return Widget.prototype._calcSize.apply(this, arguments);
}

QuiX.ui.Field._checkbox_onclick = function(evt, w) {
	if (QuiX.getTarget(evt).tagName != 'INPUT')
		w.div.firstChild.checked = !w.div.firstChild.checked;
	if (w._customRegistry.onchange)
		w._customRegistry.onchange(w);
}

QuiX.ui.Field._radio_onclick = function(evt, w) {
	var id = w.getId();
	if (id) {
		var checked = w.div.firstChild.checked;
		w.setValue(w._value);
		if (!checked && w._customRegistry.onchange)
			w._customRegistry.onchange(w);
	}
}

// spin button
QuiX.ui.Spin = function(/*params*/) {
	var params = arguments[0] || {};
	params.bgcolor = params.bgcolor || 'white';
	params.border = params.border || 1;
	params.padding = '0,0,0,0';
	params.overflow = 'hidden';
	params.height = params.height || 22;

	this.base = QuiX.ui.Widget;
	this.base(params);

	this.div.className = 'combo';
	
	this.name = params.name;
	this.editable = (params.editable=='true' || params.editable==true)?true:false;
	this.min = params.min || 0;
	this.max = params.max;
	this.step = parseInt(params.step) || 1;
	this.div.className = 'field';

	var e = ce('INPUT');
	e.style.padding = '1px';
	e.style.position='absolute';
	e.style.textAlign = 'right';
	this.div.appendChild(e);
	
	e.onmousedown = QuiX.stopPropag;
	e.onselectstart = QuiX.stopPropag;
	
	if (params.maxlength)
		e.maxLength = params.maxlength;
	
	var oSpin = this;

	upbutton = new QuiX.ui.Button({
		left : "this.parent.getWidth(false, memo)-16",
		height : '50%', width : 16,
		onclick : QuiX.ui.Spin._btnup_onclick
	});
	this.appendChild(upbutton);

	downbutton = new QuiX.ui.Button({
		left : "this.parent.getWidth(false, memo)-16",
		height : '50%', top : '50%', width : 16,
		onclick : QuiX.ui.Spin._btndown_onclick
	});
	this.appendChild(downbutton);

	if (!this.editable) {
		e.readOnly = true;
		e.style.cursor = 'default';
	} else {
		e.onblur = function() {oSpin.validate();}
	}
	
	this.attachEvent('onkeypress', QuiX.ui.Spin._onkeypress);
	
	if (params.value)
		e.value = parseInt(params.value);

	var oField = this;
	e.onchange = function() {
		var v = oField.validate( oField.getValue() );
		if (v==0) {
			if (oField._customRegistry.onchange)
				oField._customRegistry.onchange(oField);
		}
		else if (v==1)
			oField.setValue(oField.max);
		else if (v==-1)
			oField.setValue(oField.min);
	}
}

QuiX.constructors['spinbutton'] = QuiX.ui.Spin;
QuiX.ui.Spin.prototype = new QuiX.ui.Widget;
QuiX.ui.Spin.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange']);
// backwards compatibility
var Spin = QuiX.ui.Spin;

QuiX.ui.Spin.prototype._adjustFieldSize = function(memo) {
	if (this.div.firstChild) {
		var nh = this.getHeight(false, memo) - 2;
		this.div.firstChild.style.width = (this.getWidth(false, memo) - 18) + 'px';
		this.div.firstChild.style.height = nh + 'px';
	}
}

QuiX.ui.Spin.prototype._setCommonProps = function(memo) {
	QuiX.ui.Widget.prototype._setCommonProps.apply(this, arguments);
	this._adjustFieldSize(memo);
}

QuiX.ui.Spin.prototype.validate = function(val) {
	var min = this.min;
	var max = this.max;
	if (max && val > max )
		return 1;
	if (val < min)
		return -1;
	return 0;
}

QuiX.ui.Spin.prototype.setBgColor = function(color) {
	this.div.style.backgroundColor = color;
	if (this.div.firstChild)
		this.div.firstChild.style.backgroundColor = color;
}

QuiX.ui.Spin.prototype.getValue = function() {
	return( parseInt(this.div.firstChild.value) );
}

QuiX.ui.Spin.prototype.setValue = function(value) {
	if (value != this.getValue()) {
		this.div.firstChild.value = parseInt(value);
		if (this._customRegistry.onchange)
			this._customRegistry.onchange(this);
	}
}

QuiX.ui.Spin._onkeypress = function(evt, w) {
	var keycode = (QuiX.utils.BrowserInfo.family=='ie')?
        evt.keyCode:evt.charCode;
	if (!(keycode>47 && keycode<58) && keycode!=0)
		QuiX.cancelDefault(evt);
}

QuiX.ui.Spin._btnup_onclick = function(evt, w) {
	var oSpin = w.parent;
	var val = oSpin.getValue() + oSpin.step;
	if (!isNaN(val)) {
		if (oSpin.validate(val)==0)
			oSpin.setValue(val);
	}
}

QuiX.ui.Spin._btndown_onclick = function(evt, w) {
	var oSpin = w.parent;
	var val = oSpin.getValue() - oSpin.step;
	if (!isNaN(val)) {
		if (oSpin.validate(val)==0)
			oSpin.setValue(val);
	}
}
