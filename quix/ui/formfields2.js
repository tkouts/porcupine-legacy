/************************
Field controls 2
************************/

// combo box
QuiX.ui.Combo = function(/*params*/) {
	var params = arguments[0] || {};
	params.bgcolor = params.bgcolor || 'white';
	params.border = params.border || 1;
	params.overflow = 'hidden';
	params.height = params.height || 22;
	
	this.base = QuiX.ui.Widget;
	this.base(params);
	
	this.name = params.name;
	this.editable = (params.editable=='true'||params.editable==true);
	this.readonly = (params.readonly=='true'||params.readonly==true);
	this.menuHeight = parseInt(params.menuheight) || 100;
	this.div.className = 'field';
	this.selection = null;
	this.isExpanded = false;
	this.attachEvent('onmousedown', QuiX.stopPropag);
	
	var e = ce('INPUT');
	e.style.padding = '1px';
	e.style.position = 'absolute';
	this.div.appendChild(e);
	e.onselectstart = QuiX.stopPropag;
	
	var oCombo = this;
	
	this.dropdown = new QuiX.ui.Widget({
		border : 1,
		onclick : function(evt, w) {
			w.close();
		},
		onmousedown : QuiX.stopPropag
	});
	this.dropdown.combo = this;
	this.dropdown.minw = 60;
	this.dropdown.minh = 50;
	this.dropdown.div.className = 'combodropdown';
	this.dropdown.close = function() {
		document.desktop.overlays.removeItem(this);
		oCombo.isExpanded = false;
		this.detach();
	};
	
	var cont = new QuiX.ui.Widget({
		width : '100%',
		height: '100%',
		overflow: 'auto',
		onmousedown : QuiX.cancelDefault
	});
	this.dropdown.appendChild(cont);
	cont.div.style.overflowX = 'hidden';
	this.options = cont.widgets;

	var resizer = new QuiX.ui.Widget({
		left : 'this.parent.getWidth(false, memo)-16',
		top : 'this.parent.getHeight(false, memo)-16',
		width : 16,
		height : 16,
		border : 0,
		overflow : 'hidden'
	});
	this.dropdown.appendChild(resizer);
	resizer.div.className = 'resize';
	resizer.attachEvent('onclick', QuiX.stopPropag);
	resizer.attachEvent('onmousedown', function(evt){
		oCombo.dropdown._startResize(evt);
		QuiX.cancelDefault(evt);
	});
	
	this.button = new QuiX.ui.Button({
		left : 'this.parent.getWidth(false, memo)-20',
		height : '100%', width : 20,
		img : params.img || '$THEME_URL$images/desc8.gif'
	});
	this.appendChild(this.button);
	if (!this.readonly)
		this.button.attachEvent('onclick', ComboBtn__onclick);
	
	if (this.editable) {
		e.value = (params.value)?params.value:'';
		if (!this.readonly) {
			e.onfocus = function() {
				oCombo._old_value = this.value;
			}
			e.onblur = function() {
				if (oCombo._old_value != this.value) {
					if (oCombo._customRegistry.onchange)
						QuiX.getEventListener(oCombo._customRegistry.onchange)
                             (oCombo);
				}
			}
		}
		else
			e.readonly = true;
	}
	else {
		e.readOnly = true;
		e.style.cursor = 'default';
		this._set = false;
		if (!this.readonly) e.onclick = ComboBtn__onclick;
	}
	
	if (this._isDisabled)
		this.disable();
}

QuiX.constructors['combo'] = QuiX.ui.Combo;
QuiX.ui.Combo.prototype = new QuiX.ui.Widget;
QuiX.ui.Combo.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange']);
// backwards compatibility
var Combo = QuiX.ui.Combo;

QuiX.ui.Combo.prototype._adjustFieldSize = function(memo) {
	if (this.div.firstChild) {
		var nh = this.getHeight(false, memo) - 2;
		var nw = this.getWidth(false, memo) - 22;
		this.div.firstChild.style.width = (nw>0?nw:0) + 'px';
		this.div.firstChild.style.height = nh + 'px';
	}
}

QuiX.ui.Combo.prototype._setCommonProps = function(memo) {
	Widget.prototype._setCommonProps.apply(this, arguments);
	this._adjustFieldSize(memo);
}

