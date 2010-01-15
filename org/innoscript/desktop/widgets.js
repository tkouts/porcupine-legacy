// Custom QuiX widgets used by
// edit forms automatically generated
// by the desktop

// Reference1 datatype QuiX control
function Reference1(/*params*/) {
	var params = arguments[0] || {};
	this.base = QuiX.ui.Box;
	
	params.orientation = 'h';
	params.spacing = params.spacing || 0;
	params.childrenalign = 'center';
	params.height = params.height || 24;
	this.base(params);
	
	this.root = params.root || '';
	this.cc = params.cc;

	var hidden = new QuiX.ui.Field({
		name : params.name,
		value : params.value,
		type : 'hidden'
	});
	this.appendChild(hidden);
	hidden.hide();
	
	var lbl = new QuiX.ui.Label({
		caption : params.caption,
		width : 105,
		height : 20
	});
	this.appendChild(lbl);

	var fld = new QuiX.ui.Field({
		readonly : true,
		value : params.dn
	});
	this.appendChild(fld);
	
	var btn1 = new QuiX.ui.Button({
		caption : '...',
		width : 20,
		height : 20,
		disabled : params.disabled,
		onclick : Reference1__SelectObject
	});
	this.appendChild(btn1);
	
	var btn2 = new QuiX.ui.Button({
		img : 'desktop/images/cancel8.gif',
		width : 20,
		height : 20,
		disabled : params.disabled,
		onclick : Reference1__Clear		
	});
	this.appendChild(btn2);
	
	this.redraw(true);
}

Reference1.prototype = new QuiX.ui.Box;

function Reference1__SelectObject(evt, btn) {
	var oWindow = btn.getParentByType(Window);
	var oTarget = btn.parent;
	
	oWindow.showWindow(oTarget.root + '?cmd=selectobjects&cc=' +
		oTarget.cc + '&multiple=false',
		function(dlg) {
			dlg.attributes.control = oTarget;
			dlg.attachEvent("onclose", Reference1__fill);
		}
	);
}

function Reference1__Clear(evt, btn) {
	var fields = btn.parent.getWidgetsByType(Field);
	fields[0].setValue('');
	fields[1].setValue('');
}

function Reference1__fill(dlg) {
	if (dlg.buttonIndex == 0) {
		var target = dlg.attributes.control;
		var source = dlg.getWidgetById('selection');
		
		for (var i=0; i<source.options.length; i++) {
			var oOption = source.options[i];
			var fields = target.getWidgetsByType(Field);
			if (oOption.selected) {
				fields[0].setValue(oOption.value);
				fields[1].setValue(oOption.getCaption());
				return;
			}
		}
	}
}

// ReferenceN datatype QuiX control
function ReferenceN(/*params*/) {
	var params = arguments[0] || {};
	this.base = QuiX.ui.Box;
	
	params.orientation = 'v';
	this.base(params);
	
	this.root = params.root || '';
	this.cc = params.cc;
	
	var select = new QuiX.ui.SelectList({
		name : params.name,
		value : params.value,
		multiple : true,
		posts : 'all'
	});
	this.appendChild(select);
	
	var values = (params.value || '').split(';');
	for (var i=0; i < values.length - 1; i += 3) {
		select.addOption({
			img : values[i],
			value : values[i+1],
			caption : values[i+2]
		});
	}
	
	var rect = new QuiX.ui.Widget({
		height : 24,
		disabled : params.disabled
	});
	this.appendChild(rect);
	
	var btn1 = new QuiX.ui.FlatButton({
		width : 70,
		height : 22,
		caption : '@@ADD@@...',
		onclick : ReferenceN__SelectObject
	});
	rect.appendChild(btn1);
	
	var btn2 = new QuiX.ui.FlatButton({
		left : 80,
		width : 70,
		height : 22,
		caption : '@@REMOVE@@',
		onclick : ReferenceN__clear
	});
	rect.appendChild(btn2);
	
	this.redraw(true);
}

ReferenceN.prototype = new QuiX.ui.Box;

function ReferenceN__SelectObject(evt, btn) {
	var oWindow = btn.getParentByType(Window);
	var oTarget = btn.parent.parent;
	
	oWindow.showWindow(oTarget.root + '?cmd=selectobjects&cc=' +
		oTarget.cc + '&multiple=true',
		function(dlg) {
			dlg.attributes.control = oTarget;
			dlg.attachEvent("onclose", ReferenceN__fill);
		}
	);
}

