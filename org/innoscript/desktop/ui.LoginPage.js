function login() {}

login.login = function (evt, btn) {
    var login_dialog = login.getDialog(btn);
    var sUser = login_dialog.getWidgetById('user').getValue();
    var sPassword = login_dialog.getWidgetById('password').getValue();
    var sLoginServiceUrl = login_dialog.attributes.ServiceURI;

    var rpc = new QuiX.rpc.JSONRPCRequest(sLoginServiceUrl);
    rpc.oncomplete = login.login_oncomplete;
    rpc.callback_info = btn;
    rpc.onerror = login.login_onerror;
    rpc.callmethod('login', sUser, sPassword);
    if (login_dialog instanceof QuiX.ui.VBox) {
        login_dialog.getWidgetById('status').setCaption('Please wait...');
    }
    else {
        login_dialog.setStatus('Please wait...');
    }
    btn.disable();
}

login.getDialog = function(w) {
    var login_dialog = w.getParentByType(QuiX.ui.VBox);
    if (login_dialog.getId() != 'logindialog') {
        login_dialog = login_dialog.parent;
    }
    return login_dialog;
}

login.checkKey = function(evt, fld) {
    if (evt.keyCode == 13) {
        fld.parent.parent.getWidgetById('btn_login').click();
    }
}

login.login_oncomplete = function(req) {
    if (req.response) {
        var ru = QuiX.queryString('ru');
        if (ru) {
            document.location.href = decodeURIComponent(unescape(ru));
        }
        else {
            // no return url is provided
            ru = document.location.href.
                replace(/cmd=login&?/, '').
                replace('?&', '?').
                replace(/[\?\&]$/, '');
            document.location.href = ru;
        }
    }
    else {
        req.callback_info.enable();
        var dlg = login.getDialog(this.callback_info);
        if (dlg instanceof QuiX.ui.VBox) {
            dlg.getWidgetById('status').setCaption(dlg.attributes.FailMsg);
        }
        else {    
            dlg.setStatus(dlg.attributes.FailMsg);
        }
    }
}

login.login_onerror = function(e) {
    this.callback_info.enable();
    var dlg = login.getDialog(this.callback_info);
    if (dlg instanceof QuiX.ui.VBox) {
        dlg.getWidgetById('status').setCaption('');
    }
    else {
        dlg.setStatus('');
    }
    QuiX.displayError(e);
}
