# node-assert/require-custom-message

📝 Require a custom failure message argument in Node.js assert calls.

<!-- end auto-generated rule header -->

## Rule Details

A failing `node:assert` call without a custom message produces a generic `AssertionError` that only tells the reader *what* values disagreed, not *which* assertion failed or *why* it matters. Adding a description as the trailing argument turns the failure into actionable feedback.

This rule reports `node:assert` calls that omit the message argument.

### Reported pattern

```js
import assert from "node:assert/strict";

assert.strictEqual(result.status, 200);
```

Add a message:

```js
import assert from "node:assert/strict";

assert.strictEqual(result.status, 200, "GET /users should return 200 for an authenticated request");
```

### Methods covered

Each entry below shows the slot in which the rule expects to find a custom message:

| Method | Message slot |
| :--- | :--- |
| `assert(value, [message])`, `assert.ok(value, [message])` | second argument |
| `assert.equal`, `assert.notEqual`, `assert.strictEqual`, `assert.notStrictEqual` | third argument |
| `assert.deepEqual`, `assert.notDeepEqual`, `assert.deepStrictEqual`, `assert.notDeepStrictEqual` | third argument |
| `assert.partialDeepStrictEqual` | third argument |
| `assert.match`, `assert.doesNotMatch` | third argument |
| `assert.throws`, `assert.doesNotThrow`, `assert.rejects`, `assert.doesNotReject` | third argument |

`assert.ifError` is not covered because it does not accept a message argument. `assert.fail` is not covered because its message argument is positional in a way that depends on the chosen overload (`assert.fail(message)` vs. `assert.fail(actual, expected, message[, operator])`).

### What counts as a message

The rule only checks whether the message slot is occupied; it does not inspect the value placed there. A string literal, a constant template literal, a dynamic template, an identifier, a member expression, a function call, an `Error` instance — anything is accepted. Wrong-type values such as `assert.ok(value, false)` are reported by [`no-expected-value-as-message`](./no-expected-value-as-message.md) instead.

### Patterns that are not reported

```js
import assert from "node:assert/strict";

assert.ok(value, "must be truthy");
assert.ok(value, message);
assert.strictEqual(actual, expected, "values must agree");
assert.strictEqual(actual, expected, getMessage());
assert.throws(fn, Error, "operation should reject the input");
await assert.rejects(promise, /pattern/, "GET /users should reject when unauthenticated");

// Spread arguments make the trailing slot opaque; the rule does not flag these.
assert.ok(...args);
assert.strictEqual(actual, ...rest);
assert.throws(fn, Error, ...rest);
```

### Methods outside the rule's scope

```js
import assert from "node:assert/strict";

assert.ifError(err); // has no message slot
assert.fail(); // overloaded message position
assert.fail("boom");
```

### Recognized usage patterns

The rule resolves common indirections on top of plain `assert.method(...)` calls:

- ESM imports from `node:assert`, `node:assert/strict`, `assert`, and `assert/strict`.
- The default callable: `assert(value)` is treated as `assert.ok(value)`.
- Aliased and namespace imports.
- Re-exported strict namespaces (`import { strict } from 'node:assert'; strict.ok(...)`), including the `const`-destructuring form.
- Computed member access with a string literal, constant template literal, or `const`-declared string key.
- `const` aliases of namespaces (multi-hop chains included) and destructured method bindings.

`let`-declared aliases are intentionally not tracked because the binding could be reassigned. CommonJS `require` is not tracked.
