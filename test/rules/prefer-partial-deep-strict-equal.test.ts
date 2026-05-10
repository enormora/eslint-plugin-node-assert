import { RuleTester } from "@typescript-eslint/rule-tester";
import { preferPartialDeepStrictEqualRule } from "../../source/rules/prefer-partial-deep-strict-equal.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-partial-deep-strict-equal", preferPartialDeepStrictEqualRule, {
	valid: [
		// Single eligible call cannot be merged
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(user.profile, {});",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.profile.name, 'Alice');",

		// Two adjacent calls on different roots
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(account.balance, 100);",
		"import assert from 'node:assert/strict'; assert.strictEqual(a.x, 1); assert.strictEqual(b.y, 2); assert.strictEqual(c.z, 3);",

		// Non-eligible methods break the run
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.notStrictEqual(user.name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.notDeepStrictEqual(user.profile, {});",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.equal(user.name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.deepEqual(user.profile, {});",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.match(user.name, /Alice/);",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.doesNotMatch(user.name, /Alice/);",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.ok(user.active);",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.partialDeepStrictEqual(user, {});",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.throws(() => user.fail(), Error);",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.ifError(user.error);",

		// Actual is not a member expression
		"import assert from 'node:assert/strict'; assert.strictEqual(user, 1); assert.strictEqual(user, 2);",
		"import assert from 'node:assert/strict'; assert.strictEqual(value, 1); assert.strictEqual(other, 2);",
		"import assert from 'node:assert/strict'; assert.strictEqual(getUser(), 1); assert.strictEqual(getUser(), 2);",

		// Computed access anywhere in the actual chain
		"import assert from 'node:assert/strict'; assert.strictEqual(user[key], 1); assert.strictEqual(user[other], 2);",
		"import assert from 'node:assert/strict'; assert.strictEqual(users[0].id, 1); assert.strictEqual(users[0].name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.profile['name'], 'Alice'); assert.strictEqual(user.profile['email'], 'a@b');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user[`id`], 1); assert.strictEqual(user[`name`], 'Alice');",

		// Actual rooted at a non-Identifier expression
		"import assert from 'node:assert/strict'; assert.strictEqual(getUser().id, 1); assert.strictEqual(getUser().name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual(this.user.id, 1); assert.strictEqual(this.user.name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual((user || other).id, 1); assert.strictEqual((user || other).name, 'Alice');",

		// Three-argument form with custom message would lose the message when merged
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1, 'id'); assert.strictEqual(user.name, 'Alice', 'name');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice', 'name');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1, 'id'); assert.strictEqual(user.name, 'Alice');",

		// Spread arguments are opaque
		"import assert from 'node:assert/strict'; assert.strictEqual(...args); assert.strictEqual(user.id, 1);",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(...args);",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, ...rest);",

		// Run interrupted by an unrelated statement
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); console.log('between'); assert.strictEqual(user.name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); const x = 1; assert.strictEqual(user.name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); if (cond) {} assert.strictEqual(user.name, 'Alice');",
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); ; assert.strictEqual(user.name, 'Alice');",

		// Awaited calls do not appear as direct CallExpressions
		"import assert from 'node:assert/strict'; async function test() { await assert.strictEqual(user.id, 1); await assert.strictEqual(user.name, 'Alice'); }",

		// Two calls in different sibling blocks
		"import assert from 'node:assert/strict'; if (cond) { assert.strictEqual(user.id, 1); } else { assert.strictEqual(user.name, 'Alice'); }",
		"import assert from 'node:assert/strict'; { assert.strictEqual(user.id, 1); } { assert.strictEqual(user.name, 'Alice'); }",

		// Imports from unrelated modules are ignored
		"import { strictEqual } from 'somewhere-else'; strictEqual(user.id, 1); strictEqual(user.name, 'Alice');",
		"import assert from 'somewhere-else'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",

		// CommonJS require is intentionally not tracked
		"const assert = require('node:assert/strict'); assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",
		"const { strictEqual } = require('node:assert/strict'); strictEqual(user.id, 1); strictEqual(user.name, 'Alice');",

		// let-declared aliases are not propagated
		"import assert from 'node:assert/strict'; let a = assert; a.strictEqual(user.id, 1); a.strictEqual(user.name, 'Alice');",
		"import { strictEqual } from 'node:assert/strict'; let eq = strictEqual; eq(user.id, 1); eq(user.name, 'Alice');",

		// Member call on an unrelated object
		"const other = { strictEqual: () => {} }; other.strictEqual(user.id, 1); other.strictEqual(user.name, 'Alice');",

		// Computed property name on assert that cannot be statically resolved
		"import assert from 'node:assert/strict'; assert[someKey](user.id, 1); assert[someKey](user.name, 'Alice');",

		// Namespace-callable form is not tracked by this rule
		"import assert from 'node:assert/strict'; assert(user.id, 1); assert(user.name, 'Alice');",

		// Mixed runs where each run is below the threshold
		"import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(account.balance, 100); assert.strictEqual(other.x, 1);",

		// Two calls separated by a switch fall-through (different SwitchCase consequents)
		"import assert from 'node:assert/strict'; switch (x) { case 1: assert.strictEqual(user.id, 1); break; case 2: assert.strictEqual(user.name, 'Alice'); break; }"
	],
	invalid: [
		// Two adjacent strictEqual calls on the same simple root
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Deep property paths on the same root
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.profile.name, 'Alice'); assert.strictEqual(user.profile.email, 'a@b');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Three adjacent calls report a single violation at the head of the run
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); assert.strictEqual(user.email, 'a@b');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Mixed eligible methods on the same root
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.deepStrictEqual(user.profile, { name: 'Alice' });",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Two deepStrictEqual calls on the same root
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual(user.profile, { name: 'Alice' }); assert.deepStrictEqual(user.address, { city: 'X' });",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Same property path twice still constitutes a run on the same root
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.id, 2);",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Namespace import binding
		{
			code: "import * as assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Named import (no alias)
		{
			code: "import { strictEqual } from 'node:assert/strict'; strictEqual(user.id, 1); strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Aliased named import
		{
			code: "import { strictEqual as eq } from 'node:assert/strict'; eq(user.id, 1); eq(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Mixed direct and named imports
		{
			code: "import assert, { deepStrictEqual } from 'node:assert/strict'; assert.strictEqual(user.id, 1); deepStrictEqual(user.profile, {});",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Base specifier (`node:assert`)
		{
			code: "import assert from 'node:assert'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Bare specifiers without the node: protocol
		{
			code: "import assert from 'assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		{
			code: "import assert from 'assert'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		{
			code: "import { strictEqual } from 'assert/strict'; strictEqual(user.id, 1); strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// strict re-export through a named import
		{
			code: "import { strict } from 'node:assert'; strict.strictEqual(user.id, 1); strict.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// strict re-export through a renamed named import
		{
			code: "import { strict as s } from 'node:assert'; s.strictEqual(user.id, 1); s.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// strict re-export through const destructuring
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.strictEqual(user.id, 1); strict.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// strict re-export through renamed const destructuring
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.strictEqual(user.id, 1); s.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// const namespace alias
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a.strictEqual(user.id, 1); a.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Multi-hop alias
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(user.id, 1); b.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Destructured method
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(user.id, 1); strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Renamed destructured method
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual: eq } = assert; eq(user.id, 1); eq(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Re-binding a named import
		{
			code: "import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(user.id, 1); eq(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Computed member access (literal, template, const-bound)
		{
			code: "import assert from 'node:assert/strict'; assert['strictEqual'](user.id, 1); assert['strictEqual'](user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`strictEqual`](user.id, 1); assert[`strictEqual`](user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const key = 'strictEqual'; assert[key](user.id, 1); assert[key](user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Mixed bindings resolving to the same method on the same root
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = assert; a.strictEqual(user.id, 1); b.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Two separate runs in the same file produce two reports
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); const sep = 1; assert.strictEqual(account.balance, 100); assert.strictEqual(account.owner, 'Bob');",
			errors: [
				{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } },
				{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "account" } }
			]
		},
		// Adjacent runs with different roots produce one report per run of two-or-more
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); assert.strictEqual(account.balance, 100); assert.strictEqual(account.owner, 'Bob');",
			errors: [
				{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } },
				{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "account" } }
			]
		},
		// Mixed run: only the matching adjacent pair is reported
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.id, 1); assert.strictEqual(account.balance, 100); assert.strictEqual(account.owner, 'Bob');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "account" } }]
		},
		// Inside a function body
		{
			code: "import assert from 'node:assert/strict'; function test() { assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); }",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Inside an arrow function body
		{
			code: "import assert from 'node:assert/strict'; const test = () => { assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); };",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Inside an `if` block
		{
			code: "import assert from 'node:assert/strict'; if (cond) { assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); }",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Inside a try block
		{
			code: "import assert from 'node:assert/strict'; try { assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); } catch (error) {}",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Inside a switch case consequent
		{
			code: "import assert from 'node:assert/strict'; switch (x) { case 1: assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); break; }",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Inside a class static block
		{
			code: "import assert from 'node:assert/strict'; class C { static { assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); } }",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Run preceded by a non-eligible call still triggers
		{
			code: "import assert from 'node:assert/strict'; console.log('start'); assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice');",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Run with deeper nested property paths (root identifier shared)
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(user.profile.name, 'Alice'); assert.strictEqual(user.id, 1); assert.deepStrictEqual(user.address, {});",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		},
		// Run inside a nested function inside a block
		{
			code: "import assert from 'node:assert/strict'; if (cond) { function inner() { assert.strictEqual(user.id, 1); assert.strictEqual(user.name, 'Alice'); } }",
			errors: [{ messageId: "prefer-partial-deep-strict-equal", data: { rootName: "user" } }]
		}
	]
});
