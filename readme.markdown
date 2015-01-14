# Insignia

> Customizable tag input. Progressive. No non-sense!

Browser support includes every sane browser and **IE7+**.

# Inspiration

I needed a tag input that was progressively enhanced, fast, easy to use, and reliable. Tag inputs I stumbled upon were too bloated, too dependant on JavaScript, or provided an unfriendly human experience.

The goal is to produce a framework-agnostic tag input editor that is easily integrated into your favorite MVC framework, that doesn't translate into a significant addition to your codebase, and that's **enjoyable to work with**. Insignia shares the modular design philosophy of [Rome, the datetime picker][2].

# Features

- Small and focused
- Natural keyboard navigation
- Progressively enhanced

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

Insignia demands one thing of you: **the input must be placed in a parent element and have no siblings.**

```html
<div>
  <input id='insigificant' />
</div>
```

If client-side JavaScript never executes, because its disabled or too slow [_(on intermittent mobile network connections, for example)_][3], you should treat user input as a space-separated list of tags. When JavaScript does execute, you should consider sending tags as a single string and splitting them on the server-side, for consistency.

# `insignia(element, options={})`

Insignia exposes a function to turn an input into a tag list input. Empty spans will be added on both sides of your input element.

A few options may be provided. They are detailed below.

Option     | Description
-----------|---------------------------------------------------------------------------------------
`deletion` | When `true`, humans will be able to delete individual tags by clicking on an icon

When you call `insignia(element, options)`, you'll get back a tiny API to interact with the instance. Calling `insignia` repeatedly on the same DOM element will have no effect, and it will return the same API object.

### `.tags()`

Returns an array with the tags currently held by the input. Any "partial" tags _(e.g, not extracted from the input)_ will be returned as well.

### `.values()`

Returns the input value as a space-separated list of tags. This is the recommended format in which you should send values to the server, because of progressive enhancement.

### `.destroy()`

Removes all event listeners, CSS classes, and DOM elements created by Insignia. The input's `value` is set to the output of `.values()`. Once the instance is destroyed it becomes useless, and you'll have to call `insignia(element, options)` once again if you want to restore the behavior.

# License

MIT

[1]: http://stackoverflow.com/questions/ask
[2]: https://github.com/bevacqua/rome
[3]: http://ponyfoo.com/articles/stop-breaking-the-web
