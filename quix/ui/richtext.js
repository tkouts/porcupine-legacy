//=============================================================================
//    Lightweight rich text editor
//
//    Original License Information:
//    -------------------------------------------------------------------------
//    Copyright (C) 2008 Cameron Adams (http://www.themaninblue.com/)
//
//    This program is free software; you can redistribute it and/or modify it
//    under the terms of the GNU General Public License as published by the
//    Free Software Foundation; either version 2 of the License, or (at your
//    option) any later version.
//
//    This program is distributed in the hope that it will be useful, but
//    WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
//    General Public License for more details.
//
//    You should have received a copy of the GNU General Public License along
//    with this program; if not, write to the Free Software Foundation, Inc.,
//    59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
//=============================================================================

QuiX.ui.RichText = function(/*params*/) {
    var params = arguments[0] || {};
    params.spacing = 0;
    this.base = QuiX.ui.VBox;
    this.base(params);
    this.div.className = 'richtext';

    var toolbar = !(params.toolbar == false || params.toolbar == 'false');
    this.insertParagraphs = !(params.paragraphs == false || params.paragraphs == 'false');
    this.autoClean = (params.autoclean == 'false' || params.autoclean == false);
    this.readonly = (params.readonly == 'true' || params.readonly == true);
    this.target = (typeof(params.target) == 'undefined')? '_blank':params.target;

    if (toolbar) {
        var toolbarItems = params.toolbaritems ||
            'bold,italic,hyperlink,insertunorderedlist,' +
            'insertorderedlist,image,htmlsource,format';
        this.toolbarItems = toolbarItems.split(',');

        // create the toolbar
        this.toolbar = new QuiX.ui.Box({
            height : 36,
            orientation : 'h',
            padding : '2,2,2,2'
        });
        this.appendChild(this.toolbar);

        // add buttons
        var tbuttons = {
            'bold' : {
                id : 'bold',
                img : '$THEME_URL$images/edit_bold.gif',
                width : 32,
                imgwidth : 24,
                imgheight : 24,
                type : 'toggle',
                tooltip : 'Bold',
                disabled : this.readonly,
                onclick : QuiX.ui.RichText._toolbarAction},
            'italic' : {
                id : 'italic',
                img : '$THEME_URL$images/edit_italic.gif',
                width : 32,
                imgwidth : 24,
                imgheight : 24,
                type : 'toggle',
                tooltip : 'Italic',
                disabled : this.readonly,
                onclick : QuiX.ui.RichText._toolbarAction},
            'hyperlink' : {
                id : 'hyperlink',
                img : '$THEME_URL$images/edit_link.gif',
                width : 32,
                imgwidth : 24,
                imgheight : 24,
                type : 'toggle',
                tooltip : 'Hyperlink',
                disabled : this.readonly,
                onclick : QuiX.ui.RichText._toolbarAction},
            'insertunorderedlist' : {
                id : 'insertunorderedlist',
                img : '$THEME_URL$images/edit_unordered.gif',
                width : 32,
                imgwidth : 24,
                imgheight : 24,
                type : 'toggle',
                tooltip : 'Unordered list',
                disabled : this.readonly,
                onclick : QuiX.ui.RichText._toolbarAction},
            'insertorderedlist' : {
                id : 'insertorderedlist',
                img : '$THEME_URL$images/edit_ordered.gif',
                width : 32,
                imgwidth : 24,
                imgheight : 24,
                type : 'toggle',
                tooltip : 'Ordered list',
                disabled : this.readonly,
                onclick : QuiX.ui.RichText._toolbarAction},
            'image' : {
                id : 'image',
                img : '$THEME_URL$images/edit_image.gif',
                width : 32,
                imgwidth : 24,
                imgheight : 24,
                tooltip : 'Add image',
                disabled : this.readonly,
                onclick : QuiX.ui.RichText._toolbarAction},
            'htmlsource' : {
                id : 'htmlsource',
                img : '$THEME_URL$images/edit_html.gif',
                width : 32,
                imgwidth : 24,
                imgheight : 24,
                type : 'toggle',
                tooltip : 'View source',
                onclick : QuiX.ui.RichText._toolbarAction},
            'format' : {
                id : 'format',
                img : '$THEME_URL$images/edit_block.gif',
                width : 40,
                imgwidth : 24,
                imgheight : 24,
                tooltip : 'Edit block',
                disabled : this.readonly,
                type : 'menu'}
        }
        for (var i=0; i<this.toolbarItems.length; i++) {
            this.toolbar.appendChild(
                new QuiX.ui.FlatButton(tbuttons[this.toolbarItems[i]])
            );
        }
        var bt = this.toolbar.getWidgetById('format');
        if (bt) {
            var option;
            for (var j=0; j<this.blockOptions.length; j+=2) {
                option  = bt.contextMenu.addOption({
                    id : 'formatblock',
                    caption : this.blockOptions[j+1],
                    type : 'radio',
                    onclick : QuiX.ui.RichText._toolbarAction
                });
                option.attributes.block = this.blockOptions[j];
            }
        }
    }

    this.field = new QuiX.ui.Field({
        type: 'textarea',
        value: params.value,
        height: -1,
        readonly: this.readonly,
        display: 'none'
    });
    this.appendChild(this.field);

    this.frame = new QuiX.ui.IFrame({
        src: params.template || QuiX.baseUrl + 'ui/richtext.htm',
        border: (typeof params.frameborder != 'undefined')? params.frameborder:1
    });
    this.frame.div.className = 'editframe';
    this.appendChild(this.frame);

    this.locked = false;
    this.pasteCache = '';
    this.wysiwyg = true;
    this._interval = null;

    var self = this;
    this.frame.attachEvent('ondocumentload',
        function() {
            self.doc = self.frame.getDocument();
            self.doc.dir = QuiX.dir;
            self.writeDocument(self.field.getValue());
            if (self._supportsEdit() && !self.readonly) {
                self.locked = true;
                self.initEdit();
            }
        });
}

