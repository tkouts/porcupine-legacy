/************************
Field controls 2
************************/

// combo box

QuiX.ui.Combo = function(/*params*/) {
    var params = arguments[0] || {};
    var bgcolor = params.bgcolor;
    delete params.bgcolor;
    params.border = 1;
    params.overflow = 'hidden';
    params.height = params.height || 22;

    QuiX.ui.Widget.call(this, params);

    if (params.rules) {
        this._validator = new QuiX.ui.Validator({
            widget : this,
            rules : params.rules
        });
    }

    this.attachEvent('onunload',
        function(w) {
            if (w.isExpanded) {
                w.dropdown.close();
            }
            if (w._validator && w._validator.parent) {
                w._validator.destroy();
            }
        });

    this.name = params.name;
    this.editable = (params.editable == 'true' || params.editable == true);
    this.readonly = (params.readonly == 'true' || params.readonly == true);
    this.menuHeight = parseInt(params.menuheight) || 100;
    this.div.className = 'combo';
    this.selection = null;
    this.isExpanded = false;

    var e = ce('INPUT');
    e.style.padding = '0px ' + (params.textpadding ||
                                QuiX.theme.combo.textpadding) + 'px';
    e.style.position = 'absolute';
    e.style.zIndex = 1;
    e.style.backgroundColor = bgcolor;

    if (params.tabindex) {
        e.tabIndex = params.tabindex;
    }

    this.div.appendChild(e);

    if (!QuiX.supportTouches) {
        e.onselectstart = QuiX.stopPropag;
    }

    // dropdown
    this.dropdown = QuiX.theme.combo.dropdown.get();
    this.dropdown.combo = this;
    this.dropdown.minw = 60;
    this.dropdown.minh = 50;
    this.dropdown.div.className = 'combodropdown';

    this.dropdown.close = QuiX.ui.Combo._closeDropdown;
    this.dropdown.attachEvent('onclick', QuiX.ui.Combo._dropdown_onclick);

    var container = this.dropdown.getWidgetById('_c');
    this.options = container.widgets;

    var resizer = this.dropdown.getWidgetById('_r');
    resizer.div.className = 'resize';
    resizer.attachEvent('onmousedown', QuiX.ui.Combo._resizer_onmousedown);

    // button
    this.button = QuiX.theme.combo.button.get(params.img);
    this.appendChild(this.button);

    this.attachEvent('onkeydown',
        function(evt, w) {
            if (w.isExpanded && evt.keyCode == 9) {
                w.dropdown.close();
            }
        });

    var self = this;
    if (this.editable) {
        e.value = (params.value)? params.value:'';
        if (this.readonly) {
            e.readonly = true;
        }
        this.div.className += ' editable';
        if (params.prompt) {
            this.setPrompt(params.prompt);
        }
        //this.setBorderWidth(0);
        if (!this.readonly) {
            this.button.attachEvent('onclick', QuiX.ui.Combo._btn_onclick);
        }
    }
    else {
        e.readOnly = true;
        e.style.cursor = 'default';
        if (!this.readonly) {
            this.attachEvent('onclick',
                             QuiX.ui.Combo._btn_onclick);
        }
        this.div.className += ' noneditable';
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
    }

    if (this._isDisabled) {
        this.disable();
    }
}

QuiX.constructors['combo'] = QuiX.ui.Combo;
QuiX.ui.Combo.prototype = new QuiX.ui.Widget;
QuiX.ui.Combo.prototype.__class__ = QuiX.ui.Combo;
QuiX.ui.Combo.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onchange', 'onblur']);

QuiX.ui.Combo._btn_onclick = function(evt, w) {
    var oCombo;

    if (w instanceof QuiX.ui.Combo) {
        oCombo = w;
    }
    else {
        oCombo = w.parent;
    }

    if (!oCombo.isExpanded) {
        oCombo.showDropdown();
    }
    else {
        oCombo.dropdown.close();
    }
}

QuiX.ui.Combo._resizer_onmousedown = function(evt, w) {
    w.parent._startResize(evt);
    QuiX.stopPropag(evt);
}

QuiX.ui.Combo._dropdown_onclick = function(evt, w) {
    w.close();
}

QuiX.ui.Combo._closeDropdown = function() {
    document.desktop.overlays.removeItem(this);
    this.combo.isExpanded = false;
    this.detach();
}

