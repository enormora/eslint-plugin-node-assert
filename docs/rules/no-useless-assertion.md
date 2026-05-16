# @enormora/node-assert/no-useless-assertion

📝 Disallow Node.js assertions whose outcome is fully determined by constant inputs.

<!-- end auto-generated rule header -->

## Rule Details

Assertions are only useful when they check data that can vary at runtime. If every value that participates in the assertion is statically constant, the assertion is deterministic: it always passes or it always fails.

This rule reports covered `node:assert` and `node:assert/strict` calls whose checked inputs are all constant under the plugin's existing constant subset:

- literals, constant template literals, `undefined`, `NaN`, `Infinity`
- arrays and objects built only from constants
- unary expressions over constants such as `-1`, `!true`, `void 0`, and `typeof "foo"`

The rule resolves the same binding patterns as the other assert rules, including aliased imports, computed member access with statically known property names, `const` alias chains, and strict re-exports such as `import { strict } from "node:assert"`.

### Covered methods

Single-input methods:

- `ok` (including namespace-callable `assert(...)`)
- `ifError`

Two-input methods:

- `equal`, `strictEqual`, `notEqual`, `notStrictEqual`
- `deepEqual`, `deepStrictEqual`, `notDeepEqual`, `notDeepStrictEqual`
- `partialDeepStrictEqual`
- `match`, `doesNotMatch`

### Messages

- `always-passes`: the assertion always succeeds because every checked input is constant.
- `always-fails`: the assertion always throws because every checked input is constant.

The following patterns are considered warnings:

```js
import assert from "node:assert/strict";

assert.ok(true);
assert(false);
assert.ifError(undefined);
assert.strictEqual(1, 1);
assert.notStrictEqual(1, 2);
assert.deepStrictEqual({}, {});
assert.match("alphabet", /pha/);
```

These patterns would not be considered warnings:

```js
import assert from "node:assert/strict";

assert.ok(value);
assert(value);
assert.ifError(err);
assert.strictEqual(actual, 1);
assert.deepStrictEqual(result, {});
assert.match(text, /pha/);
```

### Strict vs non-strict imports

The rule uses Node's actual assert semantics when deciding whether a constant assertion always passes or always fails.

That matters for legacy methods such as `equal`, `notEqual`, and `deepEqual`:

```js
import assert from "node:assert";
assert.equal(1, "1"); // reported as always-passes

import strictAssert from "node:assert/strict";
strictAssert.equal(1, "1"); // reported as always-fails
```

### Limitations

- The rule only evaluates the plugin's existing constant subset. Calls with non-constant inputs are ignored, even if you know they are deterministic in practice.
- Spread arguments are ignored.
- CommonJS `require(...)` is intentionally not tracked.
