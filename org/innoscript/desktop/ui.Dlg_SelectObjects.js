function selectObjectsDialog() {}

selectObjectsDialog.showFolders = function(evt, w) {
	var dialog = w.getParentByType(Dialog);
	var main_box = dialog.body.getWidgetById('vbox_main');
	var btn_search = dialog.body.getWidgetById('btn_search');

	if (w.value == 'off') {
		main_box.height = 0;
	}
	else {
		if (btn_search.value == 'on')
			btn_search.toggle();
		main_box.widgets[0].height = '-1';
		main_box.widgets[1].height = 0;
		main_box.height = '-1';
	}
	main_box.parent.redraw(true);
}

selectObjectsDialog.showSearch = function(evt, w) {
	var dialog = w.getParentByType(Dialog);
	var main_box = dialog.body.getWidgetById('vbox_main');
	var btn_folders = dialog.body.getWidgetById('btn_folders');

	if (w.value == 'off') {
		main_box.height = 0;
	}
	else {
		if (btn_folders.value == 'on')
			btn_folders.toggle();
		main_box.widgets[0].height = 0;
		main_box.widgets[1].height = '-1';			
		main_box.height = 120;
	}
	main_box.parent.redraw(true);
}

selectObjectsDialog.search = function(evt, w) {
	var oDialog = w.getParentByType(Dialog);
	var cc = oDialog.attributes.CC;
	var oRect = w.parent;
	var oTree = w.getParentByType(Box).getWidgetById('tree');
	var sName = oRect.getWidgetById('displayName').getValue();
	var sDesc = oRect.getWidgetById('description').getValue();
	var isDeep = oRect.getWidgetById('deep').getValue();
	var sID = oTree.getSelection().getId();
	var sFrom;
	
	if (isDeep)
		sFrom = "deep('" + sID + "')";
	else
		sFrom = "'" + sID + "'";

	var sCommand = "select id as value, __image__ as img, displayName as caption " +
		"from " + sFrom;
	var conditions = [];
	if (cc!='*') conditions.push(selectObjectsDialog.getConditions(cc));
	if (sName!='') conditions.push("'" + sName + "' in displayName");
	if (sDesc!='') conditions.push("'" + sDesc + "' in description");
	if (conditions.length>0) {
		sCommand += ' where ' + conditions.join(' and ');
	}

	var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root);
	rpc.oncomplete = selectObjectsDialog.refreshList_oncomplete;
	rpc.callback_info = w;
	rpc.callmethod('executeOqlCommand', sCommand);
}

selectObjectsDialog.refreshList = function(treeNodeSelected) {
	var oDialog = treeNodeSelected.tree.getParentByType(Dialog);
	var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root);
	var cc = oDialog.attributes.CC;
	var sOql = "select id as value, __image__ as img, displayName as caption " +
		"from '" + treeNodeSelected.getId() + "'";
	if (cc != '*') sOql += " where " + selectObjectsDialog.getConditions(cc);
	rpc.oncomplete = selectObjectsDialog.refreshList_oncomplete;
	rpc.callback_info = treeNodeSelected.tree;
	rpc.callmethod('executeOqlCommand', sOql);
}

selectObjectsDialog.getConditions = function(s) {
	var lst = s.split('|');
	for (var i=0; i<lst.length; i++)
		lst[i] = "instanceof('" + lst[i] + "')";
	return "(" + lst.join(' or ') + ")";
}

selectObjectsDialog.refreshList_oncomplete = function(req) {
	var oDialog = req.callback_info.getParentByType(Dialog);
	var oSelect = oDialog.getWidgetById("selection");
	var oItems = req.response;
	oSelect.clear();
	for (var i=0; i<oItems.length; i++) {
		oSelect.addOption(oItems[i]);
	}
}