QuiX.ui.Combo._calcDropdownWidth = function(memo) {
    return this.combo._calcWidth(true, memo);
}

QuiX.ui.Combo.prototype.validate = function() {
    if (this._validator) {
        return this._validator.validate();
    }
    return false;
}

QuiX.ui.Combo.prototype.setPrompt = function(prompt) {
    if (this.editable) {
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
                    display: 'none'
                });
                this.appendChild(this._prompt);
                // bring to front
                this._prompt.div.style.zIndex = 2;
                this._prompt.redraw(true);
                if (this.getValue() === '') {
                    this._prompt.show();
                }
                var self = this;
                this.attachEvent('onmousedown',
                    function(){
                        self.focus();
                    });
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

QuiX.ui.Combo.prototype.getPrompt = function() {
    var prompt = '';
    if (this._prompt) {
        prompt = this._prompt.getCaption();
    }
    return prompt;
}

QuiX.ui.Combo.prototype._adjustFieldSize = function(memo) {
    if (this.div.firstChild && this.div.offsetWidth) {
        var input = this.div.firstChild,
            borders = 2 * QuiX.getStyle(input, 'border-top-width') || 0,
            nw = this._calcWidth(false, memo) || 0,
            nh = this._calcHeight(false, memo) || 0,
            bf = QuiX.utils.BrowserInfo.family,
            br = QuiX.utils.BrowserInfo.browser,
            bv = QuiX.utils.BrowserInfo.version;

        if (nh != this._sh) {
            this._sh = nh;
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
            nw -= ((this.button.isHidden())? 0:QuiX.theme.combo.button.width) +
                  parseInt(input.style.paddingLeft || 0) +
                  parseInt(input.style.paddingRight || 0) +
                  borders;
            input.style.width = (nw > 0? nw:0) + 'px';
        }
    }
}

QuiX.ui.Combo.prototype._setCommonProps = function(memo) {
    QuiX.ui.Widget.prototype._setCommonProps.apply(this, arguments);
    this._adjustFieldSize(memo);
}

QuiX.ui.Combo.prototype.getValue = function() {
    if (this.editable) {
        return this.div.firstChild.value;
    }
    else {
        if (this.selection) {
            return this.selection.value;
        }
        else {
            return null;
        }
    }
}

QuiX.ui.Combo.prototype.setValue = function(value) {
    if (this.editable) {
        this.div.firstChild.value = value;
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
            opt_value = (typeof opt.value != 'undefined')? opt.value:opt.getCaption();
            if (opt_value == value) {
                this.selection = opt;
                opt.selected = true;
                if (opt.getCaption()) {
                    this.div.style.backgroundImage = '';
                    this.div.firstChild.value = opt.getCaption();
                }
                else if (opt.img) {
                    this.div.firstChild.style.backgroundImage =
                        "url('" + opt.img + "')";
                    this.div.firstChild.style.backgroundPosition = '50% 50%';
                    this.div.firstChild.style.backgroundRepeat = 'no-repeat';
                }
                break;
            }
        }
    }
}

QuiX.ui.Combo.prototype.enable = function() {
    if (this.div.firstChild) {
        this.div.firstChild.disabled = false;
        this.div.firstChild.style.backgroundColor = '';
    }
    QuiX.ui.Widget.prototype.enable.apply(this, arguments);
}

QuiX.ui.Combo.prototype.disable = function() {
    if (this.div.firstChild) {
        this.div.firstChild.disabled = true;
        this.div.firstChild.style.backgroundColor = 'menu';
    }
    QuiX.ui.Widget.prototype.disable.apply(this, arguments);
}

QuiX.ui.Combo.prototype.selectOption = function(option) {
    var value = (option.value!=undefined)? option.value:option.getCaption();
    this.setValue(value);
}

