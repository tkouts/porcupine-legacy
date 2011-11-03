/************************
Menus
************************/

// menu option

QuiX.ui.MenuOption = function(params) {
    delete params.width;
    delete params.height;
    if (!params.img) {
        params.img = QuiX.baseUrl + 'images/transp.gif';
    }
    params.imgwidth = 16;
    params.imgheight = 16;
    params.imgalign = 'left';
    params.padding = '4,18,3,3';
    params.border = params.border || 1;
    params.onmouseover = QuiX.ui.MenuOption._onmouseover;

    QuiX.ui.Icon.call(this, params);

    this.attachEvent('onclick', QuiX.ui.MenuOption._onclick);

    this.div.className = 'option';
    this.setPosition('relative');

    this.subMenu = null;
    this.type = params.type;
    this.selected = (params.selected == 'true' || params.selected == true);
}

QuiX.ui.MenuOption.prototype = new QuiX.ui.Icon;
QuiX.ui.MenuOption.prototype.__class__ = QuiX.ui.MenuOption;

QuiX.ui.MenuOption.prototype.addOption = function(params) {
    if (!this.subMenu) {
        this.subMenu = new QuiX.ui.ContextMenu({}, this);
    }
    return this.subMenu.addOption(params);
}

QuiX.ui.MenuOption.prototype._mustRedraw = function() {
    return true;
}

QuiX.ui.MenuOption.prototype._getSig = function(memo) {
    return null;
}

QuiX.ui.MenuOption.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
    if (this.subMenu) {
        this.div.className = 'option submenu';
    }
    else {
        this.div.className = 'option';
    }
    if (this.type) {
        if (this.selected) {
            switch (this.type) {
                case 'radio':
                    this.img = QuiX.theme.contextmenu.radioImg;
                    break;
                case 'check':
                    this.img = QuiX.theme.contextmenu.checkImg;
            }
        }
        else {
            this.img = QuiX.baseUrl + 'images/transp.gif';
        }
    }
    else if (!this.img) {
        this.img = QuiX.baseUrl + 'images/transp.gif';
    }
    QuiX.ui.Icon.prototype.redraw.apply(this, [bForceAll, memo]);
}

QuiX.ui.MenuOption.prototype.destroy = function() {
    var parent = this.parent;
    parent.options.removeItem(this);

    QuiX.ui.Icon.prototype.destroy.apply(this, arguments);

    if (parent.options.length==0
            && parent.owner instanceof QuiX.ui.MenuOption) {
        parent.owner.subMenu = null;
        parent.close();
        parent.destroy();
        parent = null;
    }

    if (parent) {
        parent.redraw();
    }
}

QuiX.ui.MenuOption.prototype.select = function() {
    switch (this.type) {
        case 'radio':
            if (!this.selected) {
                var id = this.getId();
                if (id) {
                    var oOptions = this.parent.getWidgetById(id);
                    if (oOptions.length) {
                        for (var i=0; i<oOptions.length; i++) {
                            oOptions[i].selected = false;
                        }
                    }
                    else {
                        oOptions.selected = false;
                    }
                }
                this.selected = true;
            }
            break;
        case 'check':
            this.selected = !this.selected;
    }
}

QuiX.ui.MenuOption.prototype.expand = function() {
    if (this.parent.activeSub && this.parent.activeSub != this.subMenu) {
        this.parent.activeSub.close();
    }
    if (this.subMenu && !this.subMenu.isOpen) {
        var desktop = this.getDesktop();
        this.parent.activeSub = this.subMenu;
        this.subMenu._show(
            this.parent,
            this.div.offsetWidth,
            this.getScreenTop() - this.parent.getScreenTop() -
            this.parent.getPadding()[2]);
        
        if (this.subMenu.getScreenTop() + this.subMenu.div.offsetHeight >
                desktop.getHeight(true)) {
            this.subMenu.top -= this.subMenu.getScreenTop() +
                                this.subMenu.div.offsetHeight -
                                desktop.getHeight(true);
            this.subMenu.redraw();
        }
        
        if (this.subMenu.getScreenLeft() + this.subMenu.div.offsetWidth >
                desktop.getWidth(true)) {
            this.subMenu.left = - this.subMenu.div.offsetWidth;
            this.subMenu.redraw();
        }
    }
}

QuiX.ui.MenuOption._onmouseover = function(evt, w) {
    w.expand();
}

