// tree node

QuiX.ui.TreeNode = function(/*params*/) {
    var params = arguments[0] || {};
    params.display = 'none';
    params.padding = '13,0,1,1';
    params.onmousedown = QuiX.cancelDefault;
    params.onmouseover = QuiX.wrappers.eventWrapper(
        QuiX.ui.TreeNode._onmouseover,
        params.onmouseover);
    params.onmouseout = QuiX.wrappers.eventWrapper(
        QuiX.ui.TreeNode._onmouseout,
        params.onmouseout);

    this.base = QuiX.ui.Widget;
    this.base(params);

    this.isExpanded = false;
    this._hasChildren = (params.haschildren == 'true' ||
                         params.haschildren == true);
    this.img = params.img || null;
    
    if (params.imgheight)
        this.imgHeight = parseInt(params.imgheight);
    if (params.imgwidth)
        this.imgWidth = parseInt(params.imgwidth);
    
    this._expandImg = null;
    this._imgElement = null;
    this.childNodes = this.widgets;

    this.div.className = 'treenode';
    this.div.style.whiteSpace = 'nowrap';
    this.setPosition();

    var oA = ce('A');
    oA.href = 'javascript:void(0)';
    this.div.appendChild(oA);
    this.anchor = oA;
    this.setCaption(params.caption || '');
    this._putImage();
}

QuiX.constructors['treenode'] = QuiX.ui.TreeNode;
QuiX.ui.TreeNode.prototype = new QuiX.ui.Widget;

QuiX.ui.TreeNode.prototype.appendChild = function (w) {
    w.tree = this.tree;
    if (QuiX.dir != 'rtl')
        w.div.style.margin = '2px 0px 0px ' + this.tree.levelpadding + 'px';
    else
        w.div.style.margin = '2px ' + this.tree.levelpadding + 'px 0px 0px';
    QuiX.ui.Widget.prototype.appendChild(w, this);
    if (!w._isDisabled)
        w.enable();
}

QuiX.ui.TreeNode.prototype._putImage = function() {
    if (this.img) {
        if (this._imgElement != null) {
            if (this._imgElement.src != this.img)
                this._imgElement.src = this.img;
        }
        else {
            var nm = QuiX.getImage(this.img);
            nm.border = 0;
            nm.style.verticalAlign = 'middle';
            nm.style.marginRight = '4px';
            
            if (this.imgHeight)
                nm.style.height = this.imgHeight + 'px';
            if (this.imgWidth)
                nm.style.width = this.imgWidth + 'px';
            
            this.anchor.insertBefore(nm, this.anchor.firstChild);
            this._imgElement = nm;
        }
    }
    else {
        if (this._imgElement) {
            QuiX.removeNode(this._imgElement);
            this._imgElement = null;
        }
    }
}

QuiX.ui.TreeNode.prototype.redraw = function(bForceAll /*, memo*/) {
    this._putImage();
    if (this.hasChildren())
        this._addExpandImg();
    if (this.parent instanceof QuiX.ui.TreeNode) {
        //sub node
        if (!this.parent._hasChildren) {
            this.parent._addExpandImg();
            this.parent._hasChildren = true;
        }
        if (this.parent.isExpanded)
            this.show();
        else
            this.hide();
    }
    else {
        // root node
        this.show();
    }
    QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
}

QuiX.ui.TreeNode.prototype._updateParent = function() {
    var p = this.parent;
    if (p instanceof QuiX.ui.TreeNode && p.childNodes.length == 1) {
        p._removeExpandImg();
        p._hasChildren = false;
    }
}

QuiX.ui.TreeNode.prototype.destroy = function() {
    this._updateParent();
    var tree = this.tree; 
    QuiX.ui.Widget.prototype.destroy.apply(this, arguments);
    if (tree.selectedWidget && tree.selectedWidget.div == null)
        tree.selectedWidget = null;
}

QuiX.ui.TreeNode.prototype.detach = function() {
    this._updateParent();
    QuiX.ui.Widget.prototype.detach.apply(this, arguments);
}

QuiX.ui.TreeNode.prototype._addExpandImg = function() {
    if (this._expandImg == null) {
        var oTreeNode = this;
        this.setPadding([0,0,1,1]);

        var img;
        if (this.isExpanded)
            img = QuiX.getImage('$THEME_URL$images/collapse.gif');
        else
            img = QuiX.getImage('$THEME_URL$images/expand.gif');
        img.onclick = function(evt) {
            oTreeNode.toggle()
            QuiX.stopPropag(evt || event);
        };
        img.style.marginRight = '4px';
        img.style.verticalAlign = 'middle';
        this.div.insertBefore(img, this.div.firstChild);
        this._expandImg = img;
    }
}

QuiX.ui.TreeNode.prototype._removeExpandImg = function() {
    if (this._expandImg) {
        QuiX.removeNode(this._expandImg);
        this._expandImg = null;
        this.setPadding([13,0,1,1]);
    }
}

QuiX.ui.TreeNode.prototype.getCaption = function() {
    return this.anchor.lastChild.data;
}

