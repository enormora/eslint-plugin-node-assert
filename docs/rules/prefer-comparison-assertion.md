# node-assert/prefer-comparison-assertion

📝 Prefer dedicated equality assertion methods over asserting comparison results.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

This rule prefers `assert.equal()`, `assert.notEqual()`, `assert.strictEqual()`, and `assert.notStrictEqual()` over generic boolean assertions wrapped around equality comparisons.

Examples of **incorrect** code for this rule:

```js
import assert from "node:assert/strict";

assert.ok(actual === expected);
assert(actual !== expected);
assert.equal(result.deep.value === 42, true);
```

Examples of **correct** code for this rule:

```js
import assert from "node:assert/strict";

assert.strictEqual(actual, expected);
assert.notStrictEqual(actual, expected);
assert.strictEqual(result.deep.value, 42);
```

## What It Rewrites

- `assert.ok(left === right)` -> `assert.strictEqual(left, right)`
- `assert.ok(left !== right)` -> `assert.notStrictEqual(left, right)`
- `assert.equal(left === right, false)` -> `assert.notStrictEqual(left, right)`
- `assert.notStrictEqual(left === right, false)` -> `assert.strictEqual(left, right)`
- `assert.strictEqual(left !== right, false)` -> `assert.strictEqual(left, right)`

Loose operators are only rewritten for legacy `node:assert` bindings:

- `assert.ok(left == right)` -> `assert.equal(left, right)`
- `assert.equal(left != right, false)` -> `assert.equal(left, right)`
- `assert.notEqual(left == right, false)` -> `assert.equal(left, right)`

The rule intentionally skips loose comparisons on `node:assert/strict` (and `{ strict }` re-exports), because replacing `==` or `!=` there would change runtime semantics.

## Fixes

Autofix is conservative in two cases:

- Named method bindings such as `import { ok } from "node:assert/strict"; ok(a === b);` are reported but not rewritten automatically, because the corresponding comparison method may not be in scope.
- Calls containing comments are reported without a fix to avoid dropping or moving comments while restructuring the argument list.
