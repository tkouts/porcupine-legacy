// color picker

QuiX.ui.ColorPicker = function(/*params*/) {
    var params = arguments[0] || {};
    this.base = QuiX.ui.Field;
    params.type = 'text';
    this.base(params);

    var picker_params = {
        pickerMode : params.mode,
        pickerPosition : params.position,

        pickerFace : params.pickerface,
        pickerFaceColor : params.pickerfacecolor,

        pickerBorder :  params.pickerborder,
        pickerBorderColor : params.pickerbordercolor,

        pickerInset : params.pickerinset,
        pickerInsetColor : params.pickerinsetcolor
    }

    new QuiX.ui.ColorPicker.jscolor.color(this, picker_params);
}

QuiX.constructors['colorpicker'] = QuiX.ui.ColorPicker;
QuiX.ui.ColorPicker.prototype = new QuiX.ui.Field;

QuiX.ui.ColorPicker.jscolor = {

    dir : QuiX.getThemeUrl() + 'images/',

    images : {
        pad : [ 181, 101 ],
        sld : [ 16, 101 ],
        cross : [ 15, 15 ],
        arrow : [ 7, 11 ]
    },

    getMousePos : function(e) {
        if(!e) { e = window.event; }
        if(typeof e.pageX === 'number') {
            return [e.pageX, e.pageY];
        } else if(typeof e.clientX === 'number') {
            return [
                e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
                e.clientY + document.body.scrollTop + document.documentElement.scrollTop
            ];
        }
    },

    getViewPos : function() {
        if(typeof window.pageYOffset === 'number') {
            return [window.pageXOffset, window.pageYOffset];
        } else if(document.body && (document.body.scrollLeft || document.body.scrollTop)) {
            return [document.body.scrollLeft, document.body.scrollTop];
        } else if(document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
            return [document.documentElement.scrollLeft, document.documentElement.scrollTop];
        } else {
            return [0, 0];
        }
    },

    getViewSize : function() {
        if(typeof window.innerWidth === 'number') {
            return [window.innerWidth, window.innerHeight];
        } else if(document.body && (document.body.clientWidth || document.body.clientHeight)) {
            return [document.body.clientWidth, document.body.clientHeight];
        } else if(document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
            return [document.documentElement.clientWidth, document.documentElement.clientHeight];
        } else {
            return [0, 0];
        }
    },

    /*
     * Usage example:
     * var myColor = new jscolor.color(myInputElement)
     */

    color : function(field, prop) {

        // quix
        var target = field.div.firstChild;

        this.required = true; // refuse empty values?
        this.adjust = true; // adjust value to uniform notation?
        this.hash = false; // prefix color with # symbol?
        this.caps = true; // uppercase?

        this.valueElement = target; // value holder
        this.styleElement = target; // where to reflect current color

        this.hsv = [0, 0, 1]; // read-only  0-6, 0-1, 0-1
        this.rgb = [1, 1, 1]; // read-only  0-1, 0-1, 0-1

        this.pickerOnfocus = true; // display picker on focus?
        this.pickerMode = 'HSV'; // HSV | HVS
        this.pickerPosition = 'bottom'; // left | right | top | bottom
        this.pickerFace = QuiX.theme.colorpicker.face;
        this.pickerFaceColor = QuiX.theme.colorpicker.facecolor;
        this.pickerBorder = QuiX.theme.colorpicker.border;
        this.pickerBorderColor = QuiX.theme.colorpicker.bordercolor;
        this.pickerInset = QuiX.theme.colorpicker.inset;
        this.pickerInsetColor = QuiX.theme.colorpicker.insetcolor;
        this.pickerZIndex = 10000;

        for(var p in prop) {
            if (prop.hasOwnProperty(p) && typeof(prop[p]) != 'undefined') {
                this[p] = prop[p];
            }
        }

        this.hidePicker = function() {
            if (isPickerOwner()) {
                removePicker();
            }
        };

        this.showPicker = function() {
            if(!isPickerOwner()) {
                // quix
                var tp = [field.getScreenLeft(), field.getScreenTop()];
                var ts = [field.getWidth(true), field.getHeight(true)];
                var vp = jscolor.getViewPos(); // view pos
                var vs = jscolor.getViewSize(); // view size
                var ps = [ // picker size
                    2 * this.pickerBorder + 4 * this.pickerInset +
                        2 * this.pickerFace + jscolor.images.pad[0] +
                        2 * jscolor.images.arrow[0] + jscolor.images.sld[0],
                    2 * this.pickerBorder + 2 * this.pickerInset +
                        2 * this.pickerFace + jscolor.images.pad[1]
                ];
                var a, b, c;
                switch(this.pickerPosition.toLowerCase()) {
                    case 'left': a=1; b=0; c=-1; break;
                    case 'right':a=1; b=0; c=1; break;
                    case 'top':  a=0; b=1; c=-1; break;
                    default:     a=0; b=1; c=1; break;
                }
                var l = (ts[b]+ps[b])/2;
                var pp = [ // picker pos
                    -vp[a]+tp[a]+ps[a] > vs[a] ?
                        (-vp[a]+tp[a]+ts[a]/2 > vs[a]/2 && tp[a]+ts[a]-ps[a] >= 0 ? tp[a]+ts[a]-ps[a] : tp[a]) :
                        tp[a],
                    -vp[b]+tp[b]+ts[b]+ps[b]-l+l*c > vs[b] ?
                        (-vp[b]+tp[b]+ts[b]/2 > vs[b]/2 && tp[b]+ts[b]-l-l*c >= 0 ? tp[b]+ts[b]-l-l*c : tp[b]+ts[b]-l+l*c) :
                        (tp[b]+ts[b]-l+l*c >= 0 ? tp[b]+ts[b]-l+l*c : tp[b]+ts[b]-l-l*c)
                ];
                drawPicker(pp[a], pp[b]);
            }
        };

        this.importColor = function() {
            if(!valueElement) {
                this.exportColor();
            } else {
                if(!this.adjust) {
                    if(!this.fromString(valueElement.value, leaveValue)) {
                        styleElement.style.backgroundColor = styleElement.jscStyle.backgroundColor;
                        styleElement.style.color = styleElement.jscStyle.color;
                        this.exportColor(leaveValue | leaveStyle);
                    }
                } else if(!this.required && /^\s*$/.test(valueElement.value)) {
                    valueElement.value = '';
                    styleElement.style.backgroundColor = styleElement.jscStyle.backgroundColor;
                    styleElement.style.color = styleElement.jscStyle.color;
                    this.exportColor(leaveValue | leaveStyle);

                } else if(this.fromString(valueElement.value)) {
                    // OK
                } else {
                    this.exportColor();
                }
            }
        };

        this.exportColor = function(flags) {
            if(!(flags & leaveValue) && valueElement) {
                var value = this.toString();
                if(this.caps) { value = value.toUpperCase(); }
                if(this.hash) { value = '#'+value; }
                valueElement.value = value;
            }
            if(!(flags & leaveStyle) && styleElement) {
                styleElement.style.backgroundColor =
                    '#'+this.toString();
                styleElement.style.color =
                    0.213 * this.rgb[0] +
                    0.715 * this.rgb[1] +
                    0.072 * this.rgb[2]
                    < 0.5 ? '#FFF' : '#000';
            }
            if(!(flags & leavePad) && isPickerOwner()) {
                redrawPad();
            }
            if(!(flags & leaveSld) && isPickerOwner()) {
                redrawSld();
            }
        };

        this.fromHSV = function(h, s, v, flags) { // null = don't change
            h<0 && (h=0) || h>6 && (h=6);
            s<0 && (s=0) || s>1 && (s=1);
            v<0 && (v=0) || v>1 && (v=1);
            this.rgb = HSV_RGB(
                h===null ? this.hsv[0] : (this.hsv[0]=h),
                s===null ? this.hsv[1] : (this.hsv[1]=s),
                v===null ? this.hsv[2] : (this.hsv[2]=v)
            );
            this.exportColor(flags);
        };

        this.fromRGB = function(r, g, b, flags) { // null = don't change
            r<0 && (r=0) || r>1 && (r=1);
            g<0 && (g=0) || g>1 && (g=1);
            b<0 && (b=0) || b>1 && (b=1);
            var hsv = RGB_HSV(
                r===null ? this.rgb[0] : (this.rgb[0]=r),
                g===null ? this.rgb[1] : (this.rgb[1]=g),
                b===null ? this.rgb[2] : (this.rgb[2]=b)
            );
            if(hsv[0] !== null) {
                this.hsv[0] = hsv[0];
            }
            if(hsv[2] !== 0) {
                this.hsv[1] = hsv[1];
            }
            this.hsv[2] = hsv[2];
            this.exportColor(flags);
        };

        this.fromString = function(hex, flags) {
            var m = hex.match(/^\W*([0-9A-F]{3}([0-9A-F]{3})?)\W*$/i);
            if(!m) {
                return false;
            } else {
                if(m[1].length === 6) { // 6-char notation
                    this.fromRGB(
                        parseInt(m[1].substr(0,2),16) / 255,
                        parseInt(m[1].substr(2,2),16) / 255,
                        parseInt(m[1].substr(4,2),16) / 255,
                        flags
                    );
                } else { // 3-char notation
                    this.fromRGB(
                        parseInt(m[1].charAt(0)+m[1].charAt(0),16) / 255,
                        parseInt(m[1].charAt(1)+m[1].charAt(1),16) / 255,
                        parseInt(m[1].charAt(2)+m[1].charAt(2),16) / 255,
                        flags
                    );
                }
                return true;
            }
        };

        this.toString = function() {
            return (
                (0x100 | Math.round(255*this.rgb[0])).toString(16).substr(1) +
                (0x100 | Math.round(255*this.rgb[1])).toString(16).substr(1) +
                (0x100 | Math.round(255*this.rgb[2])).toString(16).substr(1)
            );
        };

        function RGB_HSV(r, g, b) {
            var n = Math.min(Math.min(r,g),b);
            var v = Math.max(Math.max(r,g),b);
            var m = v - n;
            if(m === 0) { return [ null, 0, v ]; }
            var h = r===n ? 3+(b-g)/m : (g===n ? 5+(r-b)/m : 1+(g-r)/m);
            return [ h===6?0:h, m/v, v ];
        }

        function HSV_RGB(h, s, v) {
            if(h === null) { return [ v, v, v ]; }
            var i = Math.floor(h);
            var f = i%2 ? h-i : 1-(h-i);
            var m = v * (1 - s);
            var n = v * (1 - s*f);
            switch(i) {
                case 6:
                case 0: return [v,n,m];
                case 1: return [n,v,m];
                case 2: return [m,v,n];
                case 3: return [m,n,v];
                case 4: return [n,m,v];
                case 5: return [v,m,n];
            }
        }

        function removePicker() {
            delete jscolor.picker.owner;
            // quix
            QuiX.removeNode(jscolor.picker.boxB);
        }

        function drawPicker(x, y) {
            if(!jscolor.picker) {
                jscolor.picker = {
                    box : document.createElement('div'),
                    boxB : document.createElement('div'),
                    pad : document.createElement('div'),
                    padB : document.createElement('div'),
                    padM : document.createElement('div'),
                    sld : document.createElement('div'),
                    sldB : document.createElement('div'),
                    sldM : document.createElement('div')
                };
                for(var i=0, segSize=4; i<jscolor.images.sld[1]; i+=segSize) {
                    var seg = document.createElement('div');
                    seg.style.height = segSize+'px';
                    seg.style.fontSize = '1px';
                    seg.style.lineHeight = '0';
                    jscolor.picker.sld.appendChild(seg);
                }
                jscolor.picker.sldB.appendChild(jscolor.picker.sld);
                jscolor.picker.box.appendChild(jscolor.picker.sldB);
                jscolor.picker.box.appendChild(jscolor.picker.sldM);
                jscolor.picker.padB.appendChild(jscolor.picker.pad);
                jscolor.picker.box.appendChild(jscolor.picker.padB);
                jscolor.picker.box.appendChild(jscolor.picker.padM);
                jscolor.picker.boxB.appendChild(jscolor.picker.box);
            }

            var p = jscolor.picker;

            // quix
            p.boxB.close = function() {
                //alert(1)
                document.desktop.overlays.removeItem(jscolor.picker.boxB);
                valueElement.blur();
            }

            // controls interaction
            p.box.onmouseup =
            p.box.onmouseout = function() { target.focus(); };
            p.box.onmousedown = function(e) {
                abortBlur=true;
                // quix
                //QuiX.cancelDefault(e || event);
                QuiX.stopPropag(e || event);
            };
            p.box.onmousemove = function(e) {
                holdPad && setPad(e);
                holdSld && setSld(e);
            };
            p.padM.onmouseup =
            p.padM.onmouseout = function() {
                if (holdPad) {
                    holdPad = false;
                    // quix
                    QuiX.sendEvent(valueElement, 'HTMLEvents', 'onchange');
                }
            };
            p.padM.onmousedown = function(e) { holdPad=true; setPad(e); };
            p.sldM.onmouseup =
            p.sldM.onmouseout = function() {
                if(holdSld) {
                    holdSld=false;
                    // quix
                    QuiX.sendEvent(valueElement, 'HTMLEvents', 'onchange');
                }
            };
            p.sldM.onmousedown = function(e) { holdSld=true; setSld(e); };

            // recompute controls positions
            posPad = [
                x+THIS.pickerBorder+THIS.pickerFace+THIS.pickerInset,
                y+THIS.pickerBorder+THIS.pickerFace+THIS.pickerInset ];
            posSld = [
                null,
                y+THIS.pickerBorder+THIS.pickerFace+THIS.pickerInset ];

            // picker
            p.box.style.width = 4 * THIS.pickerInset + 2 * THIS.pickerFace +
                                jscolor.images.pad[0] +
                                2 * jscolor.images.arrow[0] +
                                jscolor.images.sld[0] + 'px';
            p.box.style.height = 2 * THIS.pickerInset +
                                 2 * THIS.pickerFace +
                                 jscolor.images.pad[1] + 'px';

            // picker border
            p.boxB.style.position = 'absolute';
            p.boxB.style.clear = 'both';
            p.boxB.style.left = x + 'px';
            p.boxB.style.top = y + 'px';
            p.boxB.style.zIndex = THIS.pickerZIndex;
            p.boxB.style.border = THIS.pickerBorder + 'px solid';
            p.boxB.style.borderColor = THIS.pickerBorderColor;
            p.boxB.style.background = THIS.pickerFaceColor;

            // pad image
            p.pad.style.width = jscolor.images.pad[0] + 'px';
            p.pad.style.height = jscolor.images.pad[1] + 'px';

            // pad border
            p.padB.style.position = 'absolute';
            p.padB.style.left = THIS.pickerFace + 'px';
            p.padB.style.top = THIS.pickerFace + 'px';
            p.padB.style.border = THIS.pickerInset + 'px solid';
            p.padB.style.borderColor = THIS.pickerInsetColor;

            // pad mouse area
            p.padM.style.position = 'absolute';
            p.padM.style.left = '0';
            p.padM.style.top = '0';
            p.padM.style.width = THIS.pickerFace + 2*THIS.pickerInset +
                                 jscolor.images.pad[0] +
                                 jscolor.images.arrow[0] + 'px';
            p.padM.style.height = p.box.style.height;
            p.padM.style.cursor = 'crosshair';

            // slider image
            p.sld.style.overflow = 'hidden';
            p.sld.style.width = jscolor.images.sld[0]+'px';
            p.sld.style.height = jscolor.images.sld[1]+'px';

            // slider border
            p.sldB.style.position = 'absolute';
            p.sldB.style.right = THIS.pickerFace + 'px';
            p.sldB.style.top = THIS.pickerFace + 'px';
            p.sldB.style.border = THIS.pickerInset + 'px solid';
            p.sldB.style.borderColor = THIS.pickerInsetColor;

            // slider mouse area
            p.sldM.style.position = 'absolute';
            p.sldM.style.right = '0';
            p.sldM.style.top = '0';
            p.sldM.style.width = jscolor.images.sld[0] +
                                 jscolor.images.arrow[0] +
                                 THIS.pickerFace + 2 * THIS.pickerInset + 'px';
            p.sldM.style.height = p.box.style.height;
            try {
                p.sldM.style.cursor = 'pointer';
            } catch(eOldIE) {
                p.sldM.style.cursor = 'hand';
            }

            // load images in optimal order
            switch (modeID) {
                case 0: var padImg = 'hs.png'; break;
                case 1: var padImg = 'hv.png'; break;
            }
            p.padM.style.background = "url('" + jscolor.dir + "cross.gif') no-repeat";
            p.sldM.style.background = "url('" + jscolor.dir + "arrow.gif') no-repeat";
            p.pad.style.background = "url('" + jscolor.dir + padImg + "') 0 0 no-repeat";

            // place pointers
            redrawPad();
            redrawSld();

            jscolor.picker.owner = THIS;

            // quix
            document.desktop.div.appendChild(p.boxB);
            document.desktop.overlays.push(p.boxB);
        }

        function redrawPad() {
            // redraw the pad pointer
            switch (modeID) {
                case 0: var yComponent = 1; break;
                case 1: var yComponent = 2; break;
            }
            var x = Math.round((THIS.hsv[0]/6) * (jscolor.images.pad[0]-1));
            var y = Math.round((1-THIS.hsv[yComponent]) * (jscolor.images.pad[1]-1));
            jscolor.picker.padM.style.backgroundPosition =
                (THIS.pickerFace+THIS.pickerInset+x - Math.floor(jscolor.images.cross[0]/2)) + 'px ' +
                (THIS.pickerFace+THIS.pickerInset+y - Math.floor(jscolor.images.cross[1]/2)) + 'px';

            // redraw the slider image
            var seg = jscolor.picker.sld.childNodes;

            switch(modeID) {
                case 0:
                    var rgb = HSV_RGB(THIS.hsv[0], THIS.hsv[1], 1);
                    for(var i=0; i<seg.length; i+=1) {
                        seg[i].style.backgroundColor = 'rgb('+
                            (rgb[0]*(1-i/seg.length)*100)+'%,'+
                            (rgb[1]*(1-i/seg.length)*100)+'%,'+
                            (rgb[2]*(1-i/seg.length)*100)+'%)';
                    }
                    break;
                case 1:
                    var rgb, s, c = [ THIS.hsv[2], 0, 0 ];
                    var i = Math.floor(THIS.hsv[0]);
                    var f = i%2 ? THIS.hsv[0]-i : 1-(THIS.hsv[0]-i);
                    switch(i) {
                        case 6:
                        case 0: rgb=[0,1,2]; break;
                        case 1: rgb=[1,0,2]; break;
                        case 2: rgb=[2,0,1]; break;
                        case 3: rgb=[2,1,0]; break;
                        case 4: rgb=[1,2,0]; break;
                        case 5: rgb=[0,2,1]; break;
                    }
                    for(var i=0; i<seg.length; i+=1) {
                        s = 1 - 1/(seg.length-1)*i;
                        c[1] = c[0] * (1 - s*f);
                        c[2] = c[0] * (1 - s);
                        seg[i].style.backgroundColor = 'rgb('+
                            (c[rgb[0]]*100)+'%,'+
                            (c[rgb[1]]*100)+'%,'+
                            (c[rgb[2]]*100)+'%)';
                    }
                    break;
            }
        }

        function redrawSld() {
            // redraw the slider pointer
            switch(modeID) {
                case 0: var yComponent = 2; break;
                case 1: var yComponent = 1; break;
            }
            var y = Math.round((1-THIS.hsv[yComponent]) *
                               (jscolor.images.sld[1]-1));
            jscolor.picker.sldM.style.backgroundPosition =
                '0 ' + (THIS.pickerFace + THIS.pickerInset + y -
                        Math.floor(jscolor.images.arrow[1]/2)) + 'px';
        }

        function isPickerOwner() {
            return jscolor.picker && jscolor.picker.owner === THIS;
        }

        function blurTarget() {
            if(valueElement === target) {
                THIS.importColor();
            }
            if(THIS.pickerOnfocus) {
                THIS.hidePicker();
            }
        }

        function blurValue() {
            if(valueElement !== target) {
                THIS.importColor();
            }
        }

        function setPad(e) {
            var posM = jscolor.getMousePos(e);
            var x = posM[0]-posPad[0];
            var y = posM[1]-posPad[1];
            switch(modeID) {
                case 0: THIS.fromHSV(x * (6 / (jscolor.images.pad[0]-1)),
                                     1 - y/(jscolor.images.pad[1]-1),
                                     null, leaveSld);
                        break;
                case 1: THIS.fromHSV(x * (6 / (jscolor.images.pad[0]-1)),
                                     null, 1 - y / (jscolor.images.pad[1] - 1),
                                     leaveSld);
                        break;
            }
        }

        function setSld(e) {
            var posM = jscolor.getMousePos(e);
            var y = posM[1]-posPad[1];
            switch(modeID) {
                case 0: THIS.fromHSV(null, null, 1 - y/(jscolor.images.sld[1]-1), leavePad); break;
                case 1: THIS.fromHSV(null, 1 - y/(jscolor.images.sld[1]-1), null, leavePad); break;
            }
        }

        var THIS = this;
        var modeID = this.pickerMode.toLowerCase()==='hvs' ? 1 : 0;
        var abortBlur = false;
        var
            valueElement = this.valueElement,
            styleElement = this.styleElement;
        var
            holdPad = false,
            holdSld = false;
        var
            posPad,
            posSld;
        var
            leaveValue = 1<<0,
            leaveStyle = 1<<1,
            leavePad = 1<<2,
            leaveSld = 1<<3;
        var
            jscolor = QuiX.ui.ColorPicker.jscolor;

        field.attachEvent('onfocus', function() {
            if(THIS.pickerOnfocus) { THIS.showPicker(); }
        });
        field.attachEvent('onblur', function() {
            if(!abortBlur) {
                window.setTimeout(
                    function(){
                        abortBlur || blurTarget();
                        abortBlur=false;
                    }, 0);
            } else {
                abortBlur = false;
            }
        });

        // valueElement
        if(valueElement) {
            var updateField = function() {
                THIS.fromString(valueElement.value, leaveValue);
            };
            QuiX.addEvent(valueElement, 'onkeyup', updateField);
            QuiX.addEvent(valueElement, 'oninput', updateField);
            QuiX.addEvent(valueElement, 'onblur', blurValue);
            valueElement.setAttribute('autocomplete', 'off');
        }

        // styleElement
        if(styleElement) {
            styleElement.jscStyle = {
                backgroundColor : styleElement.style.backgroundColor,
                color : styleElement.style.color
            };
        }

        this.importColor();
    }
};
