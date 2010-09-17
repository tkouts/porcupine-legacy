QuiX.theme = {
    window: {
        border: 1,
        padding: '4,4,4,4',
        title: {
            height: 32,
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
                    oControl = new QuiX.ui.SpriteButton({
                        id: 'c' + iWhich.toString(),
                        width: 19,
                        height: 19,
                        img: QuiX.getThemeUrl() + 'images/win_' +
                             iWhich + '.png'
                    });
                    b.appendChild(oControl);
                }
                return b;
            }
        },
        body: {
            border: 1
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
                        left: 'this.parent._calcWidth(false, memo) - 16',
                        top: 'this.parent._calcHeight(false, memo) - 16',
                        width: 16,
                        height: 16,
                        border: 0,
                        overflow: 'hidden'
                    });
            }
        }
    },
    contextmenu: {
        padding: '1,1,1,1',
        border: 1,
        radioImg: '$THEME_URL$images/menu_radio.png',
        checkImg: '$THEME_URL$images/menu_check.png',
        inner: {
            get: function() {
                var inner = new QuiX.ui.Widget({
                    width: 24,
                    height: 'this.parent.div.clientHeight - 2',
                    overflow: 'hidden',
                    border: 1
                });
                inner.div.className = 'inner';
                return inner;
            }
        },
        separator: {
            get: function() {
                return new QuiX.ui.Widget({
                    border : 1,
                    height : 2,
                    left: 24,
                    width : 'this.parent.div.clientWidth - 26',
                    overflow : 'hidden'
                });
            }
        }
    },
    field: {
        textpadding: 4
    },
    combo: {
        textpadding: 4,
        button: {
            width: 20,
            get: function(img) {
                return new QuiX.ui.Button({
                        left: 'this.parent.getWidth(false, memo) - ' +
                              this.width,
                        height: '100%',
                        width: this.width,
                        img: img || '$THEME_URL$images/combo.gif'
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
                        top: 'center',
                        width : 3,
                        height : 'this.parent.getHeight(true, memo) - 4',
                        border : 1,
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
        border: 3,
        padding: '6,6,6,6',
        tabbutton: {
            get: function(img, caption, bgcolor, color) {
                return new QuiX.ui.Icon({
                        border: 1,
                        padding: '10,10,4,6',
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
            height: 26,
            get: function(params) {
                return new QuiX.ui.Label({
                        width : "100%",
                        height : params.height,
                        border : 1,
                        padding : '9,2,2,2',
                        overflow : 'hidden',
                        caption : params.caption,
                        align : params.align || 'left'
                    });
            }
        }
    },
    datepicker: {
        dropdown: {
            get: function() {
                return '<vbox xmlns="http://www.innoscript.org/quix" ' +
        'width="100%" height="100%" spacing="4" childrenalign="center">' +
    '<box height="24" spacing="2" width="212" padding="1,1,1,1" ' +
            'onclick="QuiX.stopPropag">' + 
        '<flatbutton id="prev" width="22" caption="&lt;&lt;"/>' +
        '<combo id="month" width="100" editable="false"/>' +
        '<spinbutton id="year" maxlength="4" width="60" ' +
            'editable="true"/>' +
        '<flatbutton id="next" width="22" caption="&gt;&gt;"/>' +
    '</box>' +
    '<rect id="_c"/>' +
'</vbox>';
            }
        }
    },
    slider: {
        slot: {
            get: function() {
                return new QuiX.ui.Widget({
                        top: 'center',
                        left: 0,
                        width: '100%',
                        height: 4,
                        bgcolor: 'silver',
                        border: 1,
                        overflow: 'hidden'
                    });
            }
        },
        handle: {
            width: 10,
            get: function() {
                return new QuiX.ui.Icon({
                        img: '$THEME_URL$images/slider.gif',
                        top: 'center',
                        width: this.width,
                        height: 18,
                        border: 0,
                        padding: '0,0,0,0',
                        overflow: 'visible'
                    });
            }
        }
    },
    colorpicker: {
        face: 10,
        facecolor: 'ThreeDFace',
        border: 1,
        bordercolor:
            'ThreeDHighlight ThreeDShadow ThreeDShadow ThreeDHighlight',
        inset: 1,
        insetcolor:
            'ThreeDShadow ThreeDHighlight ThreeDHighlight ThreeDShadow'
    },
    listview: {
        altrows: 'r0,',
        selected: 'srow',
        trueImg: '$THEME_URL$images/check.png',
        headerheight: 27,
        rowheight: 26
    },
    selectlist: {
        optionpadding: '9,9,9,9',
        optionheight: 38
    },
    spinbutton: {
        border: 1,
        btnWidth: 16,
        getUp: function() {
            var btn = new QuiX.ui.Button({
                id: '_up',
                left: 'this.parent.getWidth(false, memo) - ' + this.btnWidth,
                height: '50%',
                width: this.btnWidth
            });
            return btn;
        },
        getDown: function() {
            var btn = new QuiX.ui.Button({
                id: '_down',
                left: 'this.parent.getWidth(false, memo) - ' + this.btnWidth,
                height: '50%',
                top: '50%',
                width: this.btnWidth
            });
            return btn;
        }
    },
    tooltip: {
        border: 1,
        bgcolor: 'white',
        padding: '4,4,4,4'
    }
}
