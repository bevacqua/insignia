void function () {
  'use strict';

  insignia(ty);
  insignia(custom, {
    delimiter: ','
  });
  insignia(del, { deletion: true });
  insignia(def);
  insignia(lng);
  insignia(prs, {
    parse: function (value) {
      return value.toUpperCase();
    }
  })
  insignia(dup, {
    validate: function () {
      return true;
    }
  });
  insignia(bth, {
    parse: function (value) {
      return value.toUpperCase();
    },
    validate: function () {
      return true;
    }
  });

  var mssi = insignia(mss);
  var anti = insignia(ant);

  events(msst, 'click', msstoggle);
  events(ant, 'keypress', antenter);

  function msstoggle () {
    if (mssi.destroyed) {
      mssi = insignia(mss);
      msst.innerText = msst.textContent = 'Destroy!';
    } else {
      mssi.destroy();
      msst.innerText = msst.textContent = 'Restore!';
    }
  }

  function antenter (e) {
    if (e.keyCode === 13) {
      anti.convert();
      e.preventDefault();
    }
  }

  function events (el, type, fn) {
    if (el.addEventListener) {
      el.addEventListener(type, fn);
    } else if (el.attachEvent) {
      el.attachEvent('on' + type, wrap(fn));
    } else {
      el['on' + type] = wrap(fn);
    }
    function wrap (originalEvent) {
      var e = originalEvent || global.event;
      e.target = e.target || e.srcElement;
      e.preventDefault  = e.preventDefault  || function preventDefault () { e.returnValue = false; };
      e.stopPropagation = e.stopPropagation || function stopPropagation () { e.cancelBubble = true; };
      fn.call(el, e);
    }
  }
}();
