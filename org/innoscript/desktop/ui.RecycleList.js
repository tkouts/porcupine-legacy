var recycleBin= function() {}

recycleBin.listMenu_show = function(menu) {
	var oItemList = menu.owner;
	if (oItemList.selection.length == 0) {
		menu.options[0].disable();//restore
		menu.options[1].disable();//restore to
		menu.options[2].disable();//delete
		menu.options[6].disable();//properties
	}
	else {
		menu.options[0].enable();//restore
		if (oItemList.selection.length == 1)
			menu.options[1].enable();//restore to
		else
			menu.options[1].disable();//restore to
		menu.options[2].enable();//delete
		if (oItemList.selection.length == 1)
			menu.options[6].enable();//properties
		else
			menu.options[6].disable();//properties
	}
}

recycleBin.getContainerInfo = function(w) {
	var folderUri = QuiX.root + w.attributes.FolderID;
	var xmlrpc = new XMLRPCRequest(folderUri);
	xmlrpc.oncomplete = function(req) {
		var itemlist;
		w.setTitle(req.response.displayName);
		w.attributes.ParentID = req.response.parentid;

		itemlist = w.getWidgetById('itemslist');

		itemlist.dataSet = req.response.contents;
		itemlist.refresh();
	}
	xmlrpc.callmethod('getInfo');
}

recycleBin.showProperties = function(evt, w) {
	var win_elem = (w.parent.owner)?w.parent.owner:w;
	var win = win_elem.getParentByType(Window);
	var oList = win.getWidgetsByType(ListView)[0];
	var oItem = oList.getSelection();
	
	win.showWindow(QuiX.root + 
		oItem.id + '?cmd=properties',
		function(w) {
			w.attributes.Item = oItem;
			w.attachEvent("onclose",
				function(dlg){
					if (dlg.buttonIndex == 0)
						recycleBin.restoreItem(null, dlg);
				}
			);
		}
	);
}

recycleBin.refresh = function(evt, w) {
	var win = w.getParentByType(Window);
	recycleBin.getContainerInfo(win);
}

recycleBin.restoreTo = function(evt, w) {
	var win = w.parent.owner.getParentByType(Window);
	var oList = win.getWidgetById("itemslist");
	var action = w.attributes.action;
	
	win.showWindow(QuiX.root + 
		oList.getSelection().id  + '?cmd=selectcontainer&action=' + action,
		function(dlg) {
			dlg.attachEvent("onclose", recycleBin.doRestoreTo);
		}
	);
}

recycleBin.doRestoreTo = function(dlg) {
	if (dlg.buttonIndex == 0) {
		var targetid = dlg.getWidgetById('tree').getSelection().getId();
		
		var xmlrpc = new XMLRPCRequest(QuiX.root + dlg.attributes.ID);
		xmlrpc.oncomplete = function(req) {
			recycleBin.getContainerInfo(dlg.opener);
		}
		xmlrpc.callmethod('restoreTo', targetid);
	}
}

recycleBin._onerror = function(req) {
	req.callback_info.close();
}

recycleBin.restoreItem = function(evt, w) {
	var win, items, title;
	if (w.parent.owner) {
		win = w.parent.owner.getParentByType(Window);
		items = win.getWidgetById("itemslist").getSelection();
		title = w.getCaption();
	}
	else {
		win = w.opener;
		items = w.attributes.Item;
		title = w.buttons[0].getCaption();
	}
	
	if (!(items instanceof Array)) items = [items];
	items.reverse();
	
	var _startRestoring = function(w) {
		var w = w.callback_info || w;
		var pb = w.getWidgetById("pb");
		if (items.length > 0) {
			var item = items.pop();
			pb.increase(1);
			pb.widgets[1].setCaption(item.displayName);
			var xmlrpc = new XMLRPCRequest(QuiX.root + item.id);
			xmlrpc.oncomplete = _startRestoring;
			xmlrpc.callback_info = w;
			xmlrpc.onerror = recycleBin._onerror;
			xmlrpc.callmethod('restore');
		}
		else {
			w.close();
			recycleBin.getContainerInfo(win);
		}
	}
	var dlg = generic.getProcessDialog(title, items.length, _startRestoring);
}

recycleBin.deleteItem = function(evt, w) {
	var win = w.parent.owner.getParentByType(Window);
	var sCaption = w.getCaption();
	var desktop = document.desktop;

	var _deleteItem = function(evt, w) {
		w.getParentByType(Dialog).close();
		var items = win.getWidgetById("itemslist").getSelection();
		if (!(items instanceof Array)) items = [items];
		items.reverse();
		var _startDeleting = function(w) {
			w = w.callback_info || w;
			if (items.length > 0) {
				var item = items.pop();
				var pb = w.getWidgetById("pb");
				pb.increase(1);
				pb.widgets[1].setCaption(item.displayName);
				var xmlrpc = new XMLRPCRequest(QuiX.root + item.id);
				xmlrpc.oncomplete = _startDeleting;
				xmlrpc.callback_info = w;
				xmlrpc.onerror = function(req) {
					w.close();
				}
				xmlrpc.callmethod('delete');
			}
			else {
				w.close();
				recycleBin.getContainerInfo(win);
			}
		}
		generic.getProcessDialog(sCaption, items.length, _startDeleting);
	}
	
	desktop.msgbox(w.getCaption(), 
		"Are you sure you want to PERMANENTLY delete the selected items?",
		[
			[desktop.attributes['YES'], 60, _deleteItem],
			[desktop.attributes['NO'], 60]
		],
		'desktop/images/messagebox_warning.gif', 'center', 'center', 280, 112);
}

recycleBin.empty = function(evt, w) {
	var desktop = document.desktop;
	var win_elem = (w.parent.owner)?w.parent.owner:w;
	var win = win_elem.getParentByType(Window);
	var rbid = win.attributes.FolderID;
	
	var _empty = function(evt, w) {
		w.getParentByType(Dialog).close();
		var xmlrpc = new XMLRPCRequest(QuiX.root + rbid);
		xmlrpc.oncomplete = function(req) {
			recycleBin.getContainerInfo(win);
		}
		xmlrpc.callmethod('empty');
	}
	
	desktop.msgbox(w.getCaption(), 
		w.attributes.confirmString,
		[
			[desktop.attributes['YES'], 60, _empty],
			[desktop.attributes['NO'], 60]
		],
		'desktop/images/messagebox_warning.gif', 'center', 'center', 260, 112);
}
