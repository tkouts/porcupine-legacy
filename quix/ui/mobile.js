/************************
Mobile Widgets
************************/

// scroll view

QuiX.ui.ScrollView = function(params) {
    params.overflow = 'hidden';

    QuiX.ui.Widget.call(this, params);

    this.div.className = 'scrollview';
    this.dir = params.dir || 'v';
    this._scx = 0;
    this._scy = 0;

    this._c = new QuiX.ui.Widget({
        width: 'auto',
        height: 'auto',
        minw: function(w) {
            return w.parent.getWidth(false);
        },
        minh: function(w) {
            return w.parent.getHeight(false);
        }
    });

    if (typeof this.div.style.webkitTransform !== 'undefined' && !window.adbuilder) {
        if (QuiX.ui.Effect.supports3d) {
            this.div.style.webkitTransform = 'translate3d(0,0,0)';
            this._c.div.style.webkitTransform = 'translate3d(0,0,0)';
        }
    }

    QuiX.ui.Widget.prototype.appendChild.call(this, this._c);

    this.attachEvent('onmousedown', QuiX.ui.ScrollView._startScroll);

    this._vs = new QuiX.ui.Widget({
        id: '_sb',
        border: 1,
        width: 5,
        bgcolor: '#999',
        opacity: .8
    });

    this._hs = new QuiX.ui.Widget({
        id: '_sb',
        border: 1,
        height: 5,
        bgcolor: '#999',
        opacity: .8
    });

    QuiX.ui.Widget.prototype.appendChild.call(this, this._vs);
    QuiX.ui.Widget.prototype.appendChild.call(this, this._hs);

    var self = this;

    function adjust(memo) {
        if (self.dir != 'h') {
            self._vs.left = self.getWidth(false, memo) - 6;
            self._vs.height = (self.getHeight(false, memo) / self._c.getHeight(true, memo)) * self.getHeight(false, memo) - ((self.dir != 'v')? 8:0);
        }
        if (self.dir != 'v') {
            self._hs.top = self.getHeight(false) - 6;
            self._hs.width = (self.getWidth(false, memo) / self._c.getWidth(true, memo)) * self.getWidth(false, memo) - ((self.dir != 'h')? 8:0);
        }
    }

    this.attachEvent('onload',
        function() {
            window.setTimeout(
                function() {
                    var memo = {};
                    adjust(memo);
                    if (self.dir != 'h') {
                        self._vs.redraw(false, memo);
                        self._vs.hide();
                    }
                    if (self.dir != 'v') {
                        self._hs.redraw(false, memo);
                        self._hs.hide();
                    }
                } ,0);
        });
    this._c.attachEvent('onresize',
        function() {
            window.setTimeout(
                function() {
                    var memo = {};
                    adjust(memo);
                    if (self.dir != 'h') {
                        self._vs.show();
                        self._vs.redraw(false, memo);
                    }
                    if (self.dir != 'v') {
                        self._hs.show();
                        self._hs.redraw(false, memo);
                    }
                    self._vs.hide();
                    self._hs.hide();
                    self.scrollTo(0, 0);
                } ,0);
        });
}

QuiX.constructors['scrollview'] = QuiX.ui.ScrollView;
QuiX.ui.ScrollView.prototype = new QuiX.ui.Widget;
QuiX.ui.ScrollView.prototype.__class__ = QuiX.ui.ScrollView;

QuiX.ui.ScrollView.prototype.appendChild = function(w /*, index*/) {
    var index = arguments[1] || null;
    this._c.appendChild(w, index);
}

QuiX.ui.ScrollView.prototype.getScrollOffset = function() {
    return [this._scx || 0, this._scy || 0];
}

QuiX.ui.ScrollView.prototype.scrollIntoView = function(w) {
    var offsetY = w.getTopOffsetFrom(this);
    if (this.dir == 'v') {
        this.scrollTo(0, offsetY - window.scrollY);
    }
}

QuiX.ui.ScrollView.prototype.scrollTo = function(x, y) {
    var txCss = QuiX.ui.Effect.cssTransform;

    if (txCss) {
        if (QuiX.ui.Effect.supports3d) {
            this._c.div.style[txCss] =
                'translate3d(' + (-x) + 'px,' + (-y) + 'px,0px)';
        }
        else {
            this._c.div.style[txCss] =
                'translate(' + (-x)+ 'px,' + (-y) + 'px)';
        }
    }
    else {
        this._c.moveTo(-(x<0? 0:x), -(y<0? 0:y));
    }

    this._scx = -x;
    this._scy = -y;
}

