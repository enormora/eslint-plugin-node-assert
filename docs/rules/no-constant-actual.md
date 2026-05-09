# Disallow passing a constant value as the first argument to Node.js assert methods (`node-assert/no-constant-actual`)

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Node.js assert methods such as `strictEqual` accept the arguments in the order `actual, expected`. When the order is reversed, assertion failures are difficult to interpret because the diff is reported the wrong way around. Likewise, asserting against a hard-coded constant value (or comparing two constants) produces a deterministic test that has no meaningful effect.

This rule reports calls to the covered `node:assert` and `node:assert/strict` methods (also matched via the bare `assert` and `assert/strict` specifiers) whose first argument is a constant value (a literal, a constant template literal, an array or object built only from constants, `undefined`, `NaN`, `Infinity`, or a unary expression over a constant). It does not report calls where both arguments are non-constant (ambiguous, like `foo(), bar()`).

### Covered methods

Two-argument methods (`actual, expected[, message]`):

- `equal`, `strictEqual`, `notEqual`, `notStrictEqual`
- `deepEqual`, `deepStrictEqual`, `notDeepEqual`, `notDeepStrictEqual`
- `partialDeepStrictEqual`
- `match`, `doesNotMatch`
- `throws`, `doesNotThrow`, `rejects`, `doesNotReject`

Single-argument methods (`actual`):

- `ifError`

### Messages

- `no-constant-actual` (autofix available): the first argument is constant and the second is not. Almost certainly a swap.
- `constant-comparison` (no autofix): both arguments are constant. The test compares two known values and is likely meaningless.
- `constant-actual` (no autofix): a single-argument method like `ifError` was called with a constant value, so the assertion is deterministic.

The following patterns are considered warnings:

```js
import assert from "node:assert/strict";

assert.strictEqual(42, actual);
assert.deepStrictEqual({ ok: true }, result);
assert.notStrictEqual(null, value);
assert.equal("foo", result);
assert.throws({ message: "boom" }, fn);
assert.match(/pattern/, value);
assert.ifError("not an error");
```

These patterns would not be considered warnings:

```js
import assert from "node:assert/strict";

assert.strictEqual(actual, 42);
assert.deepStrictEqual(result, { ok: true });
assert.notStrictEqual(value, null);
assert.throws(fn, { message: "boom" });
assert.match(value, /pattern/);
assert.ifError(err);
```

### Autofix

For two-argument methods, the autofix swaps the two arguments. To avoid losing context, the autofix is skipped when comments appear between the arguments.

For `match` and `doesNotMatch` the two arguments have different types (`string` and `RegExp`). The autofix is still applied because in the typical mistake case the constant first argument is the regex, and swapping yields the correct shape; review fixes carefully if your code ends up in the rare opposite arrangement.

### Recognized usage patterns

The rule resolves common indirections on top of plain `assert.method(...)` calls:

- Imports from `node:assert`, `node:assert/strict`, `assert`, and `assert/strict`.
- Aliased named imports (`import { strictEqual as foo } from 'node:assert/strict'; foo(...)`).
- Computed member access with a string literal (`assert['strictEqual'](...)`), a constant template literal (`` assert[`strictEqual`](...) ``), or a `const`-declared string (`const key = 'strictEqual'; assert[key](...)`).
- Aliasing the namespace (`const a = assert; a.strictEqual(...)`), including multi-hop chains (`const a = assert; const b = a; b.strictEqual(...)`).
- Destructuring from the namespace (`const { strictEqual } = assert; strictEqual(...)`), including renames (`const { strictEqual: foo } = assert; foo(...)`).
- Re-binding a named import (`const eq = strictEqual; eq(...)`).

`let`-declared aliases are intentionally not tracked because the binding could be reassigned. CommonJS `require` is not tracked.
