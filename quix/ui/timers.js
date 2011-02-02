
// timer

QuiX.ui.Timer = function(/*params*/) {
    var params = arguments[0] || {};

    this.base = QuiX.ui.Widget;
    this.base(params);
    
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
            this.begin = params.begin || '100%';
            this.end = params.end || 0;
            break;

    }

    this.steps = parseInt(params.steps) || 5;
    // linear animations as default
    this.ease = parseFloat(params.ease) || 1;
    this._step = 0;
    this._reverse = false;
    this.base = QuiX.ui.Timer;
    this.base(params);

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

QuiX.constructors['effect'] = QuiX.ui.Effect;
QuiX.ui.Effect.prototype = new QuiX.ui.Timer;

QuiX.ui.Effect.prototype.customEvents =
    QuiX.ui.Timer.prototype.customEvents.concat(['oncomplete']);

QuiX.ui.Effect.prototype._getRange = function(wd) {
    var begin, end;
    switch (this.type) {
        case 'slide-x':
        case 'slide-y':
            var f = (this.type == 'slide-x')? '_calcLeft':'_calcTop',
                v = (this.type == 'slide-x')? 'left':'top';

            wd[v] = this.begin;
            begin = wd[f]();
            wd[v] = this.end;
            end = wd[f]();
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
    else {
        value = begin +
                (Math.pow(((1 / this.steps) * this._step),
                          this.ease) * (end - begin));
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
        evtTransitionEnd = QuiX.getEventName('TransitionEnd'),
        self = this,
        transition;

    // TODO: asign ease attribute
    transition = duration + 'ms ease';

    if (evtTransitionEnd) {
        QuiX.addEvent(wd.div, evtTransitionEnd,
            function _ontransitionend() {
                // clear css attrs
                this.style[QuiX.ui.Effect.cssTransition] = '';
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
            self._step = self.steps;
            if (self.type.slice(0,5) == 'slide') {
                // use transforms
                var range = self._getRange(wd);
                if (self.type == 'slide-x') {
                    wd.div.style[QuiX.getCssAttribute('transform')] =
                        'translate(' + (range[1] - range[0]) + 'px,0px)';
                }
                else if (self.type == 'slide-y') {
                    wd.div.style[QuiX.getCssAttribute('transform')] =
                        'translate(0px,' + (range[1] - range[0]) + 'px)';
                }
            }
            else {
                self._apply(wd);
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

    if (this._timerid) {
        QuiX.ui.Timer.prototype.stop.apply(this, arguments);
    }
    if (this._step >= this.steps) {
        // completed
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
                    this._apply(wd);
                    wd.div.style[QuiX.getCssAttribute('transform')] = '';
                }
        }
        this._step = 0;
        if (this._customRegistry.oncomplete) {
            this._customRegistry.oncomplete(this);
        }
    }
}

QuiX.ui.Effect.prototype.show = function() {}

QuiX.ui.Effect.prototype.play = function(/*reverse, widget*/) {
    this._reverse = arguments[0] || false;
    this._w = arguments[1] || null;

    var wd = this._w || this.parent;
    if (wd) {
        //QuiX.ui.Effect._handler(this);
        this._apply(wd);
        // check if css transitions are in place
        if (QuiX.ui.Effect.cssTransition &&
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
