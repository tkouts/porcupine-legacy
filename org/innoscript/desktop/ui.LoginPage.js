function login() {}

login.login = function (evt, btn) {
    var login_dialog = btn.getParentByType(QuiX.ui.VBox);
    var sUser = login_dialog.getWidgetById('user').getValue();
    var sPassword = login_dialog.getWidgetById('password').getValue();
    var sLoginServiceUrl = login_dialog.attributes.ServiceURI;

    var rpc = new QuiX.rpc.JSONRPCRequest(sLoginServiceUrl);
    rpc.oncomplete = login.login_oncomplete;
    rpc.callback_info = btn;
    rpc.onerror = login.login_onerror;
    rpc.callmethod('login', sUser, sPassword);
    login_dialog.getWidgetById('status').setCaption('Please wait...');
    btn.disable();
}

login.checkKey = function(evt, fld) {
    if (evt.keyCode == 13) {
        fld.parent.parent.getWidgetById('btn_login').click();
    }
}

login.login_oncomplete = function(req) {
    if (req.response) {
        document.location.href = QuiX.root;
    }
    else {
        req.callback_info.enable();
        var dlg = req.callback_info.getParentByType(QuiX.ui.VBox);
        dlg.getWidgetById('status').setCaption(dlg.attributes.FailMsg);
    }
}

login.login_onerror = function(e) {
    this.callback_info.enable();
    var dlg = this.callback_info.getParentByType(QuiX.ui.VBox);
    dlg.getWidgetById('status').setCaption('');
    QuiX.displayError(e);
}
