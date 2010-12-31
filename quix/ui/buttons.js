/************************
Labels & Buttons
************************/

// label

QuiX.ui.Label = function(/*params*/) {
    var params = arguments[0] || {};
    params.padding = params.padding || '2,2,2,2';

    this.base = QuiX.ui.Widget;
    this.base(params);

    if (!QuiX.supportTouches) {
        this.attachEvent('onmousedown', QuiX.ui.Label._onmousedown);
    }
    this.div.className = 'label';
    this.align = params.align || '';

    if (params.color) {
        if (!this._isDisabled) {
            this.div.style.color = params.color;
        }
        else {
            this._statecolor = params.color;
        }
    }

    this.canSelect = (params.canselect == "true" || params.canselect == true);
    if (this.canSelect) {
        if (QuiX.utils.BrowserInfo.family == 'ie') {
            this.div.onselectstart = QuiX.stopPropag;
        }
        else if (QuiX.getCssAttribute('userSelect')) {
            this.div.style[QuiX.getCssAttribute('userSelect')] = 'text';
        }
        this.div.style.cursor = 'text';
    }
    this.wrap = (params.wrap == "true" || params.wrap == true);

    var caption = params.caption || '';
    this.div.appendChild(ce('SPAN'));
    this.setCaption(caption);
}

QuiX.constructors['label'] = QuiX.ui.Label;
QuiX.ui.Label.prototype = new QuiX.ui.Widget;

QuiX.ui.Label.prototype._calcSize = function(height, offset, getHeight, memo) {
    if (this[height] == 'auto' &&
            (!memo || (memo && !memo[this._uniqueid + height]))) {
        // we need to measure
        var value = QuiX.measureWidget(this, height);
        if (typeof memo != 'undefined')
            memo[this._uniqueid + height] = value;
        return value - offset;
    }
    else {
        return QuiX.ui.Widget.prototype._calcSize.apply(this, arguments);
    }
}

QuiX.ui.Label.prototype.setCaption = function(s) {
    var span = this.div.getElementsByTagName('SPAN')[0];
    QuiX.setInnerText(span, s);
}

QuiX.ui.Label.prototype.getCaption = function() {
    return this.div.getElementsByTagName('SPAN')[0].innerHTML.xmlDecode();
}

QuiX.ui.Label.prototype.redraw = function(bForceAll /*, memo*/) {
    QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
    if (!this.wrap) {
        this.div.style.lineHeight = this.div.style.height;
    }
    if (bForceAll) {
        with (this.div.style) {
            if (!this.wrap) {
                whiteSpace = 'nowrap';
            }
            else {
                whiteSpace = 'normal';
                lineHeight = '';
            }
            if (this.align) {
                if (this.align == 'auto') {
                    textAlign = (QuiX.dir == 'rtl')? 'right':'left';
                }
                else {
                    textAlign = this.align;
                }
            }
        }
    }
}

QuiX.ui.Label._onmousedown = function(evt, w) {
    if (!w.canSelect) {
        QuiX.cancelDefault(evt);
    }
    else {
        QuiX.stopPropag(evt);
    }
}

// link

QuiX.ui.Link = function(/*params*/) {
    var params = arguments[0] || {};
    this.href = params.href;
    if (typeof params.target != 'undefined')
        this.target = params.target
    else
        this.target = '_blank';
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

// image

QuiX.ui.Image = function(/*params*/) {
    var params = arguments[0] || {};
    this.base = QuiX.ui.Widget;
    this.base(params);
    this.setImageURL(params.img);
    this.div.style.backgroundRepeat = params.repeat || 'no-repeat';
    this.div.style.backgroundPosition = params.position || '50% 50%';
    this.div.className = 'image';
}

QuiX.constructors['image'] = QuiX.ui.Image;
QuiX.ui.Image.prototype = new QuiX.ui.Widget;

QuiX.ui.Image.prototype.setImageURL = function(url) {
    this._url = url || null;
    if (this._url) {
        this.div.style.backgroundImage = "url('" + this._url + "')";
    }
    else {
        this.div.style.backgroundImage = '';
    }
}

QuiX.ui.Image.prototype.getImageURL = function() {
    return this._url;
}

// icon

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
    this.spacing = parseInt(params.spacing) || 4;
    this.imgHeight = params.imgheight;
    this.imgWidth = params.imgwidth;
    this.redraw(true);
}

