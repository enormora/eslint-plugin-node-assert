# node-assert/prefer-deep-equality

📝 Prefer deep equality assertions when comparing object or array literals.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

`assert.strictEqual` and `assert.equal` compare their arguments with reference equality semantics for objects. When the expected (or actual) value is an object literal, an array literal, or any freshly allocated structure, that comparison can never be true unless one side is the very same reference. The intended check is a structural one, which is what `assert.deepStrictEqual` and `assert.deepEqual` provide.

This rule reports `assert.strictEqual` and `assert.equal` calls where at least one of the two compared arguments is an object or array literal, and rewrites them to the corresponding deep variant:

- `strictEqual` → `deepStrictEqual`
- `equal` → `deepEqual`

Examples of **incorrect** code for this rule:

```js
import assert from "node:assert/strict";

assert.strictEqual(result, { ok: true });
assert.strictEqual(result, [1, 2, 3]);
assert.equal(result, { ok: true });
assert.strictEqual({ ok: true }, result);
```

Examples of **correct** code for this rule:

```js
import assert from "node:assert/strict";

assert.deepStrictEqual(result, { ok: true });
assert.deepStrictEqual(result, [1, 2, 3]);
assert.deepEqual(result, { ok: true });
assert.strictEqual(result, 42);
assert.strictEqual(result, "hello");
assert.strictEqual(result, null);
```

### Detection

A call is reported when:

- The resolved method is `strictEqual` or `equal` on a binding originating from `node:assert`, `node:assert/strict`, `assert`, or `assert/strict` (resolved through the same binding analysis as the other rules in this plugin: default, named, namespace, renamed, computed, destructured, and `const`-aliased forms).
- The call has at least two arguments and neither of the first two is a `SpreadElement`.
- At least one of the first two arguments is an `ObjectExpression` (`{ ... }`) or `ArrayExpression` (`[ ... ]`).

The rule deliberately limits detection to literal forms because, without type information, an arbitrary expression cannot be classified as an object reference. If you compare a value that is *known* to be an object but not written as a literal (for example, a result returned from a factory), the rule will not flag it. Use `deepStrictEqual` or `deepEqual` whenever in doubt.

### Autofix

The fix replaces the called method name with the deep variant. The remaining arguments — including a custom failure message in the third slot — are preserved verbatim.

The autofix is applied for the common shapes of the callee:

- `assert.strictEqual(...)` (member access via identifier)
- `assert['strictEqual'](...)` (computed access with a string literal)
- `` assert[`strictEqual`](...) `` (computed access with a constant template literal)

Identifier callees (e.g. a named import like `import { strictEqual } from 'node:assert'; strictEqual(actual, {})`) are reported but not autofixed, because rewriting the call site would also require changing the import. Computed access via a `const`-bound key (`const k = 'strictEqual'; assert[k](...)`) is reported but not autofixed for the same reason.

### Recognized usage patterns

The rule resolves common indirections on top of plain `assert.method(...)` calls:

- ESM imports from `node:assert`, `node:assert/strict`, `assert`, and `assert/strict`.
- Aliased and namespace imports.
- Re-exported strict namespaces (`import { strict } from 'node:assert'; strict.strictEqual(...)`), including the `const`-destructuring form.
- Computed member access with a string literal, constant template literal, or `const`-declared string key.
- `const` aliases of namespaces (multi-hop chains included) and destructured method bindings.

`let`-declared aliases are intentionally not tracked because the binding could be reassigned. CommonJS `require` is not tracked.
