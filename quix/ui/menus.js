/************************
Menus
************************/

// menu option

QuiX.ui.MenuOption = function(params) {
    params.height = params.height || 21;
    params.imgalign = 'left';
    params.width = null;
    params.overflow = 'visible';
    params.padding = '4,0,3,2';
    params.onmouseover = QuiX.ui.MenuOption._onmouseover;
    params.onclick = QuiX.wrappers.eventWrapper(params.onclick,
                                                QuiX.ui.MenuOption._onclick);
    this.base = QuiX.ui.Icon;
    this.base(params);
    this.div.style.whiteSpace = 'nowrap';
    this.setPosition('relative');

    this.subMenu = null;
    this.type = params.type;
    this.selected = (params.selected=='true' || params.selected==true);
}

QuiX.ui.MenuOption.prototype = new QuiX.ui.Icon;

QuiX.ui.MenuOption.prototype.addOption = function(params) {
    if (!this.subMenu)
        this.subMenu = new QuiX.ui.ContextMenu({}, this);
    return this.subMenu.addOption(params);
}

QuiX.ui.MenuOption.prototype.redraw = function(bForceAll /*, memo*/) {
    if (this.subMenu)
        this.div.className = 'option submenu';
    else
        this.div.className = 'option';

    if (this.type) {
        if (this.selected) {
            switch (this.type) {
                case 'radio':
                    this.img = '$THEME_URL$images/menu_radio.gif';
                    break;
                case 'check':
                    this.img = '$THEME_URL$images/menu_check.gif';
            }
        }
        else
            this.img = null;
        bForceAll = true;
    }
    if (!this.img)
        this.setPadding([24,18,3,2]);
    else
        this.setPadding([5,18,3,2]);
    
    QuiX.ui.Icon.prototype.redraw.apply(this, arguments);
}

QuiX.ui.MenuOption.prototype.destroy = function() {
    var parent = this.parent;
    parent.options.removeItem(this);
    if (this.base)
        this.base.prototype.destroy.apply(this, arguments);
    else
        QuiX.ui.Widget.prototype.destroy.apply(this, arguments);

    if (parent.options.length==0 && parent.owner instanceof MenuOption) {
        parent.owner.subMenu = null;
        parent.close();
        parent.destroy();
        parent = null;
    }
    
    if (parent) parent.redraw();
}

