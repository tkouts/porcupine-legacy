QuiX.theme = {
    window: {
        title: {
            height: 22,
            get: function(title, img) {
                // title
                var b = new QuiX.ui.Box({
                    height: this.height,
                    padding: '1,1,1,1',
                    childrenalign: 'center'
                });
                var t = new QuiX.ui.Icon({
                    id: '_t',
                    caption: title || 'Untitled',
                    img: img,
                    align: (QuiX.dir != 'rtl')? 'left':'right',
                    style: 'cursor:move'
                });
                b.appendChild(t);
                // control buttons
                var oControl;
                for (var iWhich=2; iWhich>-1; iWhich--) {
                    oControl = new QuiX.ui.Widget({
                        id: 'c' + iWhich.toString(),
                        width: 16,
                        height: 16
                    });
                    b.appendChild(oControl);
                }
                return b;
            }
        },
        status: {
            height: 20,
            get: function() {
                return new QuiX.ui.Label({
                        height: this.height,
                        padding: '4,0,0,0',
                        border: 1,
                        overflow: 'hidden'
                    });
            }
        },
        resizer: {
            get: function() {
                return new QuiX.ui.Widget({
                        left: 'this.parent.getWidth(false, memo) - 16',
                        top: 'this.parent.getHeight(false, memo) - 16',
                        width: 16,
                        height: 16,
                        border: 0,
                        overflow: 'hidden'
                    });
            }
        }
    },
    contextmenu: {
        inner: {
            get: function() {
                return new QuiX.ui.Widget({
                        width: '22',
                        height: 'this.parent.div.clientHeight',
                        bgcolor: 'silver',
                        overflow: 'hidden'
                    });
            }
        }
    },
    combo: {
        button: {
            width: 20,
            get: function(img) {
                return new QuiX.ui.Button({
                        left: 'this.parent.getWidth(false, memo) - ' +
                              this.width,
                        height: '100%',
                        width: this.width,
                        img: img || '$THEME_URL$images/desc8.gif'
                    });
            }
        },
        dropdown: {
            get: function() {
                var dropdown = new QuiX.ui.Widget({border: 1});
                var cont = new QuiX.ui.Widget({
                    id: '_c',
                    width : '100%',
                    height: '100%',
                    overflow: 'hidden auto'
                });
                dropdown.appendChild(cont);
                var resizer = new QuiX.ui.Widget({
                    id: '_r',
                    left: 'this.parent.getWidth(false, memo) - 16',
                    top: 'this.parent.getHeight(false, memo) - 16',
                    width: 16,
                    height: 16,
                    border: 0,
                    overflow: 'hidden'
                });
                dropdown.appendChild(resizer);
                // stay on top
                resizer.div.style.zIndex = QuiX.maxz;
                return dropdown;
            }
        }
    },
    toolbar: {
        handle: {
            get: function() {
                return new QuiX.ui.Widget({
                        width : 4,
                        height : '100%',
                        border : 0,
                        overflow : 'hidden'
                    });
            }
        },
        separator: {
            get: function() {
                return new QuiX.ui.Widget({
                        width : 2,
                        height : '100%',
                        border : 1,
                        overflow : 'hidden'
                    });
            }
        }
    },
    tabpane: {
        tabbutton: {
            get: function(img, caption, bgcolor, color) {
                return new QuiX.ui.Icon({
                        border: 1,
                        padding: '12,12,4,6',
                        overflow: 'hidden',
                        caption: caption,
                        img: img,
                        bgcolor: bgcolor,
                        color: color
                    });
            }
        }
    },
    splitter: {
        separator: {
            get: function(type, size) {
                var dim = (type == 'h')? 'width':'height';
                var sep = new QuiX.ui.Widget({
                        dim : size,
                        border : 1,
                        overflow :'hidden'
                    });
                sep[dim] = size;
                return sep;
            }
        }
    },
    outlookbar: {
        header: {
            get: function(height) {
                return new QuiX.ui.Label({
                        width : "100%",
                        height : height,
                        border : 1,
                        padding : '2,2,2,2',
                        overflow : 'hidden',
                        caption : params.caption,
                        align : params.align || 'center'
                    });
            }
        }
    },
    datepicker: {
        dropdown: {
            get: function() {
                return '<vbox xmlns="http://www.innoscript.org/quix" ' +
        'width="100%" height="100%" spacing="4" childrenalign="center">' +
    '<box height="24" spacing="0" width="195" padding="1,1,1,1" ' +
            'onclick="QuiX.stopPropag">' + 
        '<flatbutton id="prev" width="22" caption="&lt;&lt;"/>' +
        '<combo id="month" width="100" editable="false"/>' +
        '<spinbutton id="year" maxlength="4" width="50" ' +
            'editable="true"/>' +
        '<flatbutton id="next" width="22" caption="&gt;&gt;"/>' +
    '</box>' +
    '<rect id="_c"/>' +
'</vbox>';
            }
        }
    }
}