QuiX.constructors['icon'] = QuiX.ui.Icon;
QuiX.ui.Icon.prototype = new QuiX.ui.Label;

QuiX.ui.Icon.prototype.setImageURL = function(s) {
    if (s != this.img) {
        this.img = s;
        if (this.imageElement) {
            if (QuiX.utils.BrowserInfo.family == 'ie' &&
                    this.div.clientWidth == 0) {
                this.redraw(true);
            }
            else {
                this.imageElement.src = s;
            }
        }
    }
}

QuiX.ui.Icon.prototype.getImageURL = function() {
    return (this.imageElement)? this.imageElement.src:this.img;
}

QuiX.ui.Icon.prototype.redraw = function(bForceAll /*, memo*/) {
    QuiX.ui.Label.prototype.redraw.apply(this, arguments);

    if (this.img && (this.imgAlign == 'top' || this.imgAlign == 'bottom')) {
        this.div.style.lineHeight = '';
    }

    if (bForceAll) {
        if (this.img + this.imgAlign + this.spacing != this._sig) {
            var imgs = this.div.getElementsByTagName('IMG');
            while (imgs.length > 0) {
                imgs[0].ondragstart = null;
                QuiX.removeNode(imgs[0]);
            }
            var br = this.div.getElementsByTagName('BR')[0];
            if (br) QuiX.removeNode(br);

            if (this.img) {
                var percentage;
                var caption = this.getCaption();

                if (caption != '') {
                    var img = QuiX.getImage(this.img);
                    img.style.verticalAlign = (this.imgAlign == 'top')?
                        'top':'middle';
                    img.ondragstart = QuiX.cancelDefault;
                    //if (this.imgAlign == 'left' || this.imgAlign == 'right') {
                    //    // for vertical alignment
                    //    this._fi = QuiX.getImage(QuiX.baseUrl +
                    //                             'images/transp.gif');
                    //    this._fi.style.verticalAlign = 'middle';
                    //    this._fi.style.width = '0px';
                    //    if (this.imgAlign == 'right') {
                    //        this.div.appendChild(this._fi);
                    //    }
                    //    else {
                    //        this.div.insertBefore(this._fi,
                    //                              this.div.firstChild);
                    //    }
                    //}
                    switch(this.imgAlign) {
                        case "left":
                            img.style.marginRight = this.spacing + 'px';
                            this.div.insertBefore(img, this.div.firstChild);
                            break;
                        case "right":
                            img.style.marginLeft = this.spacing + 'px';
                            this.div.appendChild(img);
                            break;
                        case "top":
                            img.style.marginBottom = this.spacing + 'px';
                            this.div.insertBefore(ce('BR'), this.div.firstChild);
                            this.div.insertBefore(img, this.div.firstChild);
                            break;
                        case "bottom":
                            img.style.marginTop = this.spacing + 'px';
                            this.div.appendChild(ce('BR'));
                            this.div.appendChild(img);
                    }
                }
                else {
                    this.div.style.backgroundImage = 'url("' +
                        this.img.replace('$THEME_URL$', QuiX.getThemeUrl()) +
                        '")';
                    this.div.style.backgroundRepeat = 'no-repeat';
                    this.div.style.backgroundPosition = '50% 50%';
                }
                this.imageElement = img;
            }
            else {
                this.imageElement = null;
            }
            this._sig = this.img + this.imgAlign + this.spacing;
        }
    }
    //if (this._fi) {
    //    this._fi.style.height = this.div.style.height;
    //}
    if (this.imageElement && (this.imgHeight || this.imgWidth)) {
        if (this.imgHeight) {
            percentage = this.imgHeight.toString().charAt(
                this.imgHeight.length - 1);
            this.imageElement.style.height =
                (percentage == '%')? this.imgHeight:this.imgHeight + 'px';
        }
        if (this.imgWidth) {
            percentage = this.imgWidth.toString().charAt(
                this.imgWidth.length - 1);
            this.imageElement.style.width =
                (percentage == '%')? this.imgWidth:this.imgWidth + 'px';
        }
    }
}