function ReferenceN__clear(evt, btn) {
	var oSelectList = btn.parent.parent.getWidgetsByType(SelectList)[0];
	oSelectList.removeSelected();
}

function ReferenceN__fill(dlg) {
	if (dlg.buttonIndex == 0) {
		var target = dlg.attributes.control.getWidgetsByType(SelectList)[0];
		var source = dlg.getWidgetById('selection');
		
		for (var i=0; i<source.options.length; i++) {
			var oOption = source.options[i];
			if (oOption.selected) {
				target.addOption({
					img : oOption.img, 
					caption : oOption.getCaption(), 
					value : oOption.value
				});
			}
		}
	}
}

// ACLEditor QuiX control
function ACLEditor(/*params*/) {
	var params = arguments[0] || {};
	this.base = QuiX.ui.Box;
	
	params.orientation = 'v';
	params.spacing = params.spacing || 0;
	this.base(params);
	
	var rolesInherited = (params.rolesinherited == true ||
						  params.rolesinherited == 'true')? true:false;
	
	var ri = new QuiX.ui.Field({
		id : '__rolesinherited',
		name : '__rolesinherited',
		type : 'checkbox',
		height : 24,
		caption : '@@ROLES_INHERITED@@',
		value : rolesInherited,
		onclick : ACLEditor__riclick
	});
	this.appendChild(ri);
	
	var box = new QuiX.ui.Box({
		spacing : 0,
		disabled : rolesInherited
	});
	this.appendChild(box);
	
	var dg = new QuiX.ui.DataGrid({
		id : '__acl',
		name : '__acl'
	});
	dg.addHeader({});
	
	dg.addColumn({
		caption : '@@displayName@@',
		name : 'displayName',
		width : '140',
		editable : false
	});
	
	var col2 = dg.addColumn({
		caption : '@@ROLE@@',
		name : 'role',
		type : 'optionlist',
		width : '140'
	});
	
	col2.options = [
		{value : '1', caption : '@@ROLE_1@@'},
		{value : '2', caption : '@@ROLE_2@@'},
		{value : '4', caption : '@@ROLE_4@@'},
		{value : '8', caption : '@@ROLE_8@@'}
	];
	
	box.appendChild(dg);
		
	var rect = new QuiX.ui.Widget({width : 60});
	box.appendChild(rect);
	
	var btn1 = new QuiX.ui.FlatButton({
		left : 'center',
		width : 56,
		height : 22,
		caption : '@@ADD@@',
		onclick : ACLEditor__selectUsers
	});
	rect.appendChild(btn1);
	
	var btn2 = new QuiX.ui.FlatButton({
		top : 24,
		left : 'center',
		width : 56,
		height : 22,
		caption : '@@REMOVE@@',
		onclick : ACLEditor__removeEntries
	});
	rect.appendChild(btn2);
	
	this.redraw(true);
}

ACLEditor.prototype = new QuiX.ui.Box;

function ACLEditor__riclick(evt, check) {
	var _aclbox = check.parent.widgets[1];
	if (!check.getValue()) _aclbox.enable();
	else _aclbox.disable();
}

function ACLEditor__selectUsers(evt, btn) {
	var oWindow = btn.getParentByType(Window);
	var oTarget = btn.parent.parent;
	
	oWindow.showWindow('users?cmd=selectobjects&cc=*&multiple=true',
		function(dlg) {
			dlg.attributes.control = oTarget;
			dlg.attachEvent("onclose", ACLEditor__addSelectedUsers);
		}
	);
}

function ACLEditor__addSelectedUsers(dlg) {
	if (dlg.buttonIndex == 0) {
		var target = dlg.attributes.control.getWidgetsByType(DataGrid)[0];
		var source = dlg.getWidgetById('selection');
		
		for (var i=0; i<source.options.length; i++) {
			var oOption = source.options[i];
			if (oOption.selected) {
				target.dataSet.push({
					id : oOption.value, 
					displayName : oOption.getCaption(), 
					role: '1'
				});
			}
		}
		target.refresh();
	}
}

function ACLEditor__removeEntries(evt, btn) {
	var oDataGrid = btn.parent.parent.getWidgetsByType(DataGrid)[0];
	oDataGrid.removeSelected();
}