QuiX.ui.MenuOption._onclick = function(evt, w) {
    if (w.type) {
        w.select();
    }
    if (document.all && !w.subMenu) {
        // clear hover state
        var dv = w.div.cloneNode(true);
        w.div.parentNode.replaceChild(dv, w.div);
        w.div = dv;
        if (QuiX.utils.BrowserInfo.version > 8) {
            w._attachEvents();
        }
    }
    if (!w.subMenu) {
        w.getDesktop().cleanupOverlays();
    }
}

// context menu

QuiX.ui.ContextMenu = function(params, owner) {
    QuiX.ui.Widget.call(this, {
        id : params.id,
        border : params.border || QuiX.theme.contextmenu.border,
        overflow : 'visible',
        onshow : params.onshow,
        onclose : params.onclose,
        padding: params.padding || QuiX.theme.contextmenu.padding
    });

    this.div.className = 'contextmenu';
    if (QuiX.utils.BrowserInfo.family == 'moz'
            && QuiX.utils.BrowserInfo.OS == 'MacOS') {
        this.appendChild(
            new QuiX.ui.Widget({
                width : '100%',
                height : '100%',
                overflow : 'auto'
            }));
        this.appendChild(
            new QuiX.ui.Widget({
                width : '100%',
                height : '100%',
                overflow : 'hidden'
            }));
    }

    if (QuiX.theme.contextmenu.inner) {
        this.appendChild(QuiX.theme.contextmenu.inner.get());
    }

    this.options = [];
    this.owner = owner;
    this.target = null;

    owner.contextMenu = this;
    owner.attachEvent('oncontextmenu', QuiX.ui.ContextMenu._oncontextmenu);

    this.activeSub = null;
    this.isOpen = false;

    if (QuiX.effectsEnabled) {
        var show_effect = new QuiX.ui.Effect({
            id : '_eff_show',
            type : 'wipe-in',
            steps : 8,
            interval : 10
        });
        this.appendChild(show_effect);
    }
}

QuiX.constructors['contextmenu'] = QuiX.ui.ContextMenu;
QuiX.ui.ContextMenu.prototype = new QuiX.ui.Widget;
QuiX.ui.ContextMenu.prototype.__class__ = QuiX.ui.ContextMenu;
QuiX.ui.ContextMenu.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onshow', 'onclose']);

QuiX.ui.ContextMenu.prototype.destroy = function() {
    this.owner.detachEvent('oncontextmenu');
    this.owner.contextMenu = null;
    QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
}

QuiX.ui.ContextMenu.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {},
        desktop = this.getDesktop();

    this.height = null;
    this.div.style.height = '';
    this.setOverflow('visible');

    if (this.top + this.div.offsetHeight > desktop.getHeight(true, memo)) {
        this.top = this.top - this.div.offsetHeight;
    }

    if (this.top < 0) {
        this.top = 0;
    }
    if (this.div.offsetHeight > desktop.getHeight(true, memo)) {
        this.height = desktop.getHeight(true, memo);
        this.setOverflow('hidden auto');
    }

    if (this.left + this.div.offsetWidth > desktop.getWidth(true, memo)) {
        this.left = this.left - this.div.offsetWidth;
    }

    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

QuiX.ui.ContextMenu.prototype._show = function(w, x, y) {
    if (!this.isOpen) {
        var r = this.trigger('onshow'),
            bShow = !(r === false);

        if (bShow) {
            this.left = x;
            this.top = y;
            w.appendChild(this);
            this.redraw();
            this._attachEvents();
            if (QuiX.effectsEnabled) {
                var effect = this.getWidgetById('_eff_show');
                effect.play();
            }
            if (w instanceof QuiX.ui.Desktop) {
                w.overlays.push(this);
            }
            this.isOpen = true;
        }
    }
}

QuiX.ui.ContextMenu.prototype.close = function() {
    if (this.activeSub) {
        this.activeSub.close();
    }
    if (this.owner.parent && this.owner.parent.activeSub) {
        this.owner.parent.activeSub = null;
    }
    if (this.parent instanceof QuiX.ui.Desktop) {
        this.parent.overlays.removeItem(this);
    }
    this.detach();
    this.isOpen = false;
    this.trigger('onclose');
}

