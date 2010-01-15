/************************
Timer widget
************************/
QuiX.ui.Timer = function(/*params*/) {
	var params = arguments[0] || {};

	this.base = QuiX.ui.Widget;
	this.base(params);
	
	this.div.style.cursor = 'default';
	
	this._timerid = null;
	this.timeout = null;
	this.interval = null;
	
	this.handler = params.handler;

	if (params.timeout)
		this.timeout = parseInt(params.timeout);
	else if (params.interval)
		this.interval = parseInt(params.interval);

	this.auto = (params.auto==true || params.auto=='true');
	
	if (this.auto) {
		if (this.interval) {
			var h = QuiX.getEventListener(this.handler);
			if (h)
				h(this);
		}
		this.start();
	}
}

QuiX.constructors['timer'] = QuiX.ui.Timer;
QuiX.ui.Timer.prototype = new QuiX.ui.Widget;
// backwards compatibility
var Timer = QuiX.ui.Timer;

QuiX.ui.Timer.prototype.start = function() {
	if (!this._timerid) {
		var oTimer = this;
		var handler_func = QuiX.getEventListener(this.handler);
		var _handler = function() {
			if (oTimer.timeout) {
				this._timerid = null;
			}
			if (handler_func)
				handler_func(oTimer);
		}
		if (this.timeout)
			this._timerid = window.setTimeout(_handler, this.timeout);
		else
			this._timerid = window.setInterval(_handler, this.interval);
	}
}

QuiX.ui.Timer.prototype.stop = function() {
	if (this._timerid) {
		if (this.timeout)
			window.clearTimeout(this._timerid);
		else
			window.clearInterval(this._timerid);
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

/************************
Effect widget
************************/
QuiX.ui.Effect = function(/*params*/) {
	var params = arguments[0] || {};
	params.display = 'none';
	params.handler = this._handler;
	params.interval = params.interval || 50;

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
	this._step = 0;
	this._reverse = false;
	this.base = QuiX.ui.Timer;
	this.base(params);
}

QuiX.constructors['effect'] = QuiX.ui.Effect;
QuiX.ui.Effect.prototype = new QuiX.ui.Timer;
// backwards compatibility
var Effect = QuiX.ui.Effect;

QuiX.ui.Effect.prototype.customEvents =
	QuiX.ui.Timer.prototype.customEvents.concat(['oncomplete']);

QuiX.ui.Effect.prototype._apply = function(wd) {
	// calculate value
	var value, begin, end;
	var stepping = 0;
	switch (this.type) {
		case 'slide-x':
		case 'slide-y':
			var f = (this.type=='slide-x')?'_calcLeft':'_calcTop';
			var v = (this.type=='slide-x')?'left':'top';
			this.parent[v] = this.begin;
			begin = this.parent[f]();
			this.parent[v] = this.end;
			end = this.parent[f]();
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

	stepping = (end - begin) / this.steps;
	if (this._step == this.steps) {
		if (this._reverse)
			value = this.begin;
		else
			value = this.end;
	}
	else
		value = begin + (stepping * this._step);

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
					h = wd._calcHeight(true);
					wd.div.style.clip = 'rect(auto,auto,' +
										parseInt(h * value) + 'px,auto)';
					break;
				case 'e':
					w = wd._calcWidth(true);
					wd.div.style.clip = 'rect(auto,' +
										parseInt(w * value) + 'px,auto,auto)';
					break;

			}
			break;
		case 'wipe-out':
			if (this.direction == 'n') {
				h = wd.getHeight(true);
				wd.div.style.clip = 'rect(auto,auto,' +
									parseInt(h * value) + 'px,auto)';
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

QuiX.ui.Effect.prototype.stop = function() {
	if (this._timerid) {
		QuiX.ui.Timer.prototype.stop.apply(this, arguments);
		switch (this.type) {
			case 'wipe-in':
				var ev = this._reverse?this.begin:this.end;
				if (ev==1)
					if (QuiX.utils.BrowserInfo.family == 'ie')
                        this.parent.div.style.cssText =
                            this.parent.div.style.cssText.replace(/CLIP:.*?;/i, '');
					else
						this.parent.div.style.clip = '';
		}
		this._step = 0;
		if (this._customRegistry.oncomplete)
			this._customRegistry.oncomplete(this);
	}
}

QuiX.ui.Effect.prototype.show = function() {}

QuiX.ui.Effect.prototype.play = function(reverse) {
	this._reverse = reverse;
	this._handler(this);
	if (this.parent) this.start();
}

QuiX.ui.Effect.prototype._handler = function(effect) {
	var w = effect.parent;
	if (w) {
		effect._apply(w);
		if (effect._step > effect.steps)
			effect.stop();
	}
}