QuiX.ui.RichText.prototype = new QuiX.ui.VBox;
QuiX.ui.RichText.prototype.customEvents =
    QuiX.ui.Field.prototype.customEvents.concat(['onstatechange']);
QuiX.ui.RichText.prototype.blockOptions = [
    '<h1>', 'Heading 1',
    '<h2>', 'Heading 2',
    '<h3>', 'Heading 3',
    '<h4>', 'Heading 4',
    '<h5>', 'Heading 5',
    '<h6>', 'Heading 6',
    '<p>', 'Paragraph'];

QuiX.ui.RichText.prototype._supportsEdit = function() {
    return typeof(document.designMode) == 'string' &&
           (document.all || document.designMode == 'off');
}

QuiX.ui.RichText.prototype.getValue = function() {
    var wysiwyg = this.wysiwyg;
    if (!wysiwyg) {
       this.writeDocument(this.field.getValue());
    }
    this.wysiwyg = true;
    try {
        this._updateInput();
    }
    finally {
        this.wysiwyg = wysiwyg;
    }
    return this.doc.body.innerHTML;
}

QuiX.ui.RichText.prototype.redraw = function(bForceAll /*, memo*/) {
    if (QuiX.utils.BrowserInfo.family == 'moz' && this.wysiwyg && this.doc) {
        this._updateInput();
    }
    QuiX.ui.Box.prototype.redraw.apply(this, arguments);
}

