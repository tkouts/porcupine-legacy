/************************
Toolbars
************************/

QuiX.ui.Toolbar = function(/*params*/) {
	var params = arguments[0] || {};
	this.base = QuiX.ui.Widget;
	params.padding = params.padding || '2,4,0,0';
	params.border = params.border || 1;
	params.overflow = 'hidden';
	this.base(params);
	this.div.className = 'toolbar';
	this.handle = new Widget({width:4,height:"100%",border:0,overflow:'hidden'});
	this.appendChild(this.handle);
	this.handle.div.className = 'handle';

	var iSpacing = params.spacing || 4;
	this.spacing = parseInt(iSpacing);
	this.buttons = [];
}

QuiX.constructors['toolbar'] = QuiX.ui.Toolbar;
QuiX.ui.Toolbar.prototype = new QuiX.ui.Widget;
// backwards compatibility
var Toolbar = QuiX.ui.Toolbar;

QuiX.ui.Toolbar.prototype._getOffset = function(oButton) {
	var offset = 0;
	for (var i=0; i<this.buttons.length; i++) {
		if (this.buttons[i]==oButton)
			break;
		offset += this.buttons[i]._calcWidth(true) + this.spacing;
	}
	return(offset + this.handle._calcWidth(true) + 4);
}

QuiX.ui.Toolbar.prototype.addButton = function(params) {
	params.left = "this.parent._getOffset(this)";
	params.height = "100%";
	var oButton = new QuiX.ui.FlatButton(params);
	oButton.destroy = ToolbarButton__destroy;
	this.appendChild(oButton);
	this.buttons.push(oButton);
	return(oButton);
}

QuiX.ui.Toolbar.prototype.addSeparator = function() {
	var oSep = new QuiX.ui.Widget({
        left : 'this.parent._getOffset(this)',
        width : 2,
        height : "100%",
        border : 1,
        overflow : 'hidden'
    });
	oSep._isContainer = false;
	oSep.destroy = ToolbarButton__destroy;
	this.appendChild(oSep);
	oSep.div.className = 'separator';
	this.buttons.push(oSep);
	return(oSep);
}

function ToolbarButton__destroy() {
	var parent = this.parent;
	parent.buttons.removeItem(this);
	if (this.base)
		this.base.prototype.destroy.apply(this, arguments);
	else
		Widget.prototype.destroy.apply(this, arguments);
	parent.redraw();
}

QuiX.ui.OutlookBar = function(/*params*/) {
	var params = arguments[0] || {};
	this.base = QuiX.ui.Widget;
	params.overflow = 'hidden';
	this.base(params);
	this.div.className = 'outlookbar';
	
	this.headerHeight = params.headerheight || 20;
	this.panes = [];
	this.activePane = 0;
}

QuiX.constructors['outlookbar'] = QuiX.ui.OutlookBar;
QuiX.ui.OutlookBar.prototype = new QuiX.ui.Widget;
// backwards compatibility
var OutlookBar = QuiX.ui.OutlookBar;

QuiX.ui.OutlookBar.prototype.addPane = function(params) {
	var header = new QuiX.ui.Label({
		width : "100%",
		height : this.headerHeight,
		border : 1,
		padding : '2,2,2,2',
		overflow : 'hidden',
		caption : params.caption,
		align : params.align || 'center'
	});
	this.appendChild(header);
	header.setPosition('relative');
	header.div.className = 'tool';
	header.attachEvent('onclick', OutlookBarHeader__onclick);

	params.width = '100%';
	params.height = 'this.parent.getHeight(true, memo)-' +
        'this.parent.panes.length*this.parent.headerHeight';

	var w1 = new QuiX.ui.Widget(params);
	
	this.appendChild(w1);

	if (this.panes.length!=0)
		w1.hide();
	w1.setPosition('relative');

	this.panes.push(w1);

	w1.header = header;
	w1.onactivate = QuiX.getEventListener(params.onactivate);
	w1.setCaption = OutlookBarPane__setCaption;
	w1.getCaption = OutlookBarPane__getCaption;
	w1.destroy = OutlookBarPane__destroy;
	return(w1);
}

QuiX.ui.OutlookBar.prototype.activatePane = function(iPane) {
	if (this.activePane != iPane) {
		if (this.activePane > -1)
			this.panes[this.activePane].hide();
		this.panes[iPane].show();
		this.redraw(true);
		this.activePane = iPane;
		if (this.panes[iPane].onactivate)
			this.panes[iPane].onactivate(this.panes[iPane]);
	}
}

function OutlookBarHeader__onclick(evt, w) {
	var oBar = w.parent;
	for (var i=0; i<oBar.panes.length; i++) {
		if (oBar.panes[i].header == w) {
			oBar.activatePane(i);
			return;
		}
	}
}
function OutlookBarPane__setCaption(sCaption) {
	this.header.setCaption(sCaption);
}

function OutlookBarPane__getCaption() {
	return this.header.getCaption();
}

function OutlookBarPane__destroy() {
	var oBar = this.parent;
	oBar.panes.removeItem(this);
	if (oBar.panes.length < oBar.activePane + 1)
		oBar.activePane = oBar.panes.length - 1;
	this.header.destroy();
	if (this.base)
		this.base.prototype.destroy.apply(this, arguments);
	else
		QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
	oBar.redraw();
}