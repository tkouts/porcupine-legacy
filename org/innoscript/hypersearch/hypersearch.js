function hypersearch() {}

hypersearch.selectFolder = function(evt, w)
{
	var win = w.getParentByType(Window);
	win.showWindow(QuiX.root + '?cmd=selectcontainer&action=select_folder',
		function(w)
		{
			w.attachEvent("onclose", hypersearch.updateFolder)
		}
	);
}

hypersearch.updateFolder = function(dlg)
{
	if (dlg.buttonIndex == 0) {
		var selection = dlg.getWidgetById("tree").getSelection();
		var id = selection.getId();
		var caption = selection.getCaption();
		dlg.opener.getWidgetById("container_id").setValue(id);
		dlg.opener.getWidgetById("container_name").setValue(caption);
	}
}

hypersearch.updateModifiedMode = function(evt, w)
{
	if (w.getValue() == '3') {
		w.parent.getWidgetById('date_to_box').enable();
		w.parent.getWidgetById('date_from_box').enable();
	}
	else {
		w.parent.getWidgetById('date_to_box').disable();
		w.parent.getWidgetById('date_from_box').disable();
	}
}

hypersearch.search = function(evt, w)
{
	var query = hypersearch.getSearchQuery(w.parent.parent);
	var results_list = w.getParentByType(Window).getWidgetById('searchresults');

    var xmlrpc = new XMLRPCRequest(QuiX.root);
    xmlrpc.oncomplete = function(req)
    {
    	results_list.dataSet = req.response;
    	results_list.refresh();
    }
    xmlrpc.callmethod('executeOqlCommand', query);

}

hypersearch.getSearchQuery = function(w) {
	var query, conditions, date_from, date_to;
	
	var scope = "'" + w.getWidgetById('container_id').getValue() + "'";
	
	if (w.getWidgetById('scope').getValue())
	{
		scope = 'deep(' + scope + ')';
	}
	
    query = "select id, parentid, __image__ as image, displayName, " +
			"size, modified, modifiedBy from " + scope;
    
    conditions = [];
    
    var name = w.getWidgetById('name').getValue();
    var description = w.getWidgetById('description').getValue();
    var modified_mode = w.getWidgetById('modified')[0].getValue();
    
    if (name!='')
    {
    	conditions.push("'" + name + "' in displayName");
    }
    
    if (description!='')
    {
    	conditions.push("'" + description + "' in description");
    }
    
    switch (modified_mode)
    {
    	case '1':
    		date_to = new Date();
    		date_from = new Date(date_to - 604800000);
    		break;
    	case '2':
    		date_to = new Date();
    		date_from = new Date(date_to);
    		date_from.setMonth(date_to.getMonth()-1);
    		break;
    	case '3':
    		date_from = w.getWidgetById('from').getValue();
    		date_to = w.getWidgetById('to').getValue();
    }
    
    if (date_to)
    {
		conditions.push("modified between date('" + date_from.toIso8601() +
			"') and date('" + date_to.toIso8601() + "')");
    }
    
    if (conditions.length > 0)
    {
    	query += ' where ' + conditions.join(' and ');
    }
    
    query += ' order by modified desc';
    
    return(query);
}

hypersearch.showObjectProperties = function(evt, w, o) {
	document.desktop.parseFromUrl(QuiX.root	+ o.id + '?cmd=properties');
}

hypersearch.updateContextMenu = function(menu) {
	var list_view = menu.owner.getWidgetById('searchresults');
	var selected = list_view.getSelection();
	if (selected) {
		menu.options[0].enable();
		menu.options[2].enable();
	}
	else {
		menu.options[0].disable();
		menu.options[2].disable();
	}
}

hypersearch.openPropertiesDialog = function(evt, w) {
	var list_view = w.parent.owner.getWidgetById('searchresults');
	var selected = list_view.getSelection();
	if (selected) {
		hypersearch.showObjectProperties(null, null, selected);
	}
}

hypersearch.openContainer = function(evt, w) {
	var list_view = w.parent.owner.getWidgetById('searchresults');
	var selected = list_view.getSelection();
	if (selected) {
		document.desktop.parseFromUrl(QuiX.root	+ selected.parentid + '?cmd=list');
	}
}
