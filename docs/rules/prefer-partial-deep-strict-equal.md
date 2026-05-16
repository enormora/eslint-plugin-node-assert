# @enormora/node-assert/prefer-partial-deep-strict-equal

📝 Prefer a single `partialDeepStrictEqual` over multiple consecutive equality assertions on properties of the same object.

<!-- end auto-generated rule header -->

## Rule Details

When several consecutive `assert.strictEqual` (or `assert.deepStrictEqual`) calls each compare a property of the same root object against an expected value, they can usually be expressed as a single `assert.partialDeepStrictEqual` call. The consolidated form keeps related assertions together, removes repetition of the root identifier, and yields a single failure message that mentions every mismatch instead of failing at whichever assertion happens to come first.

This rule reports such runs. It does not autofix because merging into a partial object literal is not always semantically equivalent — see [Caveats](#caveats) — and the developer should review the consolidation manually.

### Reported pattern

```js
import assert from "node:assert/strict";

assert.strictEqual(user.id, 1);
assert.strictEqual(user.profile.name, "Alice");
```

The two calls can be merged into:

```js
assert.partialDeepStrictEqual(user, {
    id: 1,
    profile: {
        name: "Alice"
    }
});
```

A run is two or more consecutive eligible calls within the same body (a `Program`, `BlockStatement`, `SwitchCase` consequent, or class `static` block). The run is broken by any other statement.

### Eligible calls

A call participates in a run when:

- The method is `strictEqual` or `deepStrictEqual` (resolved through the same binding analysis as the other rules in this plugin: default, named, namespace, renamed, computed, destructured, and `const`-aliased forms).
- The call is invoked with exactly two arguments. A custom failure message in the third slot disqualifies the call because it cannot be preserved during the merge.
- The first argument is a `MemberExpression` rooted at a plain `Identifier`, with no computed access anywhere in the chain (so `user.id` and `user.profile.name` are eligible, but `users[0].id`, `user[key]`, `getUser().id`, and `this.user.id` are not).
- All calls in a run share the same root identifier name. Different roots simply form separate runs.

### Patterns that are not reported

```js
import assert from "node:assert/strict";

// Single eligible call has nothing to merge.
assert.strictEqual(user.id, 1);

// Different roots break the run.
assert.strictEqual(user.id, 1);
assert.strictEqual(account.balance, 100);

// Methods outside the rule's scope break the run.
assert.strictEqual(user.id, 1);
assert.notStrictEqual(user.name, "Alice");
assert.equal(user.email, "a@b");
assert.match(user.name, /Alice/);

// A custom failure message would be lost during the merge.
assert.strictEqual(user.id, 1, "id mismatch");
assert.strictEqual(user.name, "Alice", "name mismatch");

// Computed access disqualifies the call.
assert.strictEqual(user[key], 1);
assert.strictEqual(users[0].id, 1);

// Roots that are not plain identifiers (call expression, `this`, etc.) are skipped.
assert.strictEqual(getUser().id, 1);
assert.strictEqual(this.user.id, 1);

// Statements between the calls break the run.
assert.strictEqual(user.id, 1);
console.log("between");
assert.strictEqual(user.name, "Alice");
```

### Caveats

`assert.strictEqual` performs strict equality at the leaf, while `assert.partialDeepStrictEqual` performs deep equality on every property in the expected object. For primitive expected values (numbers, strings, booleans, `null`, `undefined`, regular expressions compared by reference, and similar) the two are interchangeable. When the expected value is an object reference, the merged form will compare the contents of that object instead of the identity, which can change the meaning of the assertion. Review the merge before applying it.

### Recognized usage patterns

The rule resolves common indirections on top of plain `assert.method(...)` calls:

- ESM imports from `node:assert`, `node:assert/strict`, `assert`, and `assert/strict`.
- Aliased and namespace imports.
- Re-exported strict namespaces (`import { strict } from 'node:assert'; strict.strictEqual(...)`), including the `const`-destructuring form.
- Computed member access with a string literal, constant template literal, or `const`-declared string key.
- `const` aliases of namespaces (multi-hop chains included) and destructured method bindings.

`let`-declared aliases are intentionally not tracked because the binding could be reassigned. CommonJS `require` is not tracked.
