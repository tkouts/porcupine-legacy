function generic() {}

generic.showObjectProperties = function(evt, w, o, onclose_func) {
	var oWin = w.getParentByType(Window) || w.parent.owner.getParentByType(Window);
	oWin.showWindow(QuiX.root + (o.id || o) + '?cmd=properties',
		function(dialog) {
			if (onclose_func)
				dialog.attachEvent("onclose", onclose_func);
		}
	);
}

generic.submitForm = function(evt, w) {
	var oDialog = w.getParentByType(Dialog);
	var oForm = oDialog.getWidgetsByType(Form)[0];
	oForm.submit(__closeDialog__);
}

generic.openContainer = function(evt, w) {
	document.desktop.parseFromUrl(QuiX.root	+ w.attributes.folderID + '?cmd=list');
}

generic.runApp = function(evt,w) {
	var appUrl = w.attributes.url;
	document.desktop.parseFromUrl(QuiX.root	+ appUrl);
}

generic.getSecurity = function(tabcontrol, itab) {
	var acl_datagrid = tabcontrol.tabs[itab].getWidgetsByType(DataGrid)[0];
	var sObjectURI = tabcontrol.getParentByType(Form).action;
	var xmlrpc = new XMLRPCRequest(sObjectURI);
	xmlrpc.oncomplete = function(req) {
		acl_datagrid.dataSet = req.response;
		acl_datagrid.refresh();
	};
	xmlrpc.callmethod('getSecurity');
}

generic.computeSize = function(obj, value) {
	if (value)
		return Math.round(value/1024) + ' KB';
	else
		return '';
}

generic.getProcessDialog = function(title, steps, oncomplete) {
	var dlg = document.desktop.parseFromString(
		'<dialog xmlns="http://www.innoscript.org/quix" '+
				'title="' + title + '" width="240" height="100" ' +
				'left="center" top="center">' +
			'<prop type="bool" name="canceled" value="0"/>' +
			'<wbody>' +
				'<progressbar id="pb" width="90%" height="24" ' +
						'left="center" top="center" ' +
						'maxvalue="' + steps + '">' +
					'<label align="center" width="100%" height="100%" ' +
						'caption="0%"/>' +
				'</progressbar>' +
			'</wbody>' +
			'<dlgbutton onclick="generic.cancelAction" width="70" ' +
				'height="22" caption="' + document.desktop.attributes.CANCEL + '"/>' +
		'</dialog>', oncomplete);
}

generic.cancelAction = function(evt, w) {
	w.getParentByType(Dialog).attributes.canceled = true;
}