QuiX.ui.Combo.prototype.getValue = function() {
	if (this.editable)
		return this.div.firstChild.value;
	else {
		if (this.selection)
			return this.selection.value;
		else
			return null;
	}
}

QuiX.ui.Combo.prototype.setValue = function(value) {
	if (this.editable){
		this.div.firstChild.value = value;
		if (this._old_value != value) {
			if (this._customRegistry.onchange)
				QuiX.getEventListener(this._customRegistry.onchange)(this);
		}		
		this._old_value = value;
	}
	else {
		var opt, opt_value;
		var old_value = this.getValue();
		this.selection = null;
		this.div.firstChild.value = '';
		for (var i=0; i<this.options.length; i++) {
			this.options[i].selected = false;
		}
		for (i=0; i<this.options.length; i++) {
			opt = this.options[i];
			opt_value = (opt.value!=undefined)?opt.value:opt.getCaption();
			if (opt_value == value) {
				this.selection = opt;
				opt.selected = true;
				this.div.firstChild.value = opt.getCaption();
				if ((this._set || old_value == null)
                        && (value != old_value)
                        && this.div.clientWidth)
					if (this._customRegistry.onchange)
						QuiX.getEventListener(
                            this._customRegistry.onchange)(this);
				break;
			}
		}
		this._set = true;
	}
}

QuiX.ui.Combo.prototype.enable = function() {
	if (this.div.firstChild) {
		this.div.firstChild.disabled = false;
		this.div.firstChild.style.backgroundColor = '';
		if (!this.readonly) this.div.firstChild.onclick = ComboBtn__onclick;
	}
	QuiX.ui.Widget.prototype.enable.apply(this, arguments);
}

QuiX.ui.Combo.prototype.disable = function() {
	if (this.div.firstChild) {
		this.div.firstChild.disabled = true;
		this.div.firstChild.style.backgroundColor = 'menu';
		if (!this.readonly) this.div.firstChild.onclick = null;
	}
	QuiX.ui.Widget.prototype.disable.apply(this, arguments);
}

QuiX.ui.Combo.prototype.selectOption = function(option) {
	var value = (option.value!=undefined)?option.value:option.getCaption();
	this.setValue(value);
}

QuiX.ui.Combo.prototype.reset = function() {
	if (this.editable)
		this.div.firstChild.value = '';
	else {
		for (var i=0; i<this.options.length; i++) {
			this.options[i].selected = false;
		}
		this.selection = null;
		this.div.firstChild.value = '';
	}	
}

QuiX.ui.Combo.prototype.clearOptions = function() {
	this.dropdown.widgets[0].clear();
	this.div.firstChild.value = '';
}

QuiX.ui.Combo.prototype.focus = function() {
	this.div.firstChild.focus();
}

QuiX.ui.Combo.prototype.showDropdown = function() {
	var iLeft = this.getScreenLeft();
	var iTop = this.getScreenTop() + this.getHeight(true);

	if (iTop + this.menuHeight > document.desktop.getHeight(true))
		iTop = this.getScreenTop() - this.menuHeight;

	this.dropdown.top = iTop;
	this.dropdown.left = iLeft;
	if (!this.dropdown.width)
		this.dropdown.width = 'this.combo.getWidth(true, memo)';
	this.dropdown.height = this.menuHeight;
	this.dropdown.setBgColor(this.getBgColor());

	document.desktop.appendChild(this.dropdown);
	this.dropdown.redraw();
	document.desktop.overlays.push(this.dropdown);
	this.isExpanded = true;
}

QuiX.ui.Combo.prototype.destroy = function() {
	if (this.isExpanded) this.dropdown.close();
	Widget.prototype.destroy.apply(this, arguments);
}

QuiX.ui.Combo.prototype.setBgColor = function(color) {
	this.div.style.backgroundColor = color;
	if (this.div.firstChild)
		this.div.firstChild.style.backgroundColor = color;
}

