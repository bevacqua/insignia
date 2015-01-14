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