QuiX.ui.Combo.prototype.reset = function() {
    if (this.editable) {
        this.div.firstChild.value = '';
    }
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

QuiX.ui.Combo.prototype.blur = function() {
    this.div.firstChild.blur();
}

QuiX.ui.Combo.prototype.showDropdown = function() {
    var iLeft = this.getScreenLeft();
    var iTop = this.getScreenTop() + this.getHeight(true);

    if (iTop + this.menuHeight > document.desktop.getHeight(true)) {
        iTop = this.getScreenTop() - this.menuHeight;
    }

    this.dropdown.top = iTop;
    this.dropdown.left = iLeft;
    if (!this.dropdown.width) {
        this.dropdown.width = QuiX.ui.Combo._calcDropdownWidth;
    }
    this.dropdown.height = this.menuHeight;
    this.dropdown.setBgColor(
        this.div.firstChild.style.backgroundColor);

    document.desktop.appendChild(this.dropdown);
    this.dropdown.redraw(true);
    this.dropdown.div.style.zIndex = QuiX.maxz;
    document.desktop.overlays.push(this.dropdown);
    this.isExpanded = true;
}

QuiX.ui.Combo.prototype.setBgColor = function(color) {
    this.div.style.backgroundColor = color;
    if (this.div.firstChild) {
        this.div.firstChild.style.backgroundColor = color;
    }
}

QuiX.ui.Combo.prototype.addOption = function(params) {
    params.align = params.align || ((QuiX.dir != 'rtl')? 'left':'right');
    //params.width = '100%';
    params.height = params.height || 24;
    params.overflow = 'hidden';
    var opt = new QuiX.ui.Icon(params);
    opt.div.className = 'option';
    opt.div.style.textOverflow = 'ellipsis';
    opt.selected = false;
    opt.value = params.value;
    this.dropdown.widgets[0].appendChild(opt);
    if ((params.selected == 'true' || params.selected == true)
            && !this.editable) {
        this.selectOption(opt);
    }
    opt.attachEvent('onclick', QuiX.ui.Combo._option_onclick);
    opt.setPosition('relative');
    return opt;
}

QuiX.ui.Combo._option_onclick = function(evt, option) {
    var combo = option.parent.parent.combo;
    if (!option.selected) {
        combo.selectOption(option);
        combo.trigger('onchange');
        combo.validate();
    }
    
}

// auto complete

QuiX.ui.AutoComplete = function(/*params*/) {
    var params = arguments[0] || {};
    params.editable = true;

    QuiX.ui.Combo.call(this, params);

    this.textField = this.div.firstChild;
    this.url = params.url;
    this.method = params.method;
    this.dataSet = false;

    if (this.url == '/') {
        this.url = '';
    }

    // hide combo button
    this.widgets[0].hide();
    if(params.cachedataset == 'true' || params.cachedataset == true) {
        this._getDataSet();
    }

    // attach events
    var self = this;
    this.textField.onkeyup = function(evt) {
        evt = evt || event;
        self._captureKey(evt);
    }
}

QuiX.constructors['autocomplete'] = QuiX.ui.AutoComplete;
QuiX.ui.AutoComplete.prototype = new QuiX.ui.Combo;
QuiX.ui.AutoComplete.prototype.__class__ = QuiX.ui.AutoComplete;

QuiX.ui.AutoComplete.prototype._getDataSet = function() {
    var rpc = new QuiX.rpc.JSONRPCRequest(this.url, false);
    this.dataSet = rpc.callmethod(this.method);
}

QuiX.ui.AutoComplete.prototype._getDataSetResults = function(value) {
    var ret = [];
    this.dataSet.each(
        function(){
            if (this.indexOf(value) === 0) {
                ret.push(String(this));
            }
        });
    return ret;
}

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
    if(this.dataSet) {
        var res = this._getDataSetResults(this.textField.value);
        this._showResults({
            response : res,
            callback_info : this
        });
    }
    else {
        var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root + this.url);
        rpc.oncomplete = this._showResults;
        rpc.callback_info = this;
        rpc.callmethod(this.method, this.textField.value);
    }
}

QuiX.ui.AutoComplete.prototype._showResults = function(oReq) {
    var oAuto = oReq.callback_info,
        option;

    oAuto.dropdown.widgets[0].clear();

    if (oReq.response.length > 0) {
        for (var i=0; i<oReq.response.length; i++) {
            option = oReq.response[i];
            if (typeof(option) == 'string'){
                option = {
                    caption : option,
                    value : option
                };
            }
            oAuto.addOption(option);
        }
        if (!oAuto.isExpanded) {
            oAuto.showDropdown();
        }
        oAuto.dropdown.redraw(true);
    }
    else {
        if (oAuto.isExpanded) {
            oAuto.dropdown.close();
        }
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
            if (this.isExpanded) {
                this.dropdown.close();
            }
            break;
        case 40: // Down Arrow
            if (this.options.length == 0) return;
            if (!this.isExpanded) {
                this._getResults();
            }
            else {
                index = this._getSelection(evt);
                opt = this.options[index];
                this.dropdown.widgets[0].div.scrollTop = opt.div.offsetTop - 20;
                opt.div.className = 'option over';
            }
            break;
        case 38: //Up arrow
            index = this._getSelection(evt);
            if (index < 0) {
                return;
            }
            if (!this.isExpanded) {
                this.showDropdown();
            }
            opt = this.options[index];
            this.dropdown.widgets[0].div.scrollTop = opt.div.offsetTop - 20;
            opt.div.className = 'option over';
            break;
        case 13: // enter
            index = this._getSelection(evt);
            if (!this.isExpanded || index < 0) {
                return;
            }
            this.dropdown.close();
            this.selectOption(this.options[index]);
            break;
        default:
            this._getResults();
    }
}

