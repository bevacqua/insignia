!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.insignia=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/nico/dev/insignia/autosize.js":[function(require,module,exports){
'use strict';

var dom = require('./dom');
var text = require('./text');
var events = require('./events');
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

module.exports = function factory (el, fn) {
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
    var i;
    var c = computed();
    for (i = 0; i < props.length; i++) {
      mirror.style[props[i]] = c[props[i]];
    }
    mirror.setAttribute('disabled', 'disabled');
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
    events[op](el, 'keydown', refresh);
    events[op](el, 'keyup', refresh);
    events[op](el, 'input', refresh);
    events[op](el, 'paste', refresh);
    events[op](el, 'change', refresh);
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

},{"./dom":"/Users/nico/dev/insignia/dom.js","./events":"/Users/nico/dev/insignia/events.js","./text":"/Users/nico/dev/insignia/text.js"}],"/Users/nico/dev/insignia/dom.js":[function(require,module,exports){
'use strict';

module.exports = function dom (tagName, classes) {
  var el = document.createElement(tagName);
  if (classes) {
    el.className = classes;
  }
  return el;
};

},{}],"/Users/nico/dev/insignia/events.js":[function(require,module,exports){
(function (global){
'use strict';

var addEvent = addEventEasy;
var removeEvent = removeEventEasy;
var hardCache = [];

if (!global.addEventListener) {
  addEvent = addEventHard;
}

if (!global.removeEventListener) {
  removeEvent = removeEventHard;
}

function addEventEasy (el, evt, fn, capture) {
  return el.addEventListener(evt, fn, capture);
}

function addEventHard (el, evt, fn, capture) {
  return el.attachEvent('on' + evt, wrap(el, evt, fn), capture);
}

function removeEventEasy (el, evt, fn, capture) {
  return el.removeEventListener(evt, fn, capture);
}

function removeEventHard (el, evt, fn, capture) {
  return el.detachEvent('on' + evt, unwrap(el, evt, fn), capture);
}

function wrapperFactory (el, evt, fn) {
  return function wrapper (originalEvent) {
    var e = originalEvent || global.event;
    e.target = e.target || e.srcElement;
    e.preventDefault  = e.preventDefault  || function preventDefault () { e.returnValue = false; };
    e.stopPropagation = e.stopPropagation || function stopPropagation () { e.cancelBubble = true; };
    fn.call(el, e);
  };
}

function wrap (el, evt, fn) {
  var wrapper = unwrap(el, evt, fn) || wrapperFactory(el, evt, fn);
  hardCache.push({
    wrapper: wrapper,
    element: el,
    evt: evt,
    fn: fn
  });
  return wrapper;
}

function unwrap (el, evt, fn) {
  var i = find(el, evt, fn);
  if (i) {
    var wrapper = hardCache[i].wrapper;
    hardCache.splice(i, 1); // free up a tad of memory
    return wrapper;
  }
}

function find (el, evt, fn) {
  var i, item;
  for (i = 0; i < hardCache.length; i++) {
    item = hardCache[i];
    if (item.element === el && item.evt === evt && item.fn === fn) {
      return i;
    }
  }
}

module.exports = {
  add: addEvent,
  remove: removeEvent
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/Users/nico/dev/insignia/insignia.js":[function(require,module,exports){
'use strict';

var dom = require('./dom');
var text = require('./text');
var events = require('./events');
var autosize = require('./autosize');
var selection = require('./selection');
var inputTag = /^input$/i;
var spaces = /^\s*$/;
var ELEMENT = 1;
var BACKSPACE = 8;
var SPACE = 32;
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

  // TODO cross browser selection ranges

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

  var options = o || {};
  var any = hasSiblings(el);
  if (any || !inputTag.test(el.tagName)) {
    throw new Error('Insignia expected an input element without any siblings.');
  }

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
    tags: tags,
    value: value,
    destroy: destroy
  };
  var entry = { el: el, api: api };

  evaluate([' '], true);
  cache.push(entry);

  return api;

  function bind (remove) {
    var op = remove ? 'remove' : 'add';
    events[op](el, 'keydown', keydown);
    events[op](el, 'paste', paste);
    events[op](parent, 'click', click);
    events[op](document.documentElement, 'focus', documentblur, true);
  }

  function destroy () {
    bind(true);
    el.value = value();
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
    }
  }

  function documentblur (e) {
    if (e.target !== el) {
      evaluate([' '], true);
      each(after, move);
    }

    function move (value, tag) {
      before.appendChild(tag);
    }
  }

  function click (e) {
    var target = e.target;
    if (tagRemovalClass.test(target.className)) {
      focusTag(target.parentElement, { start: 'end', end: 'end', remove: true });
    } else if (tagClass.test(target.className)) {
      focusTag(target, end);
    } else if (target !== el) {
      focusTag(after.lastChild, end);
      evaluate([' '], true);
      el.focus();
    }
  }

  function keydown (e) {
    var partial;
    var sel = selection(el);
    var key = e.which || e.keyCode || e.charCode;
    if (key === SPACE) {
      partial = el.value.slice(0, sel.start);
      evaluate(spaces.test(partial) ? null : [' ']);
    } else if (key === HOME) {
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

  function paste () {
    setTimeout(function later () { evaluate(); }, 0);
  }

  function evaluate (extras, entirely) {
    var p = selection(el);
    var len = entirely ? Infinity : p.start;
    var tags = el.value.slice(0, len).concat(extras || []).split(' ');
    if (tags.length < 1) {
      return;
    }

    var rest = tags.pop() + el.value.slice(len);
    var removal = tags.join(' ').length;
    var i;

    for (i = 0; i < tags.length; i++) {
      createTag(before, tags[i]);
    }
    cleanup();
    el.value = rest;
    p.start -= removal;
    p.end -= removal;
    selection(el, p);
    auto.refresh();
  }

  function cleanup () {
    var tags = [];

    each(before, detect);
    each(after, detect);

    function detect (value, tag) {
      if (tags.indexOf(value) !== -1) {
        tag.parentElement.removeChild(tag);
      } else {
        tags.push(value);
      }
    }
  }

  function createTag (buffer, value) {
    var trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }
    var el = dom('span', 'nsg-tag');
    text(el, trimmed);
    if (options.deletion) {
      el.appendChild(dom('span', 'nsg-tag-remove'));
    }
    buffer.appendChild(el);
  }

  function focusTag (tag, p) {
    if (!tag) {
      return;
    }
    evaluate([' '], true);
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
    var children = Array.prototype.slice.call(side.children);
    var i;
    var tag;
    for (i = 0; i < children.length; i++) {
      tag = children[i];
      fn(text(tag).trim(), tag, i);
    }
  }

  function tags () {
    var all = [];
    var values = el.value.split(' ');
    var i;

    each(before, add);

    for (i = 0; i < values.length; i++) {
      add(values[i]);
    }

    each(after, add);

    return all;

    function add (value) {
      if (value && all.indexOf(value) === -1) {
        all.push(value);
      }
    }
  }

  function value () {
    return tags().join(' ');
  }
}

module.exports = insignia;

},{"./autosize":"/Users/nico/dev/insignia/autosize.js","./dom":"/Users/nico/dev/insignia/dom.js","./events":"/Users/nico/dev/insignia/events.js","./selection":"/Users/nico/dev/insignia/selection.js","./text":"/Users/nico/dev/insignia/text.js"}],"/Users/nico/dev/insignia/selection.js":[function(require,module,exports){
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
  throw new Error('selection unsupported yet on old browsers');
  // var range = document.selection.createRange();
  // var bookmark = range.getBookmark();
  // var originalContents = el.value;
  // var marker = getUniqueMarker(originalContents);
  // var parent = range.parentElement();
  // if (parent === null || parent.type !== 'textarea') {
  //     return { start: 0, end: 0 };
  // }
  // range.text = marker + range.text + marker;

  // var contents = el.value;

  // el.value = originalContents;
  // range.moveToBookmark(bookmark);
  // range.select();

  // return {
  //   start: contents.indexOf(marker),
  //   end: contents.lastIndexOf(marker)
  // };
}

function getUniqueMarker (contents) {
  var marker;
  do {
    marker = '##MARKER_' + Math.random() * Date.now();
  } while (contents.indexOf(marker) !== -1);
  return marker;
}

function easySet (el, p) {
  el.selectionStart = special(el, p.start);
  el.selectionEnd = special(el, p.end);
}

function hardSet (el, p) {
  throw new Error('selection unsupported yet on old browsers');
  // var range;

  // if (p.start === 'end' && p.end === 'end') {
  //   range = el.createTextRange();
  //   range.collapse(false);
  //   range.select();
  // }
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

},{}],"/Users/nico/dev/insignia/text.js":[function(require,module,exports){
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

},{}]},{},["/Users/nico/dev/insignia/insignia.js"])("/Users/nico/dev/insignia/insignia.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYXV0b3NpemUuanMiLCJkb20uanMiLCJldmVudHMuanMiLCJpbnNpZ25pYS5qcyIsInNlbGVjdGlvbi5qcyIsInRleHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBkb20gPSByZXF1aXJlKCcuL2RvbScpO1xudmFyIHRleHQgPSByZXF1aXJlKCcuL3RleHQnKTtcbnZhciBldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpO1xudmFyIHByb3BzID0gW1xuICAnZm9udEZhbWlseScsXG4gICdmb250U2l6ZScsXG4gICdmb250V2VpZ2h0JyxcbiAgJ2ZvbnRTdHlsZScsXG4gICdsZXR0ZXJTcGFjaW5nJyxcbiAgJ3RleHRUcmFuc2Zvcm0nLFxuICAnd29yZFNwYWNpbmcnLFxuICAndGV4dEluZGVudCcsXG4gICd3ZWJraXRCb3hTaXppbmcnLFxuICAnbW96Qm94U2l6aW5nJyxcbiAgJ2JveFNpemluZycsXG4gICdwYWRkaW5nJyxcbiAgJ2JvcmRlcidcbl07XG52YXIgb2Zmc2V0ID0gMjA7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFjdG9yeSAoZWwsIGZuKSB7XG4gIHZhciBtaXJyb3IgPSBkb20oJ3NwYW4nKTtcblxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG1pcnJvcik7XG4gIHJlbWFwKCk7XG4gIGJpbmQoKTtcblxuICByZXR1cm4ge1xuICAgIHJlbWFwOiByZW1hcCxcbiAgICByZWZyZXNoOiByZWZyZXNoLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3lcbiAgfTtcblxuICBmdW5jdGlvbiByZW1hcCAoKSB7XG4gICAgdmFyIGk7XG4gICAgdmFyIGMgPSBjb21wdXRlZCgpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgbWlycm9yLnN0eWxlW3Byb3BzW2ldXSA9IGNbcHJvcHNbaV1dO1xuICAgIH1cbiAgICBtaXJyb3Iuc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpO1xuICAgIG1pcnJvci5zdHlsZS53aGl0ZVNwYWNlID0gJ3ByZSc7XG4gICAgbWlycm9yLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICBtaXJyb3Iuc3R5bGUudG9wID0gbWlycm9yLnN0eWxlLmxlZnQgPSAnLTk5OTllbSc7XG4gIH1cblxuICBmdW5jdGlvbiByZWZyZXNoICgpIHtcbiAgICB2YXIgdmFsdWUgPSBlbC52YWx1ZTtcbiAgICBpZiAodmFsdWUgPT09IG1pcnJvci52YWx1ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRleHQobWlycm9yLCB2YWx1ZSk7XG5cbiAgICB2YXIgd2lkdGggPSBtaXJyb3Iub2Zmc2V0V2lkdGggKyBvZmZzZXQ7XG5cbiAgICBlbC5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbmQgKHJlbW92ZSkge1xuICAgIHZhciBvcCA9IHJlbW92ZSA/ICdyZW1vdmUnIDogJ2FkZCc7XG4gICAgZXZlbnRzW29wXShlbCwgJ2tleWRvd24nLCByZWZyZXNoKTtcbiAgICBldmVudHNbb3BdKGVsLCAna2V5dXAnLCByZWZyZXNoKTtcbiAgICBldmVudHNbb3BdKGVsLCAnaW5wdXQnLCByZWZyZXNoKTtcbiAgICBldmVudHNbb3BdKGVsLCAncGFzdGUnLCByZWZyZXNoKTtcbiAgICBldmVudHNbb3BdKGVsLCAnY2hhbmdlJywgcmVmcmVzaCk7XG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95ICgpIHtcbiAgICBiaW5kKHRydWUpO1xuICAgIG1pcnJvci5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKG1pcnJvcik7XG4gICAgZWwuc3R5bGUud2lkdGggPSAnJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXB1dGVkICgpIHtcbiAgICBpZiAod2luZG93LmdldENvbXB1dGVkU3R5bGUpIHtcbiAgICAgIHJldHVybiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG4gICAgfVxuICAgIHJldHVybiBlbC5jdXJyZW50U3R5bGU7XG4gIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZG9tICh0YWdOYW1lLCBjbGFzc2VzKSB7XG4gIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIGlmIChjbGFzc2VzKSB7XG4gICAgZWwuY2xhc3NOYW1lID0gY2xhc3NlcztcbiAgfVxuICByZXR1cm4gZWw7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYWRkRXZlbnQgPSBhZGRFdmVudEVhc3k7XG52YXIgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEVhc3k7XG52YXIgaGFyZENhY2hlID0gW107XG5cbmlmICghZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgYWRkRXZlbnQgPSBhZGRFdmVudEhhcmQ7XG59XG5cbmlmICghZ2xvYmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEhhcmQ7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50RWFzeSAoZWwsIGV2dCwgZm4sIGNhcHR1cmUpIHtcbiAgcmV0dXJuIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZ0LCBmbiwgY2FwdHVyZSk7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50SGFyZCAoZWwsIGV2dCwgZm4sIGNhcHR1cmUpIHtcbiAgcmV0dXJuIGVsLmF0dGFjaEV2ZW50KCdvbicgKyBldnQsIHdyYXAoZWwsIGV2dCwgZm4pLCBjYXB0dXJlKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRFYXN5IChlbCwgZXZ0LCBmbiwgY2FwdHVyZSkge1xuICByZXR1cm4gZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldnQsIGZuLCBjYXB0dXJlKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRIYXJkIChlbCwgZXZ0LCBmbiwgY2FwdHVyZSkge1xuICByZXR1cm4gZWwuZGV0YWNoRXZlbnQoJ29uJyArIGV2dCwgdW53cmFwKGVsLCBldnQsIGZuKSwgY2FwdHVyZSk7XG59XG5cbmZ1bmN0aW9uIHdyYXBwZXJGYWN0b3J5IChlbCwgZXZ0LCBmbikge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcHBlciAob3JpZ2luYWxFdmVudCkge1xuICAgIHZhciBlID0gb3JpZ2luYWxFdmVudCB8fCBnbG9iYWwuZXZlbnQ7XG4gICAgZS50YXJnZXQgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCAgPSBlLnByZXZlbnREZWZhdWx0ICB8fCBmdW5jdGlvbiBwcmV2ZW50RGVmYXVsdCAoKSB7IGUucmV0dXJuVmFsdWUgPSBmYWxzZTsgfTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IGUuc3RvcFByb3BhZ2F0aW9uIHx8IGZ1bmN0aW9uIHN0b3BQcm9wYWdhdGlvbiAoKSB7IGUuY2FuY2VsQnViYmxlID0gdHJ1ZTsgfTtcbiAgICBmbi5jYWxsKGVsLCBlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gd3JhcCAoZWwsIGV2dCwgZm4pIHtcbiAgdmFyIHdyYXBwZXIgPSB1bndyYXAoZWwsIGV2dCwgZm4pIHx8IHdyYXBwZXJGYWN0b3J5KGVsLCBldnQsIGZuKTtcbiAgaGFyZENhY2hlLnB1c2goe1xuICAgIHdyYXBwZXI6IHdyYXBwZXIsXG4gICAgZWxlbWVudDogZWwsXG4gICAgZXZ0OiBldnQsXG4gICAgZm46IGZuXG4gIH0pO1xuICByZXR1cm4gd3JhcHBlcjtcbn1cblxuZnVuY3Rpb24gdW53cmFwIChlbCwgZXZ0LCBmbikge1xuICB2YXIgaSA9IGZpbmQoZWwsIGV2dCwgZm4pO1xuICBpZiAoaSkge1xuICAgIHZhciB3cmFwcGVyID0gaGFyZENhY2hlW2ldLndyYXBwZXI7XG4gICAgaGFyZENhY2hlLnNwbGljZShpLCAxKTsgLy8gZnJlZSB1cCBhIHRhZCBvZiBtZW1vcnlcbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kIChlbCwgZXZ0LCBmbikge1xuICB2YXIgaSwgaXRlbTtcbiAgZm9yIChpID0gMDsgaSA8IGhhcmRDYWNoZS5sZW5ndGg7IGkrKykge1xuICAgIGl0ZW0gPSBoYXJkQ2FjaGVbaV07XG4gICAgaWYgKGl0ZW0uZWxlbWVudCA9PT0gZWwgJiYgaXRlbS5ldnQgPT09IGV2dCAmJiBpdGVtLmZuID09PSBmbikge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBhZGQ6IGFkZEV2ZW50LFxuICByZW1vdmU6IHJlbW92ZUV2ZW50XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tID0gcmVxdWlyZSgnLi9kb20nKTtcbnZhciB0ZXh0ID0gcmVxdWlyZSgnLi90ZXh0Jyk7XG52YXIgZXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbnZhciBhdXRvc2l6ZSA9IHJlcXVpcmUoJy4vYXV0b3NpemUnKTtcbnZhciBzZWxlY3Rpb24gPSByZXF1aXJlKCcuL3NlbGVjdGlvbicpO1xudmFyIGlucHV0VGFnID0gL15pbnB1dCQvaTtcbnZhciBzcGFjZXMgPSAvXlxccyokLztcbnZhciBFTEVNRU5UID0gMTtcbnZhciBCQUNLU1BBQ0UgPSA4O1xudmFyIFNQQUNFID0gMzI7XG52YXIgRU5EID0gMzU7XG52YXIgSE9NRSA9IDM2O1xudmFyIExFRlQgPSAzNztcbnZhciBSSUdIVCA9IDM5O1xudmFyIHRhZ0NsYXNzID0gL1xcYm5zZy10YWdcXGIvO1xudmFyIHRhZ1JlbW92YWxDbGFzcyA9IC9cXGJuc2ctdGFnLXJlbW92ZVxcYi87XG52YXIgZWRpdG9yQ2xhc3MgPSAvXFxibnNnLWVkaXRvclxcYi9nO1xudmFyIGlucHV0Q2xhc3MgPSAvXFxibnNnLWlucHV0XFxiL2c7XG52YXIgZW5kID0geyBzdGFydDogJ2VuZCcsIGVuZDogJ2VuZCcgfTtcbnZhciBjYWNoZSA9IFtdO1xuXG4gIC8vIFRPRE8gY3Jvc3MgYnJvd3NlciBzZWxlY3Rpb24gcmFuZ2VzXG5cbmZ1bmN0aW9uIGZpbmQgKGVsKSB7XG4gIHZhciBlbnRyeTtcbiAgdmFyIGk7XG4gIGZvciAoaSA9IDA7IGkgPCBjYWNoZS5sZW5ndGg7IGkrKykge1xuICAgIGVudHJ5ID0gY2FjaGVbaV07XG4gICAgaWYgKGVudHJ5LmVsID09PSBlbCkge1xuICAgICAgcmV0dXJuIGVudHJ5LmFwaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGluc2lnbmlhIChlbCwgbykge1xuICB2YXIgY2FjaGVkID0gZmluZChlbCk7XG4gIGlmIChjYWNoZWQpIHtcbiAgICByZXR1cm4gY2FjaGVkO1xuICB9XG5cbiAgdmFyIG9wdGlvbnMgPSBvIHx8IHt9O1xuICB2YXIgYW55ID0gaGFzU2libGluZ3MoZWwpO1xuICBpZiAoYW55IHx8ICFpbnB1dFRhZy50ZXN0KGVsLnRhZ05hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnNpZ25pYSBleHBlY3RlZCBhbiBpbnB1dCBlbGVtZW50IHdpdGhvdXQgYW55IHNpYmxpbmdzLicpO1xuICB9XG5cbiAgdmFyIGJlZm9yZSA9IGRvbSgnc3BhbicsICduc2ctdGFncyBuc2ctdGFncy1iZWZvcmUnKTtcbiAgdmFyIGFmdGVyID0gZG9tKCdzcGFuJywgJ25zZy10YWdzIG5zZy10YWdzLWFmdGVyJyk7XG4gIHZhciBwYXJlbnQgPSBlbC5wYXJlbnRFbGVtZW50O1xuICBlbC5jbGFzc05hbWUgKz0gJyBuc2ctaW5wdXQnO1xuICBwYXJlbnQuY2xhc3NOYW1lICs9ICcgbnNnLWVkaXRvcic7XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoYmVmb3JlLCBlbCk7XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoYWZ0ZXIsIGVsLm5leHRTaWJsaW5nKTtcbiAgYmluZCgpO1xuXG4gIHZhciBhdXRvID0gYXV0b3NpemUoZWwpO1xuICB2YXIgYXBpID0ge1xuICAgIHRhZ3M6IHRhZ3MsXG4gICAgdmFsdWU6IHZhbHVlLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3lcbiAgfTtcbiAgdmFyIGVudHJ5ID0geyBlbDogZWwsIGFwaTogYXBpIH07XG5cbiAgZXZhbHVhdGUoWycgJ10sIHRydWUpO1xuICBjYWNoZS5wdXNoKGVudHJ5KTtcblxuICByZXR1cm4gYXBpO1xuXG4gIGZ1bmN0aW9uIGJpbmQgKHJlbW92ZSkge1xuICAgIHZhciBvcCA9IHJlbW92ZSA/ICdyZW1vdmUnIDogJ2FkZCc7XG4gICAgZXZlbnRzW29wXShlbCwgJ2tleWRvd24nLCBrZXlkb3duKTtcbiAgICBldmVudHNbb3BdKGVsLCAncGFzdGUnLCBwYXN0ZSk7XG4gICAgZXZlbnRzW29wXShwYXJlbnQsICdjbGljaycsIGNsaWNrKTtcbiAgICBldmVudHNbb3BdKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgJ2ZvY3VzJywgZG9jdW1lbnRibHVyLCB0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlc3Ryb3kgKCkge1xuICAgIGJpbmQodHJ1ZSk7XG4gICAgZWwudmFsdWUgPSB2YWx1ZSgpO1xuICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKGlucHV0Q2xhc3MsICcnKTtcbiAgICBwYXJlbnQuY2xhc3NOYW1lID0gcGFyZW50LmNsYXNzTmFtZS5yZXBsYWNlKGVkaXRvckNsYXNzLCAnJyk7XG4gICAgYmVmb3JlLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoYmVmb3JlKTtcbiAgICBhZnRlci5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGFmdGVyKTtcbiAgICBjYWNoZS5zcGxpY2UoY2FjaGUuaW5kZXhPZihlbnRyeSksIDEpO1xuICAgIGF1dG8uZGVzdHJveSgpO1xuICAgIGFwaS5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIGFwaS5kZXN0cm95ID0gbm9vcChhcGkpO1xuICAgIGFwaS50YWdzID0gYXBpLnZhbHVlID0gbm9vcChudWxsKTtcbiAgICByZXR1cm4gYXBpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9vcCAodmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gZGVzdHJveWVkICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkb2N1bWVudGJsdXIgKGUpIHtcbiAgICBpZiAoZS50YXJnZXQgIT09IGVsKSB7XG4gICAgICBldmFsdWF0ZShbJyAnXSwgdHJ1ZSk7XG4gICAgICBlYWNoKGFmdGVyLCBtb3ZlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3ZlICh2YWx1ZSwgdGFnKSB7XG4gICAgICBiZWZvcmUuYXBwZW5kQ2hpbGQodGFnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjbGljayAoZSkge1xuICAgIHZhciB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICBpZiAodGFnUmVtb3ZhbENsYXNzLnRlc3QodGFyZ2V0LmNsYXNzTmFtZSkpIHtcbiAgICAgIGZvY3VzVGFnKHRhcmdldC5wYXJlbnRFbGVtZW50LCB7IHN0YXJ0OiAnZW5kJywgZW5kOiAnZW5kJywgcmVtb3ZlOiB0cnVlIH0pO1xuICAgIH0gZWxzZSBpZiAodGFnQ2xhc3MudGVzdCh0YXJnZXQuY2xhc3NOYW1lKSkge1xuICAgICAgZm9jdXNUYWcodGFyZ2V0LCBlbmQpO1xuICAgIH0gZWxzZSBpZiAodGFyZ2V0ICE9PSBlbCkge1xuICAgICAgZm9jdXNUYWcoYWZ0ZXIubGFzdENoaWxkLCBlbmQpO1xuICAgICAgZXZhbHVhdGUoWycgJ10sIHRydWUpO1xuICAgICAgZWwuZm9jdXMoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBrZXlkb3duIChlKSB7XG4gICAgdmFyIHBhcnRpYWw7XG4gICAgdmFyIHNlbCA9IHNlbGVjdGlvbihlbCk7XG4gICAgdmFyIGtleSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlIHx8IGUuY2hhckNvZGU7XG4gICAgaWYgKGtleSA9PT0gU1BBQ0UpIHtcbiAgICAgIHBhcnRpYWwgPSBlbC52YWx1ZS5zbGljZSgwLCBzZWwuc3RhcnQpO1xuICAgICAgZXZhbHVhdGUoc3BhY2VzLnRlc3QocGFydGlhbCkgPyBudWxsIDogWycgJ10pO1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBIT01FKSB7XG4gICAgICBpZiAoYmVmb3JlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgZm9jdXNUYWcoYmVmb3JlLmZpcnN0Q2hpbGQsIHt9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGVjdGlvbihlbCwgeyBzdGFydDogMCwgZW5kOiAwIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBFTkQpIHtcbiAgICAgIGlmIChhZnRlci5sYXN0Q2hpbGQpIHtcbiAgICAgICAgZm9jdXNUYWcoYWZ0ZXIubGFzdENoaWxkLCBlbmQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZWN0aW9uKGVsLCBlbmQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBMRUZUICYmIHNlbC5zdGFydCA9PT0gMCAmJiBiZWZvcmUubGFzdENoaWxkKSB7XG4gICAgICBmb2N1c1RhZyhiZWZvcmUubGFzdENoaWxkLCBlbmQpO1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBCQUNLU1BBQ0UgJiYgc2VsLnN0YXJ0ID09PSAwICYmIChzZWwuZW5kID09PSAwIHx8IHNlbC5lbmQgIT09IGVsLnZhbHVlLmxlbmd0aCkgJiYgYmVmb3JlLmxhc3RDaGlsZCkge1xuICAgICAgZm9jdXNUYWcoYmVmb3JlLmxhc3RDaGlsZCwgZW5kKTtcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gUklHSFQgJiYgc2VsLmVuZCA9PT0gZWwudmFsdWUubGVuZ3RoICYmIGFmdGVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgIGZvY3VzVGFnKGFmdGVyLmZpcnN0Q2hpbGQsIHt9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBwYXN0ZSAoKSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiBsYXRlciAoKSB7IGV2YWx1YXRlKCk7IH0sIDApO1xuICB9XG5cbiAgZnVuY3Rpb24gZXZhbHVhdGUgKGV4dHJhcywgZW50aXJlbHkpIHtcbiAgICB2YXIgcCA9IHNlbGVjdGlvbihlbCk7XG4gICAgdmFyIGxlbiA9IGVudGlyZWx5ID8gSW5maW5pdHkgOiBwLnN0YXJ0O1xuICAgIHZhciB0YWdzID0gZWwudmFsdWUuc2xpY2UoMCwgbGVuKS5jb25jYXQoZXh0cmFzIHx8IFtdKS5zcGxpdCgnICcpO1xuICAgIGlmICh0YWdzLmxlbmd0aCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcmVzdCA9IHRhZ3MucG9wKCkgKyBlbC52YWx1ZS5zbGljZShsZW4pO1xuICAgIHZhciByZW1vdmFsID0gdGFncy5qb2luKCcgJykubGVuZ3RoO1xuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRhZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNyZWF0ZVRhZyhiZWZvcmUsIHRhZ3NbaV0pO1xuICAgIH1cbiAgICBjbGVhbnVwKCk7XG4gICAgZWwudmFsdWUgPSByZXN0O1xuICAgIHAuc3RhcnQgLT0gcmVtb3ZhbDtcbiAgICBwLmVuZCAtPSByZW1vdmFsO1xuICAgIHNlbGVjdGlvbihlbCwgcCk7XG4gICAgYXV0by5yZWZyZXNoKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhbnVwICgpIHtcbiAgICB2YXIgdGFncyA9IFtdO1xuXG4gICAgZWFjaChiZWZvcmUsIGRldGVjdCk7XG4gICAgZWFjaChhZnRlciwgZGV0ZWN0KTtcblxuICAgIGZ1bmN0aW9uIGRldGVjdCAodmFsdWUsIHRhZykge1xuICAgICAgaWYgKHRhZ3MuaW5kZXhPZih2YWx1ZSkgIT09IC0xKSB7XG4gICAgICAgIHRhZy5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRhZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWdzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRhZyAoYnVmZmVyLCB2YWx1ZSkge1xuICAgIHZhciB0cmltbWVkID0gdmFsdWUudHJpbSgpO1xuICAgIGlmICh0cmltbWVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZWwgPSBkb20oJ3NwYW4nLCAnbnNnLXRhZycpO1xuICAgIHRleHQoZWwsIHRyaW1tZWQpO1xuICAgIGlmIChvcHRpb25zLmRlbGV0aW9uKSB7XG4gICAgICBlbC5hcHBlbmRDaGlsZChkb20oJ3NwYW4nLCAnbnNnLXRhZy1yZW1vdmUnKSk7XG4gICAgfVxuICAgIGJ1ZmZlci5hcHBlbmRDaGlsZChlbCk7XG4gIH1cblxuICBmdW5jdGlvbiBmb2N1c1RhZyAodGFnLCBwKSB7XG4gICAgaWYgKCF0YWcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZXZhbHVhdGUoWycgJ10sIHRydWUpO1xuICAgIHZhciBwYXJlbnQgPSB0YWcucGFyZW50RWxlbWVudDtcbiAgICBpZiAocGFyZW50ID09PSBiZWZvcmUpIHtcbiAgICAgIHdoaWxlIChwYXJlbnQubGFzdENoaWxkICE9PSB0YWcpIHtcbiAgICAgICAgYWZ0ZXIuaW5zZXJ0QmVmb3JlKHBhcmVudC5sYXN0Q2hpbGQsIGFmdGVyLmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB3aGlsZSAocGFyZW50LmZpcnN0Q2hpbGQgIT09IHRhZykge1xuICAgICAgICBiZWZvcmUuYXBwZW5kQ2hpbGQocGFyZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgICB0YWcucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0YWcpO1xuICAgIGVsLnZhbHVlID0gcC5yZW1vdmUgPyAnJyA6IHRleHQodGFnKTtcbiAgICBlbC5mb2N1cygpO1xuICAgIHNlbGVjdGlvbihlbCwgcCk7XG4gICAgYXV0by5yZWZyZXNoKCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYXNTaWJsaW5ncyAoKSB7XG4gICAgdmFyIGFsbCA9IGVsLnBhcmVudEVsZW1lbnQuY2hpbGRyZW47XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IGFsbC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFsbFtpXSAhPT0gZWwgJiYgYWxsW2ldLm5vZGVUeXBlID09PSBFTEVNRU5UKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBlYWNoIChzaWRlLCBmbikge1xuICAgIHZhciBjaGlsZHJlbiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHNpZGUuY2hpbGRyZW4pO1xuICAgIHZhciBpO1xuICAgIHZhciB0YWc7XG4gICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0YWcgPSBjaGlsZHJlbltpXTtcbiAgICAgIGZuKHRleHQodGFnKS50cmltKCksIHRhZywgaSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdGFncyAoKSB7XG4gICAgdmFyIGFsbCA9IFtdO1xuICAgIHZhciB2YWx1ZXMgPSBlbC52YWx1ZS5zcGxpdCgnICcpO1xuICAgIHZhciBpO1xuXG4gICAgZWFjaChiZWZvcmUsIGFkZCk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhZGQodmFsdWVzW2ldKTtcbiAgICB9XG5cbiAgICBlYWNoKGFmdGVyLCBhZGQpO1xuXG4gICAgcmV0dXJuIGFsbDtcblxuICAgIGZ1bmN0aW9uIGFkZCAodmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSAmJiBhbGwuaW5kZXhPZih2YWx1ZSkgPT09IC0xKSB7XG4gICAgICAgIGFsbC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB2YWx1ZSAoKSB7XG4gICAgcmV0dXJuIHRhZ3MoKS5qb2luKCcgJyk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbnNpZ25pYTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGdldCA9IGVhc3lHZXQ7XG52YXIgc2V0ID0gZWFzeVNldDtcblxuaWYgKGRvY3VtZW50LnNlbGVjdGlvbiAmJiBkb2N1bWVudC5zZWxlY3Rpb24uY3JlYXRlUmFuZ2UpIHtcbiAgZ2V0ID0gaGFyZEdldDtcbiAgc2V0ID0gaGFyZFNldDtcbn1cblxuZnVuY3Rpb24gZWFzeUdldCAoZWwpIHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogZWwuc2VsZWN0aW9uU3RhcnQsXG4gICAgZW5kOiBlbC5zZWxlY3Rpb25FbmRcbiAgfTtcbn1cblxuZnVuY3Rpb24gaGFyZEdldCAoZWwpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdzZWxlY3Rpb24gdW5zdXBwb3J0ZWQgeWV0IG9uIG9sZCBicm93c2VycycpO1xuICAvLyB2YXIgcmFuZ2UgPSBkb2N1bWVudC5zZWxlY3Rpb24uY3JlYXRlUmFuZ2UoKTtcbiAgLy8gdmFyIGJvb2ttYXJrID0gcmFuZ2UuZ2V0Qm9va21hcmsoKTtcbiAgLy8gdmFyIG9yaWdpbmFsQ29udGVudHMgPSBlbC52YWx1ZTtcbiAgLy8gdmFyIG1hcmtlciA9IGdldFVuaXF1ZU1hcmtlcihvcmlnaW5hbENvbnRlbnRzKTtcbiAgLy8gdmFyIHBhcmVudCA9IHJhbmdlLnBhcmVudEVsZW1lbnQoKTtcbiAgLy8gaWYgKHBhcmVudCA9PT0gbnVsbCB8fCBwYXJlbnQudHlwZSAhPT0gJ3RleHRhcmVhJykge1xuICAvLyAgICAgcmV0dXJuIHsgc3RhcnQ6IDAsIGVuZDogMCB9O1xuICAvLyB9XG4gIC8vIHJhbmdlLnRleHQgPSBtYXJrZXIgKyByYW5nZS50ZXh0ICsgbWFya2VyO1xuXG4gIC8vIHZhciBjb250ZW50cyA9IGVsLnZhbHVlO1xuXG4gIC8vIGVsLnZhbHVlID0gb3JpZ2luYWxDb250ZW50cztcbiAgLy8gcmFuZ2UubW92ZVRvQm9va21hcmsoYm9va21hcmspO1xuICAvLyByYW5nZS5zZWxlY3QoKTtcblxuICAvLyByZXR1cm4ge1xuICAvLyAgIHN0YXJ0OiBjb250ZW50cy5pbmRleE9mKG1hcmtlciksXG4gIC8vICAgZW5kOiBjb250ZW50cy5sYXN0SW5kZXhPZihtYXJrZXIpXG4gIC8vIH07XG59XG5cbmZ1bmN0aW9uIGdldFVuaXF1ZU1hcmtlciAoY29udGVudHMpIHtcbiAgdmFyIG1hcmtlcjtcbiAgZG8ge1xuICAgIG1hcmtlciA9ICcjI01BUktFUl8nICsgTWF0aC5yYW5kb20oKSAqIERhdGUubm93KCk7XG4gIH0gd2hpbGUgKGNvbnRlbnRzLmluZGV4T2YobWFya2VyKSAhPT0gLTEpO1xuICByZXR1cm4gbWFya2VyO1xufVxuXG5mdW5jdGlvbiBlYXN5U2V0IChlbCwgcCkge1xuICBlbC5zZWxlY3Rpb25TdGFydCA9IHNwZWNpYWwoZWwsIHAuc3RhcnQpO1xuICBlbC5zZWxlY3Rpb25FbmQgPSBzcGVjaWFsKGVsLCBwLmVuZCk7XG59XG5cbmZ1bmN0aW9uIGhhcmRTZXQgKGVsLCBwKSB7XG4gIHRocm93IG5ldyBFcnJvcignc2VsZWN0aW9uIHVuc3VwcG9ydGVkIHlldCBvbiBvbGQgYnJvd3NlcnMnKTtcbiAgLy8gdmFyIHJhbmdlO1xuXG4gIC8vIGlmIChwLnN0YXJ0ID09PSAnZW5kJyAmJiBwLmVuZCA9PT0gJ2VuZCcpIHtcbiAgLy8gICByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpO1xuICAvLyAgIHJhbmdlLmNvbGxhcHNlKGZhbHNlKTtcbiAgLy8gICByYW5nZS5zZWxlY3QoKTtcbiAgLy8gfVxufVxuXG5mdW5jdGlvbiBzcGVjaWFsIChlbCwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09PSAnZW5kJyA/IGVsLnZhbHVlLmxlbmd0aCA6IHZhbHVlIHx8IDA7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbiAoZWwsIHApIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBzZXQoZWwsIHApO1xuICB9XG4gIHJldHVybiBnZXQoZWwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gdGV4dCAoZWwsIHZhbHVlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgZWwuaW5uZXJUZXh0ID0gZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfVxuICBpZiAodHlwZW9mIGVsLmlubmVyVGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZWwuaW5uZXJUZXh0O1xuICB9XG4gIHJldHVybiBlbC50ZXh0Q29udGVudDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0ZXh0O1xuIl19
