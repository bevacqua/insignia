'use strict';

require('./polyfills/String.prototype.trim');
require('./polyfills/Array.prototype.indexOf');

var dom = require('./dom');
var text = require('./text');
var slice = require('./slice');
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
    events[op](document.documentElement, 'blur', documentblur, true);
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
    };
  }

  function documentblur (e) {
    if (e.target === el) {
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
    var children = slice(side.children);
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
