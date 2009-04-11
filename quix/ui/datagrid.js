/************************
Data Grid
************************/

QuiX.ui.DataGrid = function(params) {
	params = params || {};
	params.multiple = true;
	params.cellborder = params.cellborder || 1;
	params.cellpadding = params.cellpadding || 2;

	this.base = QuiX.ui.ListView;
	this.base(params);
	
	this.name = params.name;
	this.hasSelector = true;
	this.editUndef = (params.editundef==false || params.editundef=='false')?false:true;
}

QuiX.constructors['datagrid'] = QuiX.ui.DataGrid;
QuiX.ui.DataGrid.prototype = new QuiX.ui.ListView;
// backwards compatibility
var DataGrid = QuiX.ui.DataGrid;

QuiX.ui.DataGrid.prototype.addHeader = function(params) {
	var oHeader = QuiX.ui.ListView.prototype.addHeader.apply(this, arguments);
	this.widgets[1].attachEvent('onclick', DataGrid__onclick);
	this.widgets[1].attachEvent('onkeydown', DataGrid__onkeydown);
	return(oHeader);
}

QuiX.ui.DataGrid.prototype.addColumn = function(params) {
	var oCol = QuiX.ui.ListView.prototype.addColumn.apply(this, arguments);
	oCol.editable = !(params.editable=='false' || params.editable == false);
	return(oCol);
}

QuiX.ui.DataGrid.prototype.getValue = function(params) {
	return this.dataSet;
}

QuiX.ui.DataGrid.prototype._removeEditWidget = function() {
	if (this.attributes.__editwidget) {
		this.attributes.__editwidget.destroy();
		this.attributes.__editwidget = null;
		this.detachEvent('onmousedown');
	}	
}

QuiX.ui.DataGrid.prototype.disable = function() {
	this._removeEditWidget();
	QuiX.ui.ListView.prototype.disable.apply(this, arguments);
}

QuiX.ui.DataGrid.prototype.refresh = function() {
	this._removeEditWidget();
	QuiX.ui.ListView.prototype.refresh.apply(this, arguments);
    if (QuiX.utils.BrowserInfo.family == 'ie') //strange bug in IE8
        this.widgets[1].redraw();
}

QuiX.ui.DataGrid.prototype.edit = function(cell) {
	var editValue, w2, w2_type;
	var idx = cell.cellIndex;
	var ridx = (cell.parentElement || cell.parentNode).rowIndex;
	if (idx>0 && idx<this.columns.length-1 && this.columns[idx].editable) {
		editValue = this.dataSet[ridx][this.columns[idx].name];
		if (typeof editValue == 'undefined' && !this.editUndef)
			return;
		switch (this.columns[idx].columnType) {
			case 'optionlist':
				w2 = new QuiX.ui.Combo({
					top : cell.offsetTop,
					left : cell.offsetLeft,
					width : cell.offsetWidth,
					height : cell.offsetHeight,
					onchange : DataGrid__update
				});
				this.widgets[1].appendChild(w2);
			
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
					left : cell.offsetLeft,
					width : cell.offsetWidth,
					height : cell.offsetHeight,
					value : editValue,
					type : w2_type
				});
				if (w2_type == 'checkbox')
					w2.attachEvent('onchange', DataGrid__update)
				else
					w2.attachEvent('onkeyup', DataGrid__update)
				this.widgets[1].appendChild(w2);
		}
		w2.redraw();
		if (w2.focus) w2.focus();
		this.attributes.__editwidget = w2;
		this.attributes.__rowindex = ridx;
		this.attributes.__cellindex = idx;
		this.attachEvent('onmousedown', DataGrid__onmousedown);
	}
}

function DataGrid__onclick(evt, w) {
	var target = QuiX.getTarget(evt);
	while (target && target.tagName != 'TD')
		target = target.parentElement || target.parentNode;
	if (target)
		w.parent.edit(target);
}

function DataGrid__onkeydown(evt, w) {
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
		dg._removeEditWidget();
		dg.edit(current_cell);
		QuiX.cancelDefault(evt);
	}
}

function DataGrid__update(evt, w) {
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

function DataGrid__onmousedown(evt, w) {
	w.attributes.__editwidget.destroy();
	w.attributes.__editwidget = null;
	w.detachEvent('onmousedown');
}