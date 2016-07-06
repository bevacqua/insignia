'use strict';

import sell from 'sell';
import crossvent from 'crossvent';
import emitter from 'contra/emitter';
import dom from './dom';
import text from './text';
import autosize from './autosize';
const inputTag = /^input$/i;
const ELEMENT = 1;
const BACKSPACE = 8;
const END = 35;
const HOME = 36;
const LEFT = 37;
const RIGHT = 39;
const sinkableKeys = [END, HOME];
const tagClass = /\bnsg-tag\b/;
const tagRemovalClass = /\bnsg-tag-remove\b/;
const editorClass = /\bnsg-editor\b/g;
const inputClass = /\bnsg-input\b/g;
const end = { start: 'end', end: 'end' };
const defaultDelimiter = ' ';

function insignia (el, options = {}) {
  const currentValues = [];
  const o = options;
  const delimiter = o.delimiter || defaultDelimiter;
  if (delimiter.length !== 1) {
    throw new Error('insignia expected a single-character delimiter string');
  }
  const any = hasSiblings(el);
  if (any || !inputTag.test(el.tagName)) {
    throw new Error('insignia expected an input element without any siblings');
  }
  const free = o.free !== false;
  const validate = o.validate || defaultValidate;
  const render = o.render || defaultRenderer;
  const convertOnBlur = o.convertOnBlur !== false;

  const toItemData = defaultToItemData;

  const userGetText = o.getText;
  const userGetValue = o.getValue;
  const getText = (
    typeof userGetText === 'string' ? d => d[userGetText] :
    typeof userGetText === 'function' ? userGetText :
    d => d.toString()
  );
  const getValue = (
    typeof userGetValue === 'string' ? d => d[userGetValue] :
    typeof userGetValue === 'function' ? userGetValue :
    d => d
  );

  const before = dom('span', 'nsg-tags nsg-tags-before');
  const after = dom('span', 'nsg-tags nsg-tags-after');
  const parent = el.parentElement;
  let blurblock = tick();

  el.className += ' nsg-input';
  parent.className += ' nsg-editor';
  parent.insertBefore(before, el);
  parent.insertBefore(after, el.nextSibling);

  const shrinker = autosize(el);
  const api = emitter({
    addItem,
    findItem: data => findItem(data),
    findItemIndex: data => findItemIndex(data),
    findItemByElement: el => findItem(el, 'el'),
    removeItem: removeItemByData,
    removeItemByElement,
    value: readValue,
    allValues: readValueAll,
    refresh: convert,
    destroy
  });

  const placeholder = el.getAttribute('placeholder');
  let placeheld = true;

  bind();

  (document.activeElement === el ?
    evaluateSelect :
    evaluateNoSelect
  )([delimiter], true);

  return api;

  function findItem (value, prop='data') {
    const comp = (prop === 'data' ?
      item => getValue(item[prop]) === getValue(value) :
      item => item[prop] === value
    );
    for (let i = 0; i < currentValues.length; i++) {
      if (comp(currentValues[i])) {
        return currentValues[i];
      }
    }
    return null;
  }

  function findItemIndex (value, prop='data') {
    const comp = (prop === 'data' ?
      item => getValue(item[prop]) === getValue(value) :
      item => item[prop] === value
    );
    for (let i = 0; i < currentValues.length; i++) {
      if (comp(currentValues[i])) {
        return i;
      }
    }
    return null;
  }

  function addItem (data) {
    const valid = validate(data);
    const item = { data, valid };
    if (o.preventInvalid && !valid) {
      return api;
    }
    const el = renderItem(item);
    if (!el) {
      return api;
    }
    item.el = el;
    currentValues.push(item);
    api.emit('add', data, el);
    invalidate();
    return api;
  }

  function removeItem (item) {
    if (!item) {
      return api;
    }
    removeItemElement(item.el);
    currentValues.splice(currentValues.indexOf(item), 1);
    api.emit('remove', item.data);
    invalidate();
    return api;
  }

  function invalidate () {
    currentValues.slice().forEach((v,i) => {
      currentValues.splice(i, 1);

      const valid = validate(v.data, i);
      if (valid) {
        v.el.classList.add('nsg-valid');
        v.el.classList.remove('nsg-invalid');
      } else {
        v.el.classList.add('nsg-invalid');
        v.el.classList.remove('nsg-valid');
        api.emit('invalid', v.data, v.el);
      }
      v.valid = valid;

      currentValues.splice(i, 0, v);
    });
  }

  function removeItemByData (data) {
    return removeItem(findItem(data));
  }

  function removeItemByElement (el) {
    return removeItem(findItem(el, 'el'));
  }

  function renderItem (item) {
    return createTag(before, item);
  }

  function removeItemElement (el) {
    if (el.parentElement) {
      el.parentElement.removeChild(el);
    }
  }

  function createTag (buffer, item) {
    const {data} = item;
    const empty = typeof data === 'string' && data.trim().length === 0;
    if (empty) {
      return null;
    }
    const el = dom('span', 'nsg-tag');
    render(el, item);
    if (o.deletion) {
      el.appendChild(dom('span', 'nsg-tag-remove'));
    }
    buffer.appendChild(el);
    return el;
  }

  function defaultToItemData (s) {
    return s;
  }

  function readValue () {
    return currentValues.filter(v => v.valid).map(v => v.data);
  }

  function readValueAll () {
    return currentValues.map(v => v.data);
  }

  function updatePlaceholder (e) {
    const any = parent.querySelector('.nsg-tag');
    if (!any && !placeheld) {
      el.setAttribute('placeholder', placeholder);
      placeheld = true;
    } else if (any && placeheld) {
      el.removeAttribute('placeholder');
      placeheld = false;
    }
  }

  function bind (remove) {
    const op = remove ? 'remove' : 'add';
    const ev = remove ? 'off' : 'on';
    crossvent[op](el, 'keydown', keydown);
    crossvent[op](el, 'keypress', keypress);
    crossvent[op](el, 'paste', paste);
    crossvent[op](parent, 'click', click);
    if (convertOnBlur) {
      crossvent[op](document.documentElement, 'blur', documentblur, true);
      crossvent[op](document.documentElement, 'mousedown', documentmousedown);
    }
    if (placeholder) {
      api[ev]('add', updatePlaceholder);
      api[ev]('remove', updatePlaceholder);
      crossvent[op](el, 'keydown', updatePlaceholder);
      crossvent[op](el, 'keypress', updatePlaceholder);
      crossvent[op](el, 'paste', updatePlaceholder);
      crossvent[op](parent, 'click', updatePlaceholder);
      updatePlaceholder();
    }
  }

  function destroy () {
    bind(true);
    el.value = '';
    el.className = el.className.replace(inputClass, '');
    parent.className = parent.className.replace(editorClass, '');
    if (before.parentElement) { before.parentElement.removeChild(before); }
    if (after.parentElement) { after.parentElement.removeChild(after); }
    shrinker.destroy();
    api.destroyed = true;
    api.destroy = api.addItem = api.removeItem = () => api;
    api.tags = api.value = () => null;
    return api;
  }

  function tick () {
    return new Date().valueOf();
  }

  function documentblur (e) {
    if (blurblock > tick()) {
      return;
    }
    convert(true);
  }

  function documentmousedown (e) {
    var el = e.target;
    while (el) {
      if (el === parent) {
        blurblock = tick() + 100;
      }
      el = el.parentElement;
    }
  }

  function click (e) {
    const target = e.target;
    if (tagRemovalClass.test(target.className)) {
      removeItemByElement(target.parentElement);
      el.focus();
      return;
    }
    let parent = target;
    let tagged = tagClass.test(parent.className);
    while (tagged === false && parent.parentElement) {
      parent = parent.parentElement;
      tagged = tagClass.test(parent.className);
    }
    if (tagged && free) {
      focusTag(parent, end);
    } else if (target !== el) {
      shift();
      el.focus();
    }
  }

  function shift () {
    focusTag(after.lastChild, end);
    evaluateSelect([delimiter], true);
  }

  function convert (all) {
    (all ? evaluateNoSelect : evaluateSelect)([delimiter], all);
    if (all) {
      each(after, moveLeft);
    }
    return api;
  }

  function moveLeft (value, tag) {
    before.appendChild(tag);
  }

  function keydown (e) {
    const sel = sell(el);
    const key = e.which || e.keyCode || e.charCode;
    const canMoveLeft = sel.start === 0 && sel.end === 0 && before.lastChild;
    const canMoveRight = sel.start === el.value.length && sel.end === el.value.length && after.firstChild;
    if (free) {
      if (key === HOME) {
        if (before.firstChild) {
          focusTag(before.firstChild, {});
        } else {
          sell(el, { start: 0, end: 0 });
        }
      } else if (key === END) {
        if (after.lastChild) {
          focusTag(after.lastChild, end);
        } else {
          sell(el, end);
        }
      } else if (key === BACKSPACE && canMoveLeft) {
        removeItemByElement(before.lastChild);
      } else if (key === RIGHT && canMoveRight) {
        focusTag(after.firstChild, {});
      } else if (key === LEFT && canMoveLeft) {
        focusTag(before.lastChild, end);
      } else {
        return;
      }
    } else {
      if (key === BACKSPACE && canMoveLeft) {
        removeItemByElement(before.lastChild);
      } else if (key === RIGHT && canMoveRight) {
        before.appendChild(after.firstChild);
      } else if (key === LEFT && canMoveLeft) {
        after.insertBefore(before.lastChild, after.firstChild);
      } else if (sinkableKeys.indexOf(key) === -1) { // prevent default otherwise
        return;
      }
    }

    e.preventDefault();
    return false;
  }

  function keypress (e) {
    const key = e.which || e.keyCode || e.charCode;
    if (String.fromCharCode(key) === delimiter) {
      convert();
      e.preventDefault();
      return false;
    }
  }

  function paste () {
    setTimeout(() => evaluateSelect(), 0);
  }

  function evaluateNoSelect (extras, entirely) {
    evaluateInternal(extras, entirely); // necessary for blur events, initialization, unfocused evaluation
  }

  function evaluateSelect (extras, entirely) {
    evaluateInternal(extras, entirely, sell(el)); // only if we know the input has/should have focus
  }

  function evaluateInternal (extras, entirely, p) {
    const len = entirely || !p ? Infinity : p.start;
    const tags = el.value.slice(0, len).concat(extras || []).split(delimiter);
    if (tags.length < 1 || !free) {
      return;
    }

    const rest = tags.pop() + el.value.slice(len);
    const removal = tags.join(delimiter).length;

    tags.forEach(tag => addItem(toItemData(tag)));
    el.value = rest;
    reselect();
    shrinker.refresh();

    function reselect () {
      if (p) {
        p.start -= removal;
        p.end -= removal;
        sell(el, p);
      }
    }
  }

  function defaultRenderer (container, item) {
    text(container, getText(item.data));
  }

  function readTag (tag) {
    return text(tag);
  }

  function focusTag (tag, p) {
    if (!tag) {
      return;
    }
    evaluateSelect([delimiter], true);
    const parent = tag.parentElement;
    if (parent === before) {
      while (parent.lastChild !== tag) {
        after.insertBefore(parent.lastChild, after.firstChild);
      }
    } else {
      while (parent.firstChild !== tag) {
        before.appendChild(parent.firstChild);
      }
    }
    const value = p.remove ? '' : readTag(tag);
    removeItemByElement(tag);
    el.value = value;
    el.focus();
    sell(el, p);
    shrinker.refresh();
  }

  function hasSiblings () {
    const children = el.parentElement.children;
    return [...children].some(s => s !== el && s.nodeType === ELEMENT);
  }

  function each (container, fn) {
    [...container.children].forEach((tag, i) => fn(readTag(tag), tag, i));
  }

  function defaultValidate (value, i) {
    const x = findItemIndex(value);
    return x === i || x === null ;
  }
}

module.exports = insignia;
