/************************
Menus
************************/
//menu option
QuiX.ui.MenuOption = function(params) {
	params.height = params.height || 21;
	params.imgalign = 'left';
	params.width = null;
	params.overflow = 'visible';
	params.padding = '4,0,3,2';
	params.onmouseover = MenuOption__onmouseover;
	params.onclick = QuiX.wrappers.eventWrapper(params.onclick,
                                                MenuOption__onclick);

	this.base = QuiX.ui.Icon;
	this.base(params);
	this.div.style.whiteSpace = 'nowrap';
	this.setPosition('relative');

	this.subMenu = null;
	this.type = params.type;
	this.selected = (params.selected=='true' || params.selected==true);
}

QuiX.ui.MenuOption.prototype = new QuiX.ui.Icon;
// backwards compatibility
var MenuOption = QuiX.ui.MenuOption;

QuiX.ui.MenuOption.prototype.addOption = function(params) {
	if (!this.subMenu)
		this.subMenu = new ContextMenu({}, this);
	return this.subMenu.addOption(params);
}

QuiX.ui.MenuOption.prototype.redraw = function(bForceAll /*, memo*/) {
	if (this.subMenu)
		this.div.className = 'option submenu';
	else
		this.div.className = 'option';

	if (this.type) {
		if (this.selected) {
			switch (this.type) {
				case 'radio':
					this.img = '$THEME_URL$images/menu_radio.gif';
					break;
				case 'check':
					this.img = '$THEME_URL$images/menu_check.gif';
			}
		}
		else
			this.img = null;
		bForceAll = true;
	}
	if (!this.img)
		this.setPadding([24,8,3,2]);
	else
		this.setPadding([5,8,3,2]);
    
	QuiX.ui.Icon.prototype.redraw.apply(this, arguments);
}

QuiX.ui.MenuOption.prototype.destroy = function() {
	var parent = this.parent;
	parent.options.removeItem(this);
	if (this.base)
		this.base.prototype.destroy.apply(this, arguments);
	else
		QuiX.ui.Widget.prototype.destroy.apply(this, arguments);

	if (parent.options.length==0 && parent.owner instanceof MenuOption) {
		parent.owner.subMenu = null;
		parent.close();
		parent.destroy();
		parent = null;
	}
	
	if (parent) parent.redraw();
}

QuiX.ui.MenuOption.prototype.select = function() {
	switch (this.type) {
		case 'radio':
			if (!this.selected) {
				var id = this.getId();
				if (id) {
					var oOptions = this.parent.getWidgetById(id);
					if (oOptions.length) {
						for(var i=0; i<oOptions.length; i++)
							oOptions[i].selected = false;
					}
					else
						oOptions.selected = false;
				}
				this.selected = true;
			}
			break;
		case 'check':
			this.selected = !this.selected;
	}
}

QuiX.ui.MenuOption.prototype.expand = function() {
	if (this.parent.activeSub && this.parent.activeSub != this.subMenu) {
		this.parent.activeSub.close();
	}
	if (this.subMenu && !this.subMenu.isOpen) {
		this.parent.activeSub = this.subMenu;
		this.subMenu.show(
			this.parent,
			this.getWidth(true),
			this.getScreenTop() - this.parent.getScreenTop() );
		
		if (this.subMenu.getScreenTop() + this.subMenu.height >
                document.desktop.getHeight(true)) {
			this.subMenu.top -= this.subMenu.getScreenTop() +
                                this.subMenu.height -
                                document.desktop.getHeight(true);
			this.subMenu.redraw();
		}
		
		if (this.subMenu.getScreenLeft() + this.subMenu.width >
                document.desktop.getWidth(true)) {
			this.subMenu.left = - this.subMenu.width;
			this.subMenu.redraw();
		}
	}
}

function MenuOption__onmouseover(evt, w) {
	w.expand();
}

function MenuOption__onclick(evt, w) {
	if (w.type) w.select();
    if (QuiX.utils.BrowserInfo.family == 'ie' && !w.subMenu) {
        // clear hover state
        var dv = w.div.cloneNode(true);
        w.div.parentNode.replaceChild(dv, w.div);
        w.div = dv;
    }
    if (!w.subMenu)
        QuiX.cleanupOverlays();
}

