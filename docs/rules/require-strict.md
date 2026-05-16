# @enormora/node-assert/require-strict

📝 Require strict assertion semantics for Node.js assert equality methods.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

This rule forbids legacy equality method names from non-strict assert bindings:

- `equal` -> `strictEqual`
- `notEqual` -> `notStrictEqual`
- `deepEqual` -> `deepStrictEqual`
- `notDeepEqual` -> `notDeepStrictEqual`

### Options

- `mode: "semantic"` (default): allow legacy method names on strict bindings (`node:assert/strict` or `{ strict }`)
- `mode: "explicit"`: always require strict method names at call sites

Invalid in `semantic` mode:

```js
import assert from "node:assert";
assert.equal(actual, expected);
```

Valid in `semantic` mode:

```js
import assert from "node:assert/strict";
assert.equal(actual, expected);
```
