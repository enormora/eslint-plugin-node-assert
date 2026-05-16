# node-assert/no-await-argument-in-rejects

📝 Disallow awaiting the argument passed to assert.rejects() and assert.doesNotReject().

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

`assert.rejects()` and `assert.doesNotReject()` expect either a promise or a function that returns a promise. If you `await` that promise before passing it in, the promise settles too early and the assertion checks the wrong thing.

Examples of **incorrect** code for this rule:

```js
import assert from "node:assert/strict";

await assert.rejects(await doThing(), {
    message: "invalid input"
});

await assert.doesNotReject(await doThing());
```

Examples of **correct** code for this rule:

```js
import assert from "node:assert/strict";

await assert.rejects(doThing(), {
    message: "invalid input"
});

await assert.rejects(() => doThing(), {
    message: "invalid input"
});

await assert.doesNotReject(doThing());
```

## Autofix

When removing the inner `await` is syntactically safe and does not discard comments, the rule fixes:

```js
await assert.rejects(await doThing(), matcher);
```

to:

```js
await assert.rejects(doThing(), matcher);
```