//context menu
QuiX.ui.ContextMenu = function(params, owner) {
	this.base = QuiX.ui.Widget;
	this.base({
		id : params.id,
		width : 100,
		border : 1,
		overflow : 'visible',
		onmousedown : QuiX.stopPropag,
		onshow : params.onshow,
		onclose : params.onclose
	});
	this.div.className = 'contextmenu';
	if (QuiX.utils.BrowserInfo.family == 'moz'
            && QuiX.utils.BrowserInfo.OS == 'MacOS') {
		var c = new QuiX.ui.Widget({
			width : '100%',
			height : '100%',
			overflow : 'auto'
		});
		this.appendChild(c);
		c = new QuiX.ui.Widget({
			width : '100%',
			height : '100%',
			overflow : 'hidden'
		});
		this.appendChild(c);
	}
	
	var rect = new QuiX.ui.Widget({
		width: '22',
		height: '100%',
		bgcolor: 'silver',
		overflow: 'hidden'
	});
	this.appendChild(rect);
	
	this.options = [];
	this.owner = owner;
	this.target = null;
	
	owner.contextMenu = this;
	owner.attachEvent('oncontextmenu', Widget__contextmenu);
	
	this.activeSub = null;
	this.isOpen = false;
	
	if (QuiX.effectsEnabled) {
		var show_effect = new QuiX.ui.Effect({
			id : '_eff_show',
			type : 'wipe-in',
			steps : 6,
			interval : 10
		});
		this.appendChild(show_effect);
	}
}

QuiX.constructors['contextmenu'] = QuiX.ui.ContextMenu;
QuiX.ui.ContextMenu.prototype = new QuiX.ui.Widget;
QuiX.ui.ContextMenu.prototype.customEvents =
	QuiX.ui.Widget.prototype.customEvents.concat(['onshow', 'onclose']);
// backwards compatibility
var ContextMenu = QuiX.ui.ContextMenu;

QuiX.ui.ContextMenu.prototype.destroy = function() {
	this.owner.detachEvent('oncontextmenu');
	this.owner.contextMenu = null;
	QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
}

