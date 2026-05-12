import { RuleTester } from "@typescript-eslint/rule-tester";
import { requireCustomMessageRule } from "../../source/rules/require-custom-message.js";

const ruleTester = new RuleTester();

ruleTester.run("require-custom-message", requireCustomMessageRule, {
	valid: [
		// assert.ok with a string-literal message
		"import assert from 'node:assert/strict'; assert.ok(value, 'must be truthy');",
		"import assert from 'node:assert/strict'; assert.ok(value, \"must be truthy\");",
		"import assert from 'node:assert/strict'; assert.ok(value, `must be truthy`);",
		// eslint-disable-next-line no-template-curly-in-string -- intentional template expression in fixture source
		"import assert from 'node:assert/strict'; assert.ok(value, `count: ${count}`);",

		// assert.ok with various non-constant expressions
		"import assert from 'node:assert/strict'; assert.ok(value, message);",
		"import assert from 'node:assert/strict'; assert.ok(value, getMessage());",
		"import assert from 'node:assert/strict'; assert.ok(value, obj.message);",
		"import assert from 'node:assert/strict'; assert.ok(value, a + b);",
		"import assert from 'node:assert/strict'; assert.ok(value, condition ? 'a' : 'b');",
		"import assert from 'node:assert/strict'; assert.ok(value, new Error('boom'));",

		// The rule only enforces that *something* is in the message slot; classifying
		// wrong-type values is the job of no-expected-value-as-message.
		"import assert from 'node:assert/strict'; assert.ok(value, true);",
		"import assert from 'node:assert/strict'; assert.ok(value, 3);",
		"import assert from 'node:assert/strict'; assert.ok(value, null);",
		"import assert from 'node:assert/strict'; assert.ok(value, undefined);",
		"import assert from 'node:assert/strict'; assert.ok(value, { name: 'Alice' });",

		// Namespace-callable assert(value, message)
		"import assert from 'node:assert/strict'; assert(value, 'must be truthy');",
		"import assert from 'node:assert/strict'; assert(value, message);",
		"import assert from 'node:assert/strict'; assert(value, getMessage());",

		// Spread arguments are opaque — we cannot know whether the message slot is filled
		"import assert from 'node:assert/strict'; assert.ok(...args);",
		"import assert from 'node:assert/strict'; assert(...args);",
		"import assert from 'node:assert/strict'; assert.ok(value, ...rest);",
		"import assert from 'node:assert/strict'; assert.strictEqual(...args);",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, ...rest);",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected, ...rest);",
		"import assert from 'node:assert/strict'; assert.throws(...args);",
		"import assert from 'node:assert/strict'; assert.throws(fn, ...rest);",
		"import assert from 'node:assert/strict'; assert.throws(fn, Error, ...rest);",

		// Comparison methods with a message in the third slot
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.notStrictEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.notDeepStrictEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.equal(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.notEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.deepEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.notDeepEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.partialDeepStrictEqual(actual, expected, 'msg');",
		"import assert from 'node:assert/strict'; assert.match(value, /pattern/, 'msg');",
		"import assert from 'node:assert/strict'; assert.doesNotMatch(value, /pattern/, 'msg');",

		// Comparison methods with a non-string message expression
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected, message);",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected, getMessage());",
		// eslint-disable-next-line no-template-curly-in-string -- intentional template expression in fixture source
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected, `mismatch: ${detail}`);",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, expected, new Error('boom'));",

		// Three-argument throws / rejects with a message in the third slot
		"import assert from 'node:assert/strict'; assert.throws(fn, Error, 'msg');",
		"import assert from 'node:assert/strict'; assert.throws(fn, /pattern/, 'msg');",
		"import assert from 'node:assert/strict'; assert.throws(fn, { message: 'boom' }, 'msg');",
		"import assert from 'node:assert/strict'; assert.throws(fn, validator, 'msg');",
		"import assert from 'node:assert/strict'; assert.doesNotThrow(fn, Error, 'msg');",
		"import assert from 'node:assert/strict'; await assert.rejects(promise, Error, 'msg');",
		"import assert from 'node:assert/strict'; await assert.doesNotReject(promise, Error, 'msg');",

		// Named imports with a message in the message slot
		"import { ok } from 'node:assert/strict'; ok(value, 'msg');",
		"import { ok as okay } from 'node:assert/strict'; okay(value, 'msg');",
		"import { strictEqual } from 'node:assert/strict'; strictEqual(actual, expected, 'msg');",
		"import { deepStrictEqual } from 'node:assert/strict'; deepStrictEqual(actual, expected, 'msg');",
		"import { match } from 'node:assert/strict'; match(value, /p/, 'msg');",
		"import { throws } from 'node:assert/strict'; throws(fn, Error, 'msg');",
		"import { rejects } from 'node:assert/strict'; await rejects(promise, Error, 'msg');",

		// Namespace import: member call and namespace-callable form with messages
		"import * as assert from 'node:assert/strict'; assert.ok(value, 'msg');",
		"import * as assert from 'node:assert/strict'; assert(value, 'msg');",
		"import * as assert from 'node:assert/strict'; assert.strictEqual(a, b, 'msg');",

		// strict re-export via named import
		"import { strict } from 'node:assert'; strict.ok(value, 'msg');",
		"import { strict } from 'node:assert'; strict(value, 'msg');",
		"import { strict } from 'node:assert'; strict.strictEqual(a, b, 'msg');",
		"import { strict as a } from 'node:assert'; a.ok(value, 'msg');",
		"import { strict as a } from 'node:assert'; a(value, 'msg');",
		"import { strict as a } from 'node:assert'; a.strictEqual(a, b, 'msg');",

		// strict re-export through const destructuring
		"import assert from 'node:assert'; const { strict } = assert; strict.ok(value, 'msg');",
		"import assert from 'node:assert'; const { strict } = assert; strict(value, 'msg');",
		"import assert from 'node:assert'; const { strict } = assert; strict.strictEqual(a, b, 'msg');",
		"import assert from 'node:assert'; const { strict: s } = assert; s.ok(value, 'msg');",
		"import assert from 'node:assert'; const { strict: s } = assert; s(value, 'msg');",

		// Bare specifiers without the node: protocol
		"import assert from 'assert'; assert.ok(value, 'msg');",
		"import assert from 'assert'; assert.strictEqual(a, b, 'msg');",
		"import assert from 'assert/strict'; assert.ok(value, 'msg');",
		"import { ok } from 'assert/strict'; ok(value, 'msg');",
		"import { throws } from 'assert/strict'; throws(fn, Error, 'msg');",

		// const namespace and method aliases
		"import assert from 'node:assert/strict'; const a = assert; a.ok(value, 'msg');",
		"import assert from 'node:assert/strict'; const a = assert; a(value, 'msg');",
		"import assert from 'node:assert/strict'; const a = assert; a.strictEqual(x, y, 'msg');",
		"import assert from 'node:assert/strict'; const { ok } = assert; ok(value, 'msg');",
		"import assert from 'node:assert/strict'; const { ok: okay } = assert; okay(value, 'msg');",
		"import { ok } from 'node:assert/strict'; const okay = ok; okay(value, 'msg');",
		"import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(a, b, 'msg');",

		// Multi-hop alias chains
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b.ok(value, 'msg');",
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b(value, 'msg');",
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(x, y, 'msg');",
		"import { ok } from 'node:assert/strict'; const a = ok; const b = a; b(value, 'msg');",
		"import { strictEqual } from 'node:assert/strict'; const a = strictEqual; const b = a; b(x, y, 'msg');",

		// Computed member access on tracked namespaces with a message
		"import assert from 'node:assert/strict'; assert['ok'](value, 'msg');",
		"import assert from 'node:assert/strict'; assert[`ok`](value, 'msg');",
		"import assert from 'node:assert/strict'; const k = 'ok'; assert[k](value, 'msg');",
		"import assert from 'node:assert/strict'; assert['strictEqual'](a, b, 'msg');",
		"import assert from 'node:assert/strict'; assert[`strictEqual`](a, b, 'msg');",
		"import assert from 'node:assert/strict'; const k = 'strictEqual'; assert[k](a, b, 'msg');",
		"import assert from 'node:assert/strict'; assert['throws'](fn, Error, 'msg');",

		// Methods outside the rule's scope are ignored, even without a message
		"import assert from 'node:assert/strict'; assert.fail();",
		"import assert from 'node:assert/strict'; assert.fail('boom');",
		"import assert from 'node:assert/strict'; assert.ifError(err);",

		// Imports from unrelated modules are ignored
		"import { ok } from 'somewhere-else'; ok(value);",
		"import { strictEqual } from 'somewhere-else'; strictEqual(a, b);",
		"import { throws } from 'somewhere-else'; throws(fn);",
		"import assert from 'somewhere-else'; assert.ok(value);",
		"import assert from 'somewhere-else'; assert(value);",
		"import assert from 'somewhere-else'; assert.strictEqual(a, b);",

		// Calls on unrelated objects are ignored
		"const other = { ok: () => {} }; other.ok(value);",
		"const other = { strictEqual: () => {} }; other.strictEqual(a, b);",
		"const other = { throws: () => {} }; other.throws(fn);",
		"const other = () => {}; other(value);",

		// let-declared aliases are not propagated (could be reassigned)
		"import assert from 'node:assert/strict'; let a = assert; a.ok(value);",
		"import assert from 'node:assert/strict'; let a = assert; a(value);",
		"import assert from 'node:assert/strict'; let a = assert; a.strictEqual(x, y);",
		"import { ok } from 'node:assert/strict'; let okay = ok; okay(value);",
		"import { strictEqual } from 'node:assert/strict'; let eq = strictEqual; eq(x, y);",

		// Computed member access where the property cannot be statically resolved
		"import assert from 'node:assert/strict'; assert[someKey](value);",
		"import assert from 'node:assert/strict'; assert[someKey](a, b);",

		// Calls before the import declaration cannot resolve a binding
		"someCall(value); import assert from 'node:assert/strict'; assert.ok(value, 'msg');",
		"strictEqual(a, b); import { strictEqual } from 'node:assert/strict';",

		// CommonJS require is intentionally not tracked
		"const assert = require('node:assert/strict'); assert.ok(value);",
		"const assert = require('node:assert/strict'); assert.strictEqual(a, b);",
		"const { ok } = require('node:assert/strict'); ok(value);",
		"const { strictEqual } = require('node:assert/strict'); strictEqual(a, b);",
		"const { throws } = require('node:assert/strict'); throws(fn);",

		// Side-effect-only import: no specifiers, no crash
		"import 'node:assert';",
		"import 'node:assert/strict';"
	],
	invalid: [
		// assert.ok with no message
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok();",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},

		// Namespace-callable assert(value)
		{
			code: "import assert from 'node:assert/strict'; assert(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert();",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},

		// Comparison methods missing the message
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notStrictEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "notStrictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "deepStrictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notDeepStrictEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "notDeepStrictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "equal" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "notEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "deepEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notDeepEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "notDeepEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.partialDeepStrictEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "partialDeepStrictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.match(value, /pattern/);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "match" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotMatch(value, /pattern/);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "doesNotMatch" } }]
		},

		// Comparison methods with even fewer arguments (still missing message)
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(actual);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual();",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual();",
			errors: [{ messageId: "require-custom-message", data: { methodName: "deepStrictEqual" } }]
		},

		// throws / doesNotThrow / rejects / doesNotReject missing the message slot
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, /pattern/);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, { message: 'boom' });",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, validator);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotThrow(fn);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "doesNotThrow" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotThrow(fn, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "doesNotThrow" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "rejects" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "rejects" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.doesNotReject(promise);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "doesNotReject" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.doesNotReject(promise, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "doesNotReject" } }]
		},

		// Named imports of every supported method
		{
			code: "import { ok } from 'node:assert/strict'; ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { ok as okay } from 'node:assert/strict'; okay(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { strictEqual } from 'node:assert/strict'; strictEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import { strictEqual as eq } from 'node:assert/strict'; eq(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import { deepStrictEqual } from 'node:assert/strict'; deepStrictEqual(actual, expected);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "deepStrictEqual" } }]
		},
		{
			code: "import { match } from 'node:assert/strict'; match(value, /p/);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "match" } }]
		},
		{
			code: "import { throws } from 'node:assert/strict'; throws(fn, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},
		{
			code: "import { rejects } from 'node:assert/strict'; await rejects(promise, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "rejects" } }]
		},
		{
			code: "import { doesNotThrow } from 'node:assert/strict'; doesNotThrow(fn);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "doesNotThrow" } }]
		},
		{
			code: "import { doesNotReject } from 'node:assert/strict'; await doesNotReject(promise);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "doesNotReject" } }]
		},

		// Namespace import: member call and namespace-callable form
		{
			code: "import * as assert from 'node:assert/strict'; assert.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.strictEqual(a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},

		// strict re-export via named import
		{
			code: "import { strict } from 'node:assert'; strict.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { strict } from 'node:assert'; strict(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { strict } from 'node:assert'; strict.strictEqual(a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import { strict as s } from 'node:assert'; s.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { strict as s } from 'node:assert'; s(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { strict as s } from 'node:assert'; s.throws(fn, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},

		// strict re-export through const destructuring
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.strictEqual(a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.strictEqual(a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},

		// Bare specifiers
		{
			code: "import assert from 'assert'; assert.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'assert'; assert.strictEqual(a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'assert/strict'; assert.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { ok } from 'assert/strict'; ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { throws } from 'assert'; throws(fn);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},

		// const namespace and method aliases (alias chains)
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a.strictEqual(x, y);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(x, y);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { ok } = assert; ok(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { ok: okay } = assert; okay(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(x, y);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual: eq } = assert; eq(x, y);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import { ok } from 'node:assert/strict'; const okay = ok; okay(value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(x, y);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import { strictEqual } from 'node:assert/strict'; const a = strictEqual; const b = a; b(x, y);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},

		// Computed member access
		{
			code: "import assert from 'node:assert/strict'; assert['ok'](value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`ok`](value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const k = 'ok'; assert[k](value);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['strictEqual'](a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`strictEqual`](a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const k = 'strictEqual'; assert[k](a, b);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['throws'](fn, Error);",
			errors: [{ messageId: "require-custom-message", data: { methodName: "throws" } }]
		},

		// Multiple violations in the same file
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value); assert.strictEqual(a, b);",
			errors: [
				{ messageId: "require-custom-message", data: { methodName: "ok" } },
				{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }
			]
		},
		{
			code: "import assert, { throws } from 'node:assert/strict'; assert(value); throws(fn, Error);",
			errors: [
				{ messageId: "require-custom-message", data: { methodName: "ok" } },
				{ messageId: "require-custom-message", data: { methodName: "throws" } }
			]
		},

		// Calls inside various scopes are still resolved
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"function test() { assert.strictEqual(result, expected); }",
			errors: [{ messageId: "require-custom-message", data: { methodName: "strictEqual" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; if (cond) { assert.ok(value); }",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; class C { static { assert.ok(value); } }",
			errors: [{ messageId: "require-custom-message", data: { methodName: "ok" } }]
		}
	]
});
