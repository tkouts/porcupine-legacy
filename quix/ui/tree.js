// tree node

QuiX.ui.TreeNode = function(/*params*/) {
    var params = arguments[0] || {};
    params.display = 'none';
    params.padding = '17,2,2,2';

    this.base = QuiX.ui.Widget;
    this.base(params);

    this.attachEvent('onmouseover', QuiX.ui.TreeNode._onmouseover);
    this.attachEvent('onmouseout', QuiX.ui.TreeNode._onmouseout);
    this.attachEvent('onmousedown', QuiX.ui.TreeNode._select);

    this.isExpanded = false;
    this._hasChildren = (params.haschildren == 'true' ||
                         params.haschildren == true);
    this.img = params.img || null;
    
    if (params.imgheight) {
        this.imgHeight = parseInt(params.imgheight);
    }
    if (params.imgwidth) {
        this.imgWidth = parseInt(params.imgwidth);
    }

    this._expandImg = null;
    this._imgElement = null;
    this._level = 0;
    this.parentNode = null;
    this.childNodes = [];

    this.div.className = 'treenode';
    this.div.style.whiteSpace = 'nowrap';
    this.setPosition();

    var oA = ce('A');
    oA.ondragstart = QuiX.cancelDefault;
    oA.href = 'javascript:void(0)';
    this.div.appendChild(oA);
    this.anchor = oA;
    this.anchor.onclick = QuiX.cancelDefault;
    this.setCaption(params.caption || '');
    this._putImage();
}

QuiX.constructors['treenode'] = QuiX.ui.TreeNode;
QuiX.ui.TreeNode.prototype = new QuiX.ui.Widget;

QuiX.ui.TreeNode.prototype.appendChild = function(w /*, index*/) {
    var index = (typeof arguments[1] != 'undefined')? arguments[1]:null,
        tree_index = null;

    w.parentNode = this;
    w._level = this._level + 1;

    if (index != null) {
        if (index <= 0) {
            tree_index = this.parent.widgets.indexOf(this) + 1;
        }
        else if (index > 0 && index < this.childNodes.length) {
            tree_index = this.parent.widgets.indexOf(this.childNodes[index]);
        }
        else {
            var last = this.childNodes[this.childNodes.length - 1];
            tree_index = this.parent.widgets.indexOf(last) +
                         last.childNodes.length + 1;
        }
        this.childNodes.splice(index, 0, w);
    }
    else {
        if (this.childNodes.length > 0) {
            var last = this.childNodes[this.childNodes.length - 1];
            tree_index = this.parent.widgets.indexOf(last) +
                         last.childNodes.length + 1;
        }
        else {
            tree_index = this.parent.widgets.indexOf(this) + 1;
        }
        this.childNodes.push(w);
    }
    this.parent.appendChild(w, tree_index);

    w._addChildNodes();
}

QuiX.ui.TreeNode.prototype._addChildNodes = function() {
    var child,
        tree_index = this.parent.widgets.indexOf(this);
    for (var i=0; i<this.childNodes.length; i++) {
        child = this.childNodes[i];
        child._level = this._level + 1;
        this.parent.appendChild(child, tree_index + 1 + i);
        child._addChildNodes();
    }
}