QuiX.ui.ContextMenu.prototype.redraw = function(bForceAll /*, memo*/) {
	var oOption, optionWidth;
	var iHeight = 0;
    var memo = arguments[1] || {};
	
	for (var i=0; i<this.options.length; i++) {
		oOption = this.options[i];
		if (oOption instanceof Icon) {
			if (QuiX.utils.BrowserInfo.family == 'ie')
                optionWidth = oOption.div.getElementsByTagName('SPAN')[0].offsetWidth + 26;
			else
				optionWidth = oOption.div.offsetWidth;
			oOption.width = '100%';
			if (optionWidth + 2 > this.width)
				this.width = optionWidth + 16;
		}
		iHeight += oOption.div.offsetHeight;
	}
	
	this.height = iHeight + 2;
	
	if (this.top + this.height > document.desktop.getHeight(true, memo))
		this.top = this.top - this.height;
	if (this.left + this.width > document.desktop.getWidth(true, memo))
		this.left = this.left - this.width;

	QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

QuiX.ui.ContextMenu.prototype.show = function(w, x, y) {
	if (!this.isOpen) {
		var bShow = true;
		if (this._customRegistry.onshow) {
			var r = this._customRegistry.onshow(this);
			bShow = (r==false)?false:true;
		}
		if (bShow) {
			this.left = x;
			this.top = y;
			w.appendChild(this);
			this.div.style.zIndex = QuiX.maxz;
			if (QuiX.effectsEnabled) {
				var effect = this.getWidgetById('_eff_show');
				effect.play();
			}
			this.redraw();
			if (w == document.desktop)
				document.desktop.overlays.push(this);
			this.isOpen = true;
		}
	}
}

QuiX.ui.ContextMenu.prototype.close = function() {
	if (this.activeSub) {
		this.activeSub.close();
	}
	if (this.owner.parent && this.owner.parent.activeSub)
		this.owner.parent.activeSub = null;
	if (this.parent == document.desktop)
		document.desktop.overlays.removeItem(this);
	this.detach();
	this.isOpen = false;
	if (this._customRegistry.onclose)
		this._customRegistry.onclose(this);
}

QuiX.ui.ContextMenu.prototype.addOption = function(params) {
	var oOption;
	if (params != -1) { //not a separator
        params.align = (QuiX.dir != 'rtl')?'left':'right';
		oOption = new QuiX.ui.MenuOption(params);
	}
	else {
		oOption = new QuiX.ui.Widget({
			width : 'this.parent.getWidth(false, memo) - 22',
			height : 2,
			left : (QuiX.dir != 'rtl')?22:-22,
			border : 1,
			overflow : 'hidden'
		});
		oOption.destroy = MenuOption.prototype.destroy;
		oOption.div.className = 'separator';
		oOption.setPosition('relative');
	}
	this.appendChild(oOption);
	oOption.redraw();
	
	this.options.push(oOption);
	return oOption;
}

function Widget__contextmenu(evt, w) {
    var x = evt.clientX;
    if (QuiX.dir == 'rtl')
        x = QuiX.transformX(x);
	w.contextMenu.target = QuiX.getTargetWidget(evt);
	w.contextMenu.show(document.desktop, x, evt.clientY);
	QuiX.cancelDefault(evt);
}

// Menu Bar
QuiX.ui.MenuBar = function(/*params*/) {
	var params = arguments[0] || {};
	params.border = params.border || 1;
	params.padding = '2,4,0,1';
	params.overflow = 'hidden';
	this.base = QuiX.ui.Widget;
	this.base(params);
	this.div.className = 'menubar';
	var iSpacing = params.spacing || 2;

	this.spacing = parseInt(iSpacing);
	this.menus = [];
}

QuiX.constructors['menubar'] = QuiX.ui.MenuBar;
QuiX.ui.MenuBar.prototype = new QuiX.ui.Widget;
// backwards compatibility
var MBar = QuiX.ui.MenuBar;

QuiX.ui.MenuBar.prototype.redraw = function(bForceAll /*, memo*/) {
	for (var i=0; i<this.menus.length; i++) {
		 this.menus[i].div.style.marginRight = this.spacing + 'px';
	}
	QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
}

QuiX.ui.MenuBar.prototype.addRootMenu = function(params) {
	var oMenu = new QuiX.ui.Label({
		top : 'center',
		border : 0,
		padding : '8,8,3,4',
		caption : params.caption,
		onclick : Menu__click,
		onmouseover : Menu__mouseover,
		onmouseout : Menu__mouseout
	});
	this.appendChild(oMenu);
	oMenu.div.className = 'menu';
	oMenu.setPosition();
	oMenu.destroy = Menu__destroy;
	oMenu.div.style.marginRight = this.spacing + 'px';
	
	this.menus.push(oMenu);

	var oCMenu = new QuiX.ui.ContextMenu(params, oMenu);
	oMenu.contextMenu = oCMenu;
	return(oCMenu);
}

function Menu__destroy() {
	this.parent.menus.removeItem(this);
	Label.prototype.destroy.apply(this, arguments);
}

function Menu__click(evt, w) {
	w.div.className = 'menu selected';
	showWidgetContextMenu(w, w.contextMenu);
	QuiX.stopPropag(evt);
}

function Menu__mouseover(evt, w) {
	w.setBorderWidth(1);
	w.setPadding([7,7,2,3]);
	w.div.className = 'menu over';
}

function Menu__mouseout(evt, w) {
	w.setBorderWidth(0);
	w.setPadding([8,8,3,4]);
	w.div.className = 'menu';
}

function showWidgetContextMenu(w, menu) {
	var nx = w.getScreenLeft();
	var ny = w.getScreenTop() + w.div.offsetHeight;

	menu.show(document.desktop, nx, ny);
	
	if (ny + menu.height > document.desktop.getHeight(true)) {
		menu.top = menu.owner.getScreenTop() - menu.getHeight(true);
		menu.redraw();
	}

	if (nx + menu.width > document.desktop.getWidth(true)) {
		menu.left = menu.owner.getScreenLeft() - menu.getWidth(true);
		menu.redraw();
	}
}
