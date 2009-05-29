/************************
Windows & Dialogs
************************/
// generic event handlers
function __closeDialog__(evt, w) {
	w.getParentByType(Window).close();
}

//Window class
QuiX.ui.Window = function(/*params*/) {
	var params = arguments[0] || {};
	var overflow = params.overflow;
    var padding = params.padding;
	params.border = 1;
	params.padding = '1,1,1,1';
	params.opacity = (QuiX.effectsEnabled)?0:1;
	params.onmousedown = QuiX.getEventWrapper(Window__onmousedown,
		params.onmousedown);
	params.oncontextmenu = QuiX.getEventWrapper(Window__oncontextmenu,
		params.oncontextmenu);
	params.overflow = (QuiX.utils.BrowserInfo.family == 'moz'
        && QuiX.utils.BrowserInfo.OS == 'MacOS')?'auto':'hidden';
	this.base = QuiX.ui.Widget;
	this.base(params);
	this.minw = params.minw || 120;
	this.minh = params.minh || 26;
	this.isMinimized = false;
	this.isMaximized = false;
	this.childWindows = [];
	this.opener = null;
	this._statex = 0;
	this._statey = 0;
	this._statew = 0;
	this._stateh = 0;
	this._childwindows = [];
	this.div.className = 'window';
	var box = new QuiX.ui.Box({
		width : '100%',
		height : '100%',
		orientation : 'v',
		spacing : 0
	});
	this.appendChild(box);
	//title
	this.title = new QuiX.ui.Box({
		height : 22,
		padding :'1,1,1,1',
		childrenalign : 'center',
		onmousedown : WindowTitle__onmousedown
	});
	this.title.div.className = 'header';
	box.appendChild(this.title);
	var t = new QuiX.ui.Icon({
		id : '_t',
		caption : params.title || 'Untitled',
		img : params.img,
		align : 'left',
		style : 'cursor:move'
	});
	this.title.appendChild(t);
	// control buttons
	this._addControlButtons();
	var canClose = (params.close=='true'||params.close==true)?true:false;
	var canMini = (params.minimize=='true'||params.minimize==true)?true:false;
	var canMaxi = (params.maximize=='true'||params.maximize==true)?true:false;
	if (!canMini)
		this.title.getWidgetById('2').hide();
	if (!canMaxi) {
		this.title.getWidgetById('1').hide();
		this.title.detachEvent('ondblclick');
	}
	if (!canClose)
		this.title.getWidgetById('0').hide();
	//client area
	this.body = new QuiX.ui.Widget({
		border : 0,
		overflow : overflow,
        padding : padding
	});
	this.body.div.className = 'body';
	box.appendChild(this.body);
	//status
	var stat = (params.status=="true"||params.status==true)?true:false;
	if (stat)
		this.addStatusBar();
	// resize handle
	var resizable = (params.resizable=="true"||params.resizable==true)?true:false;
	this.setResizable(resizable);
	if (QuiX.effectsEnabled) {
		var effect = new QuiX.ui.Effect({
			id : '_eff_fade',
			type : 'fade-in',
			auto : true,
			steps : 4
		});
		this.appendChild(effect);
		var mini_effect = new QuiX.ui.Effect({
			id : '_eff_mini',
			type : 'wipe-out',
			interval : 10,
			end : 0.1,
			steps : 5,
			oncomplete : Window__onminimize
		});
		this.appendChild(mini_effect);
		var maxi_effect = new QuiX.ui.Effect({
			id : '_eff_maxi',
			type : 'wipe-in',
			interval : 10,
			steps : 5,
			oncomplete : Window__onmaximize
		});
		this.appendChild(maxi_effect);
	}
}

QuiX.constructors['window'] = QuiX.ui.Window;
QuiX.ui.Window.prototype = new QuiX.ui.Widget;
QuiX.ui.Window.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onclose']);
// backwards compatibility
var Window = QuiX.ui.Window;

QuiX.ui.Window.prototype.images = [
	QuiX.getThemeUrl() + 'images/win_close.gif',
	QuiX.getThemeUrl() + 'images/win_max.gif',
	QuiX.getThemeUrl() + 'images/win_min.gif',
	QuiX.getThemeUrl() + 'images/win_close_over.gif',
	QuiX.getThemeUrl() + 'images/win_max_over.gif',
	QuiX.getThemeUrl() + 'images/win_min_over.gif'
];

QuiX.ui.Window.prototype.setIcon = function(sUrl) {
	var icon = this.title.getWidgetById('_t');
	icon.setImageURL(sUrl);
	icon.redraw(true);
}

