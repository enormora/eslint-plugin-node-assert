import { RuleTester } from "@typescript-eslint/rule-tester";
import { preferDeepEqualityRule } from "../../source/rules/prefer-deep-equality.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-deep-equality", preferDeepEqualityRule, {
	valid: [
		// Already-deep methods are fine
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.deepEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(result, [1, 2, 3]);",
		"import assert from 'node:assert/strict'; assert.notDeepStrictEqual(result, {});",
		"import assert from 'node:assert/strict'; assert.notDeepEqual(result, {});",

		// Both sides are primitives — strictEqual is appropriate
		"import assert from 'node:assert/strict'; assert.strictEqual(result, 42);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, 'hello');",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, true);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, null);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, undefined);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, NaN);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, Infinity);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, -1);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, /foo/);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, `hello`);",
		"import assert from 'node:assert/strict'; assert.equal(result, 42);",
		"import assert from 'node:assert/strict'; assert.equal(result, 'hello');",

		// Identifiers on both sides — opaque, not flagged
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);",
		"import assert from 'node:assert/strict'; assert.equal(actual, expected);",

		// Method/constructor calls produce values but their shape is unknown
		"import assert from 'node:assert/strict'; assert.strictEqual(getResult(), getExpected());",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, new Map());",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, new Set());",

		// Methods outside the rule's scope are ignored, even with literals
		"import assert from 'node:assert/strict'; assert.notStrictEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.notEqual(result, [1, 2, 3]);",
		"import assert from 'node:assert/strict'; assert.ok({ ok: true });",
		"import assert from 'node:assert/strict'; assert.match(result, /foo/);",
		"import assert from 'node:assert/strict'; assert.throws(() => fn(), { message: 'x' });",
		"import assert from 'node:assert/strict'; assert.partialDeepStrictEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.ifError({ ok: true });",

		// Imports from unrelated modules are ignored
		"import assert from 'somewhere-else'; assert.strictEqual(result, { ok: true });",
		"import { strictEqual } from 'somewhere-else'; strictEqual(result, { ok: true });",

		// Calls on unrelated objects must not be tracked
		"const other = { strictEqual: () => {} }; other.strictEqual(result, { ok: true });",
		"const assert = { strictEqual() {} }; assert.strictEqual(result, { ok: true });",

		// CommonJS require is intentionally not tracked
		"const assert = require('node:assert/strict'); assert.strictEqual(result, { ok: true });",
		"const { strictEqual } = require('node:assert/strict'); strictEqual(result, { ok: true });",

		// `let`-declared aliases are not propagated
		"import assert from 'node:assert/strict'; let a = assert; a.strictEqual(result, { ok: true });",
		"import { strictEqual } from 'node:assert/strict'; let eq = strictEqual; eq(result, { ok: true });",

		// Computed access with a non-resolvable key
		"import assert from 'node:assert/strict'; assert[someKey](result, { ok: true });",

		// Arguments below the equality arity
		"import assert from 'node:assert/strict'; assert.strictEqual({ ok: true });",
		"import assert from 'node:assert/strict'; assert.strictEqual();",

		// Spread arguments are opaque
		"import assert from 'node:assert/strict'; assert.strictEqual(...args);",
		"import assert from 'node:assert/strict'; assert.strictEqual({ ok: true }, ...rest);",
		"import assert from 'node:assert/strict'; assert.strictEqual(...rest, { ok: true });",

		// Side-effect-only import: no specifiers, no crash
		"import 'node:assert';",
		"import 'node:assert/strict';",

		// Calls before the import declaration cannot resolve a binding
		"strictEqual(other, { ok: true }); import { strictEqual } from 'node:assert/strict';"
	],
	invalid: [
		// Object literal as expected (the canonical case from the issue)
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, { ok: true });",
			errors: [
				{
					messageId: "prefer-deep-equality",
					data: { shallowMethodName: "strictEqual", deepMethodName: "deepStrictEqual" }
				}
			],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok: true });"
		},
		// Array literal as expected
		{
			code: "import assert from 'node:assert/strict'; assert.equal(result, [1, 2, 3]);",
			errors: [
				{
					messageId: "prefer-deep-equality",
					data: { shallowMethodName: "equal", deepMethodName: "deepEqual" }
				}
			],
			output: "import assert from 'node:assert/strict'; assert.deepEqual(result, [1, 2, 3]);"
		},
		// Empty object literal still flagged
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, {});",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, {});"
		},
		// Empty array literal still flagged
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, []);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, []);"
		},
		// Nested literals
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, { items: [1, 2, 3] });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { items: [1, 2, 3] });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.equal(result, [{ id: 1 }, { id: 2 }]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepEqual(result, [{ id: 1 }, { id: 2 }]);"
		},
		// Object literal as actual (also overlapping with no-constant-actual; we still flag)
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual({ ok: true }, result);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual({ ok: true }, result);"
		},
		// Both sides literal
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual({}, {});",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual({}, {});"
		},
		// Three-argument form preserves the trailing message
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, { ok: true }, 'oops');",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok: true }, 'oops');"
		},

		// `equal` paired with literals
		{
			code: "import assert from 'node:assert/strict'; assert.equal(result, { ok: true });",
			errors: [
				{
					messageId: "prefer-deep-equality",
					data: { shallowMethodName: "equal", deepMethodName: "deepEqual" }
				}
			],
			output: "import assert from 'node:assert/strict'; assert.deepEqual(result, { ok: true });"
		},

		// Default import from `node:assert`
		{
			code: "import assert from 'node:assert'; assert.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; assert.deepStrictEqual(result, { ok: true });"
		},
		// Bare specifier without the node: protocol
		{
			code: "import assert from 'assert'; assert.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'assert'; assert.deepStrictEqual(result, { ok: true });"
		},
		{
			code: "import assert from 'assert/strict'; assert.equal(result, [1, 2, 3]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'assert/strict'; assert.deepEqual(result, [1, 2, 3]);"
		},

		// Namespace import
		{
			code: "import * as assert from 'node:assert/strict'; assert.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import * as assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok: true });"
		},
		{
			code: "import * as assert from 'node:assert'; assert.equal(result, [1, 2, 3]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import * as assert from 'node:assert'; assert.deepEqual(result, [1, 2, 3]);"
		},

		// Named import (no autofix on identifier callees)
		{
			code: "import { strictEqual } from 'node:assert/strict'; strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},
		{
			code: "import { equal } from 'node:assert'; equal(result, [1, 2, 3]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},

		// Renamed named import (still flagged, no autofix)
		{
			code: "import { strictEqual as eq } from 'node:assert/strict'; eq(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},

		// Default + named combined: every offending call site is flagged
		{
			code:
				"import assert, { strictEqual } from 'node:assert'; assert.strictEqual(a, { ok: true }); " +
				"strictEqual(b, [1, 2]);",
			errors: [{ messageId: "prefer-deep-equality" }, { messageId: "prefer-deep-equality" }],
			output:
				"import assert, { strictEqual } from 'node:assert'; assert.deepStrictEqual(a, { ok: true }); " +
				"strictEqual(b, [1, 2]);"
		},

		// `strict` re-export via named import
		{
			code: "import { strict } from 'node:assert'; strict.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import { strict } from 'node:assert'; strict.deepStrictEqual(result, { ok: true });"
		},
		{
			code: "import { strict as s } from 'node:assert'; s.equal(result, [1, 2]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import { strict as s } from 'node:assert'; s.deepEqual(result, [1, 2]);"
		},

		// `strict` re-export via const destructuring (single-hop and renamed)
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; const { strict } = assert; strict.deepStrictEqual(result, { ok: true });"
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.equal(result, [1, 2]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; const { strict: s } = assert; s.deepEqual(result, [1, 2]);"
		},
		// `strict` re-export through a multi-hop alias
		{
			code:
				"import assert from 'node:assert'; const { strict } = assert; const s = strict; " +
				"s.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output:
				"import assert from 'node:assert'; const { strict } = assert; const s = strict; " +
				"s.deepStrictEqual(result, { ok: true });"
		},

		// const namespace alias
		{
			code:
				"import assert from 'node:assert/strict'; const alias = assert; " +
				"alias.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output:
				"import assert from 'node:assert/strict'; const alias = assert; " +
				"alias.deepStrictEqual(result, { ok: true });"
		},
		// Multi-hop alias chain
		{
			code:
				"import assert from 'node:assert/strict'; const a = assert; const b = a; " +
				"b.strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output:
				"import assert from 'node:assert/strict'; const a = assert; const b = a; " +
				"b.deepStrictEqual(result, { ok: true });"
		},

		// Destructured method binding (not autofixed because the call site is an Identifier)
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual: eq } = assert; eq(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},
		{
			code: "import assert from 'node:assert'; const { equal } = assert; equal(result, [1, 2, 3]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},

		// Re-binding a named import (Identifier callee, no autofix)
		{
			code: "import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},
		// Multi-hop alias of a named import
		{
			code:
				"import { strictEqual } from 'node:assert/strict'; const eq1 = strictEqual; const eq2 = eq1; " +
				"eq2(result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},

		// Computed member access via a string literal
		{
			code: "import assert from 'node:assert'; assert['strictEqual'](result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; assert['deepStrictEqual'](result, { ok: true });"
		},
		// Computed member access via a constant template literal
		{
			code: "import assert from 'node:assert'; assert[`strictEqual`](result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; assert[`deepStrictEqual`](result, { ok: true });"
		},
		// Computed member access via a const-bound key (resolved through getPropertyName but not autofixable)
		{
			code: "import assert from 'node:assert'; const key = 'strictEqual'; assert[key](result, { ok: true });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: null
		},

		// Three-argument form with custom message preserved through the autofix
		{
			code: "import assert from 'node:assert'; assert.strictEqual(result, { ok: true }, 'mismatch');",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; assert.deepStrictEqual(result, { ok: true }, 'mismatch');"
		},

		// Both arguments are literals (also flagged by no-constant-actual; this rule still reports)
		{
			code: "import assert from 'node:assert'; assert.strictEqual([1, 2], [1, 2]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; assert.deepStrictEqual([1, 2], [1, 2]);"
		},
		{
			code: "import assert from 'node:assert'; assert.equal({ a: 1 }, { a: 1 });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert'; assert.deepEqual({ a: 1 }, { a: 1 });"
		},

		// Calls inside various scopes are still resolved
		{
			code: "import assert from 'node:assert/strict'; function test() { assert.strictEqual(result, { ok: true }); }",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; function test() { assert.deepStrictEqual(result, { ok: true }); }"
		},
		{
			code: "import assert from 'node:assert/strict'; if (cond) { assert.strictEqual(result, [1, 2]); }",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; if (cond) { assert.deepStrictEqual(result, [1, 2]); }"
		},
		{
			code: "import assert from 'node:assert/strict'; class C { static { assert.strictEqual(result, {}); } }",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; class C { static { assert.deepStrictEqual(result, {}); } }"
		},

		// Object literal containing computed properties or shorthand still triggers
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, { [k]: 1 });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { [k]: 1 });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, { ok });",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok });"
		},

		// Array literal with a spread element still triggers
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, [...items]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, [...items]);"
		},
		// Array literal with holes still triggers
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(result, [, , 3]);",
			errors: [{ messageId: "prefer-deep-equality" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, [, , 3]);"
		},

		// Two flagged calls in the same file
		{
			code:
				"import assert from 'node:assert/strict'; assert.strictEqual(a, { ok: true }); " +
				"assert.equal(b, [1, 2]);",
			errors: [{ messageId: "prefer-deep-equality" }, { messageId: "prefer-deep-equality" }],
			output:
				"import assert from 'node:assert/strict'; assert.deepStrictEqual(a, { ok: true }); " +
				"assert.deepEqual(b, [1, 2]);"
		}
	]
});
