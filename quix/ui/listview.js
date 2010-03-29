/************************
List View
************************/

QuiX.ui.ListView = function(/*params*/) {
	var params = arguments[0] || {};
	params.bgcolor = params.bgcolor || 'white';
	params.overflow = 'hidden';
	
	var dragable = (params.dragable=='true' || params.dragable==true);
	delete params.dragable;
	
	this.base = QuiX.ui.Widget;
	this.base(params);
	this.div.className = 'listview';
	this.cellPadding = parseInt(params.cellpadding) || 4;
	this.cellBorder = parseInt(params.cellborder) || 0;
	this.multiple = (params.multiple==true || params.multiple=="true");
	this.nullText = params.nulltext || ' ';
	this.dateFormat = params.dateformat || 'ddd dd/mmm/yyyy time';
	this.trueImg = params.trueimg || '$THEME_URL$images/check16.gif';
	this.sortfunc = QuiX.getEventListener(params.sortfunc);
	this.altColors = (params.altcolors || ',').split(',');
	this.highlightColors =
		(params.highlightcolors || 'white,#6699FF').split(',');
	this.rowHeight = parseInt(params.rowheight);

	this.hasSelector = false;
	this.selection = [];
	this.dataSet = [];
	
	this._orderBy = null;
	this._sortOrder = null;
	this._sortimg = null;
	
	this._dragable = dragable;
}

QuiX.constructors['listview'] = QuiX.ui.ListView;
QuiX.ui.ListView.prototype = new QuiX.ui.Widget;
// backwards compatibility
var ListView = QuiX.ui.ListView;

QuiX.ui.ListView.prototype.customEvents =
	QuiX.ui.Widget.prototype.customEvents.concat(['onselect', 'onrowprerender',
                                                  'onrendercomplete']);

QuiX.ui.ListView.cellThreshold = 2000;

QuiX.ui.ListView.prototype._registerHandler = function(eventType, handler,
                                                       isCustom) {
	var wrapper;
	if (handler)
		switch (eventType) {
			case "onclick":
			case "ondblclick":
				//if it not wrapped wrap it...
				if(handler && handler.toString().lastIndexOf(
						'return handler(evt || event, self)')==-1)
					wrapper = function(evt, w) {
						return ListView__onclick(evt, w, handler)
					};
				break;
		}
	wrapper = wrapper || handler;
	QuiX.ui.Widget.prototype._registerHandler.apply(this,
        [eventType, wrapper, isCustom]);
}

QuiX.ui.ListView.prototype.addHeader = function(params) {
    var family = QuiX.utils.BrowserInfo.family;
    var displayVerticalScroll = QuiX.dir == 'rtl' &&
                                (family == 'moz' || family == 'saf');

    params.width = '100%';
	params.height = (!params.height || params.height<22)?
					22 : parseInt(params.height);
	params.overflow = 'hidden';

	this.header = new QuiX.ui.Widget(params);
	this.appendChild(this.header);
	this.header.div.className = 'listheader';
	this.header.div.innerHTML =
		'<table cellspacing="0" width="100%" height="100%"><tr>' +
		'<td class="column filler" dir="' + QuiX.dir + '"></td>' +
        '<td width="' + QuiX._scrollbarSize + '">&nbsp;</td>' +
        '</tr></table>';

    var oTable = this.header.div.firstChild;

    if (displayVerticalScroll) {
        oTable.style.paddingRight = QuiX._scrollbarSize + 'px';
    }
    else
        oTable.style.paddingRight = '0px';
	var oRow = oTable.rows[0];

    // opera horizontal scrollbar patch
    if (QuiX.dir == 'rtl' && family == 'op') {
        oTable.style.cssFloat = 'left';
    }

	this.columns = oRow.cells;
	oRow.ondblclick = QuiX.stopPropag;
	
	if (this.hasSelector) {
		var selector = this._getSelector();
		oRow.insertBefore(selector, oRow.lastChild.previousSibling);
		this._deadCells = 1;
	} else
		this._deadCells = 0;
	
	var ltop, lho;
	if (this.header.isHidden()) {
		ltop = 0;
		lho = 0;
	}
	else {
		ltop = this.header._calcHeight(true);
		lho = parseInt(params.height) + 1;
	}

    var overflow = 'auto';
    if (displayVerticalScroll)
        overflow = 'auto scroll'

	var list = new QuiX.ui.Widget({
		top : ltop,
		width : 'this.parent.getWidth(false, memo) - 1',
		height : 'this.parent.getHeight(false, memo) - ' + lho,
		dragable : this._dragable,
		overflow : overflow
	});
	list._startDrag = List__startDrag;
	this.appendChild(list);

	list.div.className = 'list';
	oTable = ce('TABLE');
	oTable.cellSpacing = 0;
	oTable.cellPadding = this.cellPadding;
    oTable.width = '100%';

    // opera horizontal scrollbar patch
    if (QuiX.dir == 'rtl' && family == 'op') {
        oTable.style.cssFloat = 'left';
        // vertical scrollbar patch
        oTable.style.paddingBottom = QuiX._scrollbarSize + 'px';
        list.attachEvent('onresize', function() {
            window.setTimeout(
                function() {
                    if (oTable.rows.length > 0)
                        oTable.rows[0].cells[0].scrollIntoView();
                }, 10);
        });
    }

	oTable.onmousedown = ListView__onmousedown;
	var tbody = ce('TBODY');
	oTable.appendChild(tbody);
	list.div.appendChild(oTable);

	list.attachEvent('onscroll', ListView__onscroll);
	this.list = list.div.firstChild;
	return this.header;
}