QuiX.ui.RichText.prototype.cleanPaste = function() {
    if (this.autoClean) {
        var matchedHead = "";
        var matchedTail = "";
        var newContent = this.doc.body.innerHTML;
        var newContentStart = 0;
        var newContentFinish = 0;
        var newSnippet = "";
        var tempNode = ce("div");
        var i, value;
        /* Find start of both strings that matches */
        while (newContent.charAt(newContentStart) ==
               this.pasteCache.charAt(newContentStart)) {
            matchedHead += this.pasteCache.charAt(newContentStart);
            newContentStart++;
        }
        /* If newContentStart is inside a HTML tag,
         * move to opening brace of tag */
        for (i = newContentStart; i >= 0; i--) {
            if (newContent.charAt(i) == "<") {
                newContentStart = i;
                matchedHead = newContent.substring(0, newContentStart);
                break;
            }
            else if(newContent.charAt(i) == ">") {
                break;
            }
        }
        newContent = newContent.reverse();
        this.pasteCache = this.pasteCache.reverse();
        /* Find end of both strings that matches */
        while (newContent.charAt(newContentFinish) ==
               this.pasteCache.charAt(newContentFinish)) {
            matchedTail += this.pasteCache.charAt(newContentFinish);
            newContentFinish++;
        }
        /* If newContentFinish is inside a HTML tag,
         * move to closing brace of tag */
        for (i = newContentFinish; i >= 0; i--) {
            if (newContent.charAt(i) == ">") {
                newContentFinish = i;
                matchedTail = newContent.substring(0, newContentFinish);
                break;
            }
            else if(newContent.charAt(i) == "<") {
                break;
            }
        }
        matchedTail = matchedTail.reverse();
        /* If there's no difference in pasted content */
        if (newContentStart == newContent.length - newContentFinish) {
            return false;
        }
        newContent = newContent.reverse();

        newSnippet = newContent.substring(newContentStart,
                                          newContent.length - newContentFinish);

        newSnippet = this._validTags(newSnippet);

        /* Replace opening bold tags with strong */
        newSnippet = newSnippet.replace(/<b(\s+|>)/g, "<strong$1");
        /* Replace closing bold tags with closing strong */
        newSnippet = newSnippet.replace(/<\/b(\s+|>)/g, "</strong$1");

        /* Replace italic tags with em */
        newSnippet = newSnippet.replace(/<i(\s+|>)/g, "<em$1");
        /* Replace closing italic tags with closing em */
        newSnippet = newSnippet.replace(/<\/i(\s+|>)/g, "</em$1");

        /* Strip out unaccepted attributes */
        newSnippet = newSnippet.replace(/<[^>]*>/g,
            function(match)	{
                match = match.replace(/ ([^=]+)="[^"]*"/g,
                    function (match2, attributeName) {
                        if (attributeName == "alt" || attributeName == "href" ||
                            attributeName == "src" || attributeName == "title")
                        {
                            return match2;
                        }
                        return "";
                    });
                return match;
            });
        tempNode.innerHTML = newSnippet;
        this._acceptableChildren(tempNode);
        value = matchedHead + tempNode.innerHTML + matchedTail;

        /* Final cleanout for MS Word cruft */
        value = value.replace(/<\?xml[^>]*>/g, "");
        value = value.replace(/<[^ >]+:[^>]*>/g, "");
        value = value.replace(/<\/[^ >]+:[^>]*>/g, "");
        value = value.replace(/&lt;!--[^>]+--&gt;/g, "");

        this.doc.body.innerHTML	= value;
        if (QuiX.utils.BrowserInfo.family != 'ie') {
            this._convertSPANs();
        }
    }
    return true;
}

QuiX.ui.RichText.prototype.cleanSource = function() {
    var theHTML = "";
    if (this.wysiwyg) {
        theHTML = this.doc.body.innerHTML;
    }
    else {
        theHTML = this.field.getValue();
    }

    theHTML = this._validTags(theHTML);

    /* Remove leading and trailing whitespace */
    theHTML = theHTML.replace(/^\s+/, "");
    theHTML = theHTML.replace(/\s+$/, "");

    /* Remove style attribute inside any tag */
    //theHTML = theHTML.replace(/ style="[^"]*"/g, "");

    /* Remove class attribute inside any tag */
    theHTML = theHTML.replace(/ class="[^"]*"/g, "");

    /* Replace improper BRs */
    theHTML = theHTML.replace(/<br>/g, "<br />");

    /* Remove BRs right before the end of blocks */
    theHTML = theHTML.replace(/<br \/>\s*<\/(h1|h2|h3|h4|h5|h6|li|p)/g, "</$1");

    /* Replace improper IMGs */
    theHTML = theHTML.replace(/(<img [^>]+[^\/])>/g, "$1 />");

    /* Remove empty tags */
    theHTML = theHTML.replace(/(<[^\/]>|<[^\/][^>]*[^\/]>)\s*<\/[^>]*>/g, "");

    if (this.wysiwyg) {
        this.doc.body.innerHTML = theHTML;
    }
    this.field.setValue(theHTML);
    return true;
}

