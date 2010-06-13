function generic() {}

generic.showObjectProperties = function(evt, w, o, onclose_func) {
    var oWin = w.getParentByType(QuiX.ui.Window) ||
               w.parent.owner.getParentByType(QuiX.ui.Window);
    oWin.showWindow(QuiX.root + (o.id || o) + '?cmd=properties',
        function(dialog) {
            if (onclose_func)
                dialog.attachEvent("onclose", onclose_func);
        }
    );
}

generic.submitForm = function(evt, w) {
    var oDialog = w.getParentByType(QuiX.ui.Dialog);
    var oForm = oDialog.getWidgetsByType(QuiX.ui.Form)[0];
    oForm.submit(__closeDialog__);
}

generic.openContainer = function(evt, w) {
    document.desktop.parseFromUrl(QuiX.root	+ w.attributes.folderID +
                                  '?cmd=list');
}

generic.runApp = function(evt,w) {
    var appUrl = w.attributes.url;
    document.desktop.parseFromUrl(QuiX.root	+ appUrl);
}

generic.getSecurity = function(tabcontrol, itab) {
    var acl_datagrid = tabcontrol.tabs[itab]
                       .getWidgetsByType(QuiX.ui.DataGrid)[0];
    if (acl_datagrid.dataSet.length == 0) {
        var sObjectURI = tabcontrol.getParentByType(QuiX.ui.Form).action;
        var rpc = new QuiX.rpc.JSONRPCRequest(sObjectURI);
        rpc.oncomplete = function(req) {
            acl_datagrid.dataSet = req.response;
            acl_datagrid.refresh();
        };
        rpc.callmethod('getSecurity');
    }
}

generic.computeSize = function(obj, value) {
    if (value)
        return Math.round(value/1024) + ' KB';
    else
        return '';
}

generic.getProcessDialog = function(title, steps, oncomplete) {
    var dlg = document.desktop.parseFromString(
        '<dialog xmlns="http://www.innoscript.org/quix" '+
                'title="' + title + '" width="240" height="70" ' +
                'left="center" top="center">' +
            '<prop type="bool" name="canceled" value="0"/>' +
            '<wbody>' +
                '<progressbar id="pb" width="90%" height="24" ' +
                        'left="center" top="center" ' +
                        'maxvalue="' + steps + '">' +
                    '<label align="center" width="100%" height="100%" ' +
                        'caption="0%"/>' +
                '</progressbar>' +
            '</wbody>' +
            '<dlgbutton onclick="generic.cancelAction" width="70" ' +
                'height="22" caption="' +
                document.desktop.attributes.CANCEL + '"/>' +
        '</dialog>', oncomplete);
}

generic.cancelAction = function(evt, w) {
    w.getParentByType(QuiX.ui.Dialog).attributes.canceled = true;
}