QuiX.ui.ListView.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
	var columns = this.columns;
	var header_width = this._calcWidth(false, memo);
	var wdth;
	// resize proportional cells
	for (var i = this._deadCells; i<columns.length; i++) {
		if (columns[i].proportion) {
			wdth = (parseInt(header_width * columns[i].proportion) -
					2*this.cellPadding - 2) + 'px';
			columns[i].style.width = wdth;
			if (this.list.firstChild.rows.length > 0)
				this.list.rows[0].cells[i].style.width = wdth;
		}
	}
    // opera horizontal scrollbar patch
    if (QuiX.dir == 'rtl' && QuiX.utils.BrowserInfo.family == 'op') {
        for (i=0; i<this.header.widgets.length; i++)
            this.header.widgets[i].div.style.left = '0px';
    }
	QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

QuiX.ui.ListView.prototype._getSelector = function() {
	var s = ce('TD');
    s.dir = QuiX.dir;
	s.className = 'column';
	s.style.width = '8px';
	s.innerHTML = '&nbsp;';
	return s;
}

QuiX.ui.ListView.prototype._selrow = function(r) {
	for (var i=0; i<this.columns.length-1; i++)
		if (this.columns[i].columnBgColor)
			r.cells[i].bgColor = '';
	r.style.color = this.highlightColors[0];
	r.style.backgroundColor = this.highlightColors[1];
	r.isSelected = true;
}

QuiX.ui.ListView.prototype._unselrow = function(r) {
	r.style.color = '';
	r.style.backgroundColor = this.altColors[r.rowIndex % 2];
	r.isSelected = false;
	for (var i=0; i<this.columns.length-1; i++)
		if (this.columns[i].columnBgColor)
			r.cells[i].bgColor = this.columns[i].columnBgColor;
}

QuiX.ui.ListView.prototype._selectline = function(evt, row) {
	if (row.isSelected && QuiX.getMouseButton(evt) == 2) {
		return false;
	}
	var fire = this.multiple || !row.isSelected;
	if (!row.isSelected) {
		if (!this.multiple || !evt.shiftKey) this.clearSelection();
		this._selrow(row);
		this.selection.push(row.rowIndex);
	}
	else if (this.multiple && evt.shiftKey) {
		this._unselrow(row);
		this.selection.removeItem(row.rowIndex);
	}
	else {
		this.clearSelection();
		this._selrow(row);
		this.selection.push(row.rowIndex);
	}
	if (fire && this._customRegistry.onselect) {
		QuiX.getEventListener(this._customRegistry.onselect)(
			evt, this, this.dataSet[row.rowIndex]);
	}
    return true;
}

QuiX.ui.ListView.prototype.select = function(i) {
	var tr = this.list.rows[i];
	if (!tr.isSelected) {
		this._selrow(this.list.rows[i]);
		if (!this.multiple)
			this.selection = [i];
		else
			this.selection.push(i);
	}
}