QuiX.ui.RichText.prototype._convertSPANs = function(theSwitch) {
    var j, theChildren;
    if (theSwitch) {
        /* Replace styled spans with their semantic equivalent */
        var theSPANs = this.doc.getElementsByTagName("span");
        while (theSPANs.length > 0) {
            var theReplacementElement = null,
                theParentElement = null,
                style;

            theChildren = new Array();
            for (j=0; j<theSPANs[0].childNodes.length; j++) {
                theChildren.push(theSPANs[0].childNodes[j].cloneNode(true));
            }

            style = theSPANs[0].getAttribute("style");

            /* Detect type of span style */
            if (!style) {
                this._replaceNodeWithChildren(theSPANs[0]);
            }
            else if (style.indexOf('font-style: italic; font-weight: bold;') > -1) {
                theParentElement = this.doc.createElement("strong");
                theReplacementElement = this.doc.createElement("em");
                theReplacementElement.appendChild(theParentElement);
                style = style.replace('font-style: italic; font-weight: bold;', '');
            }
            else if (style.indexOf('font-weight: bold; font-style: italic;') > -1) {
                theParentElement = this.doc.createElement("em");
                theReplacementElement = this.doc.createElement("strong");
                theReplacementElement.appendChild(theParentElement);
                style = style.replace('font-weight: bold; font-style: italic;', '');
            }
            else if (style.indexOf('font-style: italic;') > -1) {
                theReplacementElement = this.doc.createElement("em");
                theParentElement = theReplacementElement;
                style = style.replace('font-style: italic;', '');
            }
            else if (style.indexOf('font-weight: bold;') > -1) {
                theReplacementElement = this.doc.createElement("strong");
                theParentElement = theReplacementElement;
                style = style.replace('font-weight: bold;', '');
            }
            else {
                theReplacementElement = this.doc.createElement("font");
                theParentElement = theReplacementElement;
            }

            if (theReplacementElement != null) {
                if (style.trim()) {
                    theReplacementElement.setAttribute('style', style);
                }
                for (j=0; j<theChildren.length; j++) {
                    theParentElement.appendChild(theChildren[j]);
                }
                theSPANs[0].parentNode.replaceChild(theReplacementElement,
                                                    theSPANs[0]);
            }
            theSPANs = this.doc.getElementsByTagName("span");
        }
    }
    else {
        var theSpan;
        /* Replace em and strong tags with styled spans */
        var theEMs = this.doc.getElementsByTagName("em");
        while (theEMs.length > 0) {
            theChildren = new Array();
            theSpan = this.doc.createElement("span");
            theSpan.setAttribute("style", "font-style: italic;" +
                                 theEMs[0].getAttribute("style"));

            for (j=0; j<theEMs[0].childNodes.length; j++) {
                theChildren.push(theEMs[0].childNodes[j].cloneNode(true));
            }

            for (j=0; j<theChildren.length; j++) {
                theSpan.appendChild(theChildren[j]);
            }
            theEMs[0].parentNode.replaceChild(theSpan, theEMs[0]);
            theEMs = this.doc.getElementsByTagName("em");
        }
        var theSTRONGs = this.doc.getElementsByTagName("strong");
        while (theSTRONGs.length > 0) {
            theChildren = new Array();
            theSpan = this.doc.createElement("span");
            theSpan.setAttribute("style", "font-weight: bold;" +
                                 theSTRONGs[0].getAttribute("style"));

            for (j=0; j < theSTRONGs[0].childNodes.length; j++) {
                theChildren.push(theSTRONGs[0].childNodes[j].cloneNode(true));
            }

            for (j=0; j < theChildren.length; j++) {
                theSpan.appendChild(theChildren[j]);
            }
            theSTRONGs[0].parentNode.replaceChild(theSpan, theSTRONGs[0]);
            theSTRONGs = this.doc.getElementsByTagName("strong");
        }
    }
    return true;
}

QuiX.ui.RichText.prototype.detectPaste = function(e) {
    if (e.ctrlKey && e.keyCode == 86 && this.wysiwyg && !this.locked) {
        var self = this;
        this.pasteCache = this.doc.body.innerHTML;
        this.locked = true;
        window.setTimeout(
            function() {
                self.cleanPaste();
                self.locked = false;
                return true;
            }, 100);
    }
    return true;
}

QuiX.ui.RichText.prototype.initEdit = function() {
    var self = this;
    this.doc.designMode = 'on';
    if (QuiX.utils.BrowserInfo.family != 'ie') {
        this._convertSPANs(false);
    }
    QuiX.addEvent(this.doc, "onmouseup",
        function() {
            QuiX.cleanupOverlays();
            self._updateState();
            return true;
        });
    QuiX.addEvent(this.doc, "onkeyup",
        function() {
            self._updateState();
            return true;
        });
    QuiX.addEvent(this.doc, "onkeydown",
        function(e){
            QuiX.cleanupOverlays();
            self.detectPaste(e);
            return true;
        });
    this.locked = false;
    return true;
}

QuiX.ui.RichText.prototype.newParagraph = function(elementArray,
                                                   succeedingElement) {
    var theBody = this.doc.body,
        theParagraph = this.doc.createElement("p");

    for (var i = 0; i < elementArray.length; i++) {
        theParagraph.appendChild(elementArray[i]);
    }
    if (typeof(succeedingElement) != "undefined") {
        theBody.insertBefore(theParagraph, succeedingElement);
    }
    else {
        theBody.appendChild(theParagraph);
    }
    return true;
}

