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

function insignia (el, options) {
  var cached = find(el);
  if (cached) {
    return cached;
  }

  var _noselect = document.activeElement !== el;
  var o = options || {};
  var delimiter = o.delimiter || defaultDelimiter;
  if (delimiter.length !== 1) {
    throw new Error('Insignia expected a single-character delimiter string');
  }
  var any = hasSiblings(el);
  if (any || !inputTag.test(el.tagName)) {
    throw new Error('Insignia expected an input element without any siblings');
  }
  var parse = o.parse || defaultParse;
  var validate = o.validate || defaultValidate;
  var render = o.render || defaultRenderer;
  var readTag = o.readTag || defaultReader;
	var convertOnFocus = o.convertOnFocus !== false;

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
		if (convertOnFocus) {
      crossvent[op](document.documentElement, 'focus', documentfocus, true);
    }
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
      return;
    }
    var top = target;
    var tagged = tagClass.test(top.className);
    while (tagged === false && top.parentElement) {
      top = top.parentElement;
      tagged = tagClass.test(top.className);
    }
    if (tagged) {
      focusTag(top, end);
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
    crossvent.fabricate(el, 'insignia-evaluated');
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

  function defaultRenderer (container, value) {
    text(container, value);
  }

  function defaultReader (tag) {
    return text(tag);
  }

  function createTag (buffer, value) {
    var trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }
    var el = dom('span', 'nsg-tag');
    render(el, parse(trimmed));
    if (o.deletion) {
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
    el.value = p.remove ? '' : readTag(tag);
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
      fn(readTag(tag), tag, i);
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

insignia.find = find;
module.exports = insignia;