QuiX.ui.TreeNode.prototype._putImage = function() {
    if (this.img) {
        if (this._imgElement != null) {
            if (this._imgElement.src != this.img) {
                this._imgElement.src = this.img;
            }
        }
        else {
            var nm = QuiX.getImage(this.img);
            nm.border = 0;
            nm.style.verticalAlign = 'middle';
            nm.style.marginRight = '4px';

            if (this.imgHeight) {
                nm.style.height = this.imgHeight + 'px';
            }
            if (this.imgWidth) {
                nm.style.width = this.imgWidth + 'px';
            }

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
    if (this.hasChildren()) {
        this._addExpandImg();
    }
    if (this.parentNode) {
        //sub node
        if (!this.parentNode._hasChildren) {
            this.parentNode._addExpandImg();
            this.parentNode._hasChildren = true;
        }
        if (this.parentNode.isExpanded) {
            this.show();
        }
        else {
            this.hide();
        }
    }
    else {
        // root node
        this.show();
    }
    QuiX.ui.Widget.prototype.redraw.apply(this, arguments);
    this.div.style.lineHeight = this.div.style.height;

    // redraw child nodes
    for (var i=0; i<this.childNodes.length; i++) {
        this.childNodes[i].redraw(bForceAll);
    }

}

QuiX.ui.TreeNode.prototype._updateParent = function() {
    var p = this.parentNode;
    if (p && p.childNodes && p.childNodes.length == 1) {
        p._removeExpandImg();
        p._hasChildren = false;
    }
}

QuiX.ui.TreeNode.prototype.destroy = function() {
    this._updateParent();
    var tree = this.parent, tmp_next,
        next = this.nextSibling();

    while (next && next._level > this._level) {
        tmp_next = next.nextSibling();
        QuiX.ui.Widget.prototype.destroy.apply(next, arguments);
        next = tmp_next;
    }
    if (this.parentNode && this.parentNode.childNodes) {
        this.parentNode.childNodes.removeItem(this);
    }
    QuiX.ui.Widget.prototype.destroy.apply(this, arguments);

    // clean up selection
    if (tree.multiple) {
        var selection = tree._selection;
        for (var i=selection.length - 1; i>-1; i--) {
            if (selection[i].div == null) {
                tree._selection.splice(i, 1);
            }
        }
    }
    else {
        if (tree._selection && tree._selection.div == null) {
            tree._selection = null;
        }
    }
}

QuiX.ui.TreeNode.prototype.clear = function() {
    for (var i=0; i<this.childNodes.length; i++) {
        this.childNodes[i].clear();
        this.childNodes[i].destroy();
    }
    this.childNodes = [];
}

QuiX.ui.TreeNode.prototype.detach = function() {
    this._updateParent();

    // detach child nodes
    var next = this.nextSibling(), tmp_next;
    while (next && next._level > this._level) {
        next._removeExpandImg();
        next.setPadding([17,2,2,2]);
        tmp_next = next.nextSibling();
        QuiX.ui.Widget.prototype.detach.apply(next, arguments);
        next = tmp_next;
    }

    this.parentNode.childNodes.removeItem(this);
    this._removeExpandImg();
    this.setPadding([17,2,2,2]);
    this._level = 0;
    this.parentNode = null;
    QuiX.ui.Widget.prototype.detach.apply(this, arguments);
}

QuiX.ui.TreeNode.prototype._addExpandImg = function() {
    if (this._expandImg == null) {
        var img,
            self = this;

        if (QuiX.dir != 'rtl') {
            this.addPaddingOffset('Left', -13);
        }
        else {
            this.addPaddingOffset('Right', -13);
        }

        if (this.isExpanded) {
            img = QuiX.getImage('$THEME_URL$images/collapse.gif');
        }
        else {
            img = QuiX.getImage('$THEME_URL$images/expand.gif');
        }

        QuiX.addEvent(img, 'onmousedown',
                      function(evt) {
                        self.toggle();
                      });

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
        if (QuiX.dir != 'rtl') {
            this.addPaddingOffset('Left', 13);
        }
        else {
            this.addPaddingOffset('Right', 13);
        }
    }
}

QuiX.ui.TreeNode.prototype.getCaption = function() {
    return this.anchor.lastChild.data;
}

QuiX.ui.TreeNode.prototype.setCaption = function(sCaption) {
    if (this.anchor.lastChild) {
        QuiX.removeNode(this.anchor.lastChild);
    }
    this.anchor.appendChild(document.createTextNode(sCaption));
}

QuiX.ui.TreeNode.prototype.toggle = function() {
    var i, next;
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
        if (this._expandImg) {
            this._expandImg.src = QuiX.getThemeUrl() + 'images/collapse.gif';
        }
        for (i=0; i < this.childNodes.length; i++) {
            this.childNodes[i].show();
        }
        if (this.parent._customRegistry.onexpand) {
            this.parent._customRegistry.onexpand(this);
        }
    }
    else {
        this._expandImg.src = QuiX.getThemeUrl() + 'images/expand.gif';
        next = this.nextSibling();
        while (next && next._level > this._level) {
            next.hide();
            if (next._expandImg) {
                next.isExpanded = false;
                next._expandImg.src = QuiX.getThemeUrl() + 'images/expand.gif';
            }
            next = next.nextSibling();
        }
    }
}

QuiX.ui.TreeNode.prototype.hasChildren = function() {
    return this._hasChildren || this.childNodes.length > 0;
}

QuiX.ui.TreeNode.prototype.disable = function() {
    if (this.anchor) {
        this.anchor.className = 'disabled';
        //this.anchor.onclick = null;
    }
    QuiX.ui.Widget.prototype.disable.apply(this, arguments);
}

QuiX.ui.TreeNode.prototype.enable = function() {
    this.anchor.className = '';
    QuiX.ui.Widget.prototype.enable.apply(this, arguments);
}

QuiX.ui.TreeNode._select = function(evt, w) {
    var tree = w.parent;

    QuiX.cancelDefault(evt);

    if (!tree.multiple) {
        tree.selectNode(w);
    }
    else {
        if (evt.shiftKey) {
            var start,
                end = tree.widgets.indexOf(w);

            if (tree._selection.length == 0) {
                // first widget
                start = 0;
            }
            else {
                start = tree.widgets.indexOf(tree._selection[0]);
            }

            tree.clearSelection();

            for (var i=start; i!=end + ((start<end)? 1:-1); (start<end)? i++:i--) {
                if (!tree.widgets[i].isHidden()) {
                    tree.selectNode(tree.widgets[i]);
                }
            }
        }
        else if (evt.ctrlKey) {
            if (tree._selection.hasItem(w)) {
                tree.deSelectNode(w);
            }
            else {
                tree.selectNode(w);
            }
        }
        else {
            if (tree._selection.hasItem(w) && evt.type == 'mousedown') {
                // the widget is already selected
                w.attachEvent('onmouseup', QuiX.ui.TreeNode._select);
                return;
            }
            else {
                tree.clearSelection();
                tree.selectNode(w);
                w.detachEvent('onmouseup', QuiX.ui.TreeNode._select);
            }
        }
    }

    if (tree._customRegistry.onselect) {
        tree._customRegistry.onselect(tree);
    }
}

QuiX.ui.TreeNode._onmouseover = function(evt, treeNode) {
    if (QuiX.dragging && !treeNode._dragtimer && treeNode.hasChildren()
            && !treeNode.isExpanded) {
        treeNode._dragtimer = window.setTimeout(
            function() {
                treeNode._dragTimer = null;
                treeNode.toggle();
            }, 700);
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
    if (params) {
        this.levelpadding = params.levelpadding || 12;
    }
    this.multiple = (params.multiple == 'true' || params.multiple == true);
    this.roots = [];

    if (this.multiple) {
        this._selection = [];
    }
    else {
        this._selection = null;
    }
}

QuiX.constructors['tree'] = QuiX.ui.Tree;
QuiX.ui.Tree.prototype = new QuiX.ui.Widget;

QuiX.ui.Tree.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['onexpand', 'onselect']);

QuiX.ui.Tree.prototype.appendChild = function(w /*, index*/) {
    var index = (typeof arguments[1] != 'undefined')? arguments[1]:null;
    if (w.parentNode == null) {
        this.roots.push(w);
        w.show();
    }
    if (QuiX.dir != 'rtl') {
        w.addPaddingOffset('Left', w._level * this.levelpadding);
    }
    else {
        w.addPaddingOffset('Right', w._level * this.levelpadding);
    }
    QuiX.ui.Widget.prototype.appendChild.apply(this, [w, index]);
    if (!w._isDisabled) {
        w.enable();
    }
}

QuiX.ui.Tree.prototype.clearSelection = function() {
    var selection = [];
    if (this.multiple) {
        selection = this._selection;
    }
    else if (this._selection) {
        selection = [this._selection];
    }
    for (var i=0; i<selection.length; i++) {
        selection[i].div.className = selection[i].div.className.replace(' selected', '');
    }
    if (this.multiple) {
        this._selection = [];
    }
    else {
        this._selection = null;
    }
}

QuiX.ui.Tree.prototype.deSelectNode = function(w) {
    if (w.div.className.indexOf('selected') > -1) {
        w.div.className = w.div.className.replace(' selected', '');
        if (!this.multiple) {
            this._selection = null;
        }
        else {
            this._selection.removeItem(w);
        }
    }
}

QuiX.ui.Tree.prototype.selectNode = function(w /*, expand*/) {
    var expand = arguments[1] || false;    

    if (w.div.className.indexOf('selected') == -1) {
        w.div.className += ' selected';
        if (!this.multiple) {
            this.clearSelection();
            this._selection = w;
        }
        else {
            this._selection.push(w);
        }

        if (expand && w.parentNode) {
            // expand parent nodes
            var parents = [],
                parent = w.parentNode;
            while (parent) {
                parents.push(parent);
                parent = parent.parentNode;
            }
            parents.reverse();
            for (var i=0; i<parents.length; i++) {
                if (!parents[i].isExpanded) {
                    parents[i].toggle();
                }
            }
        }
    }
}

QuiX.ui.Tree.prototype.getSelection = function() {
    return this._selection;
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
    rpc.oncomplete = treeNode.parent.load_oncomplete;
    rpc.callback_info = treeNode;
    rpc.callmethod(treeNode.parent.method);
    for (var i=0; i< treeNode.childNodes.length; i++ ) {
        treeNode.childNodes[i].hide();
    }
}

QuiX.ui.FolderTree.prototype.load_oncomplete = function(req) {
    var newNode,
        treeNode = req.callback_info,
        oFolders = req.response;

    treeNode.clear();

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
    if (treeNode.parent._onexpand) {
        treeNode.parent._onexpand(treeNode);
    }
}