QuiX.ui.RichText.prototype.paragraphise = function() {
    if (this.insertParagraphs && this.wysiwyg) {
        var theBody = this.doc.body;
        var nodes = theBody.childNodes;
        var i;
        /* Remove all text nodes containing just whitespace */
        for (i=0; i < nodes.length; i++) {
            if (nodes[i].nodeName.toLowerCase() == "#text" &&
                    nodes[i].data.search(/^\s*$/) != -1) {
                theBody.removeChild(nodes[i]);
                i--;
            }
        }
        var removedElements = new Array();
        for (i=0; i < nodes.length; i++) {
            if (this._isInline(nodes[i].nodeName)) {
                removedElements.push(nodes[i].cloneNode(true));
                theBody.removeChild(nodes[i]);
                i--;
            }
            else if (nodes[i].nodeName.toLowerCase() == "br") {
                if (i + 1 < nodes.length) {
                    /* If the current break tag is followed by another
                     * break tag */
                    if (nodes[i+1].nodeName.toLowerCase() == "br") {
                        /* Remove consecutive break tags */
                        while (i < nodes.length &&
                               nodes[i].nodeName.toLowerCase() == "br")
                        {
                            theBody.removeChild(nodes[i]);
                        }

                        if (removedElements.length > 0) {
                            this.newParagraph(removedElements, nodes[i]);
                            removedElements = new Array();
                        }
                    }
                    /* If the break tag appears before a block element */
                    else if (!this._isInline(nodes[i+1].nodeName)) {
                        theBody.removeChild(nodes[i]);
                    }
                    else if (removedElements.length > 0) {
                        removedElements.push(nodes[i].cloneNode(true));
                        theBody.removeChild(nodes[i]);
                    }
                    else {
                        theBody.removeChild(nodes[i]);
                    }
                    i--;
                }
                else {
                    theBody.removeChild(nodes[i]);
                }
            }
            else if (removedElements.length > 0) {
                this.newParagraph(removedElements, nodes[i]);
                removedElements = new Array();
            }
        }
        if (removedElements.length > 0) {
            this.newParagraph(removedElements);
        }
    }
    return true;
}

QuiX.ui.RichText.prototype._updateInput = function() {
    /* Convert spans to semantics in Mozilla */
    if (QuiX.utils.BrowserInfo.family != 'ie') {
        this._convertSPANs(true);
    }
    this._updateAnchorsTarget();
    this.paragraphise();
    this.cleanSource();
}

QuiX.ui.RichText.prototype._updateAnchorsTarget = function() {
    if (this.target) {
        var links = this.doc.getElementsByTagName('A');
        for (var i=0; i<links.length; i++) {
            links[i].target = this.target;
        }
    }
}

QuiX.ui.RichText.prototype.focus = function() {
    if (this.wysiwyg == true) {
        this.frame.frame.contentWindow.focus();
    }
    else {
        this.field.focus();
    }
}

QuiX.ui.RichText.prototype.switchMode = function() {
    if (!this.locked) {
        var i, btn;
        this.locked = true;
        /* Switch to HTML source */
        if (this.wysiwyg) {
            this._updateInput();
            this.frame.hide();
            this.field.show();
            if (!this.readonly && this.toolbar) {
                for (i=0; i<this.toolbar.widgets.length; i++) {
                    btn = this.toolbar.widgets[i];
                    if (btn.getId() != 'htmlsource') {
                        if (btn.type == 'toggle' && btn.value=='on') {
                            btn.toggle();
                        }
                        btn.disable();
                    }
                }
            }
            this.wysiwyg = false;
            this.locked = false;
        }
        /* Switch to WYSIWYG */
        else {
            if (!this.readonly && this.toolbar) {
                for (i=0; i<this.toolbar.widgets.length; i++) {
                    btn = this.toolbar.widgets[i];
                    if (btn.getId() != 'htmlsource') {
                        btn.enable();
                    }
                }
                this.initEdit();
            }
            this.frame.show();
            this.field.hide();
            if (QuiX.utils.BrowserInfo.family == 'ie') {
                this.writeDocument(this.field.getValue());
            }
            this.wysiwyg = true;
        }
        this.redraw();
    }
    return true;
}

QuiX.ui.RichText.prototype.writeDocument = function(content) {
    this.doc.body.innerHTML = content;
    return true;
}

