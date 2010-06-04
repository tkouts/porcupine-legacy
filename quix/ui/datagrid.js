/************************
Data Grid
************************/

QuiX.ui.DataGrid = function(/*params*/) {
    var params = arguments[0] || {};
    params.multiple = true;
    params.cellborder = params.cellborder || 1;
    params.cellpadding = params.cellpadding || 2;
    params.onmousedown = QuiX.wrappers.eventWrapper(
        QuiX.ui.DataGrid._onmousedown,
        params.onmousedown);

    this.base = QuiX.ui.ListView;
    this.base(params);
    
    this.name = params.name;
    this.hasSelector = true;
    this.editUndef = !(params.editundef == false ||
                       params.editundef == 'false');
}

QuiX.constructors['datagrid'] = QuiX.ui.DataGrid;
QuiX.ui.DataGrid.prototype = new QuiX.ui.ListView;

QuiX.ui.DataGrid.prototype.addHeader = function(params) {
    var oHeader = QuiX.ui.ListView.prototype.addHeader.apply(this, arguments);
    this.widgets[1].attachEvent('onclick', QuiX.ui.DataGrid._onclick);
    this.widgets[1].attachEvent('onkeydown', QuiX.ui.DataGrid._onkeydown);
    return oHeader;
}

QuiX.ui.DataGrid.prototype.addColumn = function(params) {
    var oCol = QuiX.ui.ListView.prototype.addColumn.apply(this, arguments);
    oCol.editable = !(params.editable=='false' || params.editable == false);
    return oCol;
}

QuiX.ui.DataGrid.prototype.getValue = function(params) {
    return this.dataSet;
}

QuiX.ui.DataGrid.prototype._removeEditWidget = function() {
    if (this.attributes.__editwidget) {
        var w = this.attributes.__editwidget;
        this.attributes.__editwidget = null;
        w.destroy();
    }	
}

QuiX.ui.DataGrid.prototype.disable = function() {
    this._removeEditWidget();
    QuiX.ui.ListView.prototype.disable.apply(this, arguments);
}

QuiX.ui.DataGrid.prototype.refresh = function() {
    this._removeEditWidget();
    QuiX.ui.ListView.prototype.refresh.apply(this, arguments);
    if (QuiX.utils.BrowserInfo.family == 'ie')  // strange bug in IE8
        this.widgets[1].redraw();
}

QuiX.ui.DataGrid.prototype.edit = function(cell /*, focus*/) {
    var editValue,
        focus = (arguments.length == 2)? arguments[1]:true,
        w2 = null,
        w2_type;
    var idx = cell.cellIndex;
    var ridx = QuiX.getParentNode(cell).rowIndex;
    if (idx > 0 && idx < this.columns.length-1 && this.columns[idx].editable) {
        editValue = this.dataSet[ridx][this.columns[idx].name];
        if (typeof editValue == 'undefined' && !this.editUndef)
            return null;
        var left = cell.offsetLeft;
        if (QuiX.dir == 'rtl' && QuiX.utils.BrowserInfo.family != 'op') {
            left -= this.widgets[1].div.scrollWidth -
                    this.widgets[1].div.clientWidth;
        }
        switch (this.columns[idx].columnType) {
            case 'optionlist':
                w2 = new QuiX.ui.Combo({
                    top : cell.offsetTop,
                    left : left,
                    width : cell.offsetWidth,
                    height : cell.offsetHeight,
                    onchange : QuiX.ui.DataGrid._update
                });
            
                var options = this.columns[idx].options;
                for (var i=0; i<options.length; i++) {
                    if (editValue==options[i].value)
                        options[i].selected = true;
                    else
                        options[i].selected = false;
                    w2.addOption(options[i]);
                }
                break;
            case 'bool':
                w2_type = 'checkbox';
            default:
                w2 = new QuiX.ui.Field({
                    top : cell.offsetTop,
                    left : left,
                    width : cell.offsetWidth,
                    height : cell.offsetHeight,
                    value : editValue,
                    type : w2_type
                });
                if (w2_type == 'checkbox')
                    w2.attachEvent('onchange', QuiX.ui.DataGrid._update)
                else
                    w2.attachEvent('onkeyup', QuiX.ui.DataGrid._update)
        }
        // do not perform rtl xform
        w2._xformed = true;
        this.widgets[1].appendChild(w2);

        w2.redraw();
        w2.div.scrollIntoView(false);
        if (focus && w2.focus)
            w2.focus();
        this.attributes.__editwidget = w2;
        this.attributes.__rowindex = ridx;
        this.attributes.__cellindex = idx;
    }
    return w2;
}

QuiX.ui.DataGrid._onclick = function(evt, w) {
    var target = QuiX.getTarget(evt);
    while (target && target.tagName != 'TD')
        target = QuiX.getParentNode(target);
    if (target)
        w.parent.edit(target);
}

QuiX.ui.DataGrid._onkeydown = function(evt, w) {
    if (evt.keyCode == 9) {
        var dg = w.parent; 
        var r = dg.attributes.__rowindex;
        var c = dg.attributes.__cellindex;
        var rows = dg.list.rows;
        var current_cell = rows[r].cells[c]; 
        if (evt.shiftKey) {
            do {
                current_cell = current_cell.previousSibling;
                if (!current_cell) {
                    if (r > 0)
                        current_cell = rows[r-1].cells[dg.columns.length-2];
                    else
                        current_cell = rows[rows.length-1].cells[dg.columns.length-2];
                }
            } while (!dg.columns[current_cell.cellIndex].editable)
        }
        else {
            do {
                current_cell = current_cell.nextSibling;
                if (!current_cell) {
                    if (r < rows.length - 1)
                        current_cell = rows[r+1].cells[0];
                    else
                        current_cell = rows[0].cells[0];
                }
            } while (!dg.columns[current_cell.cellIndex].editable)
        }
        var cur_w = dg.attributes.__editwidget;
        dg.edit(current_cell, QuiX.utils.BrowserInfo.family != 'op');
        if (QuiX.utils.BrowserInfo.family == 'op') {
            window.setTimeout(
                function() {
                    dg.attributes.__editwidget.focus();
                }, 0);
        }
        if (cur_w)
            cur_w.destroy();
        QuiX.cancelDefault(evt);
    }
}

QuiX.ui.DataGrid._update = function(evt, w) {
    w = w || evt;
    var dg = w.parent.parent;
    if (dg.attributes.__editwidget) {
        var r = dg.attributes.__rowindex;
        var c = dg.attributes.__cellindex;
        var cell = dg.list.firstChild.rows[r].cells[c];
        var value = dg.attributes.__editwidget.getValue();
        dg.dataSet[r][dg.columns[c].name] = value;
        dg._renderCell(cell, c, value);
    }
}

QuiX.ui.DataGrid._onmousedown = function(evt, dg) {
    dg._removeEditWidget();
}