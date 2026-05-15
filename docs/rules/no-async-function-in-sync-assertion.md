# node-assert/no-async-function-in-sync-assertion

📝 Disallow async functions in synchronous Node.js throw assertions.

<!-- end auto-generated rule header -->

## Rule Details

Node's `assert.throws()` and `assert.doesNotThrow()` are synchronous. Passing them an `async` function does not test the eventual rejection of that function's returned promise. In those cases, `assert.rejects()` and `assert.doesNotReject()` are the matching APIs.

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

This rule reports when the first argument to `assert.throws()` or `assert.doesNotThrow()` resolves to:

- an inline `async` arrow function
- an inline `async` function expression
- an `async function` declaration referenced by identifier
- a `const` alias chain that resolves to one of the above

To avoid false positives, it does not currently try to infer whether a non-`async` function returns a promise.
