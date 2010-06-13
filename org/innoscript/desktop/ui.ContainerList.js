var containerList = function() {}

containerList.closeWindow = function(evt, w) {
    w.parent.owner.getParentByType(QuiX.ui.Window).close();
}

containerList.refreshWindow = function(w) {
    if (w.buttonIndex == 0) {
        containerList.getContainerInfo(w.opener);
    }
}

containerList.loadItem = function(evt, w, o) {
    var oWin = w.getParentByType(QuiX.ui.Window);
    if (o.isCollection) {
        oWin.attributes.FolderID = o.id;
        containerList.getContainerInfo(oWin);
    }
    else {
        generic.showObjectProperties(evt, w, o, containerList.refreshWindow);
    }
}

containerList.createItem = function(evt, w) {
    var cc = w.attributes.cc;
    var oWin = w.parent.owner.parent.owner.getParentByType(QuiX.ui.Window);
    oWin.showWindow(QuiX.root + oWin.attributes.FolderID + '?cmd=new&cc=' + cc,
        function(w) {
            w.attachEvent("onclose", containerList.refreshWindow);
        }
    );
}

containerList.showProperties = function(evt, w) {
    var oItemList = w.parent.owner;
    generic.showObjectProperties(evt, w, oItemList.getSelection(),
                                 containerList.refreshWindow);
}

containerList.getContainerInfo = function(w, bAddPath) {
    var folderUri = QuiX.root + w.attributes.FolderID;
    var rpc = new QuiX.rpc.JSONRPCRequest(folderUri);
    rpc.oncomplete = function(req) {
        var itemlist, i;
        w.setTitle(req.response.displayName);
        w.attributes.ParentID = req.response.parentid;
        var sFullPath = req.response.path;
        w.getWidgetById('path').setValue(sFullPath);
        itemlist = w.getWidgetById('itemslist');
        if (w.attributes.FolderID=='')
            w.getWidgetById('btn_up').disable();
        else
            w.getWidgetById('btn_up').enable();
        itemlist.dataSet = req.response.contents;
        itemlist.refresh();
        if (bAddPath) {
            var cmb_path = w.getWidgetById('path');
            var pathExists = false;
            for (i=0; i<cmb_path.options.length; i++) {
                if (cmb_path.options[i].value.toString() == sFullPath) {
                    pathExists = true;
                    break;
                }
            }
            if (!pathExists) cmb_path.addOption({caption: sFullPath,
                                                 value: sFullPath});
        }
        var newOption1 = w.getWidgetById('menubar').menus[0]
                            .contextMenu.options[0];
        var newOption2 = w.getWidgetById('itemslist').contextMenu.options[0];
        var containment = req.response.containment;
        newOption1.options = [];
        newOption1.subMenu = null;
        newOption2.options = [];
        newOption2.subMenu = null;
        if (req.response.user_role > 1 && containment.length > 0) {
            var params, mo1, mo2;
            newOption1.enable();
            newOption2.enable();
            for (i=0; i<containment.length; i++) {
                params = {
                    caption: containment[i][0],
                    img: containment[i][2],
                    onclick: containerList.createItem
                }
                mo1 = newOption1.addOption(params);
                mo1.attributes.cc = containment[i][1];
                mo2 = newOption2.addOption(params);
                mo2.attributes.cc = containment[i][1];
            }
        }
        else {
            newOption1.disable();
            newOption2.disable();
        }
        if (w.attributes.history[w.attributes.history.length-1] !=
                w.attributes.FolderID)
            w.attributes.history.push(w.attributes.FolderID);
    }
    rpc.callmethod('getInfo');
}

containerList.upOneFolder = function(evt, w) {
    var win = w.getParentByType(QuiX.ui.Window);
    win.attributes.FolderID = win.attributes.ParentID;
    containerList.getContainerInfo(win);
}

containerList.goBack = function(evt, w) {
    var win = w.getParentByType(QuiX.ui.Window);
    var win_history = win.attributes.history;
    if (win_history.length > 1) {
        win_history.pop();
        win.attributes.FolderID = win_history.pop();
        containerList.getContainerInfo(win);
    }
}

containerList.refresh = function(evt, w) {
    var win = w.getParentByType(QuiX.ui.Window);
    containerList.getContainerInfo(win);
}

containerList.navigateTo = function(evt, w) {
    var folder_id = w.parent.parent.getWidgetById('path').getValue();
    var win = w.getParentByType(QuiX.ui.Window);
    win.attributes.FolderID = folder_id;
    containerList.getContainerInfo(win, true);
}

containerList.listMenu_show = function(menu) {
    var oItemList = menu.owner;
    if (oItemList.selection.length == 0) {
        menu.options[2].disable();//cut
        menu.options[3].disable();//copy
        menu.options[5].disable();//delete
    }
    else {
        menu.options[2].enable();//cut
        menu.options[3].enable();//copy
        menu.options[5].enable();//delete
    }
    if (oItemList.selection.length == 1) {
        menu.options[7].enable();//move to
        menu.options[8].enable();//copy to
        menu.options[9].enable();//rename
        menu.options[11].enable();//properties
    }
    else {
        menu.options[7].disable();//move to
        menu.options[8].disable();//copy to
        menu.options[9].disable();//rename
        menu.options[11].disable();//properties		
    }
    if (QuiX.clipboard.items.length>0 && QuiX.clipboard.contains=='objects')
        menu.options[4].enable();//paste
    else
        menu.options[4].disable();//paste
}

