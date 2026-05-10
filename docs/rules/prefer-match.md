# node-assert/prefer-match

📝 Prefer assert.match() or assert.doesNotMatch() for regular expression assertions.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

This rule prefers `assert.match()` and `assert.doesNotMatch()` over wrapping `RegExp#test()` in generic boolean assertions.

Examples of **incorrect** code for this rule:

```js
import assert from "node:assert/strict";

assert.ok(/foo/.test(value));
assert.strictEqual(pattern.test(value), false);
```

Examples of **correct** code for this rule:

```js
import assert from "node:assert/strict";

assert.match(value, /foo/);
assert.doesNotMatch(value, pattern);
```

## Fixes

Autofix is intentionally conservative. The rule only rewrites calls when replacing `regex.test(value)` with `match(value, regex)` is unlikely to change evaluation order in a meaningful way and no comments would be lost.
