(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.insignia = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var dom = require('./dom');
var text = require('./text');
var props = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent', 'webkitBoxSizing', 'mozBoxSizing', 'boxSizing', 'padding', 'border'];
var offset = 20;

module.exports = function factory(el) {
  var mirror = dom('span');

  document.body.appendChild(mirror);
  remap();
  bind();

  return {
    remap: remap,
    refresh: refresh,
    destroy: destroy
  };

  function remap() {
    var c = computed();
    var value;
    var i;
    for (i = 0; i < props.length; i++) {
      value = c[props[i]];
      if (value !== void 0 && value !== null) {
        // otherwise IE blows up
        mirror.style[props[i]] = value;
      }
    }
    mirror.disabled = 'disabled';
    mirror.style.whiteSpace = 'pre';
    mirror.style.position = 'absolute';
    mirror.style.top = mirror.style.left = '-9999em';
  }

  function refresh() {
    var value = el.value;
    if (value === mirror.value) {
      return;
    }

    text(mirror, value);

    var width = mirror.offsetWidth + offset;

    el.style.width = width + 'px';
  }

  function bind(remove) {
    var op = remove ? 'remove' : 'add';
    crossvent[op](el, 'keydown', refresh);
    crossvent[op](el, 'keyup', refresh);
    crossvent[op](el, 'input', refresh);
    crossvent[op](el, 'paste', refresh);
    crossvent[op](el, 'change', refresh);
  }

  function destroy() {
    bind(true);
    mirror.parentElement.removeChild(mirror);
    el.style.width = '';
  }

  function computed() {
    if (window.getComputedStyle) {
      return window.getComputedStyle(el);
    }
    return el.currentStyle;
  }
};

},{"./dom":2,"./text":12,"crossvent":7}],2:[function(require,module,exports){
'use strict';

module.exports = function dom(tagName, classes) {
  var el = document.createElement(tagName);
  if (classes) {
    el.className = classes;
  }
  return el;
};

},{}],3:[function(require,module,exports){
'use strict';

var _sell = require('sell');

var _sell2 = _interopRequireDefault(_sell);

var _crossvent = require('crossvent');

var _crossvent2 = _interopRequireDefault(_crossvent);

var _emitter = require('contra/emitter');

var _emitter2 = _interopRequireDefault(_emitter);

var _dom = require('./dom');

var _dom2 = _interopRequireDefault(_dom);

var _text = require('./text');

var _text2 = _interopRequireDefault(_text);

var _autosize = require('./autosize');

var _autosize2 = _interopRequireDefault(_autosize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var inputTag = /^input$/i;
var ELEMENT = 1;
var BACKSPACE = 8;
var END = 35;
var HOME = 36;
var LEFT = 37;
var RIGHT = 39;
var sinkableKeys = [END, HOME];
var tagClass = /\bnsg-tag\b/;
var tagRemovalClass = /\bnsg-tag-remove\b/;
var editorClass = /\bnsg-editor\b/g;
var inputClass = /\bnsg-input\b/g;
var end = { start: 'end', end: 'end' };
var defaultDelimiter = ' ';

function insignia(el) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var currentValues = [];
  var o = options;
  var delimiter = o.delimiter || defaultDelimiter;
  if (delimiter.length !== 1) {
    throw new Error('insignia expected a single-character delimiter string');
  }
  var any = hasSiblings(el);
  if (any || !inputTag.test(el.tagName)) {
    throw new Error('insignia expected an input element without any siblings');
  }
  var free = o.free !== false;
  var validate = o.validate || defaultValidate;
  var render = o.render || defaultRenderer;
  var convertOnBlur = o.convertOnBlur !== false;

  var toItemData = defaultToItemData;

  var userGetText = o.getText;
  var userGetValue = o.getValue;
  var getText = typeof userGetText === 'string' ? function (d) {
    return d[userGetText];
  } : typeof userGetText === 'function' ? userGetText : function (d) {
    return d.toString();
  };
  var getValue = typeof userGetValue === 'string' ? function (d) {
    return d[userGetValue];
  } : typeof userGetValue === 'function' ? userGetValue : function (d) {
    return d;
  };

  var before = (0, _dom2.default)('span', 'nsg-tags nsg-tags-before');
  var after = (0, _dom2.default)('span', 'nsg-tags nsg-tags-after');
  var parent = el.parentElement;
  var blurblock = tick();

  el.className += ' nsg-input';
  parent.className += ' nsg-editor';
  parent.insertBefore(before, el);
  parent.insertBefore(after, el.nextSibling);

  var shrinker = (0, _autosize2.default)(el);
  var api = (0, _emitter2.default)({
    addItem: addItem,
    findItem: function findItem(data) {
      return _findItem(data);
    },
    findItemIndex: function findItemIndex(data) {
      return _findItemIndex(data);
    },
    findItemByElement: function findItemByElement(el) {
      return _findItem(el, 'el');
    },
    removeItem: removeItemByData,
    removeItemByElement: removeItemByElement,
    value: readValue,
    allValues: readValueAll,
    refresh: convert,
    destroy: destroy
  });

  var placeholder = el.getAttribute('placeholder');
  var placeheld = true;

  bind();

  (document.activeElement === el ? evaluateSelect : evaluateNoSelect)([delimiter], true);

  return api;

  function _findItem(value) {
    var prop = arguments.length <= 1 || arguments[1] === undefined ? 'data' : arguments[1];

    var comp = prop === 'data' ? function (item) {
      return getValue(item[prop]) === getValue(value);
    } : function (item) {
      return item[prop] === value;
    };
    for (var i = 0; i < currentValues.length; i++) {
      if (comp(currentValues[i])) {
        return currentValues[i];
      }
    }
    return null;
  }

  function _findItemIndex(value) {
    var prop = arguments.length <= 1 || arguments[1] === undefined ? 'data' : arguments[1];

    var comp = prop === 'data' ? function (item) {
      return getValue(item[prop]) === getValue(value);
    } : function (item) {
      return item[prop] === value;
    };
    for (var i = 0; i < currentValues.length; i++) {
      if (comp(currentValues[i])) {
        return i;
      }
    }
    return null;
  }

  function addItem(data) {
    var valid = validate(data);
    var item = { data: data, valid: valid };
    if (o.preventInvalid && !valid) {
      return api;
    }
    var el = renderItem(item);
    if (!el) {
      return api;
    }
    item.el = el;
    currentValues.push(item);
    api.emit('add', data, el);
    invalidate();
    return api;
  }

  function removeItem(item) {
    if (!item) {
      return api;
    }
    removeItemElement(item.el);
    currentValues.splice(currentValues.indexOf(item), 1);
    api.emit('remove', item.data);
    invalidate();
    return api;
  }

  function invalidate() {
    currentValues.slice().forEach(function (v, i) {
      currentValues.splice(i, 1);

      var valid = validate(v.data, i);
      if (valid) {
        v.el.classList.add('nsg-valid');
        v.el.classList.remove('nsg-invalid');
      } else {
        v.el.classList.add('nsg-invalid');
        v.el.classList.remove('nsg-valid');
        api.emit('invalid', v.data, v.el);
      }
      v.valid = valid;

      currentValues.splice(i, 0, v);
    });
  }

  function removeItemByData(data) {
    return removeItem(_findItem(data));
  }

  function removeItemByElement(el) {
    return removeItem(_findItem(el, 'el'));
  }

  function renderItem(item) {
    return createTag(before, item);
  }

  function removeItemElement(el) {
    if (el.parentElement) {
      el.parentElement.removeChild(el);
    }
  }

  function createTag(buffer, item) {
    var data = item.data;

    var empty = typeof data === 'string' && data.trim().length === 0;
    if (empty) {
      return null;
    }
    var el = (0, _dom2.default)('span', 'nsg-tag');
    render(el, item);
    if (o.deletion) {
      el.appendChild((0, _dom2.default)('span', 'nsg-tag-remove'));
    }
    buffer.appendChild(el);
    return el;
  }

  function defaultToItemData(s) {
    return s;
  }

  function readValue() {
    return currentValues.filter(function (v) {
      return v.valid;
    }).map(function (v) {
      return v.data;
    });
  }

  function readValueAll() {
    return currentValues.map(function (v) {
      return v.data;
    });
  }

  function updatePlaceholder(e) {
    var any = parent.querySelector('.nsg-tag');
    if (!any && !placeheld) {
      el.setAttribute('placeholder', placeholder);
      placeheld = true;
    } else if (any && placeheld) {
      el.removeAttribute('placeholder');
      placeheld = false;
    }
  }

  function bind(remove) {
    var op = remove ? 'remove' : 'add';
    var ev = remove ? 'off' : 'on';
    _crossvent2.default[op](el, 'keydown', keydown);
    _crossvent2.default[op](el, 'keypress', keypress);
    _crossvent2.default[op](el, 'paste', paste);
    _crossvent2.default[op](parent, 'click', click);
    if (convertOnBlur) {
      _crossvent2.default[op](document.documentElement, 'blur', documentblur, true);
      _crossvent2.default[op](document.documentElement, 'mousedown', documentmousedown);
    }
    if (placeholder) {
      api[ev]('add', updatePlaceholder);
      api[ev]('remove', updatePlaceholder);
      _crossvent2.default[op](el, 'keydown', updatePlaceholder);
      _crossvent2.default[op](el, 'keypress', updatePlaceholder);
      _crossvent2.default[op](el, 'paste', updatePlaceholder);
      _crossvent2.default[op](parent, 'click', updatePlaceholder);
      updatePlaceholder();
    }
  }

  function destroy() {
    bind(true);
    el.value = '';
    el.className = el.className.replace(inputClass, '');
    parent.className = parent.className.replace(editorClass, '');
    if (before.parentElement) {
      before.parentElement.removeChild(before);
    }
    if (after.parentElement) {
      after.parentElement.removeChild(after);
    }
    shrinker.destroy();
    api.destroyed = true;
    api.destroy = api.addItem = api.removeItem = function () {
      return api;
    };
    api.tags = api.value = function () {
      return null;
    };
    return api;
  }

  function tick() {
    return new Date().valueOf();
  }

  function documentblur(e) {
    if (blurblock > tick()) {
      return;
    }
    convert(true);
  }

  function documentmousedown(e) {
    var el = e.target;
    while (el) {
      if (el === parent) {
        blurblock = tick() + 100;
      }
      el = el.parentElement;
    }
  }

  function click(e) {
    var target = e.target;
    if (tagRemovalClass.test(target.className)) {
      removeItemByElement(target.parentElement);
      el.focus();
      return;
    }
    var parent = target;
    var tagged = tagClass.test(parent.className);
    while (tagged === false && parent.parentElement) {
      parent = parent.parentElement;
      tagged = tagClass.test(parent.className);
    }
    if (tagged && free) {
      focusTag(parent, end);
    } else if (target !== el) {
      shift();
      el.focus();
    }
  }

  function shift() {
    focusTag(after.lastChild, end);
    evaluateSelect([delimiter], true);
  }

  function convert(all) {
    (all ? evaluateNoSelect : evaluateSelect)([delimiter], all);
    if (all) {
      each(after, moveLeft);
    }
    return api;
  }

  function moveLeft(value, tag) {
    before.appendChild(tag);
  }

  function keydown(e) {
    var sel = (0, _sell2.default)(el);
    var key = e.which || e.keyCode || e.charCode;
    var canMoveLeft = sel.start === 0 && sel.end === 0 && before.lastChild;
    var canMoveRight = sel.start === el.value.length && sel.end === el.value.length && after.firstChild;
    if (free) {
      if (key === HOME) {
        if (before.firstChild) {
          focusTag(before.firstChild, {});
        } else {
          (0, _sell2.default)(el, { start: 0, end: 0 });
        }
      } else if (key === END) {
        if (after.lastChild) {
          focusTag(after.lastChild, end);
        } else {
          (0, _sell2.default)(el, end);
        }
      } else if (key === BACKSPACE && canMoveLeft) {
        removeItemByElement(before.lastChild);
      } else if (key === RIGHT && canMoveRight) {
        focusTag(after.firstChild, {});
      } else if (key === LEFT && canMoveLeft) {
        focusTag(before.lastChild, end);
      } else {
        return;
      }
    } else {
      if (key === BACKSPACE && canMoveLeft) {
        removeItemByElement(before.lastChild);
      } else if (key === RIGHT && canMoveRight) {
        before.appendChild(after.firstChild);
      } else if (key === LEFT && canMoveLeft) {
        after.insertBefore(before.lastChild, after.firstChild);
      } else if (sinkableKeys.indexOf(key) === -1) {
        // prevent default otherwise
        return;
      }
    }

    e.preventDefault();
    return false;
  }

  function keypress(e) {
    var key = e.which || e.keyCode || e.charCode;
    if (String.fromCharCode(key) === delimiter) {
      convert();
      e.preventDefault();
      return false;
    }
  }

  function paste() {
    setTimeout(function () {
      return evaluateSelect();
    }, 0);
  }

  function evaluateNoSelect(extras, entirely) {
    evaluateInternal(extras, entirely); // necessary for blur events, initialization, unfocused evaluation
  }

  function evaluateSelect(extras, entirely) {
    evaluateInternal(extras, entirely, (0, _sell2.default)(el)); // only if we know the input has/should have focus
  }

  function evaluateInternal(extras, entirely, p) {
    var len = entirely || !p ? Infinity : p.start;
    var tags = el.value.slice(0, len).concat(extras || []).split(delimiter);
    if (tags.length < 1 || !free) {
      return;
    }

    var rest = tags.pop() + el.value.slice(len);
    var removal = tags.join(delimiter).length;

    tags.forEach(function (tag) {
      return addItem(toItemData(tag));
    });
    el.value = rest;
    reselect();
    shrinker.refresh();

    function reselect() {
      if (p) {
        p.start -= removal;
        p.end -= removal;
        (0, _sell2.default)(el, p);
      }
    }
  }

  function defaultRenderer(container, item) {
    (0, _text2.default)(container, getText(item.data));
  }

  function readTag(tag) {
    return (0, _text2.default)(tag);
  }

  function focusTag(tag, p) {
    if (!tag) {
      return;
    }
    evaluateSelect([delimiter], true);
    var parent = tag.parentElement;
    if (parent === before) {
      while (parent.lastChild !== tag) {
        after.insertBefore(parent.lastChild, after.firstChild);
      }
    } else {
      while (parent.firstChild !== tag) {
        before.appendChild(parent.firstChild);
      }
    }
    var value = p.remove ? '' : readTag(tag);
    removeItemByElement(tag);
    el.value = value;
    el.focus();
    (0, _sell2.default)(el, p);
    shrinker.refresh();
  }

  function hasSiblings() {
    var children = el.parentElement.children;
    return [].concat(_toConsumableArray(children)).some(function (s) {
      return s !== el && s.nodeType === ELEMENT;
    });
  }

  function each(container, fn) {
    [].concat(_toConsumableArray(container.children)).forEach(function (tag, i) {
      return fn(readTag(tag), tag, i);
    });
  }

  function defaultValidate(value, i) {
    var x = _findItemIndex(value);
    return x === i || x === null;
  }
}

module.exports = insignia;

},{"./autosize":1,"./dom":2,"./text":12,"contra/emitter":6,"crossvent":7,"sell":10}],4:[function(require,module,exports){
module.exports = function atoa (a, n) { return Array.prototype.slice.call(a, n); }

},{}],5:[function(require,module,exports){
'use strict';

var ticky = require('ticky');

module.exports = function debounce (fn, args, ctx) {
  if (!fn) { return; }
  ticky(function run () {
    fn.apply(ctx || null, args || []);
  });
};

},{"ticky":11}],6:[function(require,module,exports){
'use strict';

var atoa = require('atoa');
var debounce = require('./debounce');

module.exports = function emitter (thing, options) {
  var opts = options || {};
  var evt = {};
  if (thing === undefined) { thing = {}; }
  thing.on = function (type, fn) {
    if (!evt[type]) {
      evt[type] = [fn];
    } else {
      evt[type].push(fn);
    }
    return thing;
  };
  thing.once = function (type, fn) {
    fn._once = true; // thing.off(fn) still works!
    thing.on(type, fn);
    return thing;
  };
  thing.off = function (type, fn) {
    var c = arguments.length;
    if (c === 1) {
      delete evt[type];
    } else if (c === 0) {
      evt = {};
    } else {
      var et = evt[type];
      if (!et) { return thing; }
      et.splice(et.indexOf(fn), 1);
    }
    return thing;
  };
  thing.emit = function () {
    var args = atoa(arguments);
    return thing.emitterSnapshot(args.shift()).apply(this, args);
  };
  thing.emitterSnapshot = function (type) {
    var et = (evt[type] || []).slice(0);
    return function () {
      var args = atoa(arguments);
      var ctx = this || thing;
      if (type === 'error' && opts.throws !== false && !et.length) { throw args.length === 1 ? args[0] : args; }
      et.forEach(function emitter (listen) {
        if (opts.async) { debounce(listen, args, ctx); } else { listen.apply(ctx, args); }
        if (listen._once) { thing.off(type, listen); }
      });
      return thing;
    };
  };
  return thing;
};

},{"./debounce":5,"atoa":4}],7:[function(require,module,exports){
(function (global){
'use strict';

var customEvent = require('custom-event');
var eventmap = require('./eventmap');
var doc = global.document;
var addEvent = addEventEasy;
var removeEvent = removeEventEasy;
var hardCache = [];

if (!global.addEventListener) {
  addEvent = addEventHard;
  removeEvent = removeEventHard;
}

module.exports = {
  add: addEvent,
  remove: removeEvent,
  fabricate: fabricateEvent
};

function addEventEasy (el, type, fn, capturing) {
  return el.addEventListener(type, fn, capturing);
}

function addEventHard (el, type, fn) {
  return el.attachEvent('on' + type, wrap(el, type, fn));
}

function removeEventEasy (el, type, fn, capturing) {
  return el.removeEventListener(type, fn, capturing);
}

function removeEventHard (el, type, fn) {
  var listener = unwrap(el, type, fn);
  if (listener) {
    return el.detachEvent('on' + type, listener);
  }
}

function fabricateEvent (el, type, model) {
  var e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
  if (el.dispatchEvent) {
    el.dispatchEvent(e);
  } else {
    el.fireEvent('on' + type, e);
  }
  function makeClassicEvent () {
    var e;
    if (doc.createEvent) {
      e = doc.createEvent('Event');
      e.initEvent(type, true, true);
    } else if (doc.createEventObject) {
      e = doc.createEventObject();
    }
    return e;
  }
  function makeCustomEvent () {
    return new customEvent(type, { detail: model });
  }
}

function wrapperFactory (el, type, fn) {
  return function wrapper (originalEvent) {
    var e = originalEvent || global.event;
    e.target = e.target || e.srcElement;
    e.preventDefault = e.preventDefault || function preventDefault () { e.returnValue = false; };
    e.stopPropagation = e.stopPropagation || function stopPropagation () { e.cancelBubble = true; };
    e.which = e.which || e.keyCode;
    fn.call(el, e);
  };
}

function wrap (el, type, fn) {
  var wrapper = unwrap(el, type, fn) || wrapperFactory(el, type, fn);
  hardCache.push({
    wrapper: wrapper,
    element: el,
    type: type,
    fn: fn
  });
  return wrapper;
}

function unwrap (el, type, fn) {
  var i = find(el, type, fn);
  if (i) {
    var wrapper = hardCache[i].wrapper;
    hardCache.splice(i, 1); // free up a tad of memory
    return wrapper;
  }
}

function find (el, type, fn) {
  var i, item;
  for (i = 0; i < hardCache.length; i++) {
    item = hardCache[i];
    if (item.element === el && item.type === type && item.fn === fn) {
      return i;
    }
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./eventmap":8,"custom-event":9}],8:[function(require,module,exports){
(function (global){
'use strict';

var eventmap = [];
var eventname = '';
var ron = /^on/;

for (eventname in global) {
  if (ron.test(eventname)) {
    eventmap.push(eventname.slice(2));
  }
}

module.exports = eventmap;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
(function (global){

var NativeCustomEvent = global.CustomEvent;

function useNative () {
  try {
    var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
    return  'cat' === p.type && 'bar' === p.detail.foo;
  } catch (e) {
  }
  return false;
}

/**
 * Cross-browser `CustomEvent` constructor.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
 *
 * @public
 */

module.exports = useNative() ? NativeCustomEvent :

// IE >= 9
'function' === typeof document.createEvent ? function CustomEvent (type, params) {
  var e = document.createEvent('CustomEvent');
  if (params) {
    e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
  } else {
    e.initCustomEvent(type, false, false, void 0);
  }
  return e;
} :

// IE <= 8
function CustomEvent (type, params) {
  var e = document.createEventObject();
  e.type = type;
  if (params) {
    e.bubbles = Boolean(params.bubbles);
    e.cancelable = Boolean(params.cancelable);
    e.detail = params.detail;
  } else {
    e.bubbles = false;
    e.cancelable = false;
    e.detail = void 0;
  }
  return e;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
'use strict';

var get = easyGet;
var set = easySet;

if (document.selection && document.selection.createRange) {
  get = hardGet;
  set = hardSet;
}

function easyGet (el) {
  return {
    start: el.selectionStart,
    end: el.selectionEnd
  };
}

function hardGet (el) {
  var active = document.activeElement;
  if (active !== el) {
    el.focus();
  }

  var range = document.selection.createRange();
  var bookmark = range.getBookmark();
  var original = el.value;
  var marker = getUniqueMarker(original);
  var parent = range.parentElement();
  if (parent === null || !inputs(parent)) {
    return result(0, 0);
  }
  range.text = marker + range.text + marker;

  var contents = el.value;

  el.value = original;
  range.moveToBookmark(bookmark);
  range.select();

  return result(contents.indexOf(marker), contents.lastIndexOf(marker) - marker.length);

  function result (start, end) {
    if (active !== el) { // don't disrupt pre-existing state
      if (active) {
        active.focus();
      } else {
        el.blur();
      }
    }
    return { start: start, end: end };
  }
}

function getUniqueMarker (contents) {
  var marker;
  do {
    marker = '@@marker.' + Math.random() * new Date();
  } while (contents.indexOf(marker) !== -1);
  return marker;
}

function inputs (el) {
  return ((el.tagName === 'INPUT' && el.type === 'text') || el.tagName === 'TEXTAREA');
}

function easySet (el, p) {
  el.selectionStart = parse(el, p.start);
  el.selectionEnd = parse(el, p.end);
}

function hardSet (el, p) {
  var range = el.createTextRange();

  if (p.start === 'end' && p.end === 'end') {
    range.collapse(false);
    range.select();
  } else {
    range.collapse(true);
    range.moveEnd('character', parse(el, p.end));
    range.moveStart('character', parse(el, p.start));
    range.select();
  }
}

function parse (el, value) {
  return value === 'end' ? el.value.length : value || 0;
}

function sell (el, p) {
  if (arguments.length === 2) {
    set(el, p);
  }
  return get(el);
}

module.exports = sell;

},{}],11:[function(require,module,exports){
var si = typeof setImmediate === 'function', tick;
if (si) {
  tick = function (fn) { setImmediate(fn); };
} else {
  tick = function (fn) { setTimeout(fn, 0); };
}

module.exports = tick;
},{}],12:[function(require,module,exports){
'use strict';

function text(el, value) {
  if (arguments.length === 2) {
    el.innerText = el.textContent = value;
  }
  if (typeof el.innerText === 'string') {
    return el.innerText;
  }
  return el.textContent;
}

module.exports = text;

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhdXRvc2l6ZS5qcyIsImRvbS5qcyIsImluc2lnbmlhLmpzIiwibm9kZV9tb2R1bGVzL2F0b2EvYXRvYS5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvZGVib3VuY2UuanMiLCJub2RlX21vZHVsZXMvY29udHJhL2VtaXR0ZXIuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9jcm9zc3ZlbnQuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9ldmVudG1hcC5qcyIsIm5vZGVfbW9kdWxlcy9jdXN0b20tZXZlbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsbC9zZWxsLmpzIiwibm9kZV9tb2R1bGVzL3RpY2t5L3RpY2t5LWJyb3dzZXIuanMiLCJ0ZXh0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FBRUEsSUFBSSxZQUFZLFFBQVEsV0FBUixDQUFoQjtBQUNBLElBQUksTUFBTSxRQUFRLE9BQVIsQ0FBVjtBQUNBLElBQUksT0FBTyxRQUFRLFFBQVIsQ0FBWDtBQUNBLElBQUksUUFBUSxDQUNWLFlBRFUsRUFFVixVQUZVLEVBR1YsWUFIVSxFQUlWLFdBSlUsRUFLVixlQUxVLEVBTVYsZUFOVSxFQU9WLGFBUFUsRUFRVixZQVJVLEVBU1YsaUJBVFUsRUFVVixjQVZVLEVBV1YsV0FYVSxFQVlWLFNBWlUsRUFhVixRQWJVLENBQVo7QUFlQSxJQUFJLFNBQVMsRUFBYjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsU0FBUyxPQUFULENBQWtCLEVBQWxCLEVBQXNCO0FBQ3JDLE1BQUksU0FBUyxJQUFJLE1BQUosQ0FBYjs7QUFFQSxXQUFTLElBQVQsQ0FBYyxXQUFkLENBQTBCLE1BQTFCO0FBQ0E7QUFDQTs7QUFFQSxTQUFPO0FBQ0wsV0FBTyxLQURGO0FBRUwsYUFBUyxPQUZKO0FBR0wsYUFBUztBQUhKLEdBQVA7O0FBTUEsV0FBUyxLQUFULEdBQWtC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QVAsR0FBaUIsUUFBakI7OztBQ2hjQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7O0FBRUEsU0FBUyxJQUFULENBQWUsRUFBZixFQUFtQixLQUFuQixFQUEwQjtBQUN4QixNQUFJLFVBQVUsTUFBVixLQUFxQixDQUF6QixFQUE0QjtBQUMxQixPQUFHLFNBQUgsR0FBZSxHQUFHLFdBQUgsR0FBaUIsS0FBaEM7QUFDRDtBQUNELE1BQUksT0FBTyxHQUFHLFNBQVYsS0FBd0IsUUFBNUIsRUFBc0M7QUFDcEMsV0FBTyxHQUFHLFNBQVY7QUFDRDtBQUNELFNBQU8sR0FBRyxXQUFWO0FBQ0Q7O0FBRUQsT0FBTyxPQUFQLEdBQWlCLElBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyb3NzdmVudCA9IHJlcXVpcmUoJ2Nyb3NzdmVudCcpO1xudmFyIGRvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dCcpO1xudmFyIHByb3BzID0gW1xuICAnZm9udEZhbWlseScsXG4gICdmb250U2l6ZScsXG4gICdmb250V2VpZ2h0JyxcbiAgJ2ZvbnRTdHlsZScsXG4gICdsZXR0ZXJTcGFjaW5nJyxcbiAgJ3RleHRUcmFuc2Zvcm0nLFxuICAnd29yZFNwYWNpbmcnLFxuICAndGV4dEluZGVudCcsXG4gICd3ZWJraXRCb3hTaXppbmcnLFxuICAnbW96Qm94U2l6aW5nJyxcbiAgJ2JveFNpemluZycsXG4gICdwYWRkaW5nJyxcbiAgJ2JvcmRlcidcbl07XG52YXIgb2Zmc2V0ID0gMjA7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFjdG9yeSAoZWwpIHtcbiAgdmFyIG1pcnJvciA9IGRvbSgnc3BhbicpO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobWlycm9yKTtcbiAgcmVtYXAoKTtcbiAgYmluZCgpO1xuXG4gIHJldHVybiB7XG4gICAgcmVtYXA6IHJlbWFwLFxuICAgIHJlZnJlc2g6IHJlZnJlc2gsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuXG4gIGZ1bmN0aW9uIHJlbWFwICgpIHtcbiAgICB2YXIgYyA9IGNvbXB1dGVkKCk7XG4gICAgdmFyIHZhbHVlO1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBjW3Byb3BzW2ldXTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gdm9pZCAwICYmIHZhbHVlICE9PSBudWxsKSB7IC8vIG90aGVyd2lzZSBJRSBibG93cyB1cFxuICAgICAgICBtaXJyb3Iuc3R5bGVbcHJvcHNbaV1dID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIG1pcnJvci5kaXNhYmxlZCA9ICdkaXNhYmxlZCc7XG4gICAgbWlycm9yLnN0eWxlLndoaXRlU3BhY2UgPSAncHJlJztcbiAgICBtaXJyb3Iuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIG1pcnJvci5zdHlsZS50b3AgPSBtaXJyb3Iuc3R5bGUubGVmdCA9ICctOTk5OWVtJztcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZnJlc2ggKCkge1xuICAgIHZhciB2YWx1ZSA9IGVsLnZhbHVlO1xuICAgIGlmICh2YWx1ZSA9PT0gbWlycm9yLnZhbHVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGV4dChtaXJyb3IsIHZhbHVlKTtcblxuICAgIHZhciB3aWR0aCA9IG1pcnJvci5vZmZzZXRXaWR0aCArIG9mZnNldDtcblxuICAgIGVsLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICB9XG5cbiAgZnVuY3Rpb24gYmluZCAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICBjcm9zc3ZlbnRbb3BdKGVsLCAna2V5ZG93bicsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdrZXl1cCcsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdpbnB1dCcsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdwYXN0ZScsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdjaGFuZ2UnLCByZWZyZXNoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlc3Ryb3kgKCkge1xuICAgIGJpbmQodHJ1ZSk7XG4gICAgbWlycm9yLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQobWlycm9yKTtcbiAgICBlbC5zdHlsZS53aWR0aCA9ICcnO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcHV0ZWQgKCkge1xuICAgIGlmICh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsLmN1cnJlbnRTdHlsZTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkb20gKHRhZ05hbWUsIGNsYXNzZXMpIHtcbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgaWYgKGNsYXNzZXMpIHtcbiAgICBlbC5jbGFzc05hbWUgPSBjbGFzc2VzO1xuICB9XG4gIHJldHVybiBlbDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBzZWxsIGZyb20gJ3NlbGwnO1xuaW1wb3J0IGNyb3NzdmVudCBmcm9tICdjcm9zc3ZlbnQnO1xuaW1wb3J0IGVtaXR0ZXIgZnJvbSAnY29udHJhL2VtaXR0ZXInO1xuaW1wb3J0IGRvbSBmcm9tICcuL2RvbSc7XG5pbXBvcnQgdGV4dCBmcm9tICcuL3RleHQnO1xuaW1wb3J0IGF1dG9zaXplIGZyb20gJy4vYXV0b3NpemUnO1xuY29uc3QgaW5wdXRUYWcgPSAvXmlucHV0JC9pO1xuY29uc3QgRUxFTUVOVCA9IDE7XG5jb25zdCBCQUNLU1BBQ0UgPSA4O1xuY29uc3QgRU5EID0gMzU7XG5jb25zdCBIT01FID0gMzY7XG5jb25zdCBMRUZUID0gMzc7XG5jb25zdCBSSUdIVCA9IDM5O1xuY29uc3Qgc2lua2FibGVLZXlzID0gW0VORCwgSE9NRV07XG5jb25zdCB0YWdDbGFzcyA9IC9cXGJuc2ctdGFnXFxiLztcbmNvbnN0IHRhZ1JlbW92YWxDbGFzcyA9IC9cXGJuc2ctdGFnLXJlbW92ZVxcYi87XG5jb25zdCBlZGl0b3JDbGFzcyA9IC9cXGJuc2ctZWRpdG9yXFxiL2c7XG5jb25zdCBpbnB1dENsYXNzID0gL1xcYm5zZy1pbnB1dFxcYi9nO1xuY29uc3QgZW5kID0geyBzdGFydDogJ2VuZCcsIGVuZDogJ2VuZCcgfTtcbmNvbnN0IGRlZmF1bHREZWxpbWl0ZXIgPSAnICc7XG5cbmZ1bmN0aW9uIGluc2lnbmlhIChlbCwgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IGN1cnJlbnRWYWx1ZXMgPSBbXTtcbiAgY29uc3QgbyA9IG9wdGlvbnM7XG4gIGNvbnN0IGRlbGltaXRlciA9IG8uZGVsaW1pdGVyIHx8IGRlZmF1bHREZWxpbWl0ZXI7XG4gIGlmIChkZWxpbWl0ZXIubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbnNpZ25pYSBleHBlY3RlZCBhIHNpbmdsZS1jaGFyYWN0ZXIgZGVsaW1pdGVyIHN0cmluZycpO1xuICB9XG4gIGNvbnN0IGFueSA9IGhhc1NpYmxpbmdzKGVsKTtcbiAgaWYgKGFueSB8fCAhaW5wdXRUYWcudGVzdChlbC50YWdOYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignaW5zaWduaWEgZXhwZWN0ZWQgYW4gaW5wdXQgZWxlbWVudCB3aXRob3V0IGFueSBzaWJsaW5ncycpO1xuICB9XG4gIGNvbnN0IGZyZWUgPSBvLmZyZWUgIT09IGZhbHNlO1xuICBjb25zdCB2YWxpZGF0ZSA9IG8udmFsaWRhdGUgfHwgZGVmYXVsdFZhbGlkYXRlO1xuICBjb25zdCByZW5kZXIgPSBvLnJlbmRlciB8fCBkZWZhdWx0UmVuZGVyZXI7XG4gIGNvbnN0IGNvbnZlcnRPbkJsdXIgPSBvLmNvbnZlcnRPbkJsdXIgIT09IGZhbHNlO1xuXG4gIGNvbnN0IHRvSXRlbURhdGEgPSBkZWZhdWx0VG9JdGVtRGF0YTtcblxuICBjb25zdCB1c2VyR2V0VGV4dCA9IG8uZ2V0VGV4dDtcbiAgY29uc3QgdXNlckdldFZhbHVlID0gby5nZXRWYWx1ZTtcbiAgY29uc3QgZ2V0VGV4dCA9IChcbiAgICB0eXBlb2YgdXNlckdldFRleHQgPT09ICdzdHJpbmcnID8gZCA9PiBkW3VzZXJHZXRUZXh0XSA6XG4gICAgdHlwZW9mIHVzZXJHZXRUZXh0ID09PSAnZnVuY3Rpb24nID8gdXNlckdldFRleHQgOlxuICAgIGQgPT4gZC50b1N0cmluZygpXG4gICk7XG4gIGNvbnN0IGdldFZhbHVlID0gKFxuICAgIHR5cGVvZiB1c2VyR2V0VmFsdWUgPT09ICdzdHJpbmcnID8gZCA9PiBkW3VzZXJHZXRWYWx1ZV0gOlxuICAgIHR5cGVvZiB1c2VyR2V0VmFsdWUgPT09ICdmdW5jdGlvbicgPyB1c2VyR2V0VmFsdWUgOlxuICAgIGQgPT4gZFxuICApO1xuXG4gIGNvbnN0IGJlZm9yZSA9IGRvbSgnc3BhbicsICduc2ctdGFncyBuc2ctdGFncy1iZWZvcmUnKTtcbiAgY29uc3QgYWZ0ZXIgPSBkb20oJ3NwYW4nLCAnbnNnLXRhZ3MgbnNnLXRhZ3MtYWZ0ZXInKTtcbiAgY29uc3QgcGFyZW50ID0gZWwucGFyZW50RWxlbWVudDtcbiAgbGV0IGJsdXJibG9jayA9IHRpY2soKTtcblxuICBlbC5jbGFzc05hbWUgKz0gJyBuc2ctaW5wdXQnO1xuICBwYXJlbnQuY2xhc3NOYW1lICs9ICcgbnNnLWVkaXRvcic7XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoYmVmb3JlLCBlbCk7XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoYWZ0ZXIsIGVsLm5leHRTaWJsaW5nKTtcblxuICBjb25zdCBzaHJpbmtlciA9IGF1dG9zaXplKGVsKTtcbiAgY29uc3QgYXBpID0gZW1pdHRlcih7XG4gICAgYWRkSXRlbSxcbiAgICBmaW5kSXRlbTogZGF0YSA9PiBmaW5kSXRlbShkYXRhKSxcbiAgICBmaW5kSXRlbUluZGV4OiBkYXRhID0+IGZpbmRJdGVtSW5kZXgoZGF0YSksXG4gICAgZmluZEl0ZW1CeUVsZW1lbnQ6IGVsID0+IGZpbmRJdGVtKGVsLCAnZWwnKSxcbiAgICByZW1vdmVJdGVtOiByZW1vdmVJdGVtQnlEYXRhLFxuICAgIHJlbW92ZUl0ZW1CeUVsZW1lbnQsXG4gICAgdmFsdWU6IHJlYWRWYWx1ZSxcbiAgICBhbGxWYWx1ZXM6IHJlYWRWYWx1ZUFsbCxcbiAgICByZWZyZXNoOiBjb252ZXJ0LFxuICAgIGRlc3Ryb3lcbiAgfSk7XG5cbiAgY29uc3QgcGxhY2Vob2xkZXIgPSBlbC5nZXRBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJyk7XG4gIGxldCBwbGFjZWhlbGQgPSB0cnVlO1xuXG4gIGJpbmQoKTtcblxuICAoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gZWwgP1xuICAgIGV2YWx1YXRlU2VsZWN0IDpcbiAgICBldmFsdWF0ZU5vU2VsZWN0XG4gICkoW2RlbGltaXRlcl0sIHRydWUpO1xuXG4gIHJldHVybiBhcGk7XG5cbiAgZnVuY3Rpb24gZmluZEl0ZW0gKHZhbHVlLCBwcm9wPSdkYXRhJykge1xuICAgIGNvbnN0IGNvbXAgPSAocHJvcCA9PT0gJ2RhdGEnID9cbiAgICAgIGl0ZW0gPT4gZ2V0VmFsdWUoaXRlbVtwcm9wXSkgPT09IGdldFZhbHVlKHZhbHVlKSA6XG4gICAgICBpdGVtID0+IGl0ZW1bcHJvcF0gPT09IHZhbHVlXG4gICAgKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN1cnJlbnRWYWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjb21wKGN1cnJlbnRWYWx1ZXNbaV0pKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRJdGVtSW5kZXggKHZhbHVlLCBwcm9wPSdkYXRhJykge1xuICAgIGNvbnN0IGNvbXAgPSAocHJvcCA9PT0gJ2RhdGEnID9cbiAgICAgIGl0ZW0gPT4gZ2V0VmFsdWUoaXRlbVtwcm9wXSkgPT09IGdldFZhbHVlKHZhbHVlKSA6XG4gICAgICBpdGVtID0+IGl0ZW1bcHJvcF0gPT09IHZhbHVlXG4gICAgKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN1cnJlbnRWYWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjb21wKGN1cnJlbnRWYWx1ZXNbaV0pKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEl0ZW0gKGRhdGEpIHtcbiAgICBjb25zdCB2YWxpZCA9IHZhbGlkYXRlKGRhdGEpO1xuICAgIGNvbnN0IGl0ZW0gPSB7IGRhdGEsIHZhbGlkIH07XG4gICAgaWYgKG8ucHJldmVudEludmFsaWQgJiYgIXZhbGlkKSB7XG4gICAgICByZXR1cm4gYXBpO1xuICAgIH1cbiAgICBjb25zdCBlbCA9IHJlbmRlckl0ZW0oaXRlbSk7XG4gICAgaWYgKCFlbCkge1xuICAgICAgcmV0dXJuIGFwaTtcbiAgICB9XG4gICAgaXRlbS5lbCA9IGVsO1xuICAgIGN1cnJlbnRWYWx1ZXMucHVzaChpdGVtKTtcbiAgICBhcGkuZW1pdCgnYWRkJywgZGF0YSwgZWwpO1xuICAgIGludmFsaWRhdGUoKTtcbiAgICByZXR1cm4gYXBpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlSXRlbSAoaXRlbSkge1xuICAgIGlmICghaXRlbSkge1xuICAgICAgcmV0dXJuIGFwaTtcbiAgICB9XG4gICAgcmVtb3ZlSXRlbUVsZW1lbnQoaXRlbS5lbCk7XG4gICAgY3VycmVudFZhbHVlcy5zcGxpY2UoY3VycmVudFZhbHVlcy5pbmRleE9mKGl0ZW0pLCAxKTtcbiAgICBhcGkuZW1pdCgncmVtb3ZlJywgaXRlbS5kYXRhKTtcbiAgICBpbnZhbGlkYXRlKCk7XG4gICAgcmV0dXJuIGFwaTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGludmFsaWRhdGUgKCkge1xuICAgIGN1cnJlbnRWYWx1ZXMuc2xpY2UoKS5mb3JFYWNoKCh2LGkpID0+IHtcbiAgICAgIGN1cnJlbnRWYWx1ZXMuc3BsaWNlKGksIDEpO1xuXG4gICAgICBjb25zdCB2YWxpZCA9IHZhbGlkYXRlKHYuZGF0YSwgaSk7XG4gICAgICBpZiAodmFsaWQpIHtcbiAgICAgICAgdi5lbC5jbGFzc0xpc3QuYWRkKCduc2ctdmFsaWQnKTtcbiAgICAgICAgdi5lbC5jbGFzc0xpc3QucmVtb3ZlKCduc2ctaW52YWxpZCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdi5lbC5jbGFzc0xpc3QuYWRkKCduc2ctaW52YWxpZCcpO1xuICAgICAgICB2LmVsLmNsYXNzTGlzdC5yZW1vdmUoJ25zZy12YWxpZCcpO1xuICAgICAgICBhcGkuZW1pdCgnaW52YWxpZCcsIHYuZGF0YSwgdi5lbCk7XG4gICAgICB9XG4gICAgICB2LnZhbGlkID0gdmFsaWQ7XG5cbiAgICAgIGN1cnJlbnRWYWx1ZXMuc3BsaWNlKGksIDAsIHYpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlSXRlbUJ5RGF0YSAoZGF0YSkge1xuICAgIHJldHVybiByZW1vdmVJdGVtKGZpbmRJdGVtKGRhdGEpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZUl0ZW1CeUVsZW1lbnQgKGVsKSB7XG4gICAgcmV0dXJuIHJlbW92ZUl0ZW0oZmluZEl0ZW0oZWwsICdlbCcpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbmRlckl0ZW0gKGl0ZW0pIHtcbiAgICByZXR1cm4gY3JlYXRlVGFnKGJlZm9yZSwgaXRlbSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVJdGVtRWxlbWVudCAoZWwpIHtcbiAgICBpZiAoZWwucGFyZW50RWxlbWVudCkge1xuICAgICAgZWwucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChlbCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVGFnIChidWZmZXIsIGl0ZW0pIHtcbiAgICBjb25zdCB7ZGF0YX0gPSBpdGVtO1xuICAgIGNvbnN0IGVtcHR5ID0gdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmIGRhdGEudHJpbSgpLmxlbmd0aCA9PT0gMDtcbiAgICBpZiAoZW1wdHkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBlbCA9IGRvbSgnc3BhbicsICduc2ctdGFnJyk7XG4gICAgcmVuZGVyKGVsLCBpdGVtKTtcbiAgICBpZiAoby5kZWxldGlvbikge1xuICAgICAgZWwuYXBwZW5kQ2hpbGQoZG9tKCdzcGFuJywgJ25zZy10YWctcmVtb3ZlJykpO1xuICAgIH1cbiAgICBidWZmZXIuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZmF1bHRUb0l0ZW1EYXRhIChzKSB7XG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICBmdW5jdGlvbiByZWFkVmFsdWUgKCkge1xuICAgIHJldHVybiBjdXJyZW50VmFsdWVzLmZpbHRlcih2ID0+IHYudmFsaWQpLm1hcCh2ID0+IHYuZGF0YSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFkVmFsdWVBbGwgKCkge1xuICAgIHJldHVybiBjdXJyZW50VmFsdWVzLm1hcCh2ID0+IHYuZGF0YSk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVQbGFjZWhvbGRlciAoZSkge1xuICAgIGNvbnN0IGFueSA9IHBhcmVudC5xdWVyeVNlbGVjdG9yKCcubnNnLXRhZycpO1xuICAgIGlmICghYW55ICYmICFwbGFjZWhlbGQpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCBwbGFjZWhvbGRlcik7XG4gICAgICBwbGFjZWhlbGQgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoYW55ICYmIHBsYWNlaGVsZCkge1xuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdwbGFjZWhvbGRlcicpO1xuICAgICAgcGxhY2VoZWxkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYmluZCAocmVtb3ZlKSB7XG4gICAgY29uc3Qgb3AgPSByZW1vdmUgPyAncmVtb3ZlJyA6ICdhZGQnO1xuICAgIGNvbnN0IGV2ID0gcmVtb3ZlID8gJ29mZicgOiAnb24nO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdrZXlkb3duJywga2V5ZG93bik7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgJ2tleXByZXNzJywga2V5cHJlc3MpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdwYXN0ZScsIHBhc3RlKTtcbiAgICBjcm9zc3ZlbnRbb3BdKHBhcmVudCwgJ2NsaWNrJywgY2xpY2spO1xuICAgIGlmIChjb252ZXJ0T25CbHVyKSB7XG4gICAgICBjcm9zc3ZlbnRbb3BdKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgJ2JsdXInLCBkb2N1bWVudGJsdXIsIHRydWUpO1xuICAgICAgY3Jvc3N2ZW50W29wXShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICdtb3VzZWRvd24nLCBkb2N1bWVudG1vdXNlZG93bik7XG4gICAgfVxuICAgIGlmIChwbGFjZWhvbGRlcikge1xuICAgICAgYXBpW2V2XSgnYWRkJywgdXBkYXRlUGxhY2Vob2xkZXIpO1xuICAgICAgYXBpW2V2XSgncmVtb3ZlJywgdXBkYXRlUGxhY2Vob2xkZXIpO1xuICAgICAgY3Jvc3N2ZW50W29wXShlbCwgJ2tleWRvd24nLCB1cGRhdGVQbGFjZWhvbGRlcik7XG4gICAgICBjcm9zc3ZlbnRbb3BdKGVsLCAna2V5cHJlc3MnLCB1cGRhdGVQbGFjZWhvbGRlcik7XG4gICAgICBjcm9zc3ZlbnRbb3BdKGVsLCAncGFzdGUnLCB1cGRhdGVQbGFjZWhvbGRlcik7XG4gICAgICBjcm9zc3ZlbnRbb3BdKHBhcmVudCwgJ2NsaWNrJywgdXBkYXRlUGxhY2Vob2xkZXIpO1xuICAgICAgdXBkYXRlUGxhY2Vob2xkZXIoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95ICgpIHtcbiAgICBiaW5kKHRydWUpO1xuICAgIGVsLnZhbHVlID0gJyc7XG4gICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UoaW5wdXRDbGFzcywgJycpO1xuICAgIHBhcmVudC5jbGFzc05hbWUgPSBwYXJlbnQuY2xhc3NOYW1lLnJlcGxhY2UoZWRpdG9yQ2xhc3MsICcnKTtcbiAgICBpZiAoYmVmb3JlLnBhcmVudEVsZW1lbnQpIHsgYmVmb3JlLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoYmVmb3JlKTsgfVxuICAgIGlmIChhZnRlci5wYXJlbnRFbGVtZW50KSB7IGFmdGVyLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoYWZ0ZXIpOyB9XG4gICAgc2hyaW5rZXIuZGVzdHJveSgpO1xuICAgIGFwaS5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIGFwaS5kZXN0cm95ID0gYXBpLmFkZEl0ZW0gPSBhcGkucmVtb3ZlSXRlbSA9ICgpID0+IGFwaTtcbiAgICBhcGkudGFncyA9IGFwaS52YWx1ZSA9ICgpID0+IG51bGw7XG4gICAgcmV0dXJuIGFwaTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpY2sgKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLnZhbHVlT2YoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRvY3VtZW50Ymx1ciAoZSkge1xuICAgIGlmIChibHVyYmxvY2sgPiB0aWNrKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29udmVydCh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRvY3VtZW50bW91c2Vkb3duIChlKSB7XG4gICAgdmFyIGVsID0gZS50YXJnZXQ7XG4gICAgd2hpbGUgKGVsKSB7XG4gICAgICBpZiAoZWwgPT09IHBhcmVudCkge1xuICAgICAgICBibHVyYmxvY2sgPSB0aWNrKCkgKyAxMDA7XG4gICAgICB9XG4gICAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2xpY2sgKGUpIHtcbiAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICBpZiAodGFnUmVtb3ZhbENsYXNzLnRlc3QodGFyZ2V0LmNsYXNzTmFtZSkpIHtcbiAgICAgIHJlbW92ZUl0ZW1CeUVsZW1lbnQodGFyZ2V0LnBhcmVudEVsZW1lbnQpO1xuICAgICAgZWwuZm9jdXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IHBhcmVudCA9IHRhcmdldDtcbiAgICBsZXQgdGFnZ2VkID0gdGFnQ2xhc3MudGVzdChwYXJlbnQuY2xhc3NOYW1lKTtcbiAgICB3aGlsZSAodGFnZ2VkID09PSBmYWxzZSAmJiBwYXJlbnQucGFyZW50RWxlbWVudCkge1xuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICB0YWdnZWQgPSB0YWdDbGFzcy50ZXN0KHBhcmVudC5jbGFzc05hbWUpO1xuICAgIH1cbiAgICBpZiAodGFnZ2VkICYmIGZyZWUpIHtcbiAgICAgIGZvY3VzVGFnKHBhcmVudCwgZW5kKTtcbiAgICB9IGVsc2UgaWYgKHRhcmdldCAhPT0gZWwpIHtcbiAgICAgIHNoaWZ0KCk7XG4gICAgICBlbC5mb2N1cygpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNoaWZ0ICgpIHtcbiAgICBmb2N1c1RhZyhhZnRlci5sYXN0Q2hpbGQsIGVuZCk7XG4gICAgZXZhbHVhdGVTZWxlY3QoW2RlbGltaXRlcl0sIHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29udmVydCAoYWxsKSB7XG4gICAgKGFsbCA/IGV2YWx1YXRlTm9TZWxlY3QgOiBldmFsdWF0ZVNlbGVjdCkoW2RlbGltaXRlcl0sIGFsbCk7XG4gICAgaWYgKGFsbCkge1xuICAgICAgZWFjaChhZnRlciwgbW92ZUxlZnQpO1xuICAgIH1cbiAgICByZXR1cm4gYXBpO1xuICB9XG5cbiAgZnVuY3Rpb24gbW92ZUxlZnQgKHZhbHVlLCB0YWcpIHtcbiAgICBiZWZvcmUuYXBwZW5kQ2hpbGQodGFnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleWRvd24gKGUpIHtcbiAgICBjb25zdCBzZWwgPSBzZWxsKGVsKTtcbiAgICBjb25zdCBrZXkgPSBlLndoaWNoIHx8IGUua2V5Q29kZSB8fCBlLmNoYXJDb2RlO1xuICAgIGNvbnN0IGNhbk1vdmVMZWZ0ID0gc2VsLnN0YXJ0ID09PSAwICYmIHNlbC5lbmQgPT09IDAgJiYgYmVmb3JlLmxhc3RDaGlsZDtcbiAgICBjb25zdCBjYW5Nb3ZlUmlnaHQgPSBzZWwuc3RhcnQgPT09IGVsLnZhbHVlLmxlbmd0aCAmJiBzZWwuZW5kID09PSBlbC52YWx1ZS5sZW5ndGggJiYgYWZ0ZXIuZmlyc3RDaGlsZDtcbiAgICBpZiAoZnJlZSkge1xuICAgICAgaWYgKGtleSA9PT0gSE9NRSkge1xuICAgICAgICBpZiAoYmVmb3JlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICBmb2N1c1RhZyhiZWZvcmUuZmlyc3RDaGlsZCwge30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGwoZWwsIHsgc3RhcnQ6IDAsIGVuZDogMCB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChrZXkgPT09IEVORCkge1xuICAgICAgICBpZiAoYWZ0ZXIubGFzdENoaWxkKSB7XG4gICAgICAgICAgZm9jdXNUYWcoYWZ0ZXIubGFzdENoaWxkLCBlbmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGwoZWwsIGVuZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSBCQUNLU1BBQ0UgJiYgY2FuTW92ZUxlZnQpIHtcbiAgICAgICAgcmVtb3ZlSXRlbUJ5RWxlbWVudChiZWZvcmUubGFzdENoaWxkKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSBSSUdIVCAmJiBjYW5Nb3ZlUmlnaHQpIHtcbiAgICAgICAgZm9jdXNUYWcoYWZ0ZXIuZmlyc3RDaGlsZCwge30pO1xuICAgICAgfSBlbHNlIGlmIChrZXkgPT09IExFRlQgJiYgY2FuTW92ZUxlZnQpIHtcbiAgICAgICAgZm9jdXNUYWcoYmVmb3JlLmxhc3RDaGlsZCwgZW5kKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGtleSA9PT0gQkFDS1NQQUNFICYmIGNhbk1vdmVMZWZ0KSB7XG4gICAgICAgIHJlbW92ZUl0ZW1CeUVsZW1lbnQoYmVmb3JlLmxhc3RDaGlsZCk7XG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gUklHSFQgJiYgY2FuTW92ZVJpZ2h0KSB7XG4gICAgICAgIGJlZm9yZS5hcHBlbmRDaGlsZChhZnRlci5maXJzdENoaWxkKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSBMRUZUICYmIGNhbk1vdmVMZWZ0KSB7XG4gICAgICAgIGFmdGVyLmluc2VydEJlZm9yZShiZWZvcmUubGFzdENoaWxkLCBhZnRlci5maXJzdENoaWxkKTtcbiAgICAgIH0gZWxzZSBpZiAoc2lua2FibGVLZXlzLmluZGV4T2Yoa2V5KSA9PT0gLTEpIHsgLy8gcHJldmVudCBkZWZhdWx0IG90aGVyd2lzZVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleXByZXNzIChlKSB7XG4gICAgY29uc3Qga2V5ID0gZS53aGljaCB8fCBlLmtleUNvZGUgfHwgZS5jaGFyQ29kZTtcbiAgICBpZiAoU3RyaW5nLmZyb21DaGFyQ29kZShrZXkpID09PSBkZWxpbWl0ZXIpIHtcbiAgICAgIGNvbnZlcnQoKTtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwYXN0ZSAoKSB7XG4gICAgc2V0VGltZW91dCgoKSA9PiBldmFsdWF0ZVNlbGVjdCgpLCAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV2YWx1YXRlTm9TZWxlY3QgKGV4dHJhcywgZW50aXJlbHkpIHtcbiAgICBldmFsdWF0ZUludGVybmFsKGV4dHJhcywgZW50aXJlbHkpOyAvLyBuZWNlc3NhcnkgZm9yIGJsdXIgZXZlbnRzLCBpbml0aWFsaXphdGlvbiwgdW5mb2N1c2VkIGV2YWx1YXRpb25cbiAgfVxuXG4gIGZ1bmN0aW9uIGV2YWx1YXRlU2VsZWN0IChleHRyYXMsIGVudGlyZWx5KSB7XG4gICAgZXZhbHVhdGVJbnRlcm5hbChleHRyYXMsIGVudGlyZWx5LCBzZWxsKGVsKSk7IC8vIG9ubHkgaWYgd2Uga25vdyB0aGUgaW5wdXQgaGFzL3Nob3VsZCBoYXZlIGZvY3VzXG4gIH1cblxuICBmdW5jdGlvbiBldmFsdWF0ZUludGVybmFsIChleHRyYXMsIGVudGlyZWx5LCBwKSB7XG4gICAgY29uc3QgbGVuID0gZW50aXJlbHkgfHwgIXAgPyBJbmZpbml0eSA6IHAuc3RhcnQ7XG4gICAgY29uc3QgdGFncyA9IGVsLnZhbHVlLnNsaWNlKDAsIGxlbikuY29uY2F0KGV4dHJhcyB8fCBbXSkuc3BsaXQoZGVsaW1pdGVyKTtcbiAgICBpZiAodGFncy5sZW5ndGggPCAxIHx8ICFmcmVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdCA9IHRhZ3MucG9wKCkgKyBlbC52YWx1ZS5zbGljZShsZW4pO1xuICAgIGNvbnN0IHJlbW92YWwgPSB0YWdzLmpvaW4oZGVsaW1pdGVyKS5sZW5ndGg7XG5cbiAgICB0YWdzLmZvckVhY2godGFnID0+IGFkZEl0ZW0odG9JdGVtRGF0YSh0YWcpKSk7XG4gICAgZWwudmFsdWUgPSByZXN0O1xuICAgIHJlc2VsZWN0KCk7XG4gICAgc2hyaW5rZXIucmVmcmVzaCgpO1xuXG4gICAgZnVuY3Rpb24gcmVzZWxlY3QgKCkge1xuICAgICAgaWYgKHApIHtcbiAgICAgICAgcC5zdGFydCAtPSByZW1vdmFsO1xuICAgICAgICBwLmVuZCAtPSByZW1vdmFsO1xuICAgICAgICBzZWxsKGVsLCBwKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZWZhdWx0UmVuZGVyZXIgKGNvbnRhaW5lciwgaXRlbSkge1xuICAgIHRleHQoY29udGFpbmVyLCBnZXRUZXh0KGl0ZW0uZGF0YSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVhZFRhZyAodGFnKSB7XG4gICAgcmV0dXJuIHRleHQodGFnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvY3VzVGFnICh0YWcsIHApIHtcbiAgICBpZiAoIXRhZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBldmFsdWF0ZVNlbGVjdChbZGVsaW1pdGVyXSwgdHJ1ZSk7XG4gICAgY29uc3QgcGFyZW50ID0gdGFnLnBhcmVudEVsZW1lbnQ7XG4gICAgaWYgKHBhcmVudCA9PT0gYmVmb3JlKSB7XG4gICAgICB3aGlsZSAocGFyZW50Lmxhc3RDaGlsZCAhPT0gdGFnKSB7XG4gICAgICAgIGFmdGVyLmluc2VydEJlZm9yZShwYXJlbnQubGFzdENoaWxkLCBhZnRlci5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgd2hpbGUgKHBhcmVudC5maXJzdENoaWxkICE9PSB0YWcpIHtcbiAgICAgICAgYmVmb3JlLmFwcGVuZENoaWxkKHBhcmVudC5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSBwLnJlbW92ZSA/ICcnIDogcmVhZFRhZyh0YWcpO1xuICAgIHJlbW92ZUl0ZW1CeUVsZW1lbnQodGFnKTtcbiAgICBlbC52YWx1ZSA9IHZhbHVlO1xuICAgIGVsLmZvY3VzKCk7XG4gICAgc2VsbChlbCwgcCk7XG4gICAgc2hyaW5rZXIucmVmcmVzaCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFzU2libGluZ3MgKCkge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gZWwucGFyZW50RWxlbWVudC5jaGlsZHJlbjtcbiAgICByZXR1cm4gWy4uLmNoaWxkcmVuXS5zb21lKHMgPT4gcyAhPT0gZWwgJiYgcy5ub2RlVHlwZSA9PT0gRUxFTUVOVCk7XG4gIH1cblxuICBmdW5jdGlvbiBlYWNoIChjb250YWluZXIsIGZuKSB7XG4gICAgWy4uLmNvbnRhaW5lci5jaGlsZHJlbl0uZm9yRWFjaCgodGFnLCBpKSA9PiBmbihyZWFkVGFnKHRhZyksIHRhZywgaSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVmYXVsdFZhbGlkYXRlICh2YWx1ZSwgaSkge1xuICAgIGNvbnN0IHggPSBmaW5kSXRlbUluZGV4KHZhbHVlKTtcbiAgICByZXR1cm4geCA9PT0gaSB8fCB4ID09PSBudWxsIDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc2lnbmlhO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhdG9hIChhLCBuKSB7IHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhLCBuKTsgfVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGlja3kgPSByZXF1aXJlKCd0aWNreScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlYm91bmNlIChmbiwgYXJncywgY3R4KSB7XG4gIGlmICghZm4pIHsgcmV0dXJuOyB9XG4gIHRpY2t5KGZ1bmN0aW9uIHJ1biAoKSB7XG4gICAgZm4uYXBwbHkoY3R4IHx8IG51bGwsIGFyZ3MgfHwgW10pO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhdG9hID0gcmVxdWlyZSgnYXRvYScpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVtaXR0ZXIgKHRoaW5nLCBvcHRpb25zKSB7XG4gIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGV2dCA9IHt9O1xuICBpZiAodGhpbmcgPT09IHVuZGVmaW5lZCkgeyB0aGluZyA9IHt9OyB9XG4gIHRoaW5nLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgaWYgKCFldnRbdHlwZV0pIHtcbiAgICAgIGV2dFt0eXBlXSA9IFtmbl07XG4gICAgfSBlbHNlIHtcbiAgICAgIGV2dFt0eXBlXS5wdXNoKGZuKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5vbmNlID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgZm4uX29uY2UgPSB0cnVlOyAvLyB0aGluZy5vZmYoZm4pIHN0aWxsIHdvcmtzIVxuICAgIHRoaW5nLm9uKHR5cGUsIGZuKTtcbiAgICByZXR1cm4gdGhpbmc7XG4gIH07XG4gIHRoaW5nLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAoYyA9PT0gMSkge1xuICAgICAgZGVsZXRlIGV2dFt0eXBlXTtcbiAgICB9IGVsc2UgaWYgKGMgPT09IDApIHtcbiAgICAgIGV2dCA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZXQgPSBldnRbdHlwZV07XG4gICAgICBpZiAoIWV0KSB7IHJldHVybiB0aGluZzsgfVxuICAgICAgZXQuc3BsaWNlKGV0LmluZGV4T2YoZm4pLCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5lbWl0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gYXRvYShhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGluZy5lbWl0dGVyU25hcHNob3QoYXJncy5zaGlmdCgpKS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfTtcbiAgdGhpbmcuZW1pdHRlclNuYXBzaG90ID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgZXQgPSAoZXZ0W3R5cGVdIHx8IFtdKS5zbGljZSgwKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhdG9hKGFyZ3VtZW50cyk7XG4gICAgICB2YXIgY3R4ID0gdGhpcyB8fCB0aGluZztcbiAgICAgIGlmICh0eXBlID09PSAnZXJyb3InICYmIG9wdHMudGhyb3dzICE9PSBmYWxzZSAmJiAhZXQubGVuZ3RoKSB7IHRocm93IGFyZ3MubGVuZ3RoID09PSAxID8gYXJnc1swXSA6IGFyZ3M7IH1cbiAgICAgIGV0LmZvckVhY2goZnVuY3Rpb24gZW1pdHRlciAobGlzdGVuKSB7XG4gICAgICAgIGlmIChvcHRzLmFzeW5jKSB7IGRlYm91bmNlKGxpc3RlbiwgYXJncywgY3R4KTsgfSBlbHNlIHsgbGlzdGVuLmFwcGx5KGN0eCwgYXJncyk7IH1cbiAgICAgICAgaWYgKGxpc3Rlbi5fb25jZSkgeyB0aGluZy5vZmYodHlwZSwgbGlzdGVuKTsgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpbmc7XG4gICAgfTtcbiAgfTtcbiAgcmV0dXJuIHRoaW5nO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGN1c3RvbUV2ZW50ID0gcmVxdWlyZSgnY3VzdG9tLWV2ZW50Jyk7XG52YXIgZXZlbnRtYXAgPSByZXF1aXJlKCcuL2V2ZW50bWFwJyk7XG52YXIgZG9jID0gZ2xvYmFsLmRvY3VtZW50O1xudmFyIGFkZEV2ZW50ID0gYWRkRXZlbnRFYXN5O1xudmFyIHJlbW92ZUV2ZW50ID0gcmVtb3ZlRXZlbnRFYXN5O1xudmFyIGhhcmRDYWNoZSA9IFtdO1xuXG5pZiAoIWdsb2JhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gIGFkZEV2ZW50ID0gYWRkRXZlbnRIYXJkO1xuICByZW1vdmVFdmVudCA9IHJlbW92ZUV2ZW50SGFyZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFkZDogYWRkRXZlbnQsXG4gIHJlbW92ZTogcmVtb3ZlRXZlbnQsXG4gIGZhYnJpY2F0ZTogZmFicmljYXRlRXZlbnRcbn07XG5cbmZ1bmN0aW9uIGFkZEV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50SGFyZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBlbC5hdHRhY2hFdmVudCgnb24nICsgdHlwZSwgd3JhcChlbCwgdHlwZSwgZm4pKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRFYXN5IChlbCwgdHlwZSwgZm4sIGNhcHR1cmluZykge1xuICByZXR1cm4gZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgY2FwdHVyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRIYXJkIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGxpc3RlbmVyID0gdW53cmFwKGVsLCB0eXBlLCBmbik7XG4gIGlmIChsaXN0ZW5lcikge1xuICAgIHJldHVybiBlbC5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZhYnJpY2F0ZUV2ZW50IChlbCwgdHlwZSwgbW9kZWwpIHtcbiAgdmFyIGUgPSBldmVudG1hcC5pbmRleE9mKHR5cGUpID09PSAtMSA/IG1ha2VDdXN0b21FdmVudCgpIDogbWFrZUNsYXNzaWNFdmVudCgpO1xuICBpZiAoZWwuZGlzcGF0Y2hFdmVudCkge1xuICAgIGVsLmRpc3BhdGNoRXZlbnQoZSk7XG4gIH0gZWxzZSB7XG4gICAgZWwuZmlyZUV2ZW50KCdvbicgKyB0eXBlLCBlKTtcbiAgfVxuICBmdW5jdGlvbiBtYWtlQ2xhc3NpY0V2ZW50ICgpIHtcbiAgICB2YXIgZTtcbiAgICBpZiAoZG9jLmNyZWF0ZUV2ZW50KSB7XG4gICAgICBlID0gZG9jLmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgZS5pbml0RXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChkb2MuY3JlYXRlRXZlbnRPYmplY3QpIHtcbiAgICAgIGUgPSBkb2MuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGU7XG4gIH1cbiAgZnVuY3Rpb24gbWFrZUN1c3RvbUV2ZW50ICgpIHtcbiAgICByZXR1cm4gbmV3IGN1c3RvbUV2ZW50KHR5cGUsIHsgZGV0YWlsOiBtb2RlbCB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3cmFwcGVyRmFjdG9yeSAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwcGVyIChvcmlnaW5hbEV2ZW50KSB7XG4gICAgdmFyIGUgPSBvcmlnaW5hbEV2ZW50IHx8IGdsb2JhbC5ldmVudDtcbiAgICBlLnRhcmdldCA9IGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcbiAgICBlLnByZXZlbnREZWZhdWx0ID0gZS5wcmV2ZW50RGVmYXVsdCB8fCBmdW5jdGlvbiBwcmV2ZW50RGVmYXVsdCAoKSB7IGUucmV0dXJuVmFsdWUgPSBmYWxzZTsgfTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IGUuc3RvcFByb3BhZ2F0aW9uIHx8IGZ1bmN0aW9uIHN0b3BQcm9wYWdhdGlvbiAoKSB7IGUuY2FuY2VsQnViYmxlID0gdHJ1ZTsgfTtcbiAgICBlLndoaWNoID0gZS53aGljaCB8fCBlLmtleUNvZGU7XG4gICAgZm4uY2FsbChlbCwgZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHdyYXAgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgd3JhcHBlciA9IHVud3JhcChlbCwgdHlwZSwgZm4pIHx8IHdyYXBwZXJGYWN0b3J5KGVsLCB0eXBlLCBmbik7XG4gIGhhcmRDYWNoZS5wdXNoKHtcbiAgICB3cmFwcGVyOiB3cmFwcGVyLFxuICAgIGVsZW1lbnQ6IGVsLFxuICAgIHR5cGU6IHR5cGUsXG4gICAgZm46IGZuXG4gIH0pO1xuICByZXR1cm4gd3JhcHBlcjtcbn1cblxuZnVuY3Rpb24gdW53cmFwIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGkgPSBmaW5kKGVsLCB0eXBlLCBmbik7XG4gIGlmIChpKSB7XG4gICAgdmFyIHdyYXBwZXIgPSBoYXJkQ2FjaGVbaV0ud3JhcHBlcjtcbiAgICBoYXJkQ2FjaGUuc3BsaWNlKGksIDEpOyAvLyBmcmVlIHVwIGEgdGFkIG9mIG1lbW9yeVxuICAgIHJldHVybiB3cmFwcGVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmQgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgaSwgaXRlbTtcbiAgZm9yIChpID0gMDsgaSA8IGhhcmRDYWNoZS5sZW5ndGg7IGkrKykge1xuICAgIGl0ZW0gPSBoYXJkQ2FjaGVbaV07XG4gICAgaWYgKGl0ZW0uZWxlbWVudCA9PT0gZWwgJiYgaXRlbS50eXBlID09PSB0eXBlICYmIGl0ZW0uZm4gPT09IGZuKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGV2ZW50bWFwID0gW107XG52YXIgZXZlbnRuYW1lID0gJyc7XG52YXIgcm9uID0gL15vbi87XG5cbmZvciAoZXZlbnRuYW1lIGluIGdsb2JhbCkge1xuICBpZiAocm9uLnRlc3QoZXZlbnRuYW1lKSkge1xuICAgIGV2ZW50bWFwLnB1c2goZXZlbnRuYW1lLnNsaWNlKDIpKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV2ZW50bWFwO1xuIiwiXG52YXIgTmF0aXZlQ3VzdG9tRXZlbnQgPSBnbG9iYWwuQ3VzdG9tRXZlbnQ7XG5cbmZ1bmN0aW9uIHVzZU5hdGl2ZSAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIHAgPSBuZXcgTmF0aXZlQ3VzdG9tRXZlbnQoJ2NhdCcsIHsgZGV0YWlsOiB7IGZvbzogJ2JhcicgfSB9KTtcbiAgICByZXR1cm4gICdjYXQnID09PSBwLnR5cGUgJiYgJ2JhcicgPT09IHAuZGV0YWlsLmZvbztcbiAgfSBjYXRjaCAoZSkge1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDcm9zcy1icm93c2VyIGBDdXN0b21FdmVudGAgY29uc3RydWN0b3IuXG4gKlxuICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0N1c3RvbUV2ZW50LkN1c3RvbUV2ZW50XG4gKlxuICogQHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gdXNlTmF0aXZlKCkgPyBOYXRpdmVDdXN0b21FdmVudCA6XG5cbi8vIElFID49IDlcbidmdW5jdGlvbicgPT09IHR5cGVvZiBkb2N1bWVudC5jcmVhdGVFdmVudCA/IGZ1bmN0aW9uIEN1c3RvbUV2ZW50ICh0eXBlLCBwYXJhbXMpIHtcbiAgdmFyIGUgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTtcbiAgaWYgKHBhcmFtcykge1xuICAgIGUuaW5pdEN1c3RvbUV2ZW50KHR5cGUsIHBhcmFtcy5idWJibGVzLCBwYXJhbXMuY2FuY2VsYWJsZSwgcGFyYW1zLmRldGFpbCk7XG4gIH0gZWxzZSB7XG4gICAgZS5pbml0Q3VzdG9tRXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlLCB2b2lkIDApO1xuICB9XG4gIHJldHVybiBlO1xufSA6XG5cbi8vIElFIDw9IDhcbmZ1bmN0aW9uIEN1c3RvbUV2ZW50ICh0eXBlLCBwYXJhbXMpIHtcbiAgdmFyIGUgPSBkb2N1bWVudC5jcmVhdGVFdmVudE9iamVjdCgpO1xuICBlLnR5cGUgPSB0eXBlO1xuICBpZiAocGFyYW1zKSB7XG4gICAgZS5idWJibGVzID0gQm9vbGVhbihwYXJhbXMuYnViYmxlcyk7XG4gICAgZS5jYW5jZWxhYmxlID0gQm9vbGVhbihwYXJhbXMuY2FuY2VsYWJsZSk7XG4gICAgZS5kZXRhaWwgPSBwYXJhbXMuZGV0YWlsO1xuICB9IGVsc2Uge1xuICAgIGUuYnViYmxlcyA9IGZhbHNlO1xuICAgIGUuY2FuY2VsYWJsZSA9IGZhbHNlO1xuICAgIGUuZGV0YWlsID0gdm9pZCAwO1xuICB9XG4gIHJldHVybiBlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZ2V0ID0gZWFzeUdldDtcbnZhciBzZXQgPSBlYXN5U2V0O1xuXG5pZiAoZG9jdW1lbnQuc2VsZWN0aW9uICYmIGRvY3VtZW50LnNlbGVjdGlvbi5jcmVhdGVSYW5nZSkge1xuICBnZXQgPSBoYXJkR2V0O1xuICBzZXQgPSBoYXJkU2V0O1xufVxuXG5mdW5jdGlvbiBlYXN5R2V0IChlbCkge1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBlbC5zZWxlY3Rpb25TdGFydCxcbiAgICBlbmQ6IGVsLnNlbGVjdGlvbkVuZFxuICB9O1xufVxuXG5mdW5jdGlvbiBoYXJkR2V0IChlbCkge1xuICB2YXIgYWN0aXZlID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgaWYgKGFjdGl2ZSAhPT0gZWwpIHtcbiAgICBlbC5mb2N1cygpO1xuICB9XG5cbiAgdmFyIHJhbmdlID0gZG9jdW1lbnQuc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKCk7XG4gIHZhciBib29rbWFyayA9IHJhbmdlLmdldEJvb2ttYXJrKCk7XG4gIHZhciBvcmlnaW5hbCA9IGVsLnZhbHVlO1xuICB2YXIgbWFya2VyID0gZ2V0VW5pcXVlTWFya2VyKG9yaWdpbmFsKTtcbiAgdmFyIHBhcmVudCA9IHJhbmdlLnBhcmVudEVsZW1lbnQoKTtcbiAgaWYgKHBhcmVudCA9PT0gbnVsbCB8fCAhaW5wdXRzKHBhcmVudCkpIHtcbiAgICByZXR1cm4gcmVzdWx0KDAsIDApO1xuICB9XG4gIHJhbmdlLnRleHQgPSBtYXJrZXIgKyByYW5nZS50ZXh0ICsgbWFya2VyO1xuXG4gIHZhciBjb250ZW50cyA9IGVsLnZhbHVlO1xuXG4gIGVsLnZhbHVlID0gb3JpZ2luYWw7XG4gIHJhbmdlLm1vdmVUb0Jvb2ttYXJrKGJvb2ttYXJrKTtcbiAgcmFuZ2Uuc2VsZWN0KCk7XG5cbiAgcmV0dXJuIHJlc3VsdChjb250ZW50cy5pbmRleE9mKG1hcmtlciksIGNvbnRlbnRzLmxhc3RJbmRleE9mKG1hcmtlcikgLSBtYXJrZXIubGVuZ3RoKTtcblxuICBmdW5jdGlvbiByZXN1bHQgKHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoYWN0aXZlICE9PSBlbCkgeyAvLyBkb24ndCBkaXNydXB0IHByZS1leGlzdGluZyBzdGF0ZVxuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICBhY3RpdmUuZm9jdXMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLmJsdXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgc3RhcnQ6IHN0YXJ0LCBlbmQ6IGVuZCB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFVuaXF1ZU1hcmtlciAoY29udGVudHMpIHtcbiAgdmFyIG1hcmtlcjtcbiAgZG8ge1xuICAgIG1hcmtlciA9ICdAQG1hcmtlci4nICsgTWF0aC5yYW5kb20oKSAqIG5ldyBEYXRlKCk7XG4gIH0gd2hpbGUgKGNvbnRlbnRzLmluZGV4T2YobWFya2VyKSAhPT0gLTEpO1xuICByZXR1cm4gbWFya2VyO1xufVxuXG5mdW5jdGlvbiBpbnB1dHMgKGVsKSB7XG4gIHJldHVybiAoKGVsLnRhZ05hbWUgPT09ICdJTlBVVCcgJiYgZWwudHlwZSA9PT0gJ3RleHQnKSB8fCBlbC50YWdOYW1lID09PSAnVEVYVEFSRUEnKTtcbn1cblxuZnVuY3Rpb24gZWFzeVNldCAoZWwsIHApIHtcbiAgZWwuc2VsZWN0aW9uU3RhcnQgPSBwYXJzZShlbCwgcC5zdGFydCk7XG4gIGVsLnNlbGVjdGlvbkVuZCA9IHBhcnNlKGVsLCBwLmVuZCk7XG59XG5cbmZ1bmN0aW9uIGhhcmRTZXQgKGVsLCBwKSB7XG4gIHZhciByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpO1xuXG4gIGlmIChwLnN0YXJ0ID09PSAnZW5kJyAmJiBwLmVuZCA9PT0gJ2VuZCcpIHtcbiAgICByYW5nZS5jb2xsYXBzZShmYWxzZSk7XG4gICAgcmFuZ2Uuc2VsZWN0KCk7XG4gIH0gZWxzZSB7XG4gICAgcmFuZ2UuY29sbGFwc2UodHJ1ZSk7XG4gICAgcmFuZ2UubW92ZUVuZCgnY2hhcmFjdGVyJywgcGFyc2UoZWwsIHAuZW5kKSk7XG4gICAgcmFuZ2UubW92ZVN0YXJ0KCdjaGFyYWN0ZXInLCBwYXJzZShlbCwgcC5zdGFydCkpO1xuICAgIHJhbmdlLnNlbGVjdCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlIChlbCwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09PSAnZW5kJyA/IGVsLnZhbHVlLmxlbmd0aCA6IHZhbHVlIHx8IDA7XG59XG5cbmZ1bmN0aW9uIHNlbGwgKGVsLCBwKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgc2V0KGVsLCBwKTtcbiAgfVxuICByZXR1cm4gZ2V0KGVsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZWxsO1xuIiwidmFyIHNpID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJywgdGljaztcbmlmIChzaSkge1xuICB0aWNrID0gZnVuY3Rpb24gKGZuKSB7IHNldEltbWVkaWF0ZShmbik7IH07XG59IGVsc2Uge1xuICB0aWNrID0gZnVuY3Rpb24gKGZuKSB7IHNldFRpbWVvdXQoZm4sIDApOyB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRpY2s7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiB0ZXh0IChlbCwgdmFsdWUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBlbC5pbm5lclRleHQgPSBlbC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9XG4gIGlmICh0eXBlb2YgZWwuaW5uZXJUZXh0ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBlbC5pbm5lclRleHQ7XG4gIH1cbiAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRleHQ7XG4iXX0=