QuiX.ui.ListView.prototype.clearSelection = function() {
	var selRow;
	for (var i=0; i<this.selection.length; i++) {
		selRow = this.list.rows[this.selection[i]];
		this._unselrow(selRow);
	}
	this.selection = [];
}

QuiX.ui.ListView.prototype.removeSelected = function() {
	this.selection.sort(function(a,b){
		return(a>b?-1:1)
	});
	for (var i=0; i<this.selection.length; i++) {
		this.dataSet.splice(this.selection[i], 1);
		this.list.deleteRow(this.selection[i]);
	}
	this.selection = [];
	this.refresh();
}

QuiX.ui.ListView.prototype.getSelection = function() {
	var sel = [];
	for (var i=0; i<this.selection.length; i++)
		sel.push(this.dataSet[this.selection[i]]);
	if (sel.length==0)
		return null;
	else if (sel.length==1)
		return sel[0];
	else
		return sel;
}

QuiX.ui.ListView.prototype.addColumn = function(params) {
	var oCol = ce('TD');
	oCol.className = 'column';
    oCol.dir = QuiX.dir;
	oCol._isContainer = false;
	oCol.columnBgColor = params.bgcolor || '';
	oCol.style.padding = '0px ' + this.cellPadding + 'px';

	if (params.width) {
		if (params.width.slice(params.width.length-1) == '%')
			oCol.proportion = parseInt(params.width) / 100;
		else {
			var offset = (QuiX.utils.BrowserInfo.family == 'saf')?
                         0 : 2 * this.cellPadding + 2 * this.cellBorder;
			oCol.style.width = (params.width - offset) + 'px';
		}
	}

	oCol.setCaption = ListColumn__setCaption;
	oCol.getCaption = ListColumn__getCaption;

	oCol.name = params.name;
	var sCaption = params.caption || ' ';
	oCol.setCaption(sCaption);
		
	oCol.columnType = params.type || 'str';
	if (params.xform) {
		oCol.xform = params.xform;
		oCol._xform = QuiX.getEventListener(oCol.xform);
	}
	
	oCol.sortable = (params.sortable=='false' || params.sortable==false)?
					false:true;
	if (oCol.sortable) {
		oCol.style.cursor = 'pointer';
		oCol.onclick = ListColumn__onclick;
	}

	var oHeaderRow = this.header.div.firstChild.rows[0];
	oHeaderRow.insertBefore(oCol, oHeaderRow.lastChild.previousSibling);
	
	if (oCol.columnType == 'bool')
		oCol.trueImg = params.trueimg || this.trueImg;
	else if (oCol.columnType == 'date')
		oCol.format = params.format || this.dateFormat;
		
	oCol.columnAlign = params.align || '';
	
	var resizer = new QuiX.ui.Widget({
		width : 6,
		height : this.header._calcHeight(),
		left : 'this.parent.parent._calcResizerOffset(this)',
		overflow : 'hidden'
	});
	this.header.appendChild(resizer);
	
	oCol.isResizable =
		!(params.resizable == 'false' || params.resizable == false);
	if (oCol.isResizable) {
		var iColumn = oHeaderRow.cells.length - 2;
        var self = this;
		resizer.div.className = 'resizer';
		resizer.attachEvent('onmousedown', function(evt) {
			self._moveResizer(evt, iColumn - 1 - self._deadCells);
			QuiX.cancelDefault(evt);
		});
	}
	return oCol;
}

QuiX.ui.ListView.prototype._calcResizerOffset = function(w) {
	var oHeader = this.header;
    var webkit = (QuiX.utils.BrowserInfo.family == 'saf');
	var left = this.hasSelector? (webkit? 6 : 10) : 0;
	var offset = (webkit)? -2 : 2 * this.cellPadding;
	var offset2 = (webkit)? 0 : this.cellBorder;
	var column_width;

	for (var i=this._deadCells; i<this.columns.length; i++) {
		column_width = parseInt(this.columns[i].style.width);
		left += column_width + offset;

		if (this.list.rows.length > 0)
			this.list.rows[0].cells[i].style.width =
				column_width - offset2 + 'px';

		if (oHeader.widgets[i - this._deadCells] == w)
            break;
	}

    left += parseInt(this.header.div.firstChild.style.paddingRight);
    
    // opera horizontal scrollbar patch
    if (QuiX.dir == 'rtl' && QuiX.utils.BrowserInfo.family == 'op')
        left -= (this.header.div.scrollWidth - this.header.div.clientWidth)

	left += (2*i);
	return left - 1;
}