QuiX.ui.Window.prototype.getIcon = function() {
	var icon = this.title.getWidgetById('_t');
	return icon.getImageURL();
}

QuiX.ui.Window.prototype.setResizable = function(bResizable) {
	var oWindow = this;
	if (bResizable && !this._resizer) {
		this._resizer = new QuiX.ui.Widget({
			left : 'this.parent.getWidth(false, memo)-16',
			top : 'this.parent.getHeight(false, memo)-16',
			width : 16,
			height : 16,
			border : 0,
			overflow : 'hidden'
		});
		this.appendChild(this._resizer);
		this._resizer.div.className = 'resize';
		this._resizer.div.style.zIndex = 10000; //stay on top
		this._resizer.attachEvent('onmousedown',
			function(evt){
				oWindow._startResize(evt);
				QuiX.cancelDefault(evt);
				QuiX.stopPropag(evt);
			});
	}
	else if (!bResizable && this._resizer) {
		this._resizer.destroy();
		this._resizer = null;
	}
}

QuiX.ui.Window.prototype._addControlButtons = function() {
	var oControl, img;
	var self = this;
	for (var iWhich=2; iWhich>-1; iWhich--) {
		oControl = new QuiX.ui.Widget({
			id : iWhich.toString(),
			width : 16,
			height : 16,
			onmouseover : self._mouseoverControl,
			onmouseout : self._mouseoutControl
		});
		img = QuiX.getImage(this.images[iWhich]);
		oControl.div.appendChild(img);
		oControl.div.style.cursor = 'default';
		oControl.attachEvent('onmousedown', QuiX.stopPropag);
		this.title.appendChild(oControl);
		switch(iWhich) {
			case 0:
				oControl.attachEvent('onclick', function() {
					if (self.buttonIndex)
						self.buttonIndex = -1;
					self.close();
				});
				break;
			case 1:
				oControl.attachEvent('onclick', function(){self.maximize()});
				this.title.attachEvent('ondblclick', 
					function() {
						if (!self.isMinimized)
							self.maximize();
					});
				break;
			case 2:
				oControl.attachEvent('onclick', function(){self.minimize()});
		}
	}
}

QuiX.ui.Window.prototype.addControlButton = function(iWhich) {
	var oButton = this.title.getWidgetById(iWhich.toString());
	oButton.show();
	this.title.redraw();
}

QuiX.ui.Window.prototype.removeControlButton = function(iWhich) {
	var oButton = this.title.getWidgetById(iWhich.toString());
	oButton.hide();
	this.title.redraw();
}

QuiX.ui.Window.prototype.close = function() {
	QuiX.cleanupOverlays();
	if (this._customRegistry.onclose)
		QuiX.getEventListener(this._customRegistry.onclose)(this);
	while (this.childWindows.length != 0)
		this.childWindows[0].close();
	if (this.opener)
		this.opener.childWindows.removeItem(this);
	if (QuiX.effectsEnabled) {
		var self = this;
		var eff = this.getWidgetById('_eff_fade', true);
		eff.attachEvent('oncomplete', function() {
			self.destroy();
		});
		eff.play(true);
	}
	else	
		this.destroy();
}

QuiX.ui.Window.prototype.setTitle = function(s) {
	var icon = this.title.getWidgetById('_t');
	icon.setCaption(s);
}

QuiX.ui.Window.prototype.getTitle = function() {
	var icon = this.title.getWidgetById('_t');
	return icon.getCaption();
}

QuiX.ui.Window.prototype.addStatusBar = function() {
	if (!this.statusBar) {
		this.statusBar = new QuiX.ui.Label({
			height: 20,
			padding: '4,0,0,0',
			border: 1,
			overflow: 'hidden'
		});
		this.statusBar.div.className = 'status';
		this.widgets[0].appendChild(this.statusBar);
	}
}

QuiX.ui.Window.prototype.removeStatusBar = function() {
	if (this.statusBar) {
		this.statusBar.destroy();
		this.statusBar = null;
		this.redraw();
	}
}

QuiX.ui.Window.prototype.setStatus = function(s) {
	if (this.statusBar)
		this.statusBar.setCaption(s);
}

QuiX.ui.Window.prototype.getStatus = function() {
	if (this.statusBar)
		return this.statusBar.getCaption();
    else
        return null;
}

QuiX.ui.Window.prototype._mouseoverControl = function(evt, btn) {
	var id = btn.getId();
	btn.div.childNodes[0].src = Window.prototype.images[parseInt(id) + 3];
}

