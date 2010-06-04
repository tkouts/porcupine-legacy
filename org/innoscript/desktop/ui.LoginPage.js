function login() {}

login.login = function (evt, btn) {
	var login_dialog = btn.getParentByType(QuiX.ui.Dialog);
	var sUser = login_dialog.getWidgetById('user').getValue();
	var sPassword = login_dialog.getWidgetById('password').getValue();
	var sLoginServiceUrl = login_dialog.attributes.ServiceURI;

	var rpc = new QuiX.rpc.JSONRPCRequest(sLoginServiceUrl);
	rpc.oncomplete = login.login_oncomplete;
	rpc.callback_info = btn;
	rpc.onerror = login.login_onerror;
	rpc.callmethod('login', sUser, sPassword);
	login_dialog.setStatus('Please wait...');
	btn.disable();
}

login.login_oncomplete = function(req) {
	if (req.response) {
		document.location.href = QuiX.root;
	}
	else {
		req.callback_info.enable();
		var oDialog = req.callback_info.getParentByType(QuiX.ui.Dialog);
		document.desktop.msgbox(oDialog.attributes.FailMsgTitle, 
			oDialog.attributes.FailMsg,
			document.desktop.attributes.CLOSE,
			'desktop/images/error32.gif', 'center', 'center', 260, 120);
		oDialog.setStatus('');
	}
}

login.login_onerror = function(e) {
	this.callback_info.enable();
	this.callback_info.getParentByType(QuiX.ui.Dialog).setStatus('');
    QuiX.displayError(e);
}