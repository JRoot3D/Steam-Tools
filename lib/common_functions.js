// ==UserScript==
// @name         Common functions
// @author       JRoot3D
// ==/UserScript==

var CF_VERSION = 0.9;

function CF_addStyle(name) {
    var style = GM_getResourceText(name);
    GM_addStyle(style);
}

var _menuCommand = function(trueCaption, falseCaption, flag, callback) {
    var _flag, _callback;
    var _id;
    var _trueCaption, _falseCaption;

    function switchCommand() {
        if (_flag) {
            GM_unregisterMenuCommand(_id);
            _id = GM_registerMenuCommand(_trueCaption, switchCommand);
        } else {
            GM_unregisterMenuCommand(_id);
            _id = GM_registerMenuCommand(_falseCaption, switchCommand);
        }

        _flag = !_flag;

        if (_callback) {
            _callback.call(this, _flag);
        }
    }

    this.init = function(trueCaption, falseCaption, flag, callback) {
        _callback = callback;
        _trueCaption = trueCaption;
        _falseCaption = falseCaption;
        this.setMenuState(flag);
    };

    this.setMenuState = function(flag) {
        _flag = flag;
        this.unregister();
        if (flag) {
            _id = GM_registerMenuCommand(_falseCaption, switchCommand);
        } else {
            _id = GM_registerMenuCommand(_trueCaption, switchCommand);
        }
    };

    this.getFlag = function() {
        return _flag;
    };

    this.unregister = function() {
        GM_unregisterMenuCommand(_id);
        _id = undefined;
    };

    this.setCallback = function(value) {
        _callback = value;
    };

    this.init(trueCaption, falseCaption, flag, callback);
};

function CF_registerCheckBoxMenuCommand(caption, flag, callback) {
    return new _menuCommand('☐ ' + caption, '☑ ' + caption, flag, callback);
}

function CF_registerSwitcherMenuCommand(trueCaption, falseCaption, flag, callback) {
    return new _menuCommand(trueCaption, falseCaption, flag, callback);
}

var _valueObject = function(name, defaultValue, tag) {
    var _name, _defaultValue, _tag;
    var _valueChangeListener;
    var _valueChangeListenerId;

    this.set = function(value) {
        GM_setValue(_name, value);
    };

    this.get = function(value) {
        if (value) {
            return GM_getValue(_name, value);
        }
        return GM_getValue(_name, _defaultValue);
    };

    this.addListener = function(listener) {
        _valueChangeListener = listener;
        _valueChangeListenerId = GM_addValueChangeListener(_name, function(name, old_value, new_value, remote) {
            _valueChangeListener.call(this, name, new_value, _tag, old_value, remote);
        });
    };

    this.removeListener = function() {
        GM_removeValueChangeListener(_valueChangeListenerId);
    };

    this.getTag = function() {
        return _tag;
    };

    this.init = function(name, defaultValue, tag) {
        _name = name;
        _defaultValue = defaultValue;
        _tag = tag;
    };

    this.init(name, defaultValue, tag);
};

function CF_value(name, defaultValue, tag) {
    return new _valueObject(name, defaultValue, tag);
}

function CF_checkVersion(version) {
    var result = version <= CF_VERSION;
    if (!result) {
        GM_log('Wrong version, need CF v' + version);
    }
    return result;
}