// button

QuiX.ui.Button = function(/*params*/) {
    var params = arguments[0] || {};
    this.icon = null;
    this.base = QuiX.ui.Widget;
    this.base({
        id: params.id,
        border: params.border || 1,
        width: params.width,
        height: params.height,
        minw: params.minw,
        minh: params.minh,
        top: params.top,
        left: params.left,
        disabled: params.disabled,
        display: params.display,
        overflow: 'hidden',
        onmouseout: params.onmouseout,
        onmouseup: params.onmouseup,
        onmousedown: params.onmousedown,
        onclick: params.onclick,
        onload: params.onload
    });
    this.div.className = 'btn';
    this.div.style.cursor = 'pointer';

    this.attachEvent('onmouseout', QuiX.ui.Button._onmouseout);
    this.attachEvent('onmouseup', QuiX.ui.Button._onmouseup);
    this.attachEvent('onmousedown', QuiX.ui.Button._onmousedown);

    delete params.id; delete params.top; delete params.left;
    delete params.minw; delete params.minh;
    delete params.onmouseover; delete params.onmousedown;
    delete params.onmouseup; delete params.onclick; delete params.onload;
    delete params.bgcolor; delete params.display;

    params.height = '100%';
    params.width = '100%';
    params.border = 1;
    params.align = params.align || 'center';

    this.align = params.align;
    this.imgAlign = params.imgalign || 'left';
    this.img = params.img || null;
    this.spacing = parseInt(params.spacing) || 4;

    this.icon = new QuiX.ui.Icon(params);
    this.icon.div.className = 'l2';
    this.icon.setPosition();
    this.appendChild(this.icon);

    if (this._isDisabled) {
        this._statecursor = 'pointer';
    }
}

QuiX.constructors['button'] = QuiX.ui.Button;
QuiX.ui.Button.prototype = new QuiX.ui.Widget;

QuiX.ui.Button.prototype._calcSize = function(height, offset, getHeight,
                                              memo) {
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

        if (this[other] != 'auto') {
            div.style[other] = this[other_func](true, memo) + 'px';
        }
        div.innerHTML = this.div.firstChild.innerHTML;
        // required by safari
        var imgs = div.getElementsByTagName('IMG');
        if (imgs.length > 0) {
        	imgs[0].style.height = '';
        }
        //
        document.body.appendChild(div);
        var value = div[measure] +
                    padding[padding_offset] +
                    padding[padding_offset + 1] +
                    2 * this.getBorderWidth();
        QuiX.removeNode(div);
        if (memo) {
            memo[this._uniqueid + height] = value;
        }
        return value - offset;
    }
    else {
        return QuiX.ui.Widget.prototype._calcSize.apply(this, arguments);
    }
}

QuiX.ui.Button.prototype.setPadding = function(pad) {
    this.icon.setPadding(pad);
}

QuiX.ui.Button.prototype.getPadding = function() {
    return this.icon.getPadding();
}

QuiX.ui.Button.prototype.setImageURL = function(url) {
    this.img = url;
    this.redraw(true);
}

QuiX.ui.Button.prototype.getImageURL = function() {
    return this.img;
}

QuiX.ui.Button.prototype.setCaption = function(s) {
    this.icon.setCaption(s);
}

QuiX.ui.Button.prototype.getCaption = function() {
    return this.icon.getCaption();
}

