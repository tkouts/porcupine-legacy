/************************
Labels & Buttons
************************/
QuiX.ui.Label = function(/*params*/) {
	var params = arguments[0] || {};
	params.padding = params.padding || '2,2,2,2';
	params.onmousedown = QuiX.wrappers.eventWrapper(Label__onmousedown,
                                                    params.onmousedown);
	
	this.base = QuiX.ui.Widget;
	this.base(params);

	this.div.className = 'label';
	this.align = params.align;
	
	if (params.color) {
		if (!this._isDisabled)
			this.div.style.color = params.color;
		else
			this._statecolor = params.color;
	}

	this.canSelect = (params.canselect=="true" || params.canselect==true)?
					 true:false;
	if (this.canSelect) {
		this.div.onselectstart = QuiX.stopPropag;
		this.div.style.cursor = 'text';
	}
	this.wrap = (params.wrap=="true" || params.wrap==true);
	
	var caption = params.caption || '';
    this.div.appendChild(ce('SPAN'));
    this.setCaption(caption);
}

QuiX.constructors['label'] = QuiX.ui.Label;
QuiX.ui.Label.prototype = new QuiX.ui.Widget;
// backwards compatibility
var Label = QuiX.ui.Label;

QuiX.ui.Label.prototype._calcSize = function(height, offset, getHeight, memo) {
    if (this[height] == 'auto' &&
            (!memo || (memo && !memo[this._uniqueid + height]))) {
        // we need to measure
        var value = QuiX.measureWidget(this, height);
        if (typeof memo != 'undefined')
            memo[this._uniqueid + height] = value;
        return value - offset;
    }
    else
        return Widget.prototype._calcSize.apply(this, arguments);
}

QuiX.ui.Label.prototype.setCaption = function(s) {
    var span = this.div.getElementsByTagName('SPAN')[0];
    QuiX.setInnerText(span, s);
}

QuiX.ui.Label.prototype.getCaption = function() {
	return this.div.getElementsByTagName('SPAN')[0].innerHTML.xmlDecode();
}

QuiX.ui.Label.prototype.redraw = function(bForceAll /*, memo*/) {
	with (this.div.style) {
		if (!this.wrap)
			whiteSpace = 'nowrap';
		else
			whiteSpace = '';
        if (this.align) {
            if (this.align == 'auto')
                textAlign = (QuiX.dir=='rtl')?'right':'left';
            else
                textAlign = this.align;
        }
	}
	QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
}

function Label__onmousedown(evt, w) {
	if (!w.canSelect)
		QuiX.cancelDefault(evt);
	else
		QuiX.stopPropag(evt);
}

QuiX.ui.Link = function(/*params*/) {
    var params = arguments[0] || {};
    this.href = params.href;
    this.target = params.target || '_blank';
    this.base = QuiX.ui.Label;
    this.base(params);
}

QuiX.constructors['link'] = QuiX.ui.Link;
QuiX.ui.Link.prototype = new QuiX.ui.Label;

QuiX.ui.Link.prototype.setCaption = function(s) {
    var a;
    a = this.div.getElementsByTagName('A')[0];
    if (!a) {
        var span = this.div.getElementsByTagName('SPAN')[0];
        a = ce('A');
        span.appendChild(a);
    }
    a.href = this.href || 'javascript:void(0)';
    a.target = this.target;
    QuiX.setInnerText(a, s);
}

QuiX.ui.Link.prototype.getCaption = function() {
	return this.div.getElementsByTagName('A')[0].firstChild
           .innerHTML.xmlDecode();
}

QuiX.ui.Icon = function(/*params*/) {
	var params = arguments[0] || {};
	params.border = params.border || 0;
	params.canSelect = false;
	params.align = params.align || 'center';
	
	this.base = QuiX.ui.Label;
	this.base(params);
	this.img = params.img || null;
	this.imageElement = null;
	this.imgAlign = params.imgalign || 'left';
	this.imgHeight = params.imgheight;
	this.imgWidth = params.imgwidth;
	this.redraw(true);
}