QuiX.ui.ListView.prototype._moveResizer = function(evt, iResizer) {
	var oWidget = this;
	QuiX.cancelDefault(evt);
	QuiX.startX = evt.clientX;
	this.attachEvent('onmouseup', function(evt){
		oWidget._endMoveResizer(evt, iResizer)});
	this.attachEvent('onmousemove', function(evt){
		oWidget._resizerMoving(evt, iResizer)});
}

QuiX.ui.ListView.prototype._resizerMoving = function(evt, iResizer) {
	var nw;
	var iColumn = iResizer + this._deadCells;
	var offsetX = evt.clientX - QuiX.startX;

    if (QuiX.dir == 'rtl')
        offsetX = -offsetX;
	nw = parseInt(this.columns[iColumn].style.width) + offsetX;
	nw = (nw < 2*this.cellPadding)?2*this.cellPadding:nw;
	if (nw > 2*this.cellPadding) {
		this.columns[iColumn].style.width = nw + 'px';
		this.header.redraw();
        // sync scroll offsets
        ListView__onscroll(null, this.widgets[1]);
		QuiX.startX = evt.clientX;
	}
}

QuiX.ui.ListView.prototype._endMoveResizer = function(evt, iResizer) {
	var iColumn = iResizer + this._deadCells;
	if (this.columns[iColumn].proportion)
		this.columns[iColumn].proportion = null;
	this.detachEvent('onmouseup');
	this.detachEvent('onmousemove');
}

QuiX.ui.ListView.prototype.getColumnByName = function(colName) {
	for (var i=0; i<this.columns.length; i++)
		if (this.columns[i].name == colName)
			return this.columns[i];
	return null;
}

QuiX.ui.ListView.prototype.sort = function(colName, order) {
	var column = this.getColumnByName(colName);
	if (this._sortimg) {
		QuiX.removeNode(this._sortimg);
		this._sortimg = null;
	}
	if (this.sortfunc)
		this.sortfunc(this, colName, order);
	else {
		// default sort behaviour
		this.dataSet.sortByAttribute(colName);
		if (order.toUpperCase()=='DESC')
			this.dataSet.reverse();
		this.refresh();
	}
	if (column) {
		this._sortimg = new Image;
		this._sortimg.src = (order.toUpperCase()=='ASC')?
							QuiX.getThemeUrl() + 'images/asc8.gif':
                            QuiX.getThemeUrl() + 'images/desc8.gif';
		this._sortimg.align = 'absmiddle';
		column.appendChild(this._sortimg);
	}
	this._orderBy = colName;
	this._sortOrder = order.toUpperCase();
}

QuiX.ui.ListView.prototype._isSorted = function() {
	var field = this._orderBy;
	var order = this._sortOrder;
	for (var i=0; i<this.dataSet.length - 1; i++) {
		if (order == 'ASC') {
			if (this.dataSet[i][field] > this.dataSet[i+1][field])
				return false;
		}
		else {
			if (this.dataSet[i][field] < this.dataSet[i+1][field])
				return false;
		}
	}
	return true;
}

QuiX.ui.ListView.prototype.refresh = function() {
	var tbody = this.list.tBodies[0];
	while(tbody.firstChild)
		tbody.removeChild(tbody.firstChild);
	this.selection = [];
	if (this._sortimg && !this._isSorted()) {
		QuiX.removeNode(this._sortimg);
		this._sortimg = null;
		this._orderBy = null;
		this._sortOrder = null;
	}
	if (this.dataSet.length * this.columns.length >
            QuiX.ui.ListView.cellThreshold) {
		if (this._timeout)
			window.clearTimeout(this._timeout);
        var self = this;
		this._timeout = window.setTimeout(function(){self._refresh(0, 30)}, 0);
	}
	else
		this._refresh(0, this.dataSet.length);
}