QuiX.ui.TreeNode.prototype.setCaption = function(sCaption) {
    if (this.anchor.lastChild)
        QuiX.removeNode(this.anchor.lastChild);
    this.anchor.appendChild(document.createTextNode(sCaption));
}

QuiX.ui.TreeNode.prototype.toggle = function() {
    var i;
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
        if (this._expandImg)
            this._expandImg.src = QuiX.getThemeUrl() + 'images/collapse.gif';
        for (i=0; i < this.childNodes.length; i++) {
            this.childNodes[i].show();
        }
        if (this.tree._customRegistry.onexpand)
            this.tree._customRegistry.onexpand(this);
    }
    else {
        this._expandImg.src = QuiX.getThemeUrl() + 'images/expand.gif';
        for (i=0; i < this.childNodes.length; i++) {
            this.childNodes[i].hide();
        }
    }
}

QuiX.ui.TreeNode.prototype.hasChildren = function() {
    return this._hasChildren || this.childNodes.length > 0;
}

QuiX.ui.TreeNode.prototype.disable = function() {
    if (this.anchor) {
        this.anchor.className = 'disabled';
        this.anchor.onclick = null;
    }
    QuiX.ui.Widget.prototype.disable.apply(this, arguments);
}

QuiX.ui.TreeNode.prototype.enable = function() {
    var oTreeNode = this;
    this.anchor.className = '';
    this.anchor.onclick = function(){
        oTreeNode.tree.selectNode(oTreeNode)
    };
    QuiX.ui.Widget.prototype.enable.apply(this, arguments);
}

QuiX.ui.TreeNode._onmouseover = function(evt, treeNode) {
    if (QuiX.dragging && !treeNode._dragtimer && treeNode.hasChildren()
            && !treeNode.isExpanded) {
        treeNode._dragtimer = window.setTimeout(
            function() {
                treeNode._dragTimer = null;
                treeNode.toggle();
            }, 1000);
    }
}

QuiX.ui.TreeNode._onmouseout = function(evt, treeNode) {
    if (treeNode._dragtimer) {
        window.clearTimeout(treeNode._dragtimer);
        treeNode._dragtimer = null;
    }
}

// tree

QuiX.ui.Tree = function(/*params*/) {
    var params = arguments[0] || {};
    this.base = QuiX.ui.Widget;
    this.base(params);
    
    this.div.className = 'tree';
    if (params)
        this.levelpadding = params.levelpadding || 14;
    
    this.selectedWidget = null;
    this.roots = this.widgets;
}

QuiX.constructors['tree'] = QuiX.ui.Tree;
QuiX.ui.Tree.prototype = new QuiX.ui.Widget;

QuiX.ui.Tree.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onexpand', 'onselect']);

QuiX.ui.Tree.prototype.appendChild = function (w) {
    w.tree = this;
    QuiX.ui.Widget.prototype.appendChild(w, this);
    if (!w._isDisabled)
        w.enable();
}

QuiX.ui.Tree.prototype.selectNode = function(w) {
    if (this.selectedWidget)
        this.selectedWidget.anchor.className = '';
    w.anchor.className = 'selected';
    this.selectedWidget = w;
    if (this._customRegistry.onselect)
        this._customRegistry.onselect(w);
}

QuiX.ui.Tree.prototype.getSelection = function() {
    return this.selectedWidget;
}

// folder tree

QuiX.ui.FolderTree = function(params) {
    this.base = QuiX.ui.Tree;
    this.base(params);

    this.method = params.method;
    this._onexpand = this._customRegistry.onexpand;
    this.attachEvent('onexpand', this.loadSubfolders);
}

QuiX.constructors['foldertree'] = QuiX.ui.FolderTree;
QuiX.ui.FolderTree.prototype = new QuiX.ui.Tree;

QuiX.ui.FolderTree.prototype.loadSubfolders = function(treeNode) {
    var sID = treeNode.getId() || '';
    var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root + sID);
    rpc.oncomplete = treeNode.tree.load_oncomplete;
    rpc.callback_info = treeNode;
    rpc.callmethod(treeNode.tree.method);
    for (var i=0; i< treeNode.childNodes.length; i++ ) {
        treeNode.childNodes[i].hide();
    }
}

QuiX.ui.FolderTree.prototype.load_oncomplete = function(req) {
    var newNode;
    var treeNode = req.callback_info;
    var oFolders = req.response;
    while (treeNode.childNodes.length > 0) {
        treeNode.childNodes[0].destroy();
    }
    for (var i=0; i<oFolders.length; i++) {
        newNode = new QuiX.ui.TreeNode(oFolders[i]);
        //custom attributes
        if (oFolders[i].attributes) {
            for (var attr in oFolders[i].attributes){
                newNode.attributes[attr] = oFolders[i].attributes[attr];
            }
        }
        treeNode.appendChild(newNode);
        newNode.redraw();
    }
    if (treeNode.tree._onexpand)
        treeNode.tree._onexpand(treeNode);
}