QuiX.ui.Window.prototype._mouseoutControl = function(evt, btn) {
	var id = btn.getId();
	btn.div.childNodes[0].src = Window.prototype.images[parseInt(id)];
}

QuiX.ui.Window.prototype.minimize = function() {
	var w = this,
		maxControl = w.title.getWidgetById('1'),
		minControl = w.title.getWidgetById('2'),
		childWindow,
		effect;
	if (minControl) {
		w.isMinimized = !w.isMinimized;
		if (w.isMinimized) {
            var i;
			var padding = w.getPadding();
			for (i=1; i<w.widgets[0].widgets.length; i++)
				w.widgets[0].widgets[i].hide();
			if (w._resizer)
				w._resizer.hide();
			w._stateh = w.getHeight(true);
			w.height = w.title.getHeight(true) + 2*w.getBorderWidth() +
				padding[2] + padding[3];
			if (maxControl)
				maxControl.disable();
			for (i=0; i<w.childWindows.length; i++) {
				childWindow = w.childWindows[i];
				if (!childWindow.isHidden()) {
					childWindow.hide();
					w._childwindows.push(childWindow);
				}
			}
			if (QuiX.effectsEnabled) {
				effect = w.getWidgetById('_eff_mini', true);
				effect.play();
			}
			else
				w.redraw();
		}
		else {
			w.bringToFront();
			w.height = w._stateh;
			if (QuiX.effectsEnabled) {
				effect = w.getWidgetById('_eff_maxi', true);
				effect.play();
			}
			else
				Window__onmaximize(w);
			w.redraw();
			
			if (maxControl)
				maxControl.enable();
			while (w._childwindows.length > 0) {
				childWindow = w._childwindows.pop();
				childWindow.show();
			}
		}
	}
}

QuiX.ui.Window.prototype.maximize = function() {
	var w = this;
	var maxControl = w.title.getWidgetById('1');
	var minControl = w.title.getWidgetById('2');
	if (maxControl) {
		if (!w.isMaximized) {
			w._statex = w._calcLeft();
			w._statey = w._calcTop();
			w._statew = w._calcWidth(true);
			w._stateh = w._calcHeight(true);
			w.top = 0; w.left = 0;
			w.height = '100%';
			w.width = '100%';
			if (minControl)
				minControl.disable();
			if (w._resizer)
				w._resizer.disable();
			w.title.detachEvent('onmousedown');
			w.isMaximized = true;
		}
		else {
			w.top = w._statey;
			w.left = w._statex;
			w.width = w._statew;
			w.height = w._stateh;
			if (minControl)
				minControl.enable();
			if (w._resizer)
				w._resizer.enable();
			w.title.attachEvent('onmousedown');
			w.isMaximized = false;
		}
		w.redraw();
	}
}

QuiX.ui.Window.prototype.bringToFront = function() {
	QuiX.cleanupOverlays();
	if (this.div.style.zIndex < this.parent.maxz) {
		var sw, dt, i;
		var macff = QuiX.utils.BrowserInfo.family == 'moz'
            && QuiX.utils.BrowserInfo.OS == 'MacOS';
		Widget.prototype.bringToFront.apply(this, arguments);
		if (macff) {
			dt = document.desktop;
			//hide scrollbars
			sw = dt.query('/(auto|scroll)/.exec(w.getOverflow()) != param', null);
			for (i=0; i<sw.length; i++) {
				if (sw[i] != this.parent)
					sw[i].div.style.overflow = 'hidden';
			}
			//restore scrollbars
			for (i=0; i<sw.length; i++)
				sw[i].setOverflow(sw[i]._overflow);
		}
	}
}

QuiX.ui.Window.prototype.showWindow = function(sUrl, oncomplete) {
	var oWin = this;
	this.parent.parseFromUrl(sUrl,
		function(w) {
			oWin.childWindows.push(w);
			w.opener = oWin;
			if (oncomplete) oncomplete(w);
		}
	);
}

Window.prototype.showWindowFromString = function(s, oncomplete) {
	var oWin = this;
	this.parent.parseFromString(s, 
		function(w) {
			oWin.childWindows.push(w);
			w.opener = oWin;
			if (oncomplete) oncomplete(w);
		}
	);
}

WindowTitle__onmousedown = function(evt, w) {
	QuiX.cleanupOverlays();
	QuiX.stopPropag(evt);
	QuiX.cancelDefault(evt);
    w.parent.parent.bringToFront();
	w.parent.parent._startMove(evt);
}

