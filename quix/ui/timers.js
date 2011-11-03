
// timer

QuiX.ui.Timer = function(/*params*/) {
    var params = arguments[0] || {};

    QuiX.ui.Widget.call(this, params);
    
    this.div.style.cursor = 'default';

    this._timerid = null;
    this.timeout = null;
    this.interval = null;

    this.handler = params.handler;

    if (params.timeout) {
        this.timeout = parseInt(params.timeout);
    }
    else if (params.interval) {
        this.interval = parseInt(params.interval);
    }

    this.auto = (params.auto == true || params.auto == 'true');
    
    if (this.auto) {
        if (this.interval) {
            var h = QuiX.getEventListener(this.handler);
            if (h) {
                h(this);
            }
        }
        this.start();
    }
}

QuiX.constructors['timer'] = QuiX.ui.Timer;
QuiX.ui.Timer.prototype = new QuiX.ui.Widget;
QuiX.ui.Timer.prototype.__class__ = QuiX.ui.Timer;

QuiX.ui.Timer.prototype.start = function() {
    if (!this._timerid) {
        var self = this,
            handler_func = QuiX.getEventListener(this.handler);

        var _handler = function() {
            if (self.timeout) {
                this._timerid = null;
            }
            if (handler_func) {
                handler_func(self);
            }
        }
        if (this.timeout) {
            this._timerid = window.setTimeout(_handler, this.timeout);
        }
        else {
            this._timerid = window.setInterval(_handler, this.interval);
        }
    }
}

QuiX.ui.Timer.prototype.stop = function() {
    if (this._timerid) {
        if (this.timeout) {
            window.clearTimeout(this._timerid);
        }
        else {
            window.clearInterval(this._timerid);
        }
        this._timerid = null;
    }
}

QuiX.ui.Timer.prototype.isRunning = function() {
    return (this._timerid != null);
} 

QuiX.ui.Timer.prototype._detachEvents = function() {
    this.stop();
    QuiX.ui.Widget.prototype._detachEvents.apply(this, arguments);
}

// effect widget

QuiX.ui.Effect = function(/*params*/) {
    var params = arguments[0] || {},
        auto = params.auto;
    params.display = 'none';
    params.handler = QuiX.ui.Effect._handler;
    params.interval = params.interval || 50;
    params.auto = false;

    this.type = params.type;
    switch (this.type) {
        case 'fade-in':
            this.begin = parseFloat(params.begin) || 0.0;
            this.end = parseFloat(params.end) || 1.0;
            break;
        case 'fade-out':
            this.begin = parseFloat(params.begin) || 1.0;
            this.end = parseFloat(params.end) || 0.0;
            break;
        case 'wipe-out':
            this.direction = params.direction || 'n';
            this.begin = parseFloat(params.begin) || 1.0;
            this.end = parseFloat(params.end) || 0.0;
            break;
        case 'wipe-in':
            this.direction = params.direction || 's';
            this.begin = parseFloat(params.begin) || 0.0;
            this.end = parseFloat(params.end) || 1.0;
            break;
        case 'slide-y':
        case 'slide-x':
            this.begin = (typeof params.begin == 'undefined')? '100%':params.begin;
            this.end = params.end || 0;
            break;
    }

    this.steps = parseInt(params.steps) || 5;
    // ease animations as default
    this.ease = params.ease || 'ease';
    this._step = 0;
    this._reverse = false;
    this.playing = false;
    this.useTimers = (params.usetimers == 'true' || params.usetimers == true);

    QuiX.ui.Timer.call(this, params);

    this.auto = (auto == true || auto == 'true');
    if (this.auto) {
        var self = this;
        window.setTimeout(
            function() {
                self.play();
            }, 0);
    }
}

QuiX.ui.Effect.cssTransition = QuiX.getCssAttribute('transition');
QuiX.ui.Effect.cssTransform = QuiX.getCssAttribute('transform');

QuiX.constructors['effect'] = QuiX.ui.Effect;
QuiX.ui.Effect.prototype = new QuiX.ui.Timer;
QuiX.ui.Effect.prototype.__class__ = QuiX.ui.Effect;

