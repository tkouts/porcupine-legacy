function queryPerformer() {}

queryPerformer.exitApp = function(evt, w) {
    w.parent.owner.getParentByType(Window).close();
}

queryPerformer.newQuery = function(evt, w) {
    var clientArea = w.parent.owner.getParentByType(Window).getWidgetById('clientArea');
    clientArea.parseFromUrl('queryperformer/newquery.quix');
}

queryPerformer.saveQuery = function(evt, w) {
    var win = w.getParentByType(Window);
    var file = win.parent.widgets[0];
    file.saveTextFile( win.getTitle() + '.oql', win.getWidgetById('oqlquery').getValue() );
}

queryPerformer.executeQuery = function(evt, w) {
    var oWin = w.getParentByType(Window);
    var oPane = oWin.getWidgetById('resultsarea');
    sQuery = oWin.getWidgetById('oqlquery').getValue();
    
    var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root);
    rpc.oncomplete = queryPerformer.executeQuery_oncomplete;
    rpc.callback_info = oPane;
    rpc.callmethod('executeOqlCommand', sQuery);
}

queryPerformer.executeQuery_oncomplete = function(req) {
	var oPane = req.callback_info;
	var oWin = oPane.getParentByType(Window);
	var oResults = req.response;
    var options;
	oPane.clear();
    if (oResults.length > 0) {
        options = oWin.getParentByType(Window).getWidgetById('clientArea').attributes;
        oPane.parseFromString(
            '<tree xmlns="http://www.innoscript.org/quix"\
                onexpand="queryPerformer.expandNode"\
                onselect="queryPerformer.showProps"></tree>',
            function (w) {
                queryPerformer.expandArray(w, oResults, options);
            }
        );
        oWin.setStatus('Query returned ' + oResults.length + ' rows/objects.');
    } else {
        oPane.parseFromString('<rect xmlns="http://www.innoscript.org/quix">\
            <xhtml>No results found</xhtml></rect>');
    }
}

queryPerformer.about = function(evt, w) {
    document.desktop.msgbox(
        w.getCaption(),
        "OQL Query Performer v0.1<br/>(c)2005-2009 Innoscript",
        [['OK', 60]],
        'desktop/images/messagebox_info.gif', 'center', 'center', 260, 112
    );
}

queryPerformer.showProps = function(w) {
    var obj = w.attributes.obj;
    if (obj) {
        var oAttr, dataset = [];
        var oList = w.getParentByType(Splitter).getWidgetById('proplist');
        for (var attr in obj) {
            oAttr = obj[attr];
            if (typeof(oAttr) != 'function')
                dataset.push({
                    name: attr,
                    type: queryPerformer.getType(obj[attr]),
                    value: oAttr
                });
        }
        oList.dataSet = dataset;
        oList.refresh();
    }
}

queryPerformer.expandNode = function(w) {
    var oAttr, oNode;
    var obj = w.attributes.obj;
    if (w.childNodes.length==0) {
        if (obj instanceof Array) {
            queryPerformer.expandArray(w, obj, w.getParentByType(Window).parent.attributes);
        } else {
            for (var attr in obj) {
                oAttr = obj[attr];
                if (typeof(oAttr) != 'function' && (oAttr instanceof Array)) {
                    oNode = new TreeNode({
                         haschildren:(oAttr.length>0),
                         caption: attr,
                         disabled:(oAttr.length==0)
                    });
                    oNode.attributes.obj = oAttr;
                    w.appendChild(oNode);
                    oNode.redraw();
                }
                else if (oAttr.constructor == Object) {
                    oNode = new TreeNode({
                        haschildren:true,
                        caption: attr
                    });
                    oNode.attributes.obj = oAttr;
                    w.appendChild(oNode);
                    oNode.redraw();
                }
            }
            if (w.childNodes.length == 0) {
                oNode = new TreeNode ({
                    haschildren: false,
                    caption: 'Empty',
                    disabled: true
                });
                w.appendChild(oNode);
                oNode.redraw();
            }
        }
    }    
}

queryPerformer.expandArray = function(w, array, options) {
    var caption, nodeimg;
    var tree_caption = options.tree_caption;
    for (var i=0; i<array.length; i++) {
        nodeimg = (options.use_image)?array[i][options.tree_image]:null;
        caption = (array[i][tree_caption])?array[i][tree_caption]:'Object ' + i.toString();
        treeNode = new TreeNode({
            haschildren : (array.length>0),
            img : nodeimg,
            caption : caption,
            disabled:(array.length==0)
        });
        treeNode.attributes.obj = array[i];
        w.appendChild(treeNode);
        treeNode.redraw();
    }
}

queryPerformer.getType = function(obj) {
    var typ = 'Object';
    if (obj instanceof Date) {
        typ = 'Date';
    } else if (typeof obj == 'boolean') {
        typ = 'Boolean';
    } else if (typeof obj == 'string') {
        typ = 'String';
    } else if (obj instanceof Array) {
        typ = 'Array';
    } else if (obj instanceof Number) {
        typ = 'Number';
    }
    return typ;
}

queryPerformer.showSettings = function(evt, w) {
    var win = w.parent.owner.getParentByType(Window);
    var ca = win.getWidgetById("clientArea");
    win.showWindow('queryperformer/options.quix',
    	function(dlg) {
    		dlg.setTitle(w.getCaption());
    		dlg.getWidgetById('tree_caption').setValue(ca.attributes.tree_caption);
    		dlg.getWidgetById('use_image').setValue(ca.attributes.use_image);
    		var tree_img = dlg.getWidgetById('tree_image');
    		if (ca.attributes.use_image)
    			tree_img.enable();
    		else
    			tree_img.disable();
    		tree_img.setValue(ca.attributes.tree_image);
    	}
    )
}

queryPerformer.toggleUseImage = function(evt, w) {
    if (w.getValue())
        w.parent.getWidgetById('tree_image').enable();
    else
        w.parent.getWidgetById('tree_image').disable();
}

queryPerformer.applyPreferences = function(evt, w) {
    var win = w.getParentByType(Window);
    var appWin = win.opener;
    var ca = appWin.getWidgetById('clientArea');
    ca.attributes.tree_caption = win.getWidgetById('tree_caption').getValue();
    ca.attributes.use_image = win.getWidgetById('use_image').getValue();
    ca.attributes.tree_image = win.getWidgetById('tree_image').getValue();
    win.close();
}