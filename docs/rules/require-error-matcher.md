# node-assert/require-error-matcher

📝 Require assert.throws() and assert.rejects() to include an error matcher.

<!-- end auto-generated rule header -->

## Rule Details

`assert.throws()` and `assert.rejects()` are weak assertions when they omit the matcher argument. Without a matcher, they only prove that some error happened, not that the right error happened.

This rule requires an explicit matcher in the second argument slot and can optionally enforce stricter matcher styles.

### Reported patterns

```js
import assert from "node:assert/strict";

assert.throws(fn);
await assert.rejects(promise);

await assert.rejects(promise, "invalid input");

await assert.rejects(promise, /invalid input/, "wrong config"); // only when regex matchers are disallowed

await assert.rejects(promise, { code: "ERR_INVALID_INPUT" }); // when `message` is required
```

### Allowed by default

```js
import assert from "node:assert/strict";

assert.throws(fn, TypeError);
await assert.rejects(promise, /invalid input/);
await assert.rejects(promise, { message: "invalid input" });
await assert.rejects(promise, (error) => error.message === "invalid input");
```

## Options

Default configuration:

```json
{
  "node-assert/require-error-matcher": [
    "error",
    {
      "allowedMatchers": ["object", "constructor", "validation-function", "regex"]
    }
  ]
}
```

### `allowedMatchers`

Restricts the accepted matcher kinds:

- `"object"`
- `"constructor"`
- `"validation-function"`
- `"regex"`

Example:

```json
{
  "node-assert/require-error-matcher": [
    "error",
    {
      "allowedMatchers": ["object"]
    }
  ]
}
```

With that configuration, constructor, regex, and validation-function matchers are reported when the rule can determine their shape statically.

### `objectMatcher.requiredProperties`

Requires object matchers to include every listed property.

```json
{
  "node-assert/require-error-matcher": [
    "error",
    {
      "allowedMatchers": ["object"],
      "objectMatcher": {
        "requiredProperties": ["message"]
      }
    }
  ]
}
```

### `objectMatcher.requireAtLeastOneProperty`

Requires object matchers to include at least one property from the configured list.

```json
{
  "node-assert/require-error-matcher": [
    "error",
    {
      "allowedMatchers": ["object"],
      "objectMatcher": {
        "requireAtLeastOneProperty": ["message", "code", "name"]
      }
    }
  ]
}
```

## Recognized usage patterns

The rule resolves the same import and alias patterns as the rest of this plugin, including:

- `node:assert`, `node:assert/strict`, `assert`, and `assert/strict`
- Namespace imports and destructured method bindings
- Re-exported strict namespaces (`import { strict } from "node:assert"`)
- `const` aliases of locally-declared matcher objects, classes, and functions

Ambiguous imported or dynamically-computed matcher references are intentionally left alone in stricter matcher modes unless the syntax proves they violate the configuration.