QuiX.ui.ListView.prototype._refresh = function(start, step) {
	var oRow, selector, oFiller,
        value, columnWidth, rowBgColor,
        rowHeight, offset, cell;
	var w = this;
	var tbody = w.list.tBodies[0];
    var webkit = (QuiX.utils.BrowserInfo.family=='saf');
	if (w.rowHeight) {
		if (QuiX.utils.BrowserInfo.family == 'ie')
			offset = 2 * w.cellPadding;
		else
			offset = 0;
		rowHeight = (w.rowHeight - offset) + 'px';
	}
	var cellPadding = '4px ' + (w.cellPadding + 1) + 'px';
	var cellBorder = w.cellBorder + 'px';	
	// create rows
	for (var i=start; i < start + step && i < w.dataSet.length; i++) {
		oRow = document.createElement("tr");
		oRow.isSelected = false;
		rowBgColor = w.altColors[i%2];
		oRow.style.backgroundColor = rowBgColor;
		if (rowHeight)
			oRow.style.height = rowHeight;
		if (w.hasSelector) {
			selector = w._getSelector();
			offset = webkit?0:2*w.cellPadding - 2;
			selector.style.width = (8 - offset) + 'px';
			oRow.appendChild(selector);
		}
		for (var j=0 + w._deadCells; j<w.columns.length-2; j++) {
			cell = document.createElement('td');
			cell.className = 'cell';
            cell.dir = QuiX.dir;
			columnWidth = w.columns[j].style.width;
			if (i==0 && columnWidth) {
				offset = webkit?0:w.cellBorder;
				if (w.columns[j].proportion) {
					cell.style.width =
						(parseInt(w._calcWidth() * w.columns[j].proportion) -
						 2*w.cellPadding - 2) + 'px';
				}
				else
					cell.style.width = (parseInt(columnWidth) -
										 offset) + 'px';
			}
			cell.style.borderWidth = cellBorder;
			cell.style.padding = cellPadding;
			if (w.columns[j].columnBgColor)
				cell.bgColor = w.columns[j].columnBgColor;
			oRow.appendChild(cell);
			value = w.dataSet[i][w.columns[j].name];
			w._renderCell(cell, j, value, w.dataSet[i])
		}
		oFiller = ce('TD');
		oFiller.innerHTML = '&nbsp;';
		oFiller.className = 'cell';
		oFiller.style.borderWidth = cellBorder;
		oFiller.style.borderRight = 'none';
		
		oRow.appendChild(oFiller);
		if (w._customRegistry.onrowprerender)
			w._customRegistry.onrowprerender(w, oRow, w.dataSet[i]);
		tbody.appendChild(oRow);
	}
	if (i<w.dataSet.length)
		w._timeout = window.setTimeout(
            function() {
                if (w.div)
                    w._refresh(i, step);
            }, 300);
	else
		if (w._customRegistry.onrendercomplete)
			w._customRegistry.onrendercomplete(w);
}

QuiX.ui.ListView.prototype._renderCell = function(cell, cellIndex, value, obj) {
	var elem, column, column_type;

	if (value == undefined) {
		//cell.innerHTML = this.nullText;
        QuiX.setInnerText(cell, this.nullText);
		return;
	}
	
	if (cellIndex != null) {
		column = this.columns[cellIndex];
		cell.align = column.columnAlign;
		column_type = column.columnType;

		switch (column_type) {
			case 'optionlist':
				for (var i=0; i<column.options.length; i++) {
					if (value == column.options[i].value) {
                        cell.appendChild(ce('SPAN'));
                        QuiX.setInnerText(cell.firstChild,
                                          column.options[i].caption);
                    }
				}
				return;
			case 'img':
                if (value) {
                    elem = QuiX.getImage(value);
                    elem.align = 'absmiddle';
                    elem.ondragstart = QuiX.cancelDefault;
                    cell.appendChild(elem);
                }
				return;
			case 'bool':
				if (value) {
					while (cell.childNodes.length > 0) {
						QuiX.removeNode(cell.childNodes[0]);					
					}
					elem = QuiX.getImage(column.trueImg)
					elem.align = 'absmiddle';
					cell.appendChild(elem);
				}
				else
					cell.innerHTML = '&nbsp;'
				return;
			case 'date':
				cell.innerHTML = '<span>' + 
					value.format(column.format) + '</span>';
				return;
			default:
				if (typeof column_type == 'function') {
					cell.appendChild(column_type(column, obj, value))
					return;
				}
		}
		if (column._xform)
			value = column._xform(obj, value);
	}
	
	// auto-detect value type
	if (value instanceof Date) {
		cell.innerHTML = '<span>' + 
			value.format(this.dateFormat) + '</span>';
	}
    else if (typeof(value) == 'boolean') {
		if (value) {
			elem = QuiX.getImage(this.trueImg)
			elem.align = 'absmiddle';
			cell.appendChild(elem);
		}
        else {
			cell.innerHTML = '&nbsp;';
		}
	}
    else {
        cell.appendChild(ce('SPAN'));
        QuiX.setInnerText(cell.firstChild,
                          (value == '' && value != 0)?' ':value);
	}
}

