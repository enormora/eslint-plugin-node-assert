# node-assert/no-restricted-assertion

📝 Disallow configured Node.js assert methods.

<!-- end auto-generated rule header -->

## Rule Details

This rule lets a project forbid specific `node:assert` methods without adding a dedicated rule for each local convention.

Configure the assertion method names to restrict:

```js
{
  "node-assert/no-restricted-assertion": [
    "error",
    {
      "assertions": [
        {
          "name": "doesNotReject",
          "message": "Avoid assert.doesNotReject(). Await the promise directly instead."
        },
        {
          "name": "doesNotThrow",
          "message": "Avoid assert.doesNotThrow(). Call the function directly instead."
        },
        {
          "name": "equal",
          "message": "Use assert.strictEqual() instead of assert.equal()."
        },
        {
          "name": "deepEqual",
          "message": "Use assert.deepStrictEqual() instead of assert.deepEqual()."
        }
      ]
    }
  ]
}
```

Examples of **incorrect** code with that configuration:

```js
import assert from "node:assert/strict";

assert.doesNotReject(promiseUnderTest);
assert.doesNotThrow(() => runOperation());
assert.equal(actualValue, expectedValue);
assert.deepEqual(actualValue, expectedValue);
```

Examples of **correct** code with that configuration:

```js
import assert from "node:assert/strict";

await promiseUnderTest;
runOperation();
assert.strictEqual(actualValue, expectedValue);
assert.deepStrictEqual(actualValue, expectedValue);
```

### Options

The rule takes one object option:

```ts
type Options = {
  assertions: Array<{
    name: string;
    message?: string;
  }>;
};
```

- `name` is the `node:assert` method name to restrict.
- `message` is an optional custom diagnostic. When omitted, the rule reports `Use of assert.<name>() is restricted.`

### Recognized usage patterns

The rule resolves common ESM indirections on top of plain `assert.method(...)` calls:

- ESM imports from `node:assert`, `node:assert/strict`, `assert`, and `assert/strict`.
- The default callable: `assert(value)` is treated as `assert.ok(value)`.
- Aliased and namespace imports.
- Re-exported strict namespaces (`import { strict } from "node:assert"; strict.equal(...)`), including the `const`-destructuring form.
- Computed member access with a string literal, constant template literal, or `const`-declared string key.
- `const` aliases of namespaces and destructured method bindings.

`let`-declared aliases are intentionally not tracked because the binding could be reassigned.