QuiX.ui.RichText.prototype._setButtonState = function(id , state) {
    var btn = this.toolbar.getWidgetById(id);
    if (id != 'format') {
        if (btn.value != state) btn.toggle();
    }
    else {
        for (var i=0; i<btn.contextMenu.options.length; i++) {
            if (btn.contextMenu.options[i].attributes.block == state)
                btn.contextMenu.options[i].selected = true;
            else
                btn.contextMenu.options[i].selected = false;
        }
    }
}

QuiX.ui.RichText.prototype._getSelectionRange = function() {
    var selection;
    var range = null;
    if (this.doc.selection) {
        selection = this.doc.selection;
        range = selection.createRange();
    }
    else {
        try	{
            selection = this.frame.frame.contentWindow.getSelection();
        }
        catch (e) {
            return false;
        }
        range = selection.getRangeAt(0);
    }
    return range;
}

QuiX.ui.RichText.prototype._isInline = function(n) {
    return ["#text", "a", "em", "font",
            "span", "strong", "u"].hasItem(n.toLowerCase());
}

QuiX.ui.RichText.prototype._isAcceptedElementName = function(n) {
    return ["#text", "a", "em", "h1", "h2", "h3", "h4",
            "h5", "h6", "img", "li", "ol", "p", "strong",
            "ul", "font", "sup", "sub"].hasItem(n.toLowerCase());
}

QuiX.ui.RichText.prototype._acceptableChildren = function(theNode) {
    var theChildren = theNode.childNodes;
    var i;
    for (i=0; i<theChildren.length; i++) {
        if (!this._isAcceptedElementName(theChildren[i].nodeName)) {
            if (!this._isInline(theChildren[i].nodeName)) {
                if (theNode.nodeName.toLowerCase() == "p") {
                    this._acceptableChildren(
                        this._replaceNodeWithChildren(theNode));
                    return true;
                }
                this._changeNodeType(theChildren[i], "p");
            }
            else {
                this._replaceNodeWithChildren(theChildren[i]);
            }
            i = -1;
        }
    }
    for (i=0; i < theChildren.length; i++) {
        this._acceptableChildren(theChildren[i]);
    }
    return true;
}

QuiX.ui.RichText.prototype._replaceNodeWithChildren = function(theNode) {
    var theChildren = new Array(),
        theParent = theNode.parentNode,
        i;

    if (theParent != null) {
        for (i = 0; i < theNode.childNodes.length; i++) {
            theChildren.push(theNode.childNodes[i].cloneNode(true));
        }
        for (i = 0; i < theChildren.length; i++) {
            theParent.insertBefore(theChildren[i], theNode);
        }
        theParent.removeChild(theNode);
        return theParent;
    }
    return true;
}

QuiX.ui.RichText.prototype._changeNodeType = function(theNode, nodeType) {
    var theChildren = new Array(),
        theNewNode = document.createElement(nodeType),
        theParent = theNode.parentNode,
        i;

    if (theParent != null) {
        for (i=0; i < theNode.childNodes.length; i++) {
            theChildren.push(theNode.childNodes[i].cloneNode(true));
        }
        for (i=0; i < theChildren.length; i++) {
            theNewNode.appendChild(theChildren[i]);
        }
        theParent.replaceChild(theNewNode, theNode);
    }
    return true;
}

