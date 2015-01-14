'use strict';

if (!String.prototype.trim) {
  var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
  String.prototype.trim = function () {
    return this.replace(rtrim, '');
  };
}
