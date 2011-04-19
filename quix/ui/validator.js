// validator

QuiX.ui.Validator = function(params) {
    this.element = params.widget;

    params.top = this._calculateTop;
    params.left = this._calculateLeft;

    this.rules = this.parseRules(params.rules);

    QuiX.ui.Label.call(this, params);

    this._val = null;
}

QuiX.ui.Validator.prototype = new QuiX.ui.Label;
QuiX.ui.Validator.prototype.__class__ = QuiX.ui.Validator;

QuiX.ui.Validator.rules = {
    "required": function(/*message*/) {
        var val = this.getValue(),
            message = arguments[0] || "The field is required";

        if (typeof(val) == 'undefined' || val === false){
            val = '';
        }
        return {
            error: (val.length == 0),
            message: message
        };
    },

    "maxLength": function(len /*, message*/) {
        var message = arguments[1] || "Maximum length allowed is " + len + " chars";
        return {
            error: this.getValue().length > len,
            message: message
        };
    },

    "minLength": function(len /*, message*/) {
        var message = arguments[1] || "Minimum length allowed is " + len + " chars";
        return {
            error: this.getValue().length < len,
            message: message
        };
    },

    "ajax": function(url, method, message) {
        if (this.getValue() != this._validator._val) {
            this._validator._val = this.getValue();

            var error = null,
                rpc = new QuiX.rpc.JSONRPCRequest(url, false),
                loader = this._validator._showLoader(),
                resp = rpc.callmethod(method, this.getValue());
            
            loader.destroy();

            return {error: !resp,
                    message: message};
        }
        else {
            return {error: false};
        }
    },

    "regex": function(rule, message) {
        var pattern = eval(rule);
        return {
            error: !pattern.test(this.getValue()),
            message: message
        };
    },

    "userFunc": function(f, message) {
        var func = QuiX.getEventListener(f);
        return {
            error: !func(this),
            message: message
        };
    },

    "equalFields": function(id, message) {
        var w = document.desktop.getWidgetById(id, false, 1),
            fieldsMatch = true;
        if (w.getValue() != '') {
            fieldsMatch = this.getValue() == w.getValue();
        }

        if (fieldsMatch) {
            w._validator.hideError();
        }
        return {
            error: !fieldsMatch,
            message: message
        };
    },

    "email": {
        type : "regex",
        args : ["/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$/",
                "Invalid email address"]
    },

    "onlyNumbers": {
        type: "regex",
        args: ["/^[0-9\ ]+$/", "Only numbers allowed"]
    }
}

QuiX.ui.Validator.prototype._calculateLeft = function() {
    return this.element.getScreenLeft();
}

QuiX.ui.Validator.prototype._calculateTop = function() {
    return this.element.getScreenTop() + this.element.getHeight();
}

QuiX.ui.Validator.prototype.onBeforeShow = function(){}

QuiX.ui.Validator.prototype.onAfterHide = function(){}

QuiX.ui.Validator.prototype.validate = function() {
    var message = null,
        self = this;

    var isValid = this.rules.each(
        function() {
            if (this.name == 'optional') {
                return !(self.element.getValue() == '')
            }

            var ret, _rule,
            args = this.args;

            _rule = QuiX.ui.Validator.rules[this.name];

            if ('type' in _rule) {
                args = _rule.args;
                _rule = QuiX.ui.Validator.rules[_rule.type];
            }

            ret = _rule.apply(self.element, args);

            if (ret.error) {
                message = ret.message;
                return false;
            }
            return true;
        });

    if (!isValid) {
        this.displayError(message);
        return true;
    }
    else {
        this.hideError();
        return false;
    }
}

QuiX.ui.Validator.prototype.loaderImage = QuiX.getThemeUrl() + 'images/loader.gif';

QuiX.ui.Validator.prototype._showLoader = function() {
    var url = this.loaderImage,
        self = this,
        image = new QuiX.Image(url);
    var ld = new QuiX.ui.Image({
        img : url
    });
    image.load(
        function(){
            ld.width = this.width;
            ld.height = this.height;
            ld.left = (self.element.getScreenLeft() + self.element.getWidth()) - this.width;
            ld.top = self.element.getScreenTop() + (self.element.getHeight() - this.height) / 2;
            document.desktop.appendChild(ld);
            ld.redraw();
        });
    return ld;
}

QuiX.ui.Validator.prototype.displayError = function(message) {
    this.onBeforeShow();
    this.setCaption(message);

    if (!this.parent) {
        document.desktop.appendChild(this);
    }
    this.show();
    this.redraw();
}

QuiX.ui.Validator.prototype.hideError = function() {
    this.hide();
    this.onAfterHide();
}

QuiX.ui.Validator.prototype.parseRules = function(rules) {
    var _rules = [];
    var result= rules.split(',');

    result.each(
        function(i){
            var rulesRegExp = /\((.*)\)/,
                getRules = rulesRegExp.exec(this),
                str = null;

            if (getRules == null) {
                _rules.push({
                    name : this.toString(),
                    args : []
                });
            }
            else {
                str = getRules[1];
                var prefix = /(.*)\((?:.*)\)/.exec(this);
                _rules.push({
                    name : prefix[1],
                    args : str.split('|')
                });
            }
        });

    return _rules;
}