QuiX.ui.ScrollView.prototype._moveScrollBar = function(sb, perc) {
    var txCss = QuiX.ui.Effect.cssTransform;
    if (sb == 'v') {
        if (txCss) {
            if (QuiX.ui.Effect.supports3d) {
                this._vs.div.style[txCss] =
                    'translate3d(0px, ' + (perc * this._h) + 'px, 0px)';
            }
            else {
                this._vs.div.style[txCss] =
                    'translate(0, ' + (perc * this._h) + 'px)';
            }
        }
        else {
            this._vs.moveTo(this._vs.left, (perc * 100) + '%');
        }
    }
    else {
        if (txCss) {
            if (QuiX.ui.Effect.supports3d) {
                this._hs.div.style[txCss] =
                    'translate3d(' + (perc * this._w) + 'px,0px,0px)';
            }
            else {
                this._hs.div.style[txCss] =
                    'translate(' + (perc * this._w) + 'px,0px)';
            }
        }
        else {
            this._hs.moveTo((perc * 100) + '%', this._hs.top);
        }
    }
}

QuiX.ui.ScrollView._startScroll = function(evt, sv) {
    var memo = {},
        h = sv.getHeight(false, memo),
        w = sv.getWidth(false, memo),
        sh = sv._c.getHeight(true, memo),
        sw = sv._c.getWidth(true, memo);

    if (sh > h || sw > w) {
        var target = QuiX.getTarget(evt),
            source = QuiX.getWidget(target);

        QuiX.widget = sv;
        document.desktop.attachEvent('onmousemove', QuiX.ui.ScrollView._scroll);
        document.desktop.attachEvent('onmouseup', QuiX.ui.ScrollView._endScroll);

        QuiX.stopPropag(evt);
        if (target.tagName != 'INPUT' && target.tagName != 'TEXTAREA' 
                && target.tagName != 'SELECT' && target.tagName != 'IMG') {
            QuiX.cancelDefault(evt);
        }

        if (source == sv._vs) {
            sv._dir = 'v';
            sv._sb = true;
        }
        else if (source == sv._hs) {
            sv._dir = 'h';
            sv._sb = true;
        }
        else {
            sv._dir = sv.dir;
            sv._sb = false;
        }

        sv._sx = sv._scx || 0;
        sv._sy = sv._scy || 0;

        // cache dims
        sv._h = h;
        sv._w = w;
        sv._sh = sh;
        sv._sw = sw;
    }
}

QuiX.ui.ScrollView._scroll = function(evt, dt) {
    var coords = QuiX.getEventCoordinates(evt),
        offsetX = coords[0] - QuiX.startX,
        offsetY = coords[1] - QuiX.startY,
        sv = QuiX.widget,
        x = sv._sx,
        y = sv._sy;

    QuiX.stopPropag(evt);
    QuiX.cancelDefault(evt);

    if (sv._dir != 'h') {
        if (sv._sb) {
            y -= offsetY;
        }
        else {
            y += offsetY;
        }

        if (-y + sv._h >= sv._sh) {
            y = sv._h - sv._sh;
        }
        else if (y > 0) {
            y = 0;
        }

        if (sv._vs.isHidden()) {
            sv._vs.show();
        }

        var perc = (1 - (sv._h / (sv._h - y)));
        sv._moveScrollBar('v', perc);
    }

    if (sv._dir != 'v') {
        if (sv._sb) {
            x -= offsetX;
        }
        else {
            x += offsetX;
        }

        if (-x + sv._w >= sv._sw) {
            x = sv._w - sv._sw;
        }
        else if (x > 0) {
            x = 0;
        }

        if (sv._hs.isHidden()) {
            sv._hs.show();
        }

        var perc = (1 - (sv._w / (sv._w - x)));
        sv._moveScrollBar('h', perc);
    }

    sv.scrollTo(-x, -y);
}

QuiX.ui.ScrollView._endScroll = function(evt, dt) {
    QuiX.widget._vs.hide();
    QuiX.widget._hs.hide();
    dt.detachEvent('onmousemove', QuiX.ui.ScrollView._scroll);
    dt.detachEvent('onmouseup', QuiX.ui.ScrollView._endScroll);
}

// gauge

//QuiX.ui.Gauge = function(params) {
//    params.overflow = 'visible';
//
//    QuiX.ui.Widget.call(this, params);
//
//    this.div.className = 'gauge';
//    if (typeof this.div.style.webkitTransform !== 'undefined') {
//        this.div.style.webkitTransform = 'translate3d(0,0,0)';
//    }
//
//    this._img = new QuiX.ui.Image({
//        width: '100%',
//        height: '100%',
//        img: params.img
//    });
//    this.appendChild(this.img);
//
//    this.attachEvent('onmousedown', QuiX.ui.Gauge._startRotate);
//}
//
//QuiX.constructors['gauge'] = QuiX.ui.Gauge;
//QuiX.ui.Gauge.prototype = new QuiX.ui.Widget;
//QuiX.ui.Gauge.prototype.__class__ = QuiX.ui.Gauge;
//
//QuiX.ui.Gauge._startRotate = function(evt, g) {
//
//}