QuiX.ui.ContextMenu.prototype.addOption = function(params) {
    var oOption,
        pad = this.getPadding();
    if (params != -1) { //not a separator
        params.align = (QuiX.dir != 'rtl')? 'left':'right';
        oOption = new QuiX.ui.MenuOption(params);
    }
    else {
        oOption = QuiX.theme.contextmenu.separator.get();
        oOption.destroy = QuiX.ui.MenuOption.prototype.destroy;
        oOption.div.className = 'separator';
        oOption.setPosition('relative');
    }

    this.appendChild(oOption);
    oOption.redraw();

    this.options.push(oOption);
    return oOption;
}

QuiX.ui.ContextMenu.prototype.clearOptions = function() {
    while (this.options.length > 0) {
        this.options[0].destroy();
    }
}

QuiX.ui.ContextMenu._showWidgetContextMenu = function (w, menu) {
    var nx = w.getScreenLeft(),
        ny = w.getScreenTop() + w.div.offsetHeight,
        desktop = w.getDesktop();

    menu._show(desktop, nx, ny);

    if (ny + menu.div.offsetHeight > desktop.getHeight(true)) {
        menu.top = menu.owner.getScreenTop() - menu.div.offsetHeight;
        menu.redraw();
    }

    if (nx + menu.div.offsetWidth > desktop.getWidth(true)) {
        menu.left = menu.owner.getScreenLeft() + menu.owner.getWidth(true) -
                    menu.div.offsetWidth;
        menu.redraw();
    }
}

QuiX.ui.ContextMenu._oncontextmenu = function(evt, w) {
    var x = evt.clientX,
        desktop = w.getDesktop();

    if (QuiX.dir == 'rtl') {
        x = QuiX.transformX(x, desktop);
    }
    w.contextMenu.target = QuiX.getTargetWidget(evt);
    w.contextMenu._show(desktop, x, evt.clientY);
    QuiX.cancelDefault(evt);
}

// menu Bar

QuiX.ui.MenuBar = function(/*params*/) {
    var params = arguments[0] || {};
    params.border = params.border || 1;
    params.padding = params.padding || '2,4,0,1';
    params.overflow = 'hidden';

    QuiX.ui.Widget.call(this, params);

    this.div.className = 'menubar';
    var iSpacing = params.spacing || 2;

    this.spacing = parseInt(iSpacing);
    this.menus = [];
}

QuiX.constructors['menubar'] = QuiX.ui.MenuBar;
QuiX.ui.MenuBar.prototype = new QuiX.ui.Widget;
QuiX.ui.MenuBar.prototype.__class__ = QuiX.ui.MenuBar;

QuiX.ui.MenuBar.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};
    for (var i=0; i<this.menus.length; i++) {
        this.menus[i].div.style.marginRight = this.spacing + 'px';
    }
    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

QuiX.ui.MenuBar.prototype.addRootMenu = function(params) {
    var oMenu = new QuiX.ui.Label({
        id: params.id,
        top : 'center',
        border : 1,
        padding : '8,8,0,0',
        height: '100%',
        width: params.width,
        align: params.align,
        caption : params.caption,
        tooltip: params.tooltip,
        onclick: params.onclick
    });
    this.appendChild(oMenu);
    oMenu.attachEvent('onclick', QuiX.ui.MenuBar._menuonclick);
    oMenu.attachEvent('onmouseover', QuiX.ui.MenuBar._menuonmouseover);
    oMenu.attachEvent('onmouseout', QuiX.ui.MenuBar._menuonmouseout);

    oMenu.div.className = 'menu';
    oMenu.setPosition();
    oMenu.destroy = QuiX.ui.MenuBar._menuDestroy;
    oMenu.div.style.marginRight = this.spacing + 'px';

    this.menus.push(oMenu);

    var oCMenu = new QuiX.ui.ContextMenu(params, oMenu);
    oMenu.contextMenu = oCMenu;
    return oCMenu;
}

QuiX.ui.MenuBar._menuDestroy = function() {
    this.parent.menus.removeItem(this);
    QuiX.ui.Label.prototype.destroy.apply(this, arguments);
}

QuiX.ui.MenuBar._menuonclick = function(evt, w) {
    w.div.className = 'menu selected';
    if (w.contextMenu.options.length > 0) {
        if (w.contextMenu.isOpen) {
            w.contextMenu.close();
        }
        else {
            QuiX.ui.ContextMenu._showWidgetContextMenu(w, w.contextMenu);
        }
    }
}

QuiX.ui.MenuBar._menuonmouseover = function(evt, w) {
    w.div.className = 'menu over';
}

QuiX.ui.MenuBar._menuonmouseout = function(evt, w) {
    w.div.className = 'menu';
}
