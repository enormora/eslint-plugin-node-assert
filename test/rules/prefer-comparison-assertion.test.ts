import { RuleTester } from "@typescript-eslint/rule-tester";
import { preferComparisonAssertionRule } from "../../source/rules/prefer-comparison-assertion.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-comparison-assertion", preferComparisonAssertionRule, {
	valid: [
		// Dedicated comparison methods are already explicit enough
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);",
		"import assert from 'node:assert/strict'; assert.notStrictEqual(actual, expected);",
		"import assert from 'node:assert'; assert.equal(actual, expected);",
		"import assert from 'node:assert'; assert.notEqual(actual, expected);",

		// Non-comparison assertions remain out of scope
		"import assert from 'node:assert/strict'; assert.ok(predicate(value));",
		"import assert from 'node:assert/strict'; assert(predicate(value));",
		"import assert from 'node:assert/strict'; assert.equal(predicate(value), true);",
		"import assert from 'node:assert/strict'; assert.strictEqual(predicate(value), false);",
		"import assert from 'node:assert/strict'; assert.ok(actual < expected);",
		"import assert from 'node:assert/strict'; assert.equal(actual >= expected, true);",

		// Loose operators cannot be preserved under strict assert semantics
		"import assert from 'node:assert/strict'; assert.ok(actual == expected);",
		"import assert from 'node:assert/strict'; assert(actual != expected);",
		"import assert from 'node:assert/strict'; assert.equal(actual == expected, true);",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual != expected, false);",
		"import { strict } from 'node:assert'; strict.ok(actual == expected);",
		"import assert from 'node:assert'; const { strict: s } = assert; s.equal(actual != expected, true);",

		// Missing or opaque arguments are ignored
		"import assert from 'node:assert/strict'; assert.ok();",
		"import assert from 'node:assert/strict'; assert.equal(actual === expected);",
		"import assert from 'node:assert/strict'; assert.equal(actual === expected, maybeTrue);",
		"import assert from 'node:assert/strict'; assert.strictEqual(...args);",
		"import assert from 'node:assert/strict'; assert.ok(...args);",
		"import assert from 'node:assert/strict'; assert.equal(actual === expected, ...rest);",

		// Untracked imports and objects are intentionally ignored
		"import assert from 'somewhere-else'; assert.ok(actual === expected);",
		"import { ok } from 'somewhere-else'; ok(actual === expected);",
		"const assert = { ok() {}, equal() {}, strictEqual() {} }; assert.ok(actual === expected);",

		// CommonJS require and let aliases are not tracked
		"const assert = require('node:assert/strict'); assert.ok(actual === expected);",
		"import assert from 'node:assert/strict'; let a = assert; a(actual === expected);",
		"import { ok } from 'node:assert/strict'; let a = ok; a(actual === expected);",

		// Computed access that cannot be resolved statically is ignored
		"import assert from 'node:assert/strict'; assert[someKey](actual === expected);",
		"import assert from 'node:assert/strict'; assert[someKey](actual === expected, true);",

		// Calls before imports do not resolve through the tracker
		"assert(actual === expected); import assert from 'node:assert/strict';",
		"ok(actual === expected); import { ok } from 'node:assert/strict';",

		// Binding-tracer coverage that should stay valid
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b(predicate(value));",
		"import assert from 'node:assert/strict'; const { ok: okay } = assert; okay(predicate(value));",
		"import { ok } from 'node:assert/strict'; const a = ok; const b = a; b(predicate(value));",
		"import assert from 'node:assert/strict'; const { equal: eq } = assert; eq(result, true);",
		"import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(result, false);",
		"import assert from 'node:assert'; const { strict: s } = assert; s(predicate(value));",
		"import assert from 'node:assert'; const key = 'strictEqual'; assert[key](result, true);"
	],
	invalid: [
		// ok-style assertions on member calls
		{
			code: "import assert from 'node:assert/strict'; assert.ok(actual === expected);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert(actual !== expected, message);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert/strict'; assert.notStrictEqual(actual, expected, message);"
		},
		{
			code: "import * as assert from 'node:assert'; assert['ok'](left == right);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import * as assert from 'node:assert'; assert['equal'](left, right);"
		},
		{
			code: "import assert from 'node:assert'; assert[`ok`](left != right, message);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert'; assert[`notEqual`](left, right, message);"
		},
		{
			code: "import assert from 'node:assert'; const key = 'ok'; assert[key](left == right, message);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert'; const key = 'ok'; assert.equal(left, right, message);"
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b(actual === expected);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(actual, expected);"
		},
		{
			code: "import { strict } from 'node:assert'; strict(result.deep.value === 42);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import { strict } from 'node:assert'; strict.strictEqual(result.deep.value, 42);"
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s(actual !== expected);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert'; const { strict: s } = assert; s.notStrictEqual(actual, expected);"
		},

		// Boolean assertion forms with explicit true/false comparisons
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actual === expected, true);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(actual === expected, false, message);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert/strict'; assert.notStrictEqual(actual, expected, message);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`strictEqual`](42 === result.deep.value, true, message);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert/strict'; assert[`strictEqual`](42, result.deep.value, message);"
		},
		{
			code: "import assert from 'node:assert'; assert.equal(actual != expected, false);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert'; assert.equal(actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; assert.strictEqual(actual == expected, false);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: "import assert from 'node:assert'; assert.notEqual(actual, expected);"
		},
		{
			code: "import { equal as eq } from 'node:assert'; eq(actual == expected, true);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: null
		},
		{
			code: "import assert from 'node:assert'; const { equal: eq } = assert; const a = eq; a(actual != expected, true);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: null
		},

		// Named bindings still report even when no safe fix exists
		{
			code: "import { ok } from 'node:assert/strict'; ok(actual === expected);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; const { ok: okay } = assert; const a = okay; a(actual !== expected);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: null
		},

		// Comments make the autofix intentionally conservative
		{
			code: "import assert from 'node:assert/strict'; assert.ok(actual /* keep */ === expected);",
			errors: [{ messageId: "prefer-comparison-assertion" }],
			output: null
		},

		// Multiple reports in one file
		{
			code: "import assert from 'node:assert'; assert.ok(a == b); assert.equal(c !== d, false); assert.strictEqual(e === f, true);",
			errors: [
				{ messageId: "prefer-comparison-assertion" },
				{ messageId: "prefer-comparison-assertion" },
				{ messageId: "prefer-comparison-assertion" }
			],
			output: "import assert from 'node:assert'; assert.equal(a, b); assert.strictEqual(c, d); assert.strictEqual(e, f);"
		}
	]
});
