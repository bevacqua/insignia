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
