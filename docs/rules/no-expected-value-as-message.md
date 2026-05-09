# Disallow passing an expected value where a message or error matcher belongs in Node.js assert calls (`node-assert/no-expected-value-as-message`)

<!-- end auto-generated rule header -->

## Rule Details

Several `node:assert` methods accept an optional argument in the second slot whose role is easy to confuse with an expected value:

- `assert(value[, message])` and `assert.ok(value[, message])` — the second argument is the **failure message**.
- `assert.throws(fn[, error][, message])`, `assert.doesNotThrow(...)`, `assert.rejects(...)`, `assert.doesNotReject(...)` — the second argument is the **error matcher**, not a message.

In both cases, a constant value in the second slot is almost always a sign that the developer intended to compare the first argument against an expected value. Instead, Node either uses the value as the assertion message (for `assert`/`ok` and, for strings, for `throws`/`rejects` too) or as an error matcher whose semantics differ from a comparison.

This rule reports those misuses. It does not autofix because the appropriate replacement (`strictEqual`, `deepStrictEqual`, `match`, an `Error` class, a regular expression, an object matcher, …) depends on the developer's intent.

### Reported patterns

```js
import assert from "node:assert/strict";

assert(value, true); // boolean treated as the assertion message
assert.ok(result, false); // the second arg is the message, not an expected value
assert.ok(count, 3); // intended `strictEqual(count, 3)`
assert.ok(user, { name: "Alice" }); // intended `deepStrictEqual(user, { name: 'Alice' })`
assert.ok(value, /pattern/); // a regex is not a message either
assert.ok(value, null); // null and undefined are still constants

assert.throws(fn, "invalid input"); // a string is treated as the message, not an error matcher
await assert.rejects(promise, "invalid input");
assert.throws(() => fn(), `invalid input`); // constant template literals as well
assert.doesNotThrow(fn, "boom");
assert.doesNotReject(promise, "boom");
```

### Patterns that are not reported

```js
import assert from "node:assert/strict";

assert.ok(value); // single argument
assert.ok(value, "must be truthy"); // a string literal is a valid message
assert.ok(value, `must be truthy`); // constant template literal too
assert.ok(value, `count: ${count}`); // dynamic template, not a constant
assert.ok(value, message); // any non-constant expression is fine

assert.throws(fn, /invalid/);
assert.throws(fn, TypeError);
assert.throws(fn, { message: "boom" });
assert.throws(fn, (error) => error instanceof TypeError);
assert.throws(fn, /invalid/, "custom failure message"); // strings are fine in the third slot
```

### What counts as an "expected value"

For `assert` and `assert.ok`, this rule flags any **non-string constant** as the second argument. That includes:

- Numbers, BigInts, booleans, `null`, regular expressions
- `undefined`, `NaN`, `Infinity` (and their unary forms like `-1`, `!true`, `void 0`)
- Object literals and array literals composed of constants
- Constant template literals are intentionally treated as strings and are allowed

For `assert.throws`, `assert.doesNotThrow`, `assert.rejects`, and `assert.doesNotReject`, this rule flags only **string literals and constant template literals**. Other constant shapes (regexes, Error classes, plain objects, validation functions) are valid error matchers.

### Recognized usage patterns

The rule resolves common indirections on top of plain `assert.method(...)` calls:

- ESM imports from `node:assert`, `node:assert/strict`, `assert`, and `assert/strict`.
- The default callable: `assert(value, expected)` is treated as `assert.ok(value, expected)`.
- Aliased and namespace imports.
- Re-exported strict namespaces (`import { strict } from 'node:assert'; strict.ok(...)`).
- Computed member access with a string literal, constant template literal, or `const`-declared string key.
- `const` aliases of namespaces (multi-hop chains included) and destructured method bindings.

`let`-declared aliases are intentionally not tracked because the binding could be reassigned.