// select list

QuiX.ui.SelectList  = function(/*params*/) {
    var params = arguments[0] || {};
    params.bgcolor = params.bgcolor || 'white';
    params.border = params.border || 1;
    params.overflow = 'hidden auto';

    QuiX.ui.Widget.call(this, params);

    if(params.rules) {
        this._validator = new QuiX.ui.Validator({
            widget: this,
            rules: params.rules
        });

        this.attachEvent('onunload',
            function(w){
                if (w._validator.parent) {
                    w._validator.destroy();
                }
            });

        this.attachEvent('onmouseout',
            function(evt, w){
                w.validate();
            });
    }

    this.name = params.name;
    this.div.className = 'field';
    this.multiple = (params.multiple == 'true' ||
                     params.multiple == true)? true:false;
    this.posts = params.posts || "selected";
    this.options = [];
    this.selection = [];
}

QuiX.constructors['selectlist'] = QuiX.ui.SelectList;
QuiX.ui.SelectList.prototype = new QuiX.ui.Widget;
QuiX.ui.SelectList.prototype.__class__ = QuiX.ui.SelectList;
QuiX.ui.SelectList.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onselect']);

QuiX.ui.SelectList.prototype.validate = function() {
    if (this._validator) {
        return this._validator.validate();
    }
    return false;
}

QuiX.ui.SelectList.prototype.addOption = function(params) {
    params.imgalign = 'left';
    params.align = (QuiX.dir != 'rtl')? 'left':'right';
    params.height = params.height || QuiX.theme.selectlist.optionheight;
    params.overflow = 'hidden';
    params.padding = params.padding || QuiX.theme.selectlist.optionpadding;

    var w = new QuiX.ui.Icon(params);
    w.attachEvent('onmousedown', QuiX.ui.SelectList._option_onmousedown);
    this.appendChild(w);

    w.div.style.textOverflow = 'ellipsis';
    w.selected = false;
    w.value = params.value;
    if (params.selected == 'true' || params.selected == true) {
        this.selectOption(w);
    }
    w.setPosition('relative');
    w.redraw();

    w.destroy = QuiX.ui.SelectList._destroy_option;

    this.options.push(w);
    return w;
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
        if (!this.multiple) {
            this.clearSelection();
        }
        option.div.className = 'optionselected';
        option.selected = true;
        this.selection.push(option);
        this.trigger('onselect', this, option);
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
    if (!val instanceof Array) {
        val = [val];
    }
    for (var i=0; i<val.length; i++) {
        option = this.getWidgetsByAttributeValue('value', val[i]);
        if (option.length > 0) {
            this.selectOption(option[0]);
        }
        if (!this.multiple) {
            break;
        }
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
        if (this.multiple) {
            return vs;
        }
        else {
            return vs[0];
        }
    }
}

QuiX.ui.SelectList._destroy_option = function() {
    if (this.selected) {
        this.parent.selection.removeItem(this);
    }
    this.parent.options.removeItem(this);
    QuiX.ui.Icon.prototype.destroy.apply(this, arguments);
}

QuiX.ui.SelectList._option_onmousedown = function(evt, option) {
    var oSelectList = option.parent;
    if (!oSelectList.multiple) {
        oSelectList.selectOption(option);
    }
    else {
        if (!evt.shiftKey) {
            oSelectList.clearSelection();
            oSelectList.selectOption(option);
        }
        else
            if (option.selected) {
                oSelectList.deSelectOption(option);
            }
            else {
                oSelectList.selectOption(option);
            }
    }
}
