import { RuleTester } from "@typescript-eslint/rule-tester";
import { noUselessAssertionRule } from "../../source/rules/no-useless-assertion.js";

const ruleTester = new RuleTester();

ruleTester.run("no-useless-assertion", noUselessAssertionRule, {
	valid: [
		// Non-constant values keep the assertion outcome data-dependent
		"import assert from 'node:assert/strict'; assert.ok(value);",
		"import assert from 'node:assert/strict'; assert(value);",
		"import assert from 'node:assert/strict'; assert.ifError(err);",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, 1);",
		"import assert from 'node:assert/strict'; assert.strictEqual(1, actual);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.notDeepStrictEqual(result, {});",
		"import assert from 'node:assert/strict'; assert.equal(actual, 1);",
		"import assert from 'node:assert'; assert.equal(actual, 1);",
		"import assert from 'node:assert'; assert.deepEqual(actual, { value: 1 });",
		"import assert from 'node:assert/strict'; assert.match(value, /foo/);",
		"import assert from 'node:assert/strict'; assert.doesNotMatch(value, /foo/);",
		"import assert from 'node:assert/strict'; assert.partialDeepStrictEqual(actual, { id: 1 });",
		"import assert from 'node:assert/strict'; assert.ok(value, 'msg');",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected, 'msg');",

		// Methods outside this rule's scope are ignored
		"import assert from 'node:assert/strict'; assert.fail('boom');",
		"import assert from 'node:assert/strict'; assert.throws(fn, Error);",
		"import assert from 'node:assert/strict'; assert.rejects(promise, Error);",

		// Insufficient or spread arguments are opaque to this rule
		"import assert from 'node:assert/strict'; assert.ok();",
		"import assert from 'node:assert/strict'; assert.ifError();",
		"import assert from 'node:assert/strict'; assert.strictEqual(1);",
		"import assert from 'node:assert/strict'; assert.strictEqual(...args);",
		"import assert from 'node:assert/strict'; assert.ok(...args);",
		"import assert from 'node:assert/strict'; assert.ifError(...args);",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, ...rest);",
		"import assert from 'node:assert/strict'; assert.match(value, ...rest);",

		// Imports from unrelated modules are ignored
		"import assert from 'somewhere-else'; assert.ok(true);",
		"import { strictEqual } from 'somewhere-else'; strictEqual(1, 1);",
		"import { ok } from 'somewhere-else'; ok(false);",

		// Calls on unrelated objects are ignored
		"const other = { ok: () => {}, strictEqual: () => {}, ifError: () => {} }; other.ok(true); other.strictEqual(1, 1); other.ifError(null);",

		// CommonJS require is intentionally not tracked
		"const assert = require('node:assert/strict'); assert.ok(true);",
		"const { strictEqual } = require('node:assert/strict'); strictEqual(1, 1);",

		// let-declared aliases are not propagated
		"import assert from 'node:assert/strict'; let a = assert; a.ok(true);",
		"import { strictEqual } from 'node:assert/strict'; let eq = strictEqual; eq(1, 1);",

		// Computed access that cannot be resolved statically is ignored
		"import assert from 'node:assert/strict'; assert[someKey](true);",
		"import assert from 'node:assert/strict'; assert[someKey](1, 1);",

		// Calls before the import declaration cannot resolve a tracked binding
		"ok(true); import { ok } from 'node:assert/strict';",
		"strictEqual(1, 1); import { strictEqual } from 'node:assert/strict';",

		// Binding-tracer coverage with non-constant inputs should remain valid
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b(actual);",
		"import assert from 'node:assert/strict'; const { ok: okay } = assert; okay(value);",
		"import { ok } from 'node:assert/strict'; const a = ok; const b = a; b(value);",
		"import assert from 'node:assert/strict'; const { strictEqual: eq } = assert; eq(actual, 1);",
		"import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(actual, 1);",
		"import { strict } from 'node:assert'; strict.equal(actual, 1);",
		"import assert from 'node:assert'; const { strict: s } = assert; s.equal(actual, 1);",
		"import assert from 'node:assert/strict'; assert['ok'](value);",
		"import assert from 'node:assert/strict'; assert[`strictEqual`](actual, 1);",
		"import assert from 'node:assert/strict'; const key = 'match'; assert[key](value, /foo/);"
	],
	invalid: [
		// ok-style assertions, including namespace-callable forms
		{
			code: "import assert from 'node:assert/strict'; assert.ok(true);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(0);",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert({ answer: 42 });",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert(false, message);",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert['ok']([]);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const k = 'ok'; assert[k]('');",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b(true);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import { ok as okay } from 'node:assert/strict'; const a = okay; const b = a; b(false);",
			errors: [{ messageId: "always-fails" }]
		},

		// ifError
		{
			code: "import assert from 'node:assert/strict'; assert.ifError(null);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import { ifError } from 'node:assert/strict'; ifError('boom');",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { ifError: failIfError } = assert; failIfError(null);",
			errors: [{ messageId: "always-passes" }]
		},

		// Equality families on strict assertions
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(1, 1);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(undefined, undefined);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import { strictEqual as eq } from 'node:assert/strict'; eq({}, {});",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.notStrictEqual(1, 2);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { notStrictEqual: neq } = assert; neq(1, 1);",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.deepStrictEqual({}, {});",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import { deepStrictEqual } from 'node:assert/strict'; const eq = deepStrictEqual; eq({ a: 1 }, { a: 2 });",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notDeepStrictEqual({ a: 1 }, { a: 2 });",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`notDeepStrictEqual`]({}, {});",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.partialDeepStrictEqual({ a: 1, b: 2 }, { a: 1 });",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const key = 'partialDeepStrictEqual'; assert[key]({ a: 1 }, { a: 2 });",
			errors: [{ messageId: "always-fails" }]
		},

		// Legacy equality methods depend on strictness metadata
		{
			code: "import assert from 'node:assert'; assert.equal(1, '1');",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.equal(1, '1');",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import { notEqual } from 'node:assert'; const neq = notEqual; neq(1, '1');",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { notEqual: neq } = assert; neq(1, '1');",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert'; assert.deepEqual({ value: 1 }, { value: '1' });",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import { strict } from 'node:assert'; strict.deepEqual({ value: 1 }, { value: '1' });",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.equal(1, '1');",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.notEqual(1, '1');",
			errors: [{ messageId: "always-passes" }]
		},

		// Match-style assertions
		{
			code: "import assert from 'node:assert/strict'; assert.match('alphabet', /pha/);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import { match } from 'node:assert/strict'; const m = match; m('alphabet', /z/);",
			errors: [{ messageId: "always-fails" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotMatch('alphabet', /z/);",
			errors: [{ messageId: "always-passes" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['doesNotMatch']('alphabet', /pha/);",
			errors: [{ messageId: "always-fails" }]
		},

		// Multiple reports in one file
		{
			code: "import assert from 'node:assert/strict'; assert.ok(true); assert.strictEqual(1, 1); assert.ifError(null);",
			errors: [{ messageId: "always-passes" }, { messageId: "always-passes" }, { messageId: "always-passes" }]
		}
	]
});
