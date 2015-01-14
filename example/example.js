void function () {
  'use strict';

  insignia(ty);
  insignia(del, { deletion: true });
  insignia(def);
  insignia(lng);
  insignia(dup, { dupes: true });

  var mssi = insignia(mss);

  events(msst, 'click', msstoggle);

  function msstoggle () {
    if (mssi.destroyed) {
      mssi = insignia(mss);
      msst.innerText = msst.textContent = 'Destroy!';
    } else {
      mssi.destroy();
      msst.innerText = msst.textContent = 'Restore!';
    }
  }

  function events (el, type, fn) {
    if (el.addEventListener) {
      el.addEventListener(type, fn);
    } else if (el.attachEvent) {
      el.attachEvent('on' + type, fn);
    } else {
      el['on' + type] = fn;
    }
  }
}();