QuiX.ui.Button.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
    if (bForceAll) {
        this.icon.align = this.align;
        this.icon.img = this.img;
        this.icon.imgAlign = this.imgAlign;
        this.icon.spacing = this.spacing;
        this.icon.redraw(true, memo);
    }
}

QuiX.ui.Button._onmouseout = function(evt, w) {
    w.div.className = 'btn';
    if (w._isPressed) {
        w.icon.addPaddingOffset('Left', -1);
        w.icon.addPaddingOffset('Top', -1);
        w._isPressed = false;
    }
}

QuiX.ui.Button._onmousedown = function(evt, w) {
    w.div.className += ' down';
    w.icon.addPaddingOffset('Left', 1);
    w.icon.addPaddingOffset('Top', 1);
    w._isPressed = true;
}

QuiX.ui.Button._onmouseup = function(evt, w) {
    w.div.className = 'btn';
    w.icon.addPaddingOffset('Left', -1);
    w.icon.addPaddingOffset('Top', -1);
    w._isPressed = false;
}

// flat button

QuiX.ui.FlatButton = function(/*params*/) {
    var params = arguments[0] || {};
    params.border = 1;
    params.padding = params.padding || '3,3,3,3';
    params.overflow = 'hidden';
    params.align = params.align || 'center';

    params.onclick = QuiX.wrappers.eventWrapper(QuiX.ui.FlatButton._onclick,
                                                params.onclick);

    this.base = QuiX.ui.Icon;
    this.base(params);
    this.div.className = 'flat';

    this.attachEvent('onmouseover', QuiX.ui.FlatButton._onmouseover);
    this.attachEvent('onmouseout', QuiX.ui.FlatButton._onmouseout);
    this.attachEvent('onmousedown', QuiX.ui.FlatButton._onmousedown);
    this.attachEvent('onmouseup', QuiX.ui.FlatButton._onmouseup);

    this.type = params.type || 'normal';
    this._ispressed = false;

    if (this.type=='menu') {
        delete params.height;
        delete params.overflow;
        delete params.border;
        delete params.padding;
        var oCMenu = new QuiX.ui.ContextMenu(params, this);
        this.contextMenu = oCMenu;
    }

    if (this.type == 'toggle') {
        this.value = params.value || 'off';
        if (this.value == 'on') {
            this.value = 'off';
            this.toggle();
        }
    }
}

QuiX.constructors['flatbutton'] = QuiX.ui.FlatButton;
QuiX.ui.FlatButton.prototype = new QuiX.ui.Icon;

QuiX.ui.FlatButton.prototype.toggle = function() {
    if (this.value == 'off') {
        this.div.className += ' on';
        this.value = 'on';
    }
    else {
        this.div.className = 'flat';
        this.value = 'off';
    }
}

QuiX.ui.FlatButton._onmouseover = function(evt, w) {
    if (!(w.type == 'toggle' && w.value == 'on')) {
        w.div.className += ' over';
    }
}

QuiX.ui.FlatButton._onmouseout = function(evt, w) {
    if (!(w.type == 'toggle' && w.value == 'on')) {
        w.div.className = 'flat';
        if (w.type != 'toggle' && w._ispressed) {
            w._ispressed = false;
        }
    }
}

QuiX.ui.FlatButton._onmousedown = function(evt, w) {
    w.div.className += ' on';
    if (w.type != 'toggle') {
        w._ispressed = true;
    }
}

QuiX.ui.FlatButton._onmouseup = function(evt, w) {
    w.div.className = w.div.className.replace(' on', '');
    if (w.type != 'toggle' && w._ispressed) {
        w._ispressed = false;
    }
}

QuiX.ui.FlatButton._onclick = function(evt, w) {
    if (w.type == 'toggle') {
        w.toggle();
    }
    else if (w.type == 'menu') {
        if (!w.contextMenu.isOpen) {
            w.div.className += ' menu';
            QuiX.ui.ContextMenu._showWidgetContextMenu(w, w.contextMenu);
        }
        else {
            w.div.className = 'flat';
            w.contextMenu.close();
        }
    }
}