QuiX.constructors['icon'] = QuiX.ui.Icon;
QuiX.ui.Icon.prototype = new QuiX.ui.Label;
// backwards compatibility
var Icon = QuiX.ui.Icon;

QuiX.ui.Icon.prototype.setImageURL = function(s) {
	this.img = s;
	if (this.imageElement)
		this.imageElement.src = s;
}

QuiX.ui.Icon.prototype.getImageURL = function() {
	return (this.imageElement)?this.imageElement.src:'';
}

QuiX.ui.Icon.prototype._addDummyImage = function() {
	var img = QuiX.getImage('$THEME_URL$images/transp.gif');
	img.style.verticalAlign = 'middle';
	img.style.height = '100%';
	img.style.width = '1px';
	if (this.imgAlign=='right') {
		this.div.appendChild(img);
	}
	else if (this.imgAlign=='left') {
		this.div.insertBefore(img, this.div.firstChild);
	}
}

QuiX.ui.Icon.prototype.redraw = function(bForceAll /*, memo*/) {
	if (bForceAll) {
		var imgs = this.div.getElementsByTagName('IMG');
		while (imgs.length > 0)
			QuiX.removeNode(imgs[0]);
		var br = this.div.getElementsByTagName('BR')[0];
		if (br) QuiX.removeNode(br);

		if (this.imgAlign == 'left' || this.imgAling == 'right')
			this._addDummyImage();

		if (this.img) {
			var percentage;
			var img = QuiX.getImage(this.img);
			var caption = this.getCaption();
			img.style.verticalAlign = (this.imgAlign=='top')?'top':'middle';
			img.ondragstart = QuiX.cancelDefault;
			
			if (caption != '') {
				switch(this.imgAlign) {
					case "left":
						img.style.marginRight = '3px';
						this.div.insertBefore(img, this.div.firstChild);
						break;
					case "right":
						img.style.marginLeft = '3px';
						this.div.appendChild(img);
						break;
					case "top":
						this.div.insertBefore(ce('BR'), this.div.firstChild);
						this.div.insertBefore(img, this.div.firstChild);
						break;
					case "bottom":
						this.div.appendChild(ce('BR'));
						this.div.appendChild(img);
				}
			}
			else {
				this.div.insertBefore(img, this.div.firstChild);
			}
			this.imageElement = img;
		}
		else
			this.imageElement = null;
	}
	if (this.imageElement && (this.imgHeight || this.imgWidth)) {
		if (this.imgHeight) {
			percentage = this.imgHeight.toString().charAt(this.imgHeight.length-1);
			this.imageElement.style.height =
				(percentage == '%')?this.imgHeight:this.imgHeight + 'px';
		}
		if (this.imgWidth) {
			percentage = this.imgWidth.toString().charAt(this.imgWidth.length-1);
			this.imageElement.style.width =
				(percentage == '%')?this.imgWidth:this.imgWidth + 'px';
		}
	}
	QuiX.ui.Label.prototype.redraw.apply(this, arguments);
}

//Button class