containerList.updateCliboard = function(evt, w) {
    var oList = w.parent.owner.getParentByType(QuiX.ui.Window)
                .getWidgetById("itemslist");
    var selection = oList.getSelection();
    QuiX.clipboard.action = w.attributes.action;
    QuiX.clipboard.contains = 'objects';
    if (selection instanceof Array)
        QuiX.clipboard.items = selection;
    else
        QuiX.clipboard.items = [selection];
}

containerList.paste = function(evt, w) {
    var items = [].concat(QuiX.clipboard.items);
    items.reverse();
    var win = w.parent.owner.getParentByType(QuiX.ui.Window);
    var target = win.attributes.FolderID;
    var method = (QuiX.clipboard.action=='copy')?'copyTo':'moveTo';
    
    var _startPasting = function(w) {
        w = w.callback_info || w;
        if (items.length > 0 && !w.attributes.canceled) {
            var item = items.pop();
            var pb = w.getWidgetById("pb");
            pb.increase(1);
            pb.widgets[1].setCaption(item.displayName);
            var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root + item.id);
            rpc.oncomplete = _startPasting;
            rpc.callback_info = w;
            rpc.onerror = function(e) {
                w.close();
                QuiX.displayError(e);
            }
            rpc.callmethod(method, target);
        } else {
            w.close();
            containerList.getContainerInfo(win);
        }
    }
    generic.getProcessDialog(w.getCaption(), items.length, _startPasting);
}

containerList.copyMove = function(evt, w) {
    var win = w.parent.owner.getParentByType(QuiX.ui.Window);
    var oList = win.getWidgetById("itemslist");
    var action = w.attributes.action;
    win.showWindow(QuiX.root + oList.getSelection().id  +
                   '?cmd=selectcontainer&action=' + action,
        function(w) {
            w.attachEvent("onclose", containerList.doCopyMove);
            w.attributes.method = action;
        }
    );
}

containerList.doCopyMove = function(dlg) {
    if (dlg.buttonIndex == 0) {
        var p_win = dlg.opener;
        var method = (dlg.attributes.method=='copy')?'copyTo':'moveTo';
        var targetid = dlg.getWidgetById('tree').getSelection().getId();
        
        var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root + dlg.attributes.ID);
        rpc.oncomplete = function(req) {
            if (method!='copyTo') {
                containerList.getContainerInfo(p_win);
            }
        }
        rpc.callmethod(method, targetid);
    }
}

containerList.rename = function(evt, w) {
    var win = w.parent.owner.getParentByType(QuiX.ui.Window);
    var oList = win.getWidgetById("itemslist");
    win.showWindow(QuiX.root + oList.getSelection().id  + '?cmd=rename',
        function(w) {
            w.attachEvent("onclose", containerList.doRename);
        }
    );
}

containerList.doRename = function(dlg) {
    if (dlg.buttonIndex == 0) {
        var p_win = dlg.opener;
        var new_name = dlg.getWidgetById('new_name').getValue();
        
        var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root + dlg.attributes.ID);
        rpc.oncomplete = function() {
            containerList.getContainerInfo(p_win);
        }
        rpc.callmethod('rename', new_name);
    }
}

containerList.deleteItem = function(evt, w) {
    var win = w.parent.owner.getParentByType(QuiX.ui.Window);
    var sCaption = w.getCaption();
    var desktop = document.desktop;

    var _deleteItem = function(evt, w) {
        w.getParentByType(QuiX.ui.Dialog).close();
        var items = win.getWidgetById("itemslist").getSelection();
        if (!(items instanceof Array)) items = [items];
        items.reverse();
        var _start = function(w) {
            w = w.callback_info || w;
            if (items.length > 0 && !w.attributes.canceled) {
                var item = items.pop();
                var pb = w.getWidgetById("pb");
                pb.increase(1);
                pb.widgets[1].setCaption(item.displayName);
                var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root + item.id);
                rpc.oncomplete = _start;
                rpc.callback_info = w;
                rpc.onerror = function(e) {
                    w.close();
                    QuiX.displayError(e);
                }
                rpc.callmethod('delete');
            }
            else {
                w.close();
                containerList.getContainerInfo(win);
            }
        }
        generic.getProcessDialog(sCaption, items.length, _start);
    }

    desktop.msgbox(w.getCaption(), 
        "Are you sure you want to delete the selected items?",
        [
            [desktop.attributes['YES'], 60, _deleteItem],
            [desktop.attributes['NO'], 60]
        ],
        'desktop/images/messagebox_warning.gif', 'center', 'center', 260, 82);
}
