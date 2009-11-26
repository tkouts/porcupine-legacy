function usermgmnt() {}

usermgmnt.getUsers = function(w) {
    var folderUri = w.attributes.FolderID;
    var query = "select id, __image__ as image, displayName, description," +
        "isNone(fullName,'') as fname, issystem, hasattr('password') as haspsw " +
        "from '" + folderUri + "'";
    if (w.attributes.filter)
        query += " where contentclass='" + w.attributes.filter + "'";
    if (w.orderby)
        query += " order by " + w.orderby + " " + w.sortorder;
    var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root);
    rpc.oncomplete = usermgmnt.users_loaded;
    rpc.callback_info = w;
    rpc.callmethod('executeOqlCommand', query);
}

usermgmnt.users_loaded = function(req) {
    req.callback_info.dataSet = req.response;
    req.callback_info.refresh();
}

usermgmnt.refreshUsersList = function(evt, w) {
    oUserList = w.getParentByType(Window).body.getWidgetsByType(ListView)[0];
    usermgmnt.getUsers(oUserList);
}

usermgmnt.newUser = function(evt, w) {
    var oWin = w.parent.owner.parent.owner.getParentByType(Window);
    var oUserList = w.parent.owner.parent.owner.parent.parent.parent.getWidgetById('userslist');
    var sFolder = QuiX.root + oUserList.attributes.FolderID;
    oWin.showWindow(sFolder + '?cmd=new&cc=org.innoscript.desktop.schema.security.User',
        function(win) {
            win.attachEvent("onclose", usermgmnt.refreshWindow);
        }
    );
}

usermgmnt.deleteItem = function(evt, w) {
    var win = w.parent.owner.getParentByType(Window);
    var sCaption = w.getCaption();
    var desktop = document.desktop;

    _deleteItem = function(evt, w) {
        w.getParentByType(Dialog).close();
        var items = win.getWidgetById("userslist").getSelection();
        if (!(items instanceof Array)) items = [items];
        items.reverse();
        var _startDeleting = function(w) {
            w = w.callback_info || w;
            if (items.length > 0 && !w.attributes.canceled) {
                var item = items.pop();
                var pb = w.getWidgetById("pb");
                pb.increase(1);
                pb.widgets[1].setCaption(item.displayName);
                var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root + item.id);
                rpc.oncomplete = _startDeleting;
                rpc.callback_info = w;
                rpc.onerror = function(e) {
                    w.close();
                    QuiX.displayError(e);
                }
                rpc.callmethod('delete');
            }
            else {
                w.close();
                usermgmnt.getUsers(win.getWidgetById("userslist"));
            }
        }
        var dlg = generic.getProcessDialog(sCaption, items.length, _startDeleting);
    }

    desktop.msgbox(sCaption, 
        "Are you sure you want to delete the selected users/groups?",
        [
            ['Yes', 60, _deleteItem],
            ['No', 60]
        ],
        'desktop/images/messagebox_warning.gif', 'center', 'center', 260, 112);
}

usermgmnt.newGroup = function(evt, w) {
    var oWin = w.parent.owner.parent.owner.getParentByType(Window);
    var oUserList = oWin.getWidgetById('userslist');
    var sFolder = QuiX.root + oUserList.attributes.FolderID;
    oWin.showWindow(sFolder + '?cmd=new&cc=org.innoscript.desktop.schema.security.Group',
        function(win) {
            win.attachEvent("onclose", usermgmnt.refreshWindow);
        }
    );
}

usermgmnt.applyFilter = function(evt, w) {
    var userlist = w.parent.owner.getParentByType(Window).getWidgetById('userslist');
    userlist.attributes.filter = w.attributes.CC;
    usermgmnt.getUsers(userlist);
}

usermgmnt.exitApp = function(evt, w) {
    w.parent.owner.getParentByType(Window).close();
}

usermgmnt.usersListMenu_show = function(menu) {
    var oUserList = menu.owner.getWidgetsByType(ListView)[0];
    
    if (oUserList.selection.length == 1)
        menu.options[4].enable();
    else
        menu.options[4].disable();
    
    if (oUserList.selection.length > 0)
    	menu.options[1].enable();
    else
    	menu.options[1].disable();
    
    if (oUserList.selection.length == 1 && oUserList.getSelection().haspsw)
        menu.options[3].enable();
    else
        menu.options[3].disable();
} 

usermgmnt.showProperties = function(evt, w) {
    var oUserList = w.parent.owner.getWidgetsByType(ListView)[0];
    generic.showObjectProperties(evt, w, oUserList.getSelection(), usermgmnt.refreshWindow);
}

usermgmnt.refreshWindow = function(w) {
	if (w.buttonIndex == 0) {
        var oUserList = w.opener.getWidgetsByType(ListView)[0];
        usermgmnt.getUsers(oUserList);
	}
}

usermgmnt.loadItem = function(evt, w) {
    var oUserList = w;
    generic.showObjectProperties(evt, w, oUserList.getSelection(), usermgmnt.refreshWindow);
}

usermgmnt.showResetPasswordDialog = function(evt, w) {
    var oWindow = w.parent.owner.getParentByType(Window);
    var oUserList = w.parent.owner.getWidgetsByType(ListView)[0];
    var user_url = QuiX.root + oUserList.getSelection().id;
    oWindow.showWindow(user_url + '?cmd=resetpsw');
}

usermgmnt.resetPassword = function(evt, w) {
    var oDialog = w.getParentByType(Dialog);
    var user_uri = oDialog.attributes.UserURI;
    var sPass1 = oDialog.body.getWidgetById('password1').getValue();
    var sPass2 = oDialog.body.getWidgetById('password2').getValue();
    if (sPass1==sPass2) {
        var rpc = new QuiX.rpc.JSONRPCRequest(user_uri);
        rpc.oncomplete = function(req){
            req.callback_info.close()
        }
        rpc.callback_info = oDialog;
        rpc.callmethod('resetPassword', sPass1);
    }
    else {
        document.desktop.msgbox("Error", 
            "Passwords are not identical!",
            "Close",
            "desktop/images/error32.gif", 'center', 'center', 260, 112);
    }
}

usermgmnt.about = function(evt, w) {
    document.desktop.msgbox(
        w.getCaption(),
        "User and Groups Management v0.1<br/>(c)2005-2009 Innoscript",
        [['OK', 60]],
        'desktop/images/messagebox_info.gif', 'center', 'center', 260, 112
    );
}