!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.insignia=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var dom = require('./dom');
var text = require('./text');
var props = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'textTransform',
  'wordSpacing',
  'textIndent',
  'webkitBoxSizing',
  'mozBoxSizing',
  'boxSizing',
  'padding',
  'border'
];
var offset = 20;

module.exports = function factory (el) {
  var mirror = dom('span');

  document.body.appendChild(mirror);
  remap();
  bind();

  return {
    remap: remap,
    refresh: refresh,
    destroy: destroy
  };

  function remap () {
    var c = computed();
    var value;
    var i;
    for (i = 0; i < props.length; i++) {
      value = c[props[i]];
      if (value !== void 0 && value !== null) { // otherwise IE blows up
        mirror.style[props[i]] = value;
      }
    }
    mirror.disabled = 'disabled';
    mirror.style.whiteSpace = 'pre';
    mirror.style.position = 'absolute';
    mirror.style.top = mirror.style.left = '-9999em';
  }

  function refresh () {
    var value = el.value;
    if (value === mirror.value) {
      return;
    }

    text(mirror, value);

    var width = mirror.offsetWidth + offset;

    el.style.width = width + 'px';
  }

  function bind (remove) {
    var op = remove ? 'remove' : 'add';
    crossvent[op](el, 'keydown', refresh);
    crossvent[op](el, 'keyup', refresh);
    crossvent[op](el, 'input', refresh);
    crossvent[op](el, 'paste', refresh);
    crossvent[op](el, 'change', refresh);
  }

  function destroy () {
    bind(true);
    mirror.parentElement.removeChild(mirror);
    el.style.width = '';
  }

  function computed () {
    if (window.getComputedStyle) {
      return window.getComputedStyle(el);
    }
    return el.currentStyle;
  }
};

},{"./dom":2,"./text":9,"crossvent":4}],2:[function(require,module,exports){
'use strict';

module.exports = function dom (tagName, classes) {
  var el = document.createElement(tagName);
  if (classes) {
    el.className = classes;
  }
  return el;
};

},{}],3:[function(require,module,exports){
'use strict';

require('./polyfills/String.prototype.trim');
require('./polyfills/Array.prototype.indexOf');

var crossvent = require('crossvent');
var dom = require('./dom');
var text = require('./text');
var slice = require('./slice');
var autosize = require('./autosize');
var selection = require('./selection');
var inputTag = /^input$/i;
var ELEMENT = 1;
var BACKSPACE = 8;
var END = 35;
var HOME = 36;
var LEFT = 37;
var RIGHT = 39;
var tagClass = /\bnsg-tag\b/;
var tagRemovalClass = /\bnsg-tag-remove\b/;
var editorClass = /\bnsg-editor\b/g;
var inputClass = /\bnsg-input\b/g;
var end = { start: 'end', end: 'end' };
var cache = [];
var defaultDelimiter = ' ';

function find (el) {
  var entry;
  var i;
  for (i = 0; i < cache.length; i++) {
    entry = cache[i];
    if (entry.el === el) {
      return entry.api;
    }
  }
  return null;
}

function insignia (el, o) {
  var cached = find(el);
  if (cached) {
    return cached;
  }

  var _noselect = document.activeElement !== el;
  var options = o || {};
  var delimiter = options.delimiter || defaultDelimiter;
  if (delimiter.length !== 1) {
    throw new Error('Insignia expected a single-character delimiter string');
  }
  var any = hasSiblings(el);
  if (any || !inputTag.test(el.tagName)) {
    throw new Error('Insignia expected an input element without any siblings');
  }
  var parse = options.parse || defaultParse;
  var validate = options.validate || defaultValidate;

  var before = dom('span', 'nsg-tags nsg-tags-before');
  var after = dom('span', 'nsg-tags nsg-tags-after');
  var parent = el.parentElement;
  el.className += ' nsg-input';
  parent.className += ' nsg-editor';
  parent.insertBefore(before, el);
  parent.insertBefore(after, el.nextSibling);
  bind();

  var auto = autosize(el);
  var api = {
    tags: readTags,
    value: readValue,
    convert: convert,
    destroy: destroy
  };
  var entry = { el: el, api: api };

  evaluate([delimiter], true);
  cache.push(entry);
  _noselect = false;

  return api;

  function bind (remove) {
    var op = remove ? 'remove' : 'add';
    crossvent[op](el, 'keydown', keydown);
    crossvent[op](el, 'keypress', keypress);
    crossvent[op](el, 'paste', paste);
    crossvent[op](parent, 'click', click);
    crossvent[op](document.documentElement, 'focus', documentfocus, true);
  }

  function destroy () {
    bind(true);
    el.value = readValue();
    el.className = el.className.replace(inputClass, '');
    parent.className = parent.className.replace(editorClass, '');
    before.parentElement.removeChild(before);
    after.parentElement.removeChild(after);
    cache.splice(cache.indexOf(entry), 1);
    auto.destroy();
    api.destroyed = true;
    api.destroy = noop(api);
    api.tags = api.value = noop(null);
    return api;
  }

  function noop (value) {
    return function destroyed () {
      return value;
    };
  }

  function documentfocus (e) {
    if (e.target !== el) {
      _noselect = true;
      convert(true);
      _noselect = false;
    }
  }

  function click (e) {
    var target = e.target;
    if (tagRemovalClass.test(target.className)) {
      focusTag(target.parentElement, { start: 'end', end: 'end', remove: true });
      shift();
    } else if (tagClass.test(target.className)) {
      focusTag(target, end);
    } else if (target !== el) {
      shift();
      el.focus();
    }
  }

  function shift () {
    focusTag(after.lastChild, end);
    evaluate([delimiter], true);
  }

  function convert (all) {
    evaluate([delimiter], all);
    if (all) {
      each(after, moveLeft);
    }
    crossvent.fabricate(el, 'insignia-converted');
    return api;
  }

  function moveLeft (value, tag) {
    before.appendChild(tag);
  }

  function keydown (e) {
    var sel = selection(el);
    var key = e.which || e.keyCode || e.charCode;
    if (key === HOME) {
      if (before.firstChild) {
        focusTag(before.firstChild, {});
      } else {
        selection(el, { start: 0, end: 0 });
      }
    } else if (key === END) {
      if (after.lastChild) {
        focusTag(after.lastChild, end);
      } else {
        selection(el, end);
      }
    } else if (key === LEFT && sel.start === 0 && before.lastChild) {
      focusTag(before.lastChild, end);
    } else if (key === BACKSPACE && sel.start === 0 && (sel.end === 0 || sel.end !== el.value.length) && before.lastChild) {
      focusTag(before.lastChild, end);
    } else if (key === RIGHT && sel.end === el.value.length && after.firstChild) {
      focusTag(after.firstChild, {});
    } else {
      return;
    }

    e.preventDefault();
    return false;
  }

  function keypress (e) {
    var key = e.which || e.keyCode || e.charCode;
    if (String.fromCharCode(key) === delimiter) {
      convert();
      e.preventDefault();
      return false;
    }
  }

  function paste () {
    setTimeout(function later () { evaluate(); }, 0);
  }

  function evaluate (extras, entirely) {
    var p = selection(el);
    var len = entirely ? Infinity : p.start;
    var tags = el.value.slice(0, len).concat(extras || []).split(delimiter);
    if (tags.length < 1) {
      return;
    }

    var rest = tags.pop() + el.value.slice(len);
    var removal = tags.join(delimiter).length;
    var i;

    for (i = 0; i < tags.length; i++) {
      createTag(before, tags[i]);
    }
    cleanup();
    el.value = rest;
    p.start -= removal;
    p.end -= removal;
    if (_noselect !== true) { selection(el, p); }
    auto.refresh();
  }

  function cleanup () {
    var tags = [];

    each(before, detect);
    each(after, detect);

    function detect (value, tagElement) {
      if (validate(value, slice(tags))) {
        tags.push(value);
      } else {
        tagElement.parentElement.removeChild(tagElement);
      }
    }
  }

  function createTag (buffer, value) {
    var trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }
    var el = dom('span', 'nsg-tag');
    text(el, parse(trimmed));
    if (options.deletion) {
      el.appendChild(dom('span', 'nsg-tag-remove'));
    }
    buffer.appendChild(el);
  }

  function focusTag (tag, p) {
    if (!tag) {
      return;
    }
    evaluate([delimiter], true);
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
    tag.parentElement.removeChild(tag);
    el.value = p.remove ? '' : text(tag);
    el.focus();
    selection(el, p);
    auto.refresh();
  }

  function hasSiblings () {
    var all = el.parentElement.children;
    var i;
    for (i = 0; i < all.length; i++) {
      if (all[i] !== el && all[i].nodeType === ELEMENT) {
        return true;
      }
    }
    return false;
  }

  function each (side, fn) {
    var children = slice(side.children);
    var i;
    var tag;
    for (i = 0; i < children.length; i++) {
      tag = children[i];
      fn(text(tag), tag, i);
    }
  }

  function readTags () {
    var all = [];
    var values = el.value.split(delimiter);
    var i;

    each(before, add);

    for (i = 0; i < values.length; i++) {
      add(values[i]);
    }

    each(after, add);

    return all;

    function add (value) {
      if (!value) {
        return;
      }
      var tag = parse(value);
      if (validate(tag, slice(all))) {
        all.push(tag);
      }
    }
  }

  function readValue () {
    return readTags().join(delimiter);
  }

  function defaultParse (value) {
    return value.trim().toLowerCase();
  }

  function defaultValidate (value, tags) {
    return tags.indexOf(value) === -1;
  }
}

module.exports = insignia;

},{"./autosize":1,"./dom":2,"./polyfills/Array.prototype.indexOf":5,"./polyfills/String.prototype.trim":6,"./selection":7,"./slice":8,"./text":9,"crossvent":4}],4:[function(require,module,exports){
(function (global){
'use strict';

var addEvent = addEventEasy;
var removeEvent = removeEventEasy;
var hardCache = [];

if (!global.addEventListener) {
  addEvent = addEventHard;
  removeEvent = removeEventHard;
}

function addEventEasy (el, type, fn, capturing) {
  return el.addEventListener(type, fn, capturing);
}

function addEventHard (el, type, fn, capturing) {
  return el.attachEvent('on' + type, wrap(el, type, fn), capturing);
}

function removeEventEasy (el, type, fn) {
  return el.removeEventListener(type, fn);
}

function removeEventHard (el, type, fn) {
  return el.detachEvent('on' + type, unwrap(el, type, fn));
}

function fabricateEvent (el, type) {
  var e = document.createEvent('Event');
  e.initEvent(type, true, true);
  el.dispatchEvent(e);
}

function wrapperFactory (el, type, fn) {
  return function wrapper (originalEvent) {
    var e = originalEvent || global.event;
    e.target = e.target || e.srcElement;
    e.preventDefault  = e.preventDefault  || function preventDefault () { e.returnValue = false; };
    e.stopPropagation = e.stopPropagation || function stopPropagation () { e.cancelBubble = true; };
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

module.exports = {
  add: addEvent,
  remove: removeEvent,
  fabricate: fabricateEvent
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
'use strict';

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (what, start) {
    if (this === undefined || this === null) {
      throw new TypeError();
    }
    var length = this.length;
    start = +start || 0;
    if (Math.abs(start) === Infinity) {
      start = 0;
    } else if (start < 0) {
      start += length;
      if (start < 0) { start = 0; }
    }
    for (; start < length; start++) {
      if (this[start] === what) {
        return start;
      }
    }
    return -1;
  };
}

},{}],6:[function(require,module,exports){
'use strict';

if (!String.prototype.trim) {
  var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
  String.prototype.trim = function () {
    return this.replace(rtrim, '');
  };
}

},{}],7:[function(require,module,exports){
'use strict';

var get = easyGet;
var set = easySet;
var inputTag = /input/i;
var textareaTag = /textarea/i;

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
  return ((inputTag.test(el.tagName) && el.type === 'text') || textareaTag.test(el.tagName));
}

function easySet (el, p) {
  el.selectionStart = special(el, p.start);
  el.selectionEnd = special(el, p.end);
}

function hardSet (el, p) {
  var range = el.createTextRange();

  if (p.start === 'end' && p.end === 'end') {
    range.collapse(false);
    range.select();
  } else {
    range.collapse(true);
    range.moveEnd('character', p.end);
    range.moveStart('character', p.start);
    range.select();
  }
}

function special (el, value) {
  return value === 'end' ? el.value.length : value || 0;
}

function selection (el, p) {
  if (arguments.length === 2) {
    set(el, p);
  }
  return get(el);
}

module.exports = selection;

},{}],8:[function(require,module,exports){
'use strict';

function slice (collection) { // because old IE
  var result = [];
  var i;
  for (i = 0; i < collection.length; i++) {
    result.push(collection[i]);
  }
  return result;
}

module.exports = slice;

},{}],9:[function(require,module,exports){
'use strict';

function text (el, value) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhdXRvc2l6ZS5qcyIsImRvbS5qcyIsImluc2lnbmlhLmpzIiwibm9kZV9tb2R1bGVzL2Nyb3NzdmVudC9zcmMvY3Jvc3N2ZW50LmpzIiwicG9seWZpbGxzL0FycmF5LnByb3RvdHlwZS5pbmRleE9mLmpzIiwicG9seWZpbGxzL1N0cmluZy5wcm90b3R5cGUudHJpbS5qcyIsInNlbGVjdGlvbi5qcyIsInNsaWNlLmpzIiwidGV4dC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyb3NzdmVudCA9IHJlcXVpcmUoJ2Nyb3NzdmVudCcpO1xudmFyIGRvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dCcpO1xudmFyIHByb3BzID0gW1xuICAnZm9udEZhbWlseScsXG4gICdmb250U2l6ZScsXG4gICdmb250V2VpZ2h0JyxcbiAgJ2ZvbnRTdHlsZScsXG4gICdsZXR0ZXJTcGFjaW5nJyxcbiAgJ3RleHRUcmFuc2Zvcm0nLFxuICAnd29yZFNwYWNpbmcnLFxuICAndGV4dEluZGVudCcsXG4gICd3ZWJraXRCb3hTaXppbmcnLFxuICAnbW96Qm94U2l6aW5nJyxcbiAgJ2JveFNpemluZycsXG4gICdwYWRkaW5nJyxcbiAgJ2JvcmRlcidcbl07XG52YXIgb2Zmc2V0ID0gMjA7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFjdG9yeSAoZWwpIHtcbiAgdmFyIG1pcnJvciA9IGRvbSgnc3BhbicpO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobWlycm9yKTtcbiAgcmVtYXAoKTtcbiAgYmluZCgpO1xuXG4gIHJldHVybiB7XG4gICAgcmVtYXA6IHJlbWFwLFxuICAgIHJlZnJlc2g6IHJlZnJlc2gsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuXG4gIGZ1bmN0aW9uIHJlbWFwICgpIHtcbiAgICB2YXIgYyA9IGNvbXB1dGVkKCk7XG4gICAgdmFyIHZhbHVlO1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBjW3Byb3BzW2ldXTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gdm9pZCAwICYmIHZhbHVlICE9PSBudWxsKSB7IC8vIG90aGVyd2lzZSBJRSBibG93cyB1cFxuICAgICAgICBtaXJyb3Iuc3R5bGVbcHJvcHNbaV1dID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIG1pcnJvci5kaXNhYmxlZCA9ICdkaXNhYmxlZCc7XG4gICAgbWlycm9yLnN0eWxlLndoaXRlU3BhY2UgPSAncHJlJztcbiAgICBtaXJyb3Iuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIG1pcnJvci5zdHlsZS50b3AgPSBtaXJyb3Iuc3R5bGUubGVmdCA9ICctOTk5OWVtJztcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZnJlc2ggKCkge1xuICAgIHZhciB2YWx1ZSA9IGVsLnZhbHVlO1xuICAgIGlmICh2YWx1ZSA9PT0gbWlycm9yLnZhbHVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGV4dChtaXJyb3IsIHZhbHVlKTtcblxuICAgIHZhciB3aWR0aCA9IG1pcnJvci5vZmZzZXRXaWR0aCArIG9mZnNldDtcblxuICAgIGVsLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICB9XG5cbiAgZnVuY3Rpb24gYmluZCAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICBjcm9zc3ZlbnRbb3BdKGVsLCAna2V5ZG93bicsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdrZXl1cCcsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdpbnB1dCcsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdwYXN0ZScsIHJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdjaGFuZ2UnLCByZWZyZXNoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlc3Ryb3kgKCkge1xuICAgIGJpbmQodHJ1ZSk7XG4gICAgbWlycm9yLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQobWlycm9yKTtcbiAgICBlbC5zdHlsZS53aWR0aCA9ICcnO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcHV0ZWQgKCkge1xuICAgIGlmICh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsLmN1cnJlbnRTdHlsZTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkb20gKHRhZ05hbWUsIGNsYXNzZXMpIHtcbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgaWYgKGNsYXNzZXMpIHtcbiAgICBlbC5jbGFzc05hbWUgPSBjbGFzc2VzO1xuICB9XG4gIHJldHVybiBlbDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vcG9seWZpbGxzL1N0cmluZy5wcm90b3R5cGUudHJpbScpO1xucmVxdWlyZSgnLi9wb2x5ZmlsbHMvQXJyYXkucHJvdG90eXBlLmluZGV4T2YnKTtcblxudmFyIGNyb3NzdmVudCA9IHJlcXVpcmUoJ2Nyb3NzdmVudCcpO1xudmFyIGRvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG52YXIgdGV4dCA9IHJlcXVpcmUoJy4vdGV4dCcpO1xudmFyIHNsaWNlID0gcmVxdWlyZSgnLi9zbGljZScpO1xudmFyIGF1dG9zaXplID0gcmVxdWlyZSgnLi9hdXRvc2l6ZScpO1xudmFyIHNlbGVjdGlvbiA9IHJlcXVpcmUoJy4vc2VsZWN0aW9uJyk7XG52YXIgaW5wdXRUYWcgPSAvXmlucHV0JC9pO1xudmFyIEVMRU1FTlQgPSAxO1xudmFyIEJBQ0tTUEFDRSA9IDg7XG52YXIgRU5EID0gMzU7XG52YXIgSE9NRSA9IDM2O1xudmFyIExFRlQgPSAzNztcbnZhciBSSUdIVCA9IDM5O1xudmFyIHRhZ0NsYXNzID0gL1xcYm5zZy10YWdcXGIvO1xudmFyIHRhZ1JlbW92YWxDbGFzcyA9IC9cXGJuc2ctdGFnLXJlbW92ZVxcYi87XG52YXIgZWRpdG9yQ2xhc3MgPSAvXFxibnNnLWVkaXRvclxcYi9nO1xudmFyIGlucHV0Q2xhc3MgPSAvXFxibnNnLWlucHV0XFxiL2c7XG52YXIgZW5kID0geyBzdGFydDogJ2VuZCcsIGVuZDogJ2VuZCcgfTtcbnZhciBjYWNoZSA9IFtdO1xudmFyIGRlZmF1bHREZWxpbWl0ZXIgPSAnICc7XG5cbmZ1bmN0aW9uIGZpbmQgKGVsKSB7XG4gIHZhciBlbnRyeTtcbiAgdmFyIGk7XG4gIGZvciAoaSA9IDA7IGkgPCBjYWNoZS5sZW5ndGg7IGkrKykge1xuICAgIGVudHJ5ID0gY2FjaGVbaV07XG4gICAgaWYgKGVudHJ5LmVsID09PSBlbCkge1xuICAgICAgcmV0dXJuIGVudHJ5LmFwaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGluc2lnbmlhIChlbCwgbykge1xuICB2YXIgY2FjaGVkID0gZmluZChlbCk7XG4gIGlmIChjYWNoZWQpIHtcbiAgICByZXR1cm4gY2FjaGVkO1xuICB9XG5cbiAgdmFyIF9ub3NlbGVjdCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IGVsO1xuICB2YXIgb3B0aW9ucyA9IG8gfHwge307XG4gIHZhciBkZWxpbWl0ZXIgPSBvcHRpb25zLmRlbGltaXRlciB8fCBkZWZhdWx0RGVsaW1pdGVyO1xuICBpZiAoZGVsaW1pdGVyLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW5zaWduaWEgZXhwZWN0ZWQgYSBzaW5nbGUtY2hhcmFjdGVyIGRlbGltaXRlciBzdHJpbmcnKTtcbiAgfVxuICB2YXIgYW55ID0gaGFzU2libGluZ3MoZWwpO1xuICBpZiAoYW55IHx8ICFpbnB1dFRhZy50ZXN0KGVsLnRhZ05hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnNpZ25pYSBleHBlY3RlZCBhbiBpbnB1dCBlbGVtZW50IHdpdGhvdXQgYW55IHNpYmxpbmdzJyk7XG4gIH1cbiAgdmFyIHBhcnNlID0gb3B0aW9ucy5wYXJzZSB8fCBkZWZhdWx0UGFyc2U7XG4gIHZhciB2YWxpZGF0ZSA9IG9wdGlvbnMudmFsaWRhdGUgfHwgZGVmYXVsdFZhbGlkYXRlO1xuXG4gIHZhciBiZWZvcmUgPSBkb20oJ3NwYW4nLCAnbnNnLXRhZ3MgbnNnLXRhZ3MtYmVmb3JlJyk7XG4gIHZhciBhZnRlciA9IGRvbSgnc3BhbicsICduc2ctdGFncyBuc2ctdGFncy1hZnRlcicpO1xuICB2YXIgcGFyZW50ID0gZWwucGFyZW50RWxlbWVudDtcbiAgZWwuY2xhc3NOYW1lICs9ICcgbnNnLWlucHV0JztcbiAgcGFyZW50LmNsYXNzTmFtZSArPSAnIG5zZy1lZGl0b3InO1xuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGJlZm9yZSwgZWwpO1xuICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGFmdGVyLCBlbC5uZXh0U2libGluZyk7XG4gIGJpbmQoKTtcblxuICB2YXIgYXV0byA9IGF1dG9zaXplKGVsKTtcbiAgdmFyIGFwaSA9IHtcbiAgICB0YWdzOiByZWFkVGFncyxcbiAgICB2YWx1ZTogcmVhZFZhbHVlLFxuICAgIGNvbnZlcnQ6IGNvbnZlcnQsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuICB2YXIgZW50cnkgPSB7IGVsOiBlbCwgYXBpOiBhcGkgfTtcblxuICBldmFsdWF0ZShbZGVsaW1pdGVyXSwgdHJ1ZSk7XG4gIGNhY2hlLnB1c2goZW50cnkpO1xuICBfbm9zZWxlY3QgPSBmYWxzZTtcblxuICByZXR1cm4gYXBpO1xuXG4gIGZ1bmN0aW9uIGJpbmQgKHJlbW92ZSkge1xuICAgIHZhciBvcCA9IHJlbW92ZSA/ICdyZW1vdmUnIDogJ2FkZCc7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgJ2tleWRvd24nLCBrZXlkb3duKTtcbiAgICBjcm9zc3ZlbnRbb3BdKGVsLCAna2V5cHJlc3MnLCBrZXlwcmVzcyk7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgJ3Bhc3RlJywgcGFzdGUpO1xuICAgIGNyb3NzdmVudFtvcF0ocGFyZW50LCAnY2xpY2snLCBjbGljayk7XG4gICAgY3Jvc3N2ZW50W29wXShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICdmb2N1cycsIGRvY3VtZW50Zm9jdXMsIHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgYmluZCh0cnVlKTtcbiAgICBlbC52YWx1ZSA9IHJlYWRWYWx1ZSgpO1xuICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKGlucHV0Q2xhc3MsICcnKTtcbiAgICBwYXJlbnQuY2xhc3NOYW1lID0gcGFyZW50LmNsYXNzTmFtZS5yZXBsYWNlKGVkaXRvckNsYXNzLCAnJyk7XG4gICAgYmVmb3JlLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoYmVmb3JlKTtcbiAgICBhZnRlci5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGFmdGVyKTtcbiAgICBjYWNoZS5zcGxpY2UoY2FjaGUuaW5kZXhPZihlbnRyeSksIDEpO1xuICAgIGF1dG8uZGVzdHJveSgpO1xuICAgIGFwaS5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIGFwaS5kZXN0cm95ID0gbm9vcChhcGkpO1xuICAgIGFwaS50YWdzID0gYXBpLnZhbHVlID0gbm9vcChudWxsKTtcbiAgICByZXR1cm4gYXBpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9vcCAodmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gZGVzdHJveWVkICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZG9jdW1lbnRmb2N1cyAoZSkge1xuICAgIGlmIChlLnRhcmdldCAhPT0gZWwpIHtcbiAgICAgIF9ub3NlbGVjdCA9IHRydWU7XG4gICAgICBjb252ZXJ0KHRydWUpO1xuICAgICAgX25vc2VsZWN0ID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2xpY2sgKGUpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgaWYgKHRhZ1JlbW92YWxDbGFzcy50ZXN0KHRhcmdldC5jbGFzc05hbWUpKSB7XG4gICAgICBmb2N1c1RhZyh0YXJnZXQucGFyZW50RWxlbWVudCwgeyBzdGFydDogJ2VuZCcsIGVuZDogJ2VuZCcsIHJlbW92ZTogdHJ1ZSB9KTtcbiAgICAgIHNoaWZ0KCk7XG4gICAgfSBlbHNlIGlmICh0YWdDbGFzcy50ZXN0KHRhcmdldC5jbGFzc05hbWUpKSB7XG4gICAgICBmb2N1c1RhZyh0YXJnZXQsIGVuZCk7XG4gICAgfSBlbHNlIGlmICh0YXJnZXQgIT09IGVsKSB7XG4gICAgICBzaGlmdCgpO1xuICAgICAgZWwuZm9jdXMoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzaGlmdCAoKSB7XG4gICAgZm9jdXNUYWcoYWZ0ZXIubGFzdENoaWxkLCBlbmQpO1xuICAgIGV2YWx1YXRlKFtkZWxpbWl0ZXJdLCB0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnZlcnQgKGFsbCkge1xuICAgIGV2YWx1YXRlKFtkZWxpbWl0ZXJdLCBhbGwpO1xuICAgIGlmIChhbGwpIHtcbiAgICAgIGVhY2goYWZ0ZXIsIG1vdmVMZWZ0KTtcbiAgICB9XG4gICAgY3Jvc3N2ZW50LmZhYnJpY2F0ZShlbCwgJ2luc2lnbmlhLWNvbnZlcnRlZCcpO1xuICAgIHJldHVybiBhcGk7XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlTGVmdCAodmFsdWUsIHRhZykge1xuICAgIGJlZm9yZS5hcHBlbmRDaGlsZCh0YWcpO1xuICB9XG5cbiAgZnVuY3Rpb24ga2V5ZG93biAoZSkge1xuICAgIHZhciBzZWwgPSBzZWxlY3Rpb24oZWwpO1xuICAgIHZhciBrZXkgPSBlLndoaWNoIHx8IGUua2V5Q29kZSB8fCBlLmNoYXJDb2RlO1xuICAgIGlmIChrZXkgPT09IEhPTUUpIHtcbiAgICAgIGlmIChiZWZvcmUuZmlyc3RDaGlsZCkge1xuICAgICAgICBmb2N1c1RhZyhiZWZvcmUuZmlyc3RDaGlsZCwge30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZWN0aW9uKGVsLCB7IHN0YXJ0OiAwLCBlbmQ6IDAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChrZXkgPT09IEVORCkge1xuICAgICAgaWYgKGFmdGVyLmxhc3RDaGlsZCkge1xuICAgICAgICBmb2N1c1RhZyhhZnRlci5sYXN0Q2hpbGQsIGVuZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxlY3Rpb24oZWwsIGVuZCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChrZXkgPT09IExFRlQgJiYgc2VsLnN0YXJ0ID09PSAwICYmIGJlZm9yZS5sYXN0Q2hpbGQpIHtcbiAgICAgIGZvY3VzVGFnKGJlZm9yZS5sYXN0Q2hpbGQsIGVuZCk7XG4gICAgfSBlbHNlIGlmIChrZXkgPT09IEJBQ0tTUEFDRSAmJiBzZWwuc3RhcnQgPT09IDAgJiYgKHNlbC5lbmQgPT09IDAgfHwgc2VsLmVuZCAhPT0gZWwudmFsdWUubGVuZ3RoKSAmJiBiZWZvcmUubGFzdENoaWxkKSB7XG4gICAgICBmb2N1c1RhZyhiZWZvcmUubGFzdENoaWxkLCBlbmQpO1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBSSUdIVCAmJiBzZWwuZW5kID09PSBlbC52YWx1ZS5sZW5ndGggJiYgYWZ0ZXIuZmlyc3RDaGlsZCkge1xuICAgICAgZm9jdXNUYWcoYWZ0ZXIuZmlyc3RDaGlsZCwge30pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleXByZXNzIChlKSB7XG4gICAgdmFyIGtleSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlIHx8IGUuY2hhckNvZGU7XG4gICAgaWYgKFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5KSA9PT0gZGVsaW1pdGVyKSB7XG4gICAgICBjb252ZXJ0KCk7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGFzdGUgKCkge1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gbGF0ZXIgKCkgeyBldmFsdWF0ZSgpOyB9LCAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV2YWx1YXRlIChleHRyYXMsIGVudGlyZWx5KSB7XG4gICAgdmFyIHAgPSBzZWxlY3Rpb24oZWwpO1xuICAgIHZhciBsZW4gPSBlbnRpcmVseSA/IEluZmluaXR5IDogcC5zdGFydDtcbiAgICB2YXIgdGFncyA9IGVsLnZhbHVlLnNsaWNlKDAsIGxlbikuY29uY2F0KGV4dHJhcyB8fCBbXSkuc3BsaXQoZGVsaW1pdGVyKTtcbiAgICBpZiAodGFncy5sZW5ndGggPCAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHJlc3QgPSB0YWdzLnBvcCgpICsgZWwudmFsdWUuc2xpY2UobGVuKTtcbiAgICB2YXIgcmVtb3ZhbCA9IHRhZ3Muam9pbihkZWxpbWl0ZXIpLmxlbmd0aDtcbiAgICB2YXIgaTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0YWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjcmVhdGVUYWcoYmVmb3JlLCB0YWdzW2ldKTtcbiAgICB9XG4gICAgY2xlYW51cCgpO1xuICAgIGVsLnZhbHVlID0gcmVzdDtcbiAgICBwLnN0YXJ0IC09IHJlbW92YWw7XG4gICAgcC5lbmQgLT0gcmVtb3ZhbDtcbiAgICBpZiAoX25vc2VsZWN0ICE9PSB0cnVlKSB7IHNlbGVjdGlvbihlbCwgcCk7IH1cbiAgICBhdXRvLnJlZnJlc2goKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFudXAgKCkge1xuICAgIHZhciB0YWdzID0gW107XG5cbiAgICBlYWNoKGJlZm9yZSwgZGV0ZWN0KTtcbiAgICBlYWNoKGFmdGVyLCBkZXRlY3QpO1xuXG4gICAgZnVuY3Rpb24gZGV0ZWN0ICh2YWx1ZSwgdGFnRWxlbWVudCkge1xuICAgICAgaWYgKHZhbGlkYXRlKHZhbHVlLCBzbGljZSh0YWdzKSkpIHtcbiAgICAgICAgdGFncy5wdXNoKHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZ0VsZW1lbnQucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0YWdFbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUYWcgKGJ1ZmZlciwgdmFsdWUpIHtcbiAgICB2YXIgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcbiAgICBpZiAodHJpbW1lZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGVsID0gZG9tKCdzcGFuJywgJ25zZy10YWcnKTtcbiAgICB0ZXh0KGVsLCBwYXJzZSh0cmltbWVkKSk7XG4gICAgaWYgKG9wdGlvbnMuZGVsZXRpb24pIHtcbiAgICAgIGVsLmFwcGVuZENoaWxkKGRvbSgnc3BhbicsICduc2ctdGFnLXJlbW92ZScpKTtcbiAgICB9XG4gICAgYnVmZmVyLmFwcGVuZENoaWxkKGVsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvY3VzVGFnICh0YWcsIHApIHtcbiAgICBpZiAoIXRhZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBldmFsdWF0ZShbZGVsaW1pdGVyXSwgdHJ1ZSk7XG4gICAgdmFyIHBhcmVudCA9IHRhZy5wYXJlbnRFbGVtZW50O1xuICAgIGlmIChwYXJlbnQgPT09IGJlZm9yZSkge1xuICAgICAgd2hpbGUgKHBhcmVudC5sYXN0Q2hpbGQgIT09IHRhZykge1xuICAgICAgICBhZnRlci5pbnNlcnRCZWZvcmUocGFyZW50Lmxhc3RDaGlsZCwgYWZ0ZXIuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlIChwYXJlbnQuZmlyc3RDaGlsZCAhPT0gdGFnKSB7XG4gICAgICAgIGJlZm9yZS5hcHBlbmRDaGlsZChwYXJlbnQuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRhZy5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRhZyk7XG4gICAgZWwudmFsdWUgPSBwLnJlbW92ZSA/ICcnIDogdGV4dCh0YWcpO1xuICAgIGVsLmZvY3VzKCk7XG4gICAgc2VsZWN0aW9uKGVsLCBwKTtcbiAgICBhdXRvLnJlZnJlc2goKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc1NpYmxpbmdzICgpIHtcbiAgICB2YXIgYWxsID0gZWwucGFyZW50RWxlbWVudC5jaGlsZHJlbjtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgYWxsLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYWxsW2ldICE9PSBlbCAmJiBhbGxbaV0ubm9kZVR5cGUgPT09IEVMRU1FTlQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVhY2ggKHNpZGUsIGZuKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gc2xpY2Uoc2lkZS5jaGlsZHJlbik7XG4gICAgdmFyIGk7XG4gICAgdmFyIHRhZztcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRhZyA9IGNoaWxkcmVuW2ldO1xuICAgICAgZm4odGV4dCh0YWcpLCB0YWcsIGkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRUYWdzICgpIHtcbiAgICB2YXIgYWxsID0gW107XG4gICAgdmFyIHZhbHVlcyA9IGVsLnZhbHVlLnNwbGl0KGRlbGltaXRlcik7XG4gICAgdmFyIGk7XG5cbiAgICBlYWNoKGJlZm9yZSwgYWRkKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFkZCh2YWx1ZXNbaV0pO1xuICAgIH1cblxuICAgIGVhY2goYWZ0ZXIsIGFkZCk7XG5cbiAgICByZXR1cm4gYWxsO1xuXG4gICAgZnVuY3Rpb24gYWRkICh2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgdGFnID0gcGFyc2UodmFsdWUpO1xuICAgICAgaWYgKHZhbGlkYXRlKHRhZywgc2xpY2UoYWxsKSkpIHtcbiAgICAgICAgYWxsLnB1c2godGFnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkVmFsdWUgKCkge1xuICAgIHJldHVybiByZWFkVGFncygpLmpvaW4oZGVsaW1pdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZmF1bHRQYXJzZSAodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWZhdWx0VmFsaWRhdGUgKHZhbHVlLCB0YWdzKSB7XG4gICAgcmV0dXJuIHRhZ3MuaW5kZXhPZih2YWx1ZSkgPT09IC0xO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zaWduaWE7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhZGRFdmVudCA9IGFkZEV2ZW50RWFzeTtcbnZhciByZW1vdmVFdmVudCA9IHJlbW92ZUV2ZW50RWFzeTtcbnZhciBoYXJkQ2FjaGUgPSBbXTtcblxuaWYgKCFnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICBhZGRFdmVudCA9IGFkZEV2ZW50SGFyZDtcbiAgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEhhcmQ7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50SGFyZCAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLmF0dGFjaEV2ZW50KCdvbicgKyB0eXBlLCB3cmFwKGVsLCB0eXBlLCBmbiksIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBlbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGZuKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRIYXJkIChlbCwgdHlwZSwgZm4pIHtcbiAgcmV0dXJuIGVsLmRldGFjaEV2ZW50KCdvbicgKyB0eXBlLCB1bndyYXAoZWwsIHR5cGUsIGZuKSk7XG59XG5cbmZ1bmN0aW9uIGZhYnJpY2F0ZUV2ZW50IChlbCwgdHlwZSkge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICBlLmluaXRFdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgZWwuZGlzcGF0Y2hFdmVudChlKTtcbn1cblxuZnVuY3Rpb24gd3JhcHBlckZhY3RvcnkgKGVsLCB0eXBlLCBmbikge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcHBlciAob3JpZ2luYWxFdmVudCkge1xuICAgIHZhciBlID0gb3JpZ2luYWxFdmVudCB8fCBnbG9iYWwuZXZlbnQ7XG4gICAgZS50YXJnZXQgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCAgPSBlLnByZXZlbnREZWZhdWx0ICB8fCBmdW5jdGlvbiBwcmV2ZW50RGVmYXVsdCAoKSB7IGUucmV0dXJuVmFsdWUgPSBmYWxzZTsgfTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IGUuc3RvcFByb3BhZ2F0aW9uIHx8IGZ1bmN0aW9uIHN0b3BQcm9wYWdhdGlvbiAoKSB7IGUuY2FuY2VsQnViYmxlID0gdHJ1ZTsgfTtcbiAgICBmbi5jYWxsKGVsLCBlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gd3JhcCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciB3cmFwcGVyID0gdW53cmFwKGVsLCB0eXBlLCBmbikgfHwgd3JhcHBlckZhY3RvcnkoZWwsIHR5cGUsIGZuKTtcbiAgaGFyZENhY2hlLnB1c2goe1xuICAgIHdyYXBwZXI6IHdyYXBwZXIsXG4gICAgZWxlbWVudDogZWwsXG4gICAgdHlwZTogdHlwZSxcbiAgICBmbjogZm5cbiAgfSk7XG4gIHJldHVybiB3cmFwcGVyO1xufVxuXG5mdW5jdGlvbiB1bndyYXAgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgaSA9IGZpbmQoZWwsIHR5cGUsIGZuKTtcbiAgaWYgKGkpIHtcbiAgICB2YXIgd3JhcHBlciA9IGhhcmRDYWNoZVtpXS53cmFwcGVyO1xuICAgIGhhcmRDYWNoZS5zcGxpY2UoaSwgMSk7IC8vIGZyZWUgdXAgYSB0YWQgb2YgbWVtb3J5XG4gICAgcmV0dXJuIHdyYXBwZXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciBpLCBpdGVtO1xuICBmb3IgKGkgPSAwOyBpIDwgaGFyZENhY2hlLmxlbmd0aDsgaSsrKSB7XG4gICAgaXRlbSA9IGhhcmRDYWNoZVtpXTtcbiAgICBpZiAoaXRlbS5lbGVtZW50ID09PSBlbCAmJiBpdGVtLnR5cGUgPT09IHR5cGUgJiYgaXRlbS5mbiA9PT0gZm4pIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGRFdmVudCxcbiAgcmVtb3ZlOiByZW1vdmVFdmVudCxcbiAgZmFicmljYXRlOiBmYWJyaWNhdGVFdmVudFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaWYgKCFBcnJheS5wcm90b3R5cGUuaW5kZXhPZikge1xuICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uICh3aGF0LCBzdGFydCkge1xuICAgIGlmICh0aGlzID09PSB1bmRlZmluZWQgfHwgdGhpcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gICAgc3RhcnQgPSArc3RhcnQgfHwgMDtcbiAgICBpZiAoTWF0aC5hYnMoc3RhcnQpID09PSBJbmZpbml0eSkge1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH0gZWxzZSBpZiAoc3RhcnQgPCAwKSB7XG4gICAgICBzdGFydCArPSBsZW5ndGg7XG4gICAgICBpZiAoc3RhcnQgPCAwKSB7IHN0YXJ0ID0gMDsgfVxuICAgIH1cbiAgICBmb3IgKDsgc3RhcnQgPCBsZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmICh0aGlzW3N0YXJ0XSA9PT0gd2hhdCkge1xuICAgICAgICByZXR1cm4gc3RhcnQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaWYgKCFTdHJpbmcucHJvdG90eXBlLnRyaW0pIHtcbiAgdmFyIHJ0cmltID0gL15bXFxzXFx1RkVGRlxceEEwXSt8W1xcc1xcdUZFRkZcXHhBMF0rJC9nO1xuICBTdHJpbmcucHJvdG90eXBlLnRyaW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMucmVwbGFjZShydHJpbSwgJycpO1xuICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZ2V0ID0gZWFzeUdldDtcbnZhciBzZXQgPSBlYXN5U2V0O1xudmFyIGlucHV0VGFnID0gL2lucHV0L2k7XG52YXIgdGV4dGFyZWFUYWcgPSAvdGV4dGFyZWEvaTtcblxuaWYgKGRvY3VtZW50LnNlbGVjdGlvbiAmJiBkb2N1bWVudC5zZWxlY3Rpb24uY3JlYXRlUmFuZ2UpIHtcbiAgZ2V0ID0gaGFyZEdldDtcbiAgc2V0ID0gaGFyZFNldDtcbn1cblxuZnVuY3Rpb24gZWFzeUdldCAoZWwpIHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogZWwuc2VsZWN0aW9uU3RhcnQsXG4gICAgZW5kOiBlbC5zZWxlY3Rpb25FbmRcbiAgfTtcbn1cblxuZnVuY3Rpb24gaGFyZEdldCAoZWwpIHtcbiAgdmFyIGFjdGl2ZSA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7XG4gIGlmIChhY3RpdmUgIT09IGVsKSB7XG4gICAgZWwuZm9jdXMoKTtcbiAgfVxuXG4gIHZhciByYW5nZSA9IGRvY3VtZW50LnNlbGVjdGlvbi5jcmVhdGVSYW5nZSgpO1xuICB2YXIgYm9va21hcmsgPSByYW5nZS5nZXRCb29rbWFyaygpO1xuICB2YXIgb3JpZ2luYWwgPSBlbC52YWx1ZTtcbiAgdmFyIG1hcmtlciA9IGdldFVuaXF1ZU1hcmtlcihvcmlnaW5hbCk7XG4gIHZhciBwYXJlbnQgPSByYW5nZS5wYXJlbnRFbGVtZW50KCk7XG4gIGlmIChwYXJlbnQgPT09IG51bGwgfHwgIWlucHV0cyhwYXJlbnQpKSB7XG4gICAgcmV0dXJuIHJlc3VsdCgwLCAwKTtcbiAgfVxuICByYW5nZS50ZXh0ID0gbWFya2VyICsgcmFuZ2UudGV4dCArIG1hcmtlcjtcblxuICB2YXIgY29udGVudHMgPSBlbC52YWx1ZTtcblxuICBlbC52YWx1ZSA9IG9yaWdpbmFsO1xuICByYW5nZS5tb3ZlVG9Cb29rbWFyayhib29rbWFyayk7XG4gIHJhbmdlLnNlbGVjdCgpO1xuXG4gIHJldHVybiByZXN1bHQoY29udGVudHMuaW5kZXhPZihtYXJrZXIpLCBjb250ZW50cy5sYXN0SW5kZXhPZihtYXJrZXIpIC0gbWFya2VyLmxlbmd0aCk7XG5cbiAgZnVuY3Rpb24gcmVzdWx0IChzdGFydCwgZW5kKSB7XG4gICAgaWYgKGFjdGl2ZSAhPT0gZWwpIHsgLy8gZG9uJ3QgZGlzcnVwdCBwcmUtZXhpc3Rpbmcgc3RhdGVcbiAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgYWN0aXZlLmZvY3VzKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbC5ibHVyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7IHN0YXJ0OiBzdGFydCwgZW5kOiBlbmQgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRVbmlxdWVNYXJrZXIgKGNvbnRlbnRzKSB7XG4gIHZhciBtYXJrZXI7XG4gIGRvIHtcbiAgICBtYXJrZXIgPSAnQEBtYXJrZXIuJyArIE1hdGgucmFuZG9tKCkgKiBuZXcgRGF0ZSgpO1xuICB9IHdoaWxlIChjb250ZW50cy5pbmRleE9mKG1hcmtlcikgIT09IC0xKTtcbiAgcmV0dXJuIG1hcmtlcjtcbn1cblxuZnVuY3Rpb24gaW5wdXRzIChlbCkge1xuICByZXR1cm4gKChpbnB1dFRhZy50ZXN0KGVsLnRhZ05hbWUpICYmIGVsLnR5cGUgPT09ICd0ZXh0JykgfHwgdGV4dGFyZWFUYWcudGVzdChlbC50YWdOYW1lKSk7XG59XG5cbmZ1bmN0aW9uIGVhc3lTZXQgKGVsLCBwKSB7XG4gIGVsLnNlbGVjdGlvblN0YXJ0ID0gc3BlY2lhbChlbCwgcC5zdGFydCk7XG4gIGVsLnNlbGVjdGlvbkVuZCA9IHNwZWNpYWwoZWwsIHAuZW5kKTtcbn1cblxuZnVuY3Rpb24gaGFyZFNldCAoZWwsIHApIHtcbiAgdmFyIHJhbmdlID0gZWwuY3JlYXRlVGV4dFJhbmdlKCk7XG5cbiAgaWYgKHAuc3RhcnQgPT09ICdlbmQnICYmIHAuZW5kID09PSAnZW5kJykge1xuICAgIHJhbmdlLmNvbGxhcHNlKGZhbHNlKTtcbiAgICByYW5nZS5zZWxlY3QoKTtcbiAgfSBlbHNlIHtcbiAgICByYW5nZS5jb2xsYXBzZSh0cnVlKTtcbiAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLCBwLmVuZCk7XG4gICAgcmFuZ2UubW92ZVN0YXJ0KCdjaGFyYWN0ZXInLCBwLnN0YXJ0KTtcbiAgICByYW5nZS5zZWxlY3QoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzcGVjaWFsIChlbCwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09PSAnZW5kJyA/IGVsLnZhbHVlLmxlbmd0aCA6IHZhbHVlIHx8IDA7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbiAoZWwsIHApIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBzZXQoZWwsIHApO1xuICB9XG4gIHJldHVybiBnZXQoZWwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gc2xpY2UgKGNvbGxlY3Rpb24pIHsgLy8gYmVjYXVzZSBvbGQgSUVcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICB2YXIgaTtcbiAgZm9yIChpID0gMDsgaSA8IGNvbGxlY3Rpb24ubGVuZ3RoOyBpKyspIHtcbiAgICByZXN1bHQucHVzaChjb2xsZWN0aW9uW2ldKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNsaWNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiB0ZXh0IChlbCwgdmFsdWUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBlbC5pbm5lclRleHQgPSBlbC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9XG4gIGlmICh0eXBlb2YgZWwuaW5uZXJUZXh0ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBlbC5pbm5lclRleHQ7XG4gIH1cbiAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRleHQ7XG4iXX0=
