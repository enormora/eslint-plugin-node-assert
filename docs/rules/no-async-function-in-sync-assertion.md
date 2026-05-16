# @enormora/node-assert/no-async-function-in-sync-assertion

📝 Disallow passing async functions to synchronous Node.js assert methods.

<!-- end auto-generated rule header -->

## Rule Details

`assert.throws()` and `assert.doesNotThrow()` are synchronous APIs. When you pass them an async function, Node does not await the returned promise, so async rejections can be missed or asserted incorrectly.

Examples of **incorrect** code for this rule:

```js
import assert from "node:assert/strict";

assert.throws(async () => {
    await doThing();
});

assert.doesNotThrow(async function () {
    await doThing();
});
```

Examples of **correct** code for this rule:

```js
import assert from "node:assert/strict";

await assert.rejects(async () => {
    await doThing();
});

await assert.doesNotReject(async function () {
    await doThing();
});
```

## Scope

This rule applies to:

- `assert.throws()`
- `assert.doesNotThrow()`

It reports async function expressions, async arrow functions, async function declarations, and simple `const` aliases that are passed as the first argument to those synchronous assertion methods.