QuiX.ui.Button = function(/*params*/) {
	var params = arguments[0] || {};
	this.icon = null;
	this.base = QuiX.ui.Widget;
	this.base({
		id: params.id,
		border: 1,
		width: params.width,
		height: params.height,
		minw: params.minw,
		minh: params.minh,
		top: params.top,
		left: params.left,
		disabled: params.disabled,
        display: params.display,
		bgcolor: params.bgcolor || 'buttonface',
		overflow: 'hidden',
		onmouseout: QuiX.wrappers.eventWrapper(XButton__onmouseout,
                                               params.onmouseout),
		onmouseup: QuiX.wrappers.eventWrapper(XButton__onmouseup,
                                              params.onmouseup),
		onmousedown: QuiX.wrappers.eventWrapper(XButton__onmousedown,
                                                params.onmousedown),
		onclick: params.onclick,
        onload: params.onload
	});
	this.div.className = 'btn';
	this.div.style.cursor = 'pointer';
	
	delete params.id; delete params.top; delete params.left;
	delete params.minw;	delete params.minh; delete params.onclick;
	delete params.onmouseover; delete params.onmousedown;
	delete params.onmouseup; delete params.onmousedown; delete params.onload;
	delete params.bgcolor; delete params.width; delete params.display;
    
	params.height = '100%';
	params.border = 1;
	this.iconPadding = params.iconpadding || '0,0,0,0';
	params.padding = this.iconPadding;
	params.align = params.align || 'center';

	this.align = params.align;
	this.imgAlign = params.imgAlign || 'left';
	this.img = params.img || null;
	
	this.icon = new QuiX.ui.Icon(params);
	this.icon.div.className = 'l2';
	this.icon.setPosition();
	this.appendChild(this.icon);

	if (this._isDisabled)
		this._statecursor = 'pointer';
}

QuiX.constructors['button'] = QuiX.ui.Button;
QuiX.ui.Button.prototype = new QuiX.ui.Widget;
// backwards compatibility
var XButton = QuiX.ui.Button;

QuiX.ui.Button.prototype._calcSize = function(height, offset, getHeight, memo) {
    if (this[height] == 'auto' &&
            (!memo || (memo && !memo[this._uniqueid + height]))) {
        // we need to measure
        var div = ce('DIV');
        div.style.position = 'absolute';
        div.id = this.div.id;
        div.style.border = this.icon.div.style.border;
        div.style.padding = this.icon.div.style.padding;

        var other = (height == 'height')?'width':'height';
        var other_func = (other == 'height')?'_calcHeight':'_calcWidth';
        var measure = (height == 'height')?'offsetHeight':'offsetWidth';
        var padding_offset = (height == 'height')?2:0;
        var padding = this.getPadding();

        if (this[other] != 'auto')
            div.style[other] = this[other_func](true, memo) + 'px';
        div.innerHTML = this.div.firstChild.innerHTML;
        // required by safari
        var imgs = div.getElementsByTagName('IMG');
        imgs[imgs.length - 1].style.height = '';
        //
        document.body.appendChild(div);
        var value = div[measure] +
                    padding[padding_offset] +
                    padding[padding_offset + 1] +
                    2 * this.getBorderWidth();
        QuiX.removeNode(div);
        if (memo)
            memo[this._uniqueid + height] = value;
        return value - offset;
    }
    else
        return Widget.prototype._calcSize.apply(this, arguments);
}

QuiX.ui.Button.prototype.setCaption = function(s) {
	this.icon.setCaption(s);
}

QuiX.ui.Button.prototype.getCaption = function() {
	return this.icon.getCaption();
}

QuiX.ui.Button.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
	if (bForceAll) {
		this.icon.align = this.align;
		this.icon.img = this.img;
		this.icon.imgAlign = this.imgAlign;
		this.icon.setPadding(this.iconPadding.split(','));
		this.icon.redraw(true, memo);
	}
	QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

function XButton__onmouseout(evt, w) {
	w.div.className = 'btn';
	if (w._isPressed) {
		w.icon.addPaddingOffset('Left', -1);
		w.icon.addPaddingOffset('Top', -1);
		w._isPressed = false;
	}
}

function XButton__onmousedown(evt, w) {
	w.div.className = 'btndown';
	w.icon.addPaddingOffset('Left', 1);
	w.icon.addPaddingOffset('Top', 1);
	w._isPressed = true;
}

function XButton__onmouseup(evt, w) {
	w.div.className = 'btn';
	w.icon.addPaddingOffset('Left', -1);
	w.icon.addPaddingOffset('Top', -1);
	w._isPressed = false;
}