QuiX.ui.Combo.prototype.addOption = function(params) {
	params.align = params.align || 'left';
	params.width = '100%';
	params.height = params.height || 24;
	params.overflow = 'hidden';
	var opt = new QuiX.ui.Icon(params);
	opt._isContainer = false;
	opt.selected = false;
	opt.value = params.value;
	this.dropdown.widgets[0].appendChild(opt);
	if ((params.selected=='true' || params.selected == true) && !this.editable)
		this.selectOption(opt);
	opt.attachEvent('onmouseover', ComboOption__mouseover);
	opt.attachEvent('onmouseout', ComboOption__mouseout);
	opt.attachEvent('onclick', ComboOption__onclick);
	opt.setPosition('relative');
	return opt;
}

function ComboOption__mouseover(evt, w) {
	w.div.className = 'option over';
}

function ComboOption__mouseout(evt, w) {
	w.div.className = 'option';
}

function ComboOption__onclick(evt, w) {
	w.parent.parent.combo.selectOption(w);
	w.div.className = 'option';
}

function ComboBtn__onclick(evt, w) {
	var oCombo;
	if (w)
		oCombo = w.parent
	else
		oCombo = QuiX.getParentNode(this).widget;
	if (!oCombo.isExpanded) {
		QuiX.cleanupOverlays();
		oCombo.showDropdown();
	}
	else
		oCombo.dropdown.close();
	QuiX.stopPropag(evt);
}

// auto complete
QuiX.ui.AutoComplete = function(/*params*/) {
	var params = arguments[0] || {};
	params.editable = true;
	this.base = QuiX.ui.Combo;
	this.base(params);
	this.textField = this.div.firstChild;
	this.url = params.url;
	this.method = params.method;
	if (this.url == '/')
		this.url = '';
	
	//hide combo button
	this.widgets[0].hide();
	
	//attach events
	var oAuto = this;
	this.textField.onkeyup = function(evt) {
		evt = evt || event;
		oAuto._captureKey(evt);
	}
}

QuiX.constructors['autocomplete'] = QuiX.ui.AutoComplete;
QuiX.ui.AutoComplete.prototype = new QuiX.ui.Combo;
// backwards compatibility
var AutoComplete = QuiX.ui.AutoComplete;

QuiX.ui.AutoComplete.prototype._getSelection = function(evt) {
	var sel = this.dropdown.widgets[0].getWidgetsByClassName('option over');
	var index = -1;
	if (sel.length > 0) {
		sel = sel[0];
		index = this.options.indexOf(sel);
		sel.div.className = 'option';
	}
	
	switch(evt.keyCode) {
		case 40: 
			if (index + 1 < this.options.length)
				return index + 1;
			return 0;
		case 38: 
			return (index == 0)?this.options.length-1:index-1;
		case 13:
			return index;
	}
}

QuiX.ui.AutoComplete.prototype._getResults = function() {
	var xmlrpc = new QuiX.rpc.XMLRPCRequest(QuiX.root + this.url);
	xmlrpc.oncomplete = this._showResults;
	xmlrpc.callback_info = this;
	xmlrpc.callmethod(this.method, this.textField.value);
}

QuiX.ui.AutoComplete.prototype._showResults = function(oReq) {
	var oAuto = oReq.callback_info;
	oAuto.dropdown.widgets[0].clear();
	if (oReq.response.length > 0) {
		for (var i=0; i<oReq.response.length; i++)
			oAuto.addOption(oReq.response[i]);
		if (!oAuto.isExpanded)
			oAuto.showDropdown();
		oAuto.dropdown.redraw();
	}
	else {
		if (oAuto.isExpanded)
			oAuto.dropdown.close();
	}
}

QuiX.ui.AutoComplete.prototype._captureKey = function(evt) {
	var index, opt;
	if (this.textField.value == '') {
		if (this.isExpanded)
			this.dropdown.close();
		this.dropdown.widgets[0].clear();
		return;
	}

	switch(evt.keyCode)
	{
		case 27: //ESC
		case 39: //Right Arrow
			if (this.isExpanded)
				this.dropdown.close();
			break;
		case 40: // Down Arrow
			if (this.options.length == 0) return;
			if (!this.isExpanded)
				this._getResults();
			else {
				index = this._getSelection(evt);
				opt = this.options[index];
				this.dropdown.widgets[0].div.scrollTop = opt.div.offsetTop - 20;
				opt.div.className = 'option over';
			}
			break;
		case 38: //Up arrow
			index = this._getSelection(evt);
			if (index < 0)
				return;
			if (!this.isExpanded)
				this.showDropdown();
			opt = this.options[index];
			this.dropdown.widgets[0].div.scrollTop = opt.div.offsetTop - 20;
			opt.div.className = 'option over';
			break;
		case 13: // enter
			index = this._getSelection(evt);
			if (!this.isExpanded || index < 0)
				return;
			this.dropdown.close();
			this.selectOption(this.options[index]);
			break;
		default:
			this._getResults();
	}
}

