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