//FlatButton class
QuiX.ui.FlatButton = function(/*params*/) {
	var params = arguments[0] || {};
	params.border = 1;
	params.padding = params.padding || '3,3,3,3';
	params.overflow = 'hidden';
	params.align = params.align || 'center';
	params.onmouseover = QuiX.wrappers.eventWrapper(FlatButton__onmouseover,
                                                    params.onmouseover);
	params.onmouseout = QuiX.wrappers.eventWrapper(FlatButton__onmouseout,
                                                   params.onmouseout);
	params.onmousedown = QuiX.wrappers.eventWrapper(FlatButton__onmousedown,
                                                    params.onmousedown);
	params.onmouseup = QuiX.wrappers.eventWrapper(FlatButton__onmouseup,
                                                  params.onmouseup);
	params.onclick = QuiX.wrappers.eventWrapper(FlatButton__onclick,
                                                params.onclick);

	this.base = QuiX.ui.Icon;
	this.base(params);
	this.div.className = 'flat';
	
	this.type = params.type || 'normal';
	
	this._ispressed = false;
	
	if (this.type=='menu') {
		delete(params.height);
		delete(params.overflow);
		var oCMenu = new ContextMenu(params, this);
		this.contextMenu = oCMenu;
		this._menuImg = null;
	}
	
	if (this.type=='toggle') {
		this.value = params.value || 'off';
		if (this.value == 'on') {
			this.value = 'off';
			this.toggle();
		}
	}
}

QuiX.constructors['flatbutton'] = QuiX.ui.FlatButton;
QuiX.ui.FlatButton.prototype = new QuiX.ui.Icon;
// backwards compatibility
var FlatButton = QuiX.ui.FlatButton;

QuiX.ui.FlatButton.prototype.redraw = function(bForceAll /*, memo*/) {
	QuiX.ui.Icon.prototype.redraw.apply(this, arguments);

	if (this.type == 'menu' && (!this._menuImg || bForceAll)) {
		this._menuImg = QuiX.getImage('$THEME_URL$images/desc8.gif');
		this._menuImg.border = 0;
		this._menuImg.align = 'top';
		this.div.appendChild(this._menuImg);
	}
}

QuiX.ui.FlatButton.prototype.toggle = function() {
	if (this.value=='off') {
		this.div.className = 'flaton';
		this.addPaddingOffset('Left', 1);
		this.addPaddingOffset('Right', -1);
		this.value = 'on';
	}
	else {
		this.addPaddingOffset('Left', -1);
		this.addPaddingOffset('Right', 1);
		this.div.className = 'flat';
		this.value = 'off';
	}
}

function FlatButton__onmouseover(evt, w) {
	if (!(w.type == 'toggle' && w.value == 'on')) {
		w.div.className += ' flatover';
	}
}

function FlatButton__onmouseout(evt, w) {
	if (!(w.type == 'toggle' && w.value == 'on')) {
		w.div.className = 'flat';
		if (w.type != 'toggle' && w._ispressed) {
			w.addPaddingOffset('Left', -1);
			w._ispressed = false;
		}
	}
}

function FlatButton__onmousedown(evt, w) {
	w.div.className = 'flaton';
	if (w.type == 'menu')
		QuiX.stopPropag(evt);
	if (w.type != 'toggle') {
		w.addPaddingOffset('Left', 1);
		w._ispressed = true;
	}
}

function FlatButton__onmouseup(evt, w) {
	w.div.className = 'flat';
	if (w.type != 'toggle' && w._ispressed) {
		w.addPaddingOffset('Left', -1);
		w._ispressed = false;
	}
}

function FlatButton__onclick(evt, w) {
	if (w.type=='toggle')
		w.toggle();
	else if (w.type=='menu') {
		if (!w.contextMenu.isOpen) {
			w.div.className = 'btnmenu';
			showWidgetContextMenu(w, w.contextMenu);
		}
		else {
			w.div.className = 'btn';
			w.contextMenu.close();
		}
	}
	QuiX.stopPropag(evt);
}