// sprite button
/**
 * You can define 4 states as follows
 * normal, over, down, disabled
 */
QuiX.ui.SpriteButton = function(/*params*/) {
    var params = arguments[0] || {},
        self = this,
        img = new QuiX.Image(params.img);

    this.isToggle = (params.toggle == 'true' || params.toggle == true);
    if (this.isToggle) {
        this.state = 'off';
        var state = params.state;
        if (state == 'on') {
            this.toggle();
        }
    }

    img.load(
        function() {
            self._imgHeight = img.height;
            self._states = (img.height / params.height);
            if (self._states > 2) {
                self.attachEvent('onmousedown',
                                 QuiX.ui.SpriteButton._onmousedown);
                self.attachEvent('onmouseup',
                                 QuiX.ui.SpriteButton._onmouseover);
                if (self._isDisabled && self._states == 4) {
                    self.disable();
                }
            }
            if (self.isToggle && self._st) {
                self.toggle();
            }
        });

    params.overflow = 'hidden';
    params.align = params.align || 'center';

    this.base = QuiX.ui.Label;
    this.base(params);

    this.attachEvent('onmouseover', QuiX.ui.SpriteButton._onmouseover);
    this.attachEvent('onmouseout', QuiX.ui.SpriteButton._onmouseout);

    this.div.className = 'spritebutton';
    this.div.style.backgroundImage = 'url(' + params.img + ')';
    this.div.style.backgroundRepeat = 'repeat-x';
}

QuiX.constructors['spritebutton'] = QuiX.ui.SpriteButton;
QuiX.ui.SpriteButton.prototype = new QuiX.ui.Label;

QuiX.ui.SpriteButton.prototype.enable = function() {
    this._setBackgroundPosition('0px');
    QuiX.ui.Label.prototype.enable.apply(this);
}

QuiX.ui.SpriteButton.prototype.disable = function() {
    var top;
    if (this._states == 4) {
        top = (parseInt(this.height) - (this._imgHeight)) + 'px';
    }
    else {
        top = '0px';
    }
    this._setBackgroundPosition(top);
    QuiX.ui.Label.prototype.disable.apply(this);
}

QuiX.ui.SpriteButton.prototype.toggle = function() {
    if (this.isToggle) {
        QuiX.ui.SpriteButton._onmousedown(null, this);
    }
}

QuiX.ui.SpriteButton.prototype.resetToggleGroup = function() {
    var id = this.getId(),
        grp = this.parent.getWidgetById(id);
    for (var i=0; i<grp.length; i++) {
        if (grp[i].state == 'on') {
            grp[i].toggle();
        }
    }
}

QuiX.ui.SpriteButton.prototype._setBackgroundPosition = function(top) {
    this.div.style.backgroundPosition = '0px ' + top;
}

QuiX.ui.SpriteButton._onmouseover = function(evt, w) {
    if (!w.isToggle) {
        var top = - (w.height) + 'px';
        w._setBackgroundPosition(top);
    }
}

QuiX.ui.SpriteButton._onmouseout = function(evt, w) {
    if (!w.isToggle) {
        w._setBackgroundPosition('0px');
    }
}

QuiX.ui.SpriteButton._onmousedown = function(evt, w) {
    var top;
    if (w.isToggle && w.state == 'on') {
        if (evt && w.parent.getWidgetById(w.getId()).length) {
            return;
        }
        top = '0px';
        w.state = 'off';
    }
    else {
        if (w.isToggle && w.state == 'off') {
            if (w.parent) {
                w.resetToggleGroup();
            }
            if (!isNaN(w._imgHeight)) {
                w.state = 'on';
            }
            else {
                // the image has not loaded yet
                w._st = true;
                return;
            }
        }
        if (w._states == 3) {
            top = (parseInt(w.height) - (w._imgHeight)) + 'px';
        }
        else {
            top = ((parseInt(w.height) * 2) - (w._imgHeight)) + 'px';
        }
    }
    w._setBackgroundPosition(top);
}
