# Disallow the usage of 'assert.rejects' (`node-assert/no-assert-rejects`)

<!-- end auto-generated rule header -->

This rule reports calls to `assert.rejects`.

## Rule Details

Examples of **incorrect** code for this rule:

```js
import assert from "node:assert/strict";

await assert.rejects(async () => {
  throw new Error("boom");
});
```

Examples of **correct** code for this rule:

```js
import assert from "node:assert/strict";

assert.throws(() => {
  throw new Error("boom");
});
```
