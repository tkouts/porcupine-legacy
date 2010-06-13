function formUser() {}

formUser.createUser = function(evt, w) {
    var oForm = w.getParentByType(QuiX.ui.Dialog)
                .getWidgetsByType(QuiX.ui.Form)[0];
    var sPass1 = oForm.getWidgetById('password').getValue();
    var sPass2 = oForm.getWidgetById('password2').getValue();
    if (sPass1 != sPass2) {
        document.desktop.msgbox("Error", 
            "Passwords are not identical!",
            document.desktop.attributes['CLOSE'],
            "desktop/images/error32.gif", 'center', 'center', 260, 82);
    }
    else
        oForm.submit(__closeDialog__);
}