Window__onmousedown = function(evt, w) {
	if (QuiX.getMouseButton(evt) == 0) {
		w.bringToFront();
		QuiX.stopPropag(evt);
	}
	QuiX.cancelDefault(evt);
	QuiX.cleanupOverlays();
}

Window__oncontextmenu = function(evt, w) {
	QuiX.stopPropag(evt);
	return false;
}

Window__onminimize = function(eff) {
	eff.parent.div.style.clip = 'rect(auto,auto,auto,auto)';
	eff.parent.redraw();
}

Window__onmaximize = function(w) {
	if (!(w instanceof Window))
		w = w.parent;
	for (var i=1; i<w.widgets[0].widgets.length; i++)
		w.widgets[0].widgets[i].show();
	if (w._resizer)
		w._resizer.show();
}

//Dialog class
QuiX.ui.Dialog = function(/*params*/) {
    var params = arguments[0] || {};
	var stat = params.status || false;
	var resizable = params.resizable || false;
	
	params.status = false;
	params.resizable = false;
	params.onkeypress = Dialog__keypress;
		
	this.base = QuiX.ui.Window;
	this.base(params);

	this.footer = new QuiX.ui.Widget({
		height : 32,
		padding : '0,0,0,0',
		overflow : 'hidden',
		onclick : QuiX.stopPropag
	});
	this.widgets[0].appendChild(this.footer);
	
	this.buttonHolder = new QuiX.ui.Widget({
		top : 0,
		height : '100%',
		width : 0,
		border : 0,
		overflow:'hidden'
	});
	this.buttonHolder.redraw = Dialog__buttonHolderRedraw;
	
	this.setButtonsAlign(params.align);
	this.footer.appendChild(this.buttonHolder);
	this.buttons = this.buttonHolder.widgets;
	
	//status
	if (stat.toString()=='true')
		this.addStatusBar();

	// resize handle
	if (resizable.toString()=='true')
		this.setResizable(true);
	
	this.buttonIndex = -1;
	this.defaultButton = null;
}

QuiX.constructors['dialog'] = QuiX.ui.Dialog;
QuiX.ui.Dialog.prototype = new QuiX.ui.Window;
// backwards compatibility
var Dialog = QuiX.ui.Dialog;

QuiX.ui.Dialog.prototype.setButtonsAlign = function(sAlign) {
	var left;
	switch (sAlign) {
		case 'left':
			left = 0;
			break;
		case 'center':
			left = 'center';
			break;
		default:
			left = 'this.parent.getWidth(false, memo)-this.getWidth(true, memo)';
	}
	this.buttonHolder.left = left;
	this.buttonHolder.redraw();
}

QuiX.ui.Dialog.prototype.addButton = function(params) {
	params.top = 'center';
	var oWidget = new QuiX.ui.DialogButton(params, this);
	this.buttonHolder.appendChild(oWidget);
	this.buttonHolder.redraw();
	if (params['default'] == 'true') {
		this.defaultButton = oWidget;
		this.defaultButton.widgets[0].div.className='l2default';
	}
	return oWidget;
}

function Dialog__keypress(evt, w) {
	if (evt.keyCode==13 && w.defaultButton)
		w.defaultButton.click();
	else if (evt.keyCode==27 && w.title.getWidgetById('0'))
		w.close();
}

function Dialog__buttonHolderRedraw(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
	var iOffset = 0;
	for (var i=0; i<this.widgets.length; i++) {
		this.widgets[i].left = iOffset;
		iOffset += this.widgets[i].getWidth(true, memo) + 8;
	}
	this.width = iOffset;
	QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

QuiX.ui.DialogButton = function(params, dialog) {
	this.base = QuiX.ui.Button;
	this.base(params);
	this.dialog = dialog;
}

QuiX.ui.DialogButton.prototype = new QuiX.ui.Button;
// backwards compatibility
var DialogButton = QuiX.ui.DialogButton;

QuiX.ui.DialogButton.prototype._registerHandler = function(eventType, handler,
                                                           isCustom) {
	var wrapper;
	if (handler && handler.toString().lastIndexOf(
            'return handler(evt || event, self)') == -1)
		wrapper = function(evt, w) {
			w.dialog.buttonIndex = w.dialog.buttons.indexOf(w);
			handler(evt, w);
		}
	wrapper = wrapper || handler;
	QuiX.ui.Widget.prototype._registerHandler.apply(this,
        [eventType, wrapper, isCustom]);
}