QuiX.ui.RichText.prototype._validTags = function(theString) {
    /* Replace uppercase element names with lowercase */
    theString = theString.replace(/<[^> ]*/g,
        function(match){return match.toLowerCase();});

    /* Replace uppercase attribute names with lowercase */
    theString = theString.replace(/<[^>]*>/g,
        function(match) {
            match = match.replace(/ [^=]+=/g,
                function(match2) {
                    return match2.toLowerCase();
                });
            return match;
        });

    /* Put quotes around unquoted attributes */
    theString = theString.replace(/<[^>]*>/g,
        function(match) {
            match = match.replace(/( [^=]+=)([^"][^ >]*)/g, "$1\"$2\"");
            return match;
        });

    return theString;
}

QuiX.ui.RichText.prototype.executeCommand = function(command /*, arg1, ...*/) {
    var arg = arguments[1] || null,
        bf = QuiX.utils.BrowserInfo.family;

    if (bf == 'ie') {
        this._range.select();
    }
    switch (command) {
        case 'superscript':
            if (bf != 'saf') {
                if (this.doc.queryCommandState('subscript', false, null)) {
                    this.doc.execCommand('subscript', false, null);
                }
            }
            this.doc.execCommand(command, false, null);
            break;
        case 'subscript':
            if (bf != 'saf') {
                if (this.doc.queryCommandState('superscript', false, null)) {
                    this.doc.execCommand('superscript', false, null);
                }
            }
            this.doc.execCommand(command, false, null);
            break;
        case 'CreateLink':
            this.doc.execCommand(command, false, arg);
            this._updateAnchorsTarget();
            break;
        case 'InsertImage':
            var alt = arguments[2];
            this._range.collapse(false);
            /* IE selections */
            if (this.doc.selection)	{
                /* Escape quotes in alt text */
                alt = alt.replace(/"/g, "'");
                this._range.pasteHTML('<img alt="' + alt + '" src="' + arg + '" />');
            }
            /* Mozilla selections */
            else {
                var theImageNode = this.doc.createElement("img");
                theImageNode.src = arg;
                theImageNode.alt = alt;
                this._range.insertNode(theImageNode);
            }
            break;
        default:
            this.doc.execCommand(command, false, arg);
    }
}

/* Action taken when toolbar item activated */
QuiX.ui.RichText._toolbarAction = function(evt , btn) {
    //return;
    var theWidgEditor = (btn.parent.owner || btn).parent.parent;
    var theIframe = theWidgEditor.frame.frame;
    var theSelection = "";
    var action = btn.getId();

    /* If somehow a button other than "HTML source" is clicked
     * while viewing HTML source, ignore click */
    if (!theWidgEditor.wysiwyg && action != "htmlsource") {
        return;
    }

    switch (action) {
        case "formatblock":
            theWidgEditor.executeCommand(action, btn.attributes.block);
            break;
        case "htmlsource":
            theWidgEditor.switchMode();
            break;
        case "hyperlink":
            if (btn.value == "off") {
                theWidgEditor.executeCommand('Unlink');
            }
            else {
                if (theWidgEditor.doc.selection) {
                    theSelection = theWidgEditor._getSelectionRange().text;
                }
                else {
                    theSelection = theIframe.contentWindow.getSelection();
                }
                if (theSelection == "")	{
                    theWidgEditor._setButtonState("hyperlink", "off");
                    document.desktop.msgbox(
                        'Error',
                        'Please select the text you wish to hyperlink.',
                        document.desktop.attributes.CLOSE, null,
                        'center', 'center', 240, 80);
                    break;
                }
                document.desktop.parseFromString(
                    '<dialog xmlns="http://www.innoscript.org/quix"\
                        title="Enter Hyperlink URL" padding="4,4,4,4"\
                        width="240" height="60" left="center" top="center">\
                      <wbody>\
                        <field id="url" width="100%" value="http://"/>\
                      </wbody>\
                      <dlgbutton width="70" height="22"\
                        onclick="__closeDialog__" caption="' +
                        document.desktop.attributes.OK + '"/>\
                      <dlgbutton width="70" height="22"\
                        onclick="__closeDialog__" caption="' +
                        document.desktop.attributes.CANCEL + '"/>\
                    </dialog>',
                    function(dlg) {
                        var url = dlg.getWidgetById('url');
                        url.focus();
                        dlg.attachEvent('onclose', function(){
                            if (dlg.buttonIndex == 0 && url.getValue() != '') {
                                theWidgEditor.executeCommand('CreateLink', url.getValue());
                            }
                        });
                    });
            }
            return;
        case "image":
            document.desktop.parseFromString(
                '<dialog xmlns="http://www.innoscript.org/quix" \
                    title="Enter Image details" padding="4,4,4,4"\
                    width="240" height="120" left="center" top="center">\
                  <wbody>\
                    <label caption="Url:" width="30"/>\
                    <field id="url" left="34" width="186" value="http://"/>\
                    <label caption="Alt:" top="32" width="36"/>\
                    <field id="alt" top="30" left="34" width="186"/>\
                  </wbody>\
                  <dlgbutton width="70" height="22"\
                    onclick="__closeDialog__" caption="' +
                    document.desktop.attributes.OK + '"/>\
                  <dlgbutton width="70" height="22"\
                    onclick="__closeDialog__" caption="' +
                    document.desktop.attributes.CANCEL + '"/>\
                </dialog>',
                function(dlg) {
                    var url = dlg.getWidgetById('url'),
                        alt = dlg.getWidgetById('alt').getValue();

                    url.focus();
                    dlg.attachEvent('onclose', function(){
                        if (dlg.buttonIndex == 0 && url.getValue()) {
                            theWidgEditor.executeCommand('InsertImage', url.getValue(), alt);
                        }
                    });
                });
            return;
        default:
            theWidgEditor.executeCommand(action);
            /* If toolbar item was turned on */
            if (theWidgEditor.doc.queryCommandState(action, false, null)) {
                theWidgEditor._setButtonState(action, "on");
            }
            else {
                theWidgEditor._setButtonState(action, "off");
            }
    }
    theWidgEditor.focus();
}

QuiX.ui.RichText.prototype._updateState = function() {
    var self = this;

    this._range = self._getSelectionRange();
    if (this._timeout) {
        window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(
        function() {
            if (self.toolbar) {
                self._updateToolbar();
            }
            self._timeout = null;
            if (self._customRegistry.onstatechange) {
                self._customRegistry.onstatechange(self);
            }
            return true;
        }, 200);
    /* strange bug in IE requires a redraw
     * to update curret position correctly */
    //if (QuiX.utils.BrowserInfo.family == 'ie') {
    //    this.toolbar.widgets[0].redraw();
    //}
    //}
}

/* Check the nesting of the current cursor position/selection */
QuiX.ui.RichText.prototype._updateToolbar = function() {
    var state = this.getState();

    /* Turn off all the buttons */
    var toggles = this.toolbar.getWidgetsByAttributeValue('type', 'toggle', true);
    for (var i=0; i<toggles.length; i++) {
        if (toggles[i].value == 'on') {
            toggles[i].toggle();
        }
    }

    /* Clear block format */
    var selected = this.toolbar.getWidgetById('format').contextMenu.
                   getWidgetsByAttributeValue('selected', true, true);
    if (selected.length) {
        selected[0].selected = false;
    }

    if (state.b) {
        this._setButtonState("bold", "on");
    }
    if (state.i) {
        this._setButtonState("italic", "on");
    }
    if (state.a) {
        this._setButtonState("hyperlink", "on");
    }
    if (state.ol) {
        this._setButtonState("insertorderedlist", "on");
    }
    if (state.ul) {
        this._setButtonState("insertunorderedlist", "on");
    }
    if (state.format) {
        this._setButtonState('format', state.format);
    }
}

QuiX.ui.RichText.prototype.getState = function() {
    var theParentNode = null,
        style,
        state = {b: false,
                 i: false,
                 u: false,
                 a: null,
                 ol: false,
                 ul: false,
                 sup: false,
                 sub: false,
                 format: null,
                 fontName: null,
                 fontSize: null,
                 color: null,
                 align: null};

    /* IE selections */
    if (this.doc.selection) {
        try	{
            theParentNode = this._range.parentElement();
        }
        catch (e) {
            return state;
        }
    }
    /* Mozilla selections */
    else {
        theParentNode = this._range.commonAncestorContainer;
    }

    while (theParentNode.nodeType == 3) {
        theParentNode = theParentNode.parentNode;
    }

    while (theParentNode.nodeName.toLowerCase() != "body") {
        switch (theParentNode.nodeName.toLowerCase()) {
            case "a":
                if (!state.a) {
                    state.a = theParentNode.href;
                }
                break;
            case "em":
                state.i = true;
                break;
            case "strong":
                state.b = true;
                break;
            case "ol":
                if (!(state.ul || state.ol)) {
                    state.ol = true;
                }
                break;
            case "ul":
                if (!(state.ul || state.ol)) {
                    state.ul = true;
                }
                break;
            case "li":
                break;
            case "sup":
                state.sup = true;
                break;
            case "sub":
                state.sub = true;
                break;
            case "font":
            case "span":
                break;
            default:
                state.format = "<" + theParentNode.nodeName.toLowerCase() + ">";
        }
        style = theParentNode.getAttribute("style");
        if (style) {
            if (style.search(/font-style: italic;/i) > -1) {
                state.i = true;
            }
            if (style.search(/font-weight: bold;/i) > -1) {
                state.b = true;
            }
            if (style.search(/text-decoration: underline;/i) > -1) {
                state.u = true;
            }
            if (style.search(/font-family:/i) > -1 && !state.fontName) {
                state.fontName = theParentNode.style.fontFamily;
            }
            if (style.search(/color:/i) > -1 && !state.color) {
                state.color = theParentNode.style.color;
            }
            if (style.search(/text-align:/i) > -1 && !state.align) {
                state.align = theParentNode.style.textAlign;
            }
        }
        if (theParentNode.align && !state.align) {
            state.align = theParentNode.align;
        }
        if (theParentNode.size && !state.fontSize) {
            state.fontSize = theParentNode.size;
        }
        if (theParentNode.face && !state.fontName) {
            state.fontName = theParentNode.face;
        }
        theParentNode = theParentNode.parentNode;
    }

    return state;
}
