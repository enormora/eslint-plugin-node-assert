# node-assert/require-valid-error-validator-return

📝 Require custom Node.js assert error validators to return true when their checks pass.

<!-- end auto-generated rule header -->

## Rule Details

Node's `assert.throws()`, `assert.doesNotThrow()`, `assert.rejects()`, and `assert.doesNotReject()` accept a validation function as the error matcher. That function must return `true` when the error is acceptable. A common mistake is to perform inner assertions in the validator and forget the final `return true`, which makes the validator return `undefined` and causes the outer assertion to fail even though the inner checks passed.

Examples of **incorrect** code for this rule:

```js
import assert from "node:assert/strict";

assert.throws(fn, (error) => {
    assert.strictEqual(error.message, "invalid input");
});

await assert.rejects(promise, (error) => assert.strictEqual(error.message, "invalid input"));
```

Examples of **correct** code for this rule:

```js
import assert from "node:assert/strict";

assert.throws(fn, (error) => {
    assert.strictEqual(error.message, "invalid input");
    return true;
});

await assert.rejects(promise, (error) => {
    assert.strictEqual(error.message, "invalid input");
    return true;
});
```

## Scope

This rule currently analyzes only inline function expressions and arrow functions used directly as the second argument to:

- `assert.throws()`
- `assert.doesNotThrow()`
- `assert.rejects()`
- `assert.doesNotReject()`

It reports validators when it can prove that they may finish without returning `true`, or when they explicitly return a different constant value.

To avoid false positives, complex control flow that the rule does not model precisely is skipped.