QuiX.ui.ListView.prototype._getRow = function(evt) {
	var target = (QuiX.getTarget(evt));
	while (target && target.tagName != 'TR')
		target = QuiX.getParentNode(target);
	return target;	
}

function ListView__onclick (evt, w, f) {
	if (!evt) return;
	var row = w._getRow(evt);
	if (row)
		f(evt, w, w.dataSet[row.rowIndex]);
	else
		QuiX.cancelDefault(evt);
}

function ListView__onmousedown(evt) {
	evt = evt || event;
	QuiX.cancelDefault(evt);
	var lv = QuiX.getTargetWidget(evt).parent;
	if (lv._isDisabled) return;
	var row = lv._getRow(evt);
	if (row)
		lv._selectline(evt, row);
}

function ListView__onscroll(evt , w) {
    var offset = 0;
    if (QuiX.dir == 'rtl') {
        var family = QuiX.utils.BrowserInfo.family;
        if (family == 'saf')
            offset = QuiX._scrollbarSize;
        else if (family == 'op') {
            if (w.div.scrollHeight == w.div.offsetHeight)
                offset = QuiX._scrollbarSize;
        }
    }
	w.parent.header.div.scrollLeft = w.div.scrollLeft + offset;
}

function ListColumn__setCaption(s) {
	this.innerHTML = '<span style="white-space:nowrap"></span>';
    QuiX.setInnerText(this.firstChild, s);
}

function ListColumn__getCaption(s) {
	return this.firstChild.innerHTML;
}

function ListColumn__onclick(evt) {
	var sortOrder, orderBy;
	evt = evt || event;
	var lv = QuiX.getTargetWidget(evt).parent;
	if (lv._orderBy == this.name)
		sortOrder = (lv._sortOrder=='ASC')?'DESC':'ASC';
	else
		sortOrder = 'ASC';
	orderBy = this.name;
	lv.sort(orderBy, sortOrder);
	QuiX.stopPropag(evt);
}

function List__startDrag(x, y, el) {
	if (el.tagName == 'DIV')
		return;
	var dragable = new QuiX.ui.Widget({
		width : this.getWidth(true),
		height : 1,
		border : 1,
		style : 'border:1px solid transparent'
	});
	with (dragable) {
		div.className = this.div.className;
		setPosition('absolute');
		left = x + 2;
		top = y + 2;
		setOpacity(.5);
	}
	// fill with selected rows
	var src_row, row;
	var srcTable = this.div.firstChild;
	var table = srcTable.cloneNode(false);
	table.appendChild(ce('TBODY'));
	dragable.div.appendChild(table);
	
	for (var i=0; i<this.parent.selection.length; i++) {
		src_row = srcTable.rows[this.parent.selection[i]];
		dragable.height += src_row.offsetHeight;
		row = src_row.cloneNode(true);
		if (i==0) {
			for (var j=0; j<row.cells.length; j++) {
				row.cells[j].style.width =
					srcTable.rows[0].cells[j].style.width;
			}	
		}
		table.firstChild.appendChild(row);
	}
	document.desktop.appendChild(dragable);
	dragable.div.style.zIndex = QuiX.maxz;
	dragable.redraw(true);

	QuiX.tmpWidget = dragable;
	QuiX.dragable = this.parent;

	document.desktop.attachEvent('onmouseover', Widget__detecttarget);
	document.desktop.attachEvent('onmousemove', Widget__drag);
}
