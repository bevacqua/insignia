# Insignia

> Customizable tag input. Progressive. No non-sense!

Browser support includes every sane browser and **IE7+**.

# Demo!

You can see a [live demo here][5].

[![screenshot.png][4]][5]

# Inspiration

I needed a tag input that was progressively enhanced, fast, easy to use, and reliable. Tag inputs I stumbled upon were too bloated, too dependant on JavaScript, or provided an unfriendly human experience.

The goal is to produce a framework-agnostic tag input editor that is easily integrated into your favorite MVC framework, that doesn't translate into a significant addition to your codebase, and that's **enjoyable to work with**. Insignia shares the modular design philosophy of [Rome, the datetime picker][2].

# Features

- Small and focused
- Natural keyboard navigation
- Progressively enhanced
- Extensive browser support

# Install

You can get it on npm.

```shell
npm install insignia --save
```

Or bower, too.

```shell
bower install insignia --save
```

# Usage

Insignia demands one thing of you: **the input must have no siblings.**

```html
<div>
  <input id='insigificant' />
</div>
```

If client-side JavaScript never executes, because its disabled or too slow [_(on intermittent mobile network connections, for example)_][3], you should treat user input as a delimited list of tags. When JavaScript does execute, you should consider sending tags as a single string and splitting them on the server-side, for consistency.

# `insignia.find(input)`

Retrieves a previously created instance of Insignia associated with the provided `input`. Returns `null` if none can be found.

# `insignia(input, options={})`

Insignia exposes a function to turn an input into a tag list input. Empty spans will be added on both sides of your input element.

A few options may be provided. They are detailed below.

### `free`

Defaults to `true`. When this flag is turned off, tags can't be edited by hand but they can still be deleted entirely using backspace. Tags would have to be added programmatically.

## `deletion`

When `true`, humans will be able to delete individual tags by clicking on an icon.

## `delimiter`

The separator between tags. Defaults to `' '`. Must be a single character.

## `preventInvalid`

This option will prevent tags identified as invalid from being added. By default this is turned off and they just get a `nsg-invalid` CSS class.

## `validate(value)`

A method that validates whether the user input `value` constitutes a valid tag. Useful to filter out duplicates. Defaults to the method below, that does exactly that. Note that in the code below, `toy` is the API returned by calling `insignia(el)`.

```js
function validate (value) {
  return toy.findItem(value) === null;
}
```

Note that `tags` is only a copy and modifying it won't affect the list of tags.

## `render(container, item)`

A method that's called whenever a tag should be rendered. Defaults to setting `getText(item)` as the container's text.

## `parseText`

When you have complex data items from autocomplete, you need to set `parseText` to read the value that should be used as a display value.

## `parseValue`

When you have complex data items from autocomplete, you need to set `parseText` to read the value that should be used as each tag's value.

## `convertOnBlur`

By default, tags are converted whenever the `blur` event fires on elements other than `input`. Set to `false` to disable.

# Instance API

When you call `insignia(input, options)`, you'll get back a tiny API to interact with the instance. Calling `insignia` repeatedly on the same DOM element will have no effect, and it will return the same API object.

## `.addItem(data)`

Adds an item to the input. The `data` parameter could be a string or a complex object, depending on your instance configuration.

## `.findItem(data)`

Finds an item by its `data` string or object.

## `.findItemIndex(data)`

Return the index of the first item found by its `data` string or object.

## `.findItemByElement(el)`

Finds an item by its `.nsg-tag` DOM element.

## `.removeItem(data)`

Removes an item from the input. The item is found using the `data` string or object.

## `.removeItemByElement(el)`

Removes an item from the input. The item is found using a `.nsg-tag` DOM element.

## `.value()`

Returns the list of valid tags as an array.

## `.allValues()`

Returns the list of tags as an array including invalid tags.

## `.destroy()`

Removes all event listeners, CSS classes, and DOM elements created by insignia. The input's `value` is set to the output of `.value()`. Once the instance is destroyed it becomes useless, and you'll have to call `insignia(input, options)` once again if you want to restore the behavior.

## Instance Events

The instance API comes with a few events.

Event     | Arguments    | Description
----------|--------------|------------
`add`     | `data`, `el` | Emitted whenever a new item is added to the list
`remove`  | `data`       | Emitted whenever an item is removed from the list
`invalid` | `data`, `el` | Emitted whenever an invalid item is added to the list

You can listen to these events using the following API.

```js
const toy = insignia(el);
toy.on('add', data => console.log(data)); // listen to an event
toy.once('invalid', data => throw new Error('invalid data')); // listener discarded after one execution

toy.on('add', added);
toy.off('add', added); // removes `added` listener

function added (data) {
  console.log(data);
}
```

# License

MIT

[1]: http://stackoverflow.com/questions/ask
[2]: https://github.com/bevacqua/rome
[3]: http://ponyfoo.com/articles/stop-breaking-the-web
[4]: http://i.imgur.com/mhy3Fv9.png
[5]: http://bevacqua.github.io/insignia
