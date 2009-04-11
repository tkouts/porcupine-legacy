/************************
Tab Pane
************************/

QuiX.ui.TabPane = function(params) {
	params = params || {};
	this.base = Widget;
	params.overflow = 'hidden';
	this.base(params);
	this.div.className = 'tabpane';
	
	this.tabs = [];
	this.activeTab = params.active || 0;
}

QuiX.constructors['tabpane'] = QuiX.ui.TabPane;
QuiX.ui.TabPane.prototype = new QuiX.ui.Widget;
// backwards compatibility
var TabPane = QuiX.ui.TabPane;

QuiX.ui.TabPane.prototype.addTab = function(params) {
	var oTab = new QuiX.ui.Label({
		border : 1,
		padding : '6,6,4,6',
		overflow : 'hidden',
		height : 26,
		caption : params.caption,
		onclick : Tab__click,
		onmouseover : Tab__mouseover,
		onmouseout : Tab__mouseout
	});
	this.appendChild(oTab);
	oTab.redraw();
	oTab.setDisplay('inline');
	oTab.setPosition('relative');
	oTab.div.className = 'tab';

	params.top = 24;
	params.height = 'this.parent.getHeight()-24';
	params.width = '100%';
	params.border = 1;
	params.padding = params.padding || '8,8,8,8';
	params.overflow = 'auto';

	var w = new QuiX.ui.Widget(params);
	this.appendChild(w);
	w.redraw();
	w.div.className = 'tabpage';
	w.tabButton = oTab;
	w.destroy = Tab__destroy;
	w.onactivate = params.onactivate;
	
	this.tabs.push(w);
	if ((this.tabs.length - 1) >= this.activeTab)
		this.activateTab(this.activeTab);
	if (this.activeTab == this.tabs.length - 1)
		oTab.top = -2;
	return(w);
}

QuiX.ui.TabPane.prototype.activateTab = function(tab) {
	var activeTabButton;
	var iActive = this.activeTab;
	var iTab;
	if (typeof tab == 'number')
		iTab = tab;
	else {
		for (iTab=0; iTab<this.tabs.length; iTab++)
			if (this.tabs[iTab] == tab) break;
	}
	
	var oTab = this.tabs[iTab];
	oTab.bringToFront();
	oTab.show();
	oTab.redraw();
	
	oTab.tabButton.bringToFront();
	oTab.tabButton.div.style.top='-2px';
	oTab.tabButton.div.className='tab';
	oTab.tabButton.div.style.cursor='default';
	oTab.tabButton.detachEvent('onmouseout');
	oTab.tabButton.detachEvent('onmouseover');
	oTab.tabButton.detachEvent('onclick');
	
	if (iActive != iTab) {
		activeTabButton = this.tabs[iActive].tabButton;
		activeTabButton.div.style.top=0;
		activeTabButton.attachEvent('onmouseout');
		activeTabButton.attachEvent('onmouseover');
		activeTabButton.attachEvent('onclick');
		activeTabButton.div.style.cursor='';
		this.tabs[iActive].hide();
	}
	
	this.activeTab = iTab;
	if ((this.tabs.length==1 || iActive!=iTab) && oTab.onactivate) {
		QuiX.getEventListener(oTab.onactivate)(this, iTab);
	}
}

function Tab__destroy() {
	var oTab = this.parent;
	for (var idx=0; idx < oTab.tabs.length; idx++) {
		 if (oTab.tabs[idx] == this)
		 	break;
	}
	if (idx > 0)
		oTab.activateTab(idx - 1);
	else {
		if (oTab.tabs.length > 1)
			oTab.activateTab(1);
		oTab.activeTab = 0;
	}
	oTab.tabs.splice(idx, 1);
	this.tabButton.destroy();
	Widget.prototype.destroy.apply(this, arguments);
}

function Tab__mouseover(evt, w) {
	w.div.className = 'tab over';
}

function Tab__mouseout(evt, w) {
	w.div.className = 'tab';
}

function Tab__click(evt, w) {
	var oTabPane = w.parent;
	for (var iTab=0; iTab<oTabPane.tabs.length; iTab++) {
		if (oTabPane.tabs[iTab].tabButton == w)
			break;
	}
	oTabPane.activateTab(iTab);
}