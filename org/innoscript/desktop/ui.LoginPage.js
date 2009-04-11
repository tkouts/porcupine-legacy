function login() {}

login.login = function (evt, w) {
	var login_dialog = w.getParentByType(Dialog);
	var sUser = login_dialog.getWidgetById('user').getValue();
	var sPassword = login_dialog.getWidgetById('password').getValue();
	var sLoginServiceUrl = login_dialog.attributes.ServiceURI;

	var xmlrpc = new XMLRPCRequest(sLoginServiceUrl);
	xmlrpc.oncomplete = login.login_oncomplete;
	xmlrpc.callback_info = w;
	xmlrpc.onerror = login.login_onerror;
	xmlrpc.callmethod('login', sUser, sPassword);
	login_dialog.setStatus('Please wait...');
	w.disable();
}

login.login_oncomplete = function (req) {
	if (req.response) {
		document.location.href = QuiX.root;
	}
	else {
		req.callback_info.enable();
		var oDialog = req.callback_info.getParentByType(Dialog);
		document.desktop.msgbox(oDialog.attributes.FailMsgTitle, 
			oDialog.attributes.FailMsg,
			document.desktop.attributes.CLOSE,
			'desktop/images/error32.gif', 'center', 'center', 260, 120);
		oDialog.setStatus('');
	}
}

login.login_onerror = function(req) {
	req.callback_info.enable();
	req.callback_info.getParentByType(Dialog).setStatus('');
}