// Select list
QuiX.ui.SelectList  = function(/*params*/) {
	var params = arguments[0] || {};
	params.bgcolor = params.bgcolor || 'white';
	params.border = params.border || 1;
	params.overflow = 'auto';
	this.base = QuiX.ui.Widget;
	this.base(params);
	this.name = params.name;
	this.div.className = 'field';
	this.div.style.overflowX = 'hidden';
	this.multiple = (params.multiple=="true")?true:false;
	this.posts = params.posts || "selected";
	this.options = [];
	this.selection = [];
}

QuiX.constructors['selectlist'] = QuiX.ui.SelectList;
QuiX.ui.SelectList.prototype = new QuiX.ui.Widget;
// backwards compatibility
var SelectList = QuiX.ui.SelectList;

QuiX.ui.SelectList.prototype.addOption = function(params) {
	params.imgalign = 'left';
	params.align = 'left';
	params.width = '100%';
	params.height = params.height || 24;
	params.overflow = 'hidden';
	params.onmousedown = QuiX.getEventWrapper(SelectOption__onmousedown,
											  params.onmousedown);
	var w = new QuiX.ui.Icon(params);
	this.appendChild(w);
	w.selected = false;
	w.value = params.value;
	if (params.selected == 'true' || params.selected == true) {
		this.selectOption(w);
	}
	w.setPosition('relative');
	w.redraw();
	
	this.options.push(w);
	return(w);
}

QuiX.ui.SelectList.prototype.clear = function() {
	for (var i=this.options.length-1; i>=0; i--) {
		this.options[i].destroy();
	}
	this.options = [];
	this.selection = [];
}

QuiX.ui.SelectList.prototype.removeSelected = function() {
	for (var i=0; i<this.selection.length; i++) {
		this.options.removeItem(this.selection[i]);
		this.selection[i].destroy();
	}
	this.selection = [];
}

QuiX.ui.SelectList.prototype.clearSelection = function() {
	for (var i=0; i<this.selection.length; i++) {
		this.deSelectOption(this.selection[i]);
	}
}

QuiX.ui.SelectList.prototype.selectOption = function(option) {
	if (!option.selected) {
		if (!this.multiple)
			this.clearSelection();
		option.div.className = 'optionselected';
		option.selected = true;
		this.selection.push(option);
	}
}

QuiX.ui.SelectList.prototype.deSelectOption = function(option) {
	if (option.selected) {
		option.div.className = 'label';
		option.selected = false;
		this.selection.removeItem(option);
	}
}

QuiX.ui.SelectList.prototype.setValue = function(val) {
    var option;
    if (!val instanceof Array)
        val = [val];
    for (var i=0; i<val.length; i++) {
        option = this.getWidgetsByAttributeValue('value', val[i]);
        if(option.length > 0)
            this.selectOption(option[0]);
        if(!this.multiple)
            break;
    }
}

QuiX.ui.SelectList.prototype.getValue = function() {
    var i;
	var vs = [];
	if (this.posts == 'all') {
		for (i=0; i<this.options.length; i++) {
			vs.push(this.options[i].value);
		}
		return vs;
	}
	else {
		for (i=0; i<this.selection.length; i++) {
			vs.push(this.selection[i].value);
		}
		if (this.multiple)
			return vs;
		else
			return vs[0];
	}
}

function SelectOption__onmousedown(evt, option) {
	var oSelectList = option.parent;
	if (!oSelectList.multiple)
		oSelectList.selectOption(option);
	else {
		if (!evt.shiftKey) {
			oSelectList.clearSelection();
			oSelectList.selectOption(option);
		}
		else
			if (option.selected)
				oSelectList.deSelectOption(option);
			else
				oSelectList.selectOption(option);
	}
}