QuiX.ui.MenuOption.prototype.select = function() {
    switch (this.type) {
        case 'radio':
            if (!this.selected) {
                var id = this.getId();
                if (id) {
                    var oOptions = this.parent.getWidgetById(id);
                    if (oOptions.length) {
                        for(var i=0; i<oOptions.length; i++)
                            oOptions[i].selected = false;
                    }
                    else
                        oOptions.selected = false;
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
        this.parent.activeSub = this.subMenu;
        this.subMenu.show(
            this.parent,
            this.div.offsetWidth,
            this.getScreenTop() - this.parent.getScreenTop());
        
        if (this.subMenu.getScreenTop() + this.subMenu.div.offsetHeight >
                document.desktop.getHeight(true)) {
            this.subMenu.top -= this.subMenu.getScreenTop() +
                                this.subMenu.div.offsetHeight -
                                document.desktop.getHeight(true);
            this.subMenu.redraw();
        }
        
        if (this.subMenu.getScreenLeft() + this.subMenu.div.offsetWidth >
                document.desktop.getWidth(true)) {
            this.subMenu.left = - this.subMenu.div.offsetWidth;
            this.subMenu.redraw();
        }
    }
}

QuiX.ui.MenuOption._onmouseover = function(evt, w) {
    w.expand();
}

QuiX.ui.MenuOption._onclick = function(evt, w) {
    if (w.type) w.select();
    if (QuiX.utils.BrowserInfo.family == 'ie' && !w.subMenu) {
        // clear hover state
        var dv = w.div.cloneNode(true);
        w.div.parentNode.replaceChild(dv, w.div);
        w.div = dv;
    }
    if (!w.subMenu)
        QuiX.cleanupOverlays();
}

// context menu

QuiX.ui.ContextMenu = function(params, owner) {
    this.base = QuiX.ui.Widget;
    this.base({
        id : params.id,
        border : 1,
        overflow : 'visible',
        onmousedown : QuiX.stopPropag,
        onshow : params.onshow,
        onclose : params.onclose
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
    
    var rect = new QuiX.ui.Widget({
        width: '22',
        height: 'this.parent.div.clientHeight',
        bgcolor: 'silver',
        overflow: 'hidden'
    });
    this.appendChild(rect);
    
    this.options = [];
    this.owner = owner;
    this.target = null;
    
    owner.contextMenu = this;
    owner.attachEvent('oncontextmenu', QuiX.ui.ContextMenu._oncotextmenu);
    
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
QuiX.ui.ContextMenu.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onshow', 'onclose']);

QuiX.ui.ContextMenu.prototype.destroy = function() {
    this.owner.detachEvent('oncontextmenu');
    this.owner.contextMenu = null;
    QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
}

QuiX.ui.ContextMenu.prototype.redraw = function(bForceAll /*, memo*/) {
    var memo = arguments[1] || {};

    this.div.style.height = '';

    if (QuiX.utils.BrowserInfo.family == 'ie'
            && QuiX.utils.BrowserInfo.version < 8) {
        var oOption, optionWidth, iHeight = 0;
        for (var i=0; i<this.options.length; i++) {
            oOption = this.options[i];
            if (oOption instanceof QuiX.ui.Icon) {
                optionWidth = oOption.div.getElementsByTagName('SPAN')[0]
                              .offsetWidth + 26;
                oOption.width = '100%';
                if (optionWidth + 2 > this.width)
                    this.width = optionWidth + 16;
            }
            iHeight += oOption.div.offsetHeight;
        }
        this.height = iHeight + 2;
    }
    else
        this.height = this.div.offsetHeight;

    if (this.top + this.div.offsetHeight >
            document.desktop.getHeight(true, memo))
        this.top = this.top - this.div.offsetHeight;
    if (this.left + this.div.offsetWidth >
            document.desktop.getWidth(true, memo))
        this.left = this.left - this.div.offsetWidth;

    QuiX.ui.Widget.prototype.redraw.apply(this, [bForceAll, memo]);
}

QuiX.ui.ContextMenu.prototype.show = function(w, x, y) {
    if (!this.isOpen) {
        var bShow = true;
        if (this._customRegistry.onshow) {
            var r = this._customRegistry.onshow(this);
            bShow = (r == false)? false:true;
        }
        if (bShow) {
            this.left = x;
            this.top = y;
            w.appendChild(this);
            this.redraw(true);
            if (QuiX.effectsEnabled) {
                var effect = this.getWidgetById('_eff_show');
                effect.play();
            }
            if (w == document.desktop)
                document.desktop.overlays.push(this);
            this.isOpen = true;
        }
    }
}

QuiX.ui.ContextMenu.prototype.close = function() {
    if (this.activeSub) {
        this.activeSub.close();
    }
    if (this.owner.parent && this.owner.parent.activeSub)
        this.owner.parent.activeSub = null;
    if (this.parent == document.desktop)
        document.desktop.overlays.removeItem(this);
    this.detach();
    this.isOpen = false;
    if (this._customRegistry.onclose)
        this._customRegistry.onclose(this);
}

QuiX.ui.ContextMenu.prototype.addOption = function(params) {
    var oOption;
    if (params != -1) { //not a separator
        params.align = (QuiX.dir != 'rtl')?'left':'right';
        oOption = new QuiX.ui.MenuOption(params);
    }
    else {
        oOption = new QuiX.ui.Widget({
            height : 2,
            border : 1,
            overflow : 'hidden'
        });
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
    while (this.options.length > 0)
        this.options[0].destroy();
}

QuiX.ui.ContextMenu._showWidgetContextMenu = function (w, menu) {
    var nx = w.getScreenLeft();
    var ny = w.getScreenTop() + w.div.offsetHeight;

    menu.show(document.desktop, nx, ny);

    if (ny + menu.div.offsetHeight > document.desktop.getHeight(true)) {
        menu.top = menu.owner.getScreenTop() - menu.div.offsetHeight;
        menu.redraw();
    }

    if (nx + menu.div.offsetWidth > document.desktop.getWidth(true)) {
        menu.left = menu.owner.getScreenLeft() + menu.owner.getWidth(true) -
                    menu.div.offsetWidth;
        menu.redraw();
    }
}

QuiX.ui.ContextMenu._oncotextmenu = function(evt, w) {
    var x = evt.clientX;
    if (QuiX.dir == 'rtl')
        x = QuiX.transformX(x);
    w.contextMenu.target = QuiX.getTargetWidget(evt);
    w.contextMenu.show(document.desktop, x, evt.clientY);
    QuiX.cancelDefault(evt);
}

// menu Bar

QuiX.ui.MenuBar = function(/*params*/) {
    var params = arguments[0] || {};
    params.border = params.border || 1;
    params.padding = '2,4,0,1';
    params.overflow = 'hidden';
    this.base = QuiX.ui.Widget;
    this.base(params);
    this.div.className = 'menubar';
    var iSpacing = params.spacing || 2;

    this.spacing = parseInt(iSpacing);
    this.menus = [];
}

QuiX.constructors['menubar'] = QuiX.ui.MenuBar;
QuiX.ui.MenuBar.prototype = new QuiX.ui.Widget;

QuiX.ui.MenuBar.prototype.redraw = function(bForceAll /*, memo*/) {
    for (var i=0; i<this.menus.length; i++) {
         this.menus[i].div.style.marginRight = this.spacing + 'px';
    }
    QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
}

QuiX.ui.MenuBar.prototype.addRootMenu = function(params) {
    var oMenu = new QuiX.ui.Label({
        top : 'center',
        border : 0,
        padding : '8,8,3,4',
        caption : params.caption,
        onclick : QuiX.ui.MenuBar._menuonclick,
        onmouseover : QuiX.ui.MenuBar._menuonmouseover,
        onmouseout : QuiX.ui.MenuBar._menuonmouseout
    });
    this.appendChild(oMenu);
    oMenu.div.className = 'menu';
    oMenu.setPosition();
    oMenu.destroy = QuiX.ui.MenuBar._menuDestroy;
    oMenu.div.style.marginRight = this.spacing + 'px';

    this.menus.push(oMenu);

    var oCMenu = new QuiX.ui.ContextMenu(params, oMenu);
    oMenu.contextMenu = oCMenu;
    return(oCMenu);
}

QuiX.ui.MenuBar._menuDestroy = function() {
    this.parent.menus.removeItem(this);
    QuiX.ui.Label.prototype.destroy.apply(this, arguments);
}

QuiX.ui.MenuBar._menuonclick = function(evt, w) {
    w.div.className = 'menu selected';
    QuiX.ui.ContextMenu._showWidgetContextMenu(w, w.contextMenu);
    QuiX.stopPropag(evt);
}

QuiX.ui.MenuBar._menuonmouseover = function(evt, w) {
    w.setBorderWidth(1);
    w.setPadding([7,7,2,3]);
    w.div.className = 'menu over';
}

QuiX.ui.MenuBar._menuonmouseout = function(evt, w) {
    w.setBorderWidth(0);
    w.setPadding([8,8,3,4]);
    w.div.className = 'menu';
}