QuiX.ui.Effect.prototype.customEvents =
    QuiX.ui.Timer.prototype.customEvents.concat(['oncomplete']);

QuiX.ui.Effect.easePresets = {
    'ease': [0.25, 0.1, 0.25, 1.0],
    'linear': [0.0, 0.0, 1.0, 1.0],
    'ease-in': [0.42, 0.0, 1.0, 1.0],
    'ease-out': [0.0, 0.0, 0.58, 1.0],
    'ease-in-out': [0.42, 0.0, 0.58, 1.0]
};

QuiX.ui.Effect.supports3d = (function() {
    if (!document.body) {
        setTimeout(arguments.callee, 250);
        return false;
    }

    // borrowed from modernizr
    var div = ce('div'),
        ret = false,
        properties = ['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];

    for (var i=properties.length - 1; i>=0; i--) {
        ret = ret? ret:div.style[properties[i]] != undefined;
    };

    // webkit has 3d transforms disabled for chrome, though
    // it works fine in safari on leopard and snow leopard
    // as a result, it 'recognizes' the syntax and throws a false positive
    // thus we must do a more thorough check:
    if (ret) {
        var st = ce('style');
        // webkit allows this media query to succeed only if the feature is enabled.    
        // "@media (transform-3d),(-o-transform-3d),(-moz-transform-3d),(-ms-transform-3d),(-webkit-transform-3d),(modernizr){#modernizr{height:3px}}"
        st.textContent = '@media (-webkit-transform-3d){#test3d{height:3px}}';
        document.getElementsByTagName('head')[0].appendChild(st);
        div.id = 'test3d';
        document.body.appendChild(div);
        ret = div.offsetHeight === 3;

        QuiX.removeNode(st);
        QuiX.removeNode(div);
    }
    return ret;
})();

QuiX.ui.Effect._getTransitionEndEvent = function() {
    var evt_name = null,
        e = 'TransitionEnd',
        l = e.toLowerCase();

    if (('on' + l) in window) {
        evt_name = 'on' + l;
    }
    else if (('onwebkit' + l) in window) {
        // Chrome/Saf (+ Mobile Saf)/Android
        evt_name = 'onwebkit' + e;
    }
    else if (('ono' + l) in document.body ||
            (QuiX.utils.BrowserInfo.browser == 'Opera' &&
             QuiX.utils.BrowserInfo.version >= 10.61)) {
        // Opera
        // As of Opera 10.61, there is no "onotransitionend" property added to DOM elements,
        // so it will always use the navigator.appName fallback
        evt_name = 'ono' + e;
    }
    else if (QuiX.utils.BrowserInfo.browser == 'Firefox' &&
             QuiX.utils.BrowserInfo.version >= 4) {
        return 'on' + l;
    }

    return evt_name;
}

QuiX.ui.Effect.prototype._getRange = function(wd) {
    var begin, end;
    switch (this.type) {
        case 'slide-x':
        case 'slide-y':
            var f = (this.type == 'slide-x')? '_calcLeft':'_calcTop',
                v = (this.type == 'slide-x')? 'left':'top',
                cur = wd[v];

            wd[v] = this.begin;
            begin = wd[f]();
            wd[v] = this.end;
            end = wd[f]();
            wd[v] = cur;
            break;

        default:
            begin = this.begin;
            end = this.end;
    }

    if (this._reverse) {
        var tmp = begin;
        begin = end;
        end = tmp;
    }

    return [begin, end];
}

QuiX.ui.Effect.cubicBezierAtTime = function (t, p1x, p1y, p2x, p2y) {
    var ax=0,bx=0,cx=0,ay=0,by=0,cy=0;
    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
    function sampleCurveX(t) {return ((ax*t+bx)*t+cx)*t;};
    function sampleCurveY(t) {return ((ay*t+by)*t+cy)*t;};
    function sampleCurveDerivativeX(t) {return (3.0*ax*t+2.0*bx)*t+cx;};
    // The epsilon value to pass given that the animation is going to run over |dur| seconds. The longer the
    // animation, the more precision is needed in the timing function result to avoid ugly discontinuities.
    function solve(x,epsilon) {return sampleCurveY(solveCurveX(x,epsilon));};
    // Given an x value, find a parametric value it came from.
    function solveCurveX(x,epsilon) {var t0,t1,t2,x2,d2,i;
        function fabs(n) {if(n>=0) {return n;}else {return 0-n;}}; 
        // First try a few iterations of Newton's method -- normally very fast.
        for(t2=x, i=0; i<8; i++) {x2=sampleCurveX(t2)-x; if(fabs(x2)<epsilon) {return t2;} d2=sampleCurveDerivativeX(t2); if(fabs(d2)<1e-6) {break;} t2=t2-x2/d2;}
        // Fall back to the bisection method for reliability.
        t0=0.0; t1=1.0; t2=x; if(t2<t0) {return t0;} if(t2>t1) {return t1;}
        while(t0<t1) {x2=sampleCurveX(t2); if(fabs(x2-x)<epsilon) {return t2;} if(x>x2) {t0=t2;}else {t1=t2;} t2=(t1-t0)*.5+t0;}
        return t2; // Failure.
    };
    // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
    cx=3.0*p1x; bx=3.0*(p2x-p1x)-cx; ax=1.0-cx-bx; cy=3.0*p1y; by=3.0*(p2y-p1y)-cy; ay=1.0-cy-by;
    // Convert from input time to parametric value in curve, then from that to output time.
    return Math.abs(solve(t, 0.00005));
};

QuiX.ui.Effect.prototype._apply = function(wd) {
    // calculate value
    var value,
        range = this._getRange(wd);
        begin = range[0],
        end = range[1],
        stepping = 0;

    if (this._step == this.steps) {
        if (this._reverse) {
            value = this.begin;
        }
        else {
            value = this.end;
        }
    }
    else if (this._step == 0) {
        if (this._reverse) {
            value = this.end;
        }
        else {
            value = this.begin;
        }
    }
    else {
        value = begin +
                ((end - begin) *
                 QuiX.ui.Effect.cubicBezierAtTime.apply(null, [this._step/this.steps].concat(QuiX.ui.Effect.easePresets[this.ease])));
    }

    var h, w;
    // apply value
    switch (this.type) {
        case 'fade-in':
        case 'fade-out':
            wd.setOpacity(Math.round(value * 100) / 100);
            break;
        case 'wipe-in':
            switch (this.direction) {
                case 's':
                    h = wd.div.offsetHeight;
                    wd.div.style.clip = 'rect(auto, auto, ' +
                                        parseInt(h * value) + 'px, auto)';
                    break;
                case 'e':
                    w = wd.div.offsetWidth;
                    wd.div.style.clip = 'rect(auto, ' +
                                        parseInt(w * value) + 'px, auto, auto)';
                    break;

            }
            break;
        case 'wipe-out':
            if (this.direction == 'n') {
                h = wd.div.offsetHeight;
                wd.div.style.clip = 'rect(auto, auto, ' +
                                    parseInt(h * value) + 'px, auto)';
            }
            break;
        case 'slide-x':
            wd.moveTo(value, wd.top);
            break;
        case 'slide-y':
            wd.moveTo(wd.left, value);
    }
    this._step++;
}

QuiX.ui.Effect.prototype._apply_css_effect = function(wd) {
    var duration = this.steps * this.interval,
        evtTransitionEnd = QuiX.ui.Effect._getTransitionEndEvent(),
        self = this,
        transition;

    transition = duration + 'ms ' + this.ease;

    if (evtTransitionEnd) {
        QuiX.addEvent(wd.div, evtTransitionEnd,
            function _ontransitionend() {
                // detach event
                QuiX.removeEvent(this, evtTransitionEnd, _ontransitionend);
                self.stop();
            });
    }
    else {
        //TODO: IE9 assign timeout?
    }

    if (QuiX.utils.BrowserInfo.family == 'op') {
        this._setCssTransition(wd, transition);
    }

    window.setTimeout(
        function() {
            if (QuiX.utils.BrowserInfo.family != 'op') {
                self._setCssTransition(wd, transition);
            }
            if (self.type.slice(0,5) == 'slide') {
                // use transforms
                var range = self._getRange(wd),
                    tx;

                if (self.type == 'slide-x') {
                    tx = (range[1] - range[0]) + 'px,0px';
                }
                else if (self.type == 'slide-y') {
                    tx = '0px,' + (range[1] - range[0]) + 'px';
                }
                if (QuiX.ui.Effect.supports3d) {
                    wd.div.style[QuiX.ui.Effect.cssTransform] =
                        'translate3d(' + tx + ',0px)';
                }
                else {
                    wd.div.style[QuiX.ui.Effect.cssTransform] =
                        'translate(' + tx  + ')';
                }
            }
            else {
                self._step = self.steps;
                self._apply(wd);
                self._step = 1;
            }
        }, 0);
}

QuiX.ui.Effect.prototype._setCssTransition = function(wd, t) {
    switch (this.type) {
        case 'slide-x':
            wd.div.style[QuiX.ui.Effect.cssTransition] = 'all ' + t;
            break;
        case 'slide-y':
            wd.div.style[QuiX.ui.Effect.cssTransition] = 'all ' + t;
            break;
        case 'fade-in':
        case 'fade-out':
            wd.div.style[QuiX.ui.Effect.cssTransition] = 'opacity ' + t;
            break;
        case 'wipe-in':
        case 'wipe-out':
            wd.div.style[QuiX.ui.Effect.cssTransition] = 'clip ' + t;
    }
}

QuiX.ui.Effect.prototype.stop = function() {
    var wd = this._w || this.parent;

    if (QuiX.ui.Effect.cssTransition) {
        wd.div.style[QuiX.ui.Effect.cssTransition] = '';
    }

    if (this._timerid) {
        QuiX.ui.Timer.prototype.stop.apply(this, arguments);
    }

    if (this.playing) {
        this.playing =false;
        if (this._step < this.steps) {
            // move to end
            this._step = this.steps;
            this._apply(wd);
        }
        switch (this.type) {
            case 'wipe-in':
                var ev = this._reverse? this.begin:this.end;
                if (ev == 1) {
                    if (QuiX.utils.BrowserInfo.family == 'ie') {
                        with (wd.div.style) {
                            cssText = cssText.replace(/CLIP.*?:.*?;/ig, '');
                        }
                    }
                    else {
                        wd.div.style.clip = '';
                    }
                }
                break;
            case 'slide-x':
            case 'slide-y':
                if (QuiX.ui.Effect.cssTransition) {
                    // restore x and y coordinates
                    if (QuiX.ui.Effect.supports3d) {
                        wd.div.style[QuiX.ui.Effect.cssTransform] = 'translate3d(0px,0px,0px)';
                    }
                    else {
                        wd.div.style[QuiX.ui.Effect.cssTransform] = 'translate(0px,0px)';
                    }
                }
                break;
        }
        this._step = 0;
        this.trigger('oncomplete');
    }
}

QuiX.ui.Effect.prototype.show = function() {}

QuiX.ui.Effect.prototype.play = function(/*reverse, widget*/) {
    this._reverse = (typeof arguments[0] != 'undefined')? arguments[0]:false;
    this._w = arguments[1] || null;
    var wd = this._w || this.parent;
    if (wd) {
        //QuiX.ui.Effect._handler(this);
        if (document.all && this.type.slice(0,4) == 'fade') {
            wd.hide();
        }
        this._apply(wd);
        if (document.all && this.type.slice(0,4) == 'fade') {
            wd.show();
        }

        // check if css transitions are in place
        if (!this.useTimers && QuiX.ui.Effect.cssTransition &&
                !(QuiX.supportTouches && !QuiX.ui.Effect.supports3d) &&
                // safari and opera do not animate css clip
                // chrome does
                (!((QuiX.utils.BrowserInfo.browser == 'Safari' ||
                    QuiX.utils.BrowserInfo.browser == 'Opera') &&
                   this.type.slice(0, 4) == 'wipe'))) {
            this._apply_css_effect(wd);
        }
        else {
            // if css transitions are not in place
            // use timers
            this.start();
        }
        this.playing = true;
    }
}

QuiX.ui.Effect._handler = function(effect) {
    var w = effect._w || effect.parent;
    if (w) {
        if (effect._step > effect.steps) {
            effect.stop();
        }
        else {
            effect._apply(w);
        }
    }
}
