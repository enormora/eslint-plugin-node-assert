import { RuleTester } from "@typescript-eslint/rule-tester";
import { noExpectedValueAsMessageRule } from "../../source/rules/no-expected-value-as-message.js";

const ruleTester = new RuleTester();

ruleTester.run("no-expected-value-as-message", noExpectedValueAsMessageRule, {
	valid: [
		// assert.ok with no second argument
		"import assert from 'node:assert/strict'; assert.ok(value);",
		"import assert from 'node:assert/strict'; assert.ok();",

		// assert.ok with valid message variants
		"import assert from 'node:assert/strict'; assert.ok(value, 'must be truthy');",
		"import assert from 'node:assert/strict'; assert.ok(value, \"must be truthy\");",
		"import assert from 'node:assert/strict'; assert.ok(value, `must be truthy`);",
		// eslint-disable-next-line no-template-curly-in-string -- intentional template expression in fixture source
		"import assert from 'node:assert/strict'; assert.ok(value, `count: ${count}`);",
		"import assert from 'node:assert/strict'; assert.ok(value, message);",
		"import assert from 'node:assert/strict'; assert.ok(value, getMessage());",
		"import assert from 'node:assert/strict'; assert.ok(value, obj.message);",
		"import assert from 'node:assert/strict'; assert.ok(value, a + b);",
		"import assert from 'node:assert/strict'; assert.ok(value, condition ? 'a' : 'b');",
		"import assert from 'node:assert/strict'; assert.ok(value, new Error('boom'));",
		"import assert from 'node:assert/strict'; assert.ok(value, String(x));",

		// Namespace-callable assert(value) with no second argument or with valid message
		"import assert from 'node:assert/strict'; assert(value);",
		"import assert from 'node:assert/strict'; assert(value, 'must be truthy');",
		"import assert from 'node:assert/strict'; assert(value, message);",

		// Spread arguments are opaque
		"import assert from 'node:assert/strict'; assert.ok(...args);",
		"import assert from 'node:assert/strict'; assert(...args);",
		"import assert from 'node:assert/strict'; assert.ok(value, ...rest);",
		"import assert from 'node:assert/strict'; assert.throws(fn, ...rest);",

		// Named imports of ok with valid second argument
		"import { ok } from 'node:assert/strict'; ok(value);",
		"import { ok } from 'node:assert/strict'; ok(value, 'msg');",
		"import { ok as okay } from 'node:assert/strict'; okay(value, 'msg');",

		// Namespace import: member call and namespace-callable form with valid arguments
		"import * as assert from 'node:assert/strict'; assert.ok(value, 'msg');",
		"import * as assert from 'node:assert/strict'; assert(value, 'msg');",

		// strict re-export through named import
		"import { strict } from 'node:assert'; strict.ok(value, 'msg');",
		"import { strict } from 'node:assert'; strict(value, 'msg');",
		"import { strict as a } from 'node:assert'; a.ok(value, 'msg');",
		"import { strict as a } from 'node:assert'; a(value, 'msg');",

		// strict re-export through const destructuring
		"import assert from 'node:assert'; const { strict } = assert; strict.ok(value, 'msg');",
		"import assert from 'node:assert'; const { strict } = assert; strict(value, 'msg');",
		"import assert from 'node:assert'; const { strict: s } = assert; s.ok(value, 'msg');",
		"import assert from 'node:assert'; const { strict: s } = assert; s(value, 'msg');",

		// Bare specifiers without the node: protocol
		"import assert from 'assert'; assert.ok(value, 'msg');",
		"import assert from 'assert/strict'; assert.ok(value, 'msg');",
		"import { ok } from 'assert/strict'; ok(value, 'msg');",
		"import { throws } from 'assert/strict'; throws(fn, /pattern/);",

		// const namespace and method aliases
		"import assert from 'node:assert/strict'; const a = assert; a.ok(value, 'msg');",
		"import assert from 'node:assert/strict'; const a = assert; a(value, 'msg');",
		"import assert from 'node:assert/strict'; const { ok } = assert; ok(value, 'msg');",
		"import assert from 'node:assert/strict'; const { ok: okay } = assert; okay(value, 'msg');",
		"import { ok } from 'node:assert/strict'; const okay = ok; okay(value, 'msg');",

		// Multi-hop alias chains
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b.ok(value, 'msg');",
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b(value, 'msg');",
		"import { ok } from 'node:assert/strict'; const a = ok; const b = a; b(value, 'msg');",

		// Computed member access on tracked namespaces
		"import assert from 'node:assert/strict'; assert['ok'](value, 'msg');",
		"import assert from 'node:assert/strict'; assert[`ok`](value, 'msg');",
		"import assert from 'node:assert/strict'; const k = 'ok'; assert[k](value, 'msg');",
		"import assert from 'node:assert/strict'; assert['throws'](fn, /pattern/);",

		// Methods outside the rule's scope are ignored
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, true);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(actual, { a: 1 });",
		"import assert from 'node:assert/strict'; assert.match(value, /pattern/);",
		"import assert from 'node:assert/strict'; assert.equal(actual, 42);",
		"import assert from 'node:assert/strict'; assert.fail('boom');",
		"import assert from 'node:assert/strict'; assert.ifError(err);",

		// throws / rejects / doesNotThrow / doesNotReject with valid second argument
		"import assert from 'node:assert/strict'; assert.throws(fn);",
		"import assert from 'node:assert/strict'; assert.throws(fn, Error);",
		"import assert from 'node:assert/strict'; assert.throws(fn, TypeError);",
		"import assert from 'node:assert/strict'; assert.throws(fn, /pattern/);",
		"import assert from 'node:assert/strict'; assert.throws(fn, { message: 'boom' });",
		"import assert from 'node:assert/strict'; assert.throws(fn, validator);",
		"import assert from 'node:assert/strict'; assert.throws(fn, (error) => error instanceof TypeError);",
		"import assert from 'node:assert/strict'; assert.throws(fn, /pattern/, 'optional message');",
		// eslint-disable-next-line no-template-curly-in-string -- intentional template expression in fixture source
		"import assert from 'node:assert/strict'; assert.throws(fn, `with ${dynamic}`);",
		"import assert from 'node:assert/strict'; assert.doesNotThrow(fn, Error);",
		"import assert from 'node:assert/strict'; assert.rejects(promise, Error);",
		"import assert from 'node:assert/strict'; assert.rejects(promise, /pattern/);",
		"import assert from 'node:assert/strict'; assert.doesNotReject(promise, Error);",

		// Imports from unrelated modules are ignored
		"import { ok } from 'somewhere-else'; ok(value, true);",
		"import { throws } from 'somewhere-else'; throws(fn, 'whatever');",
		"import assert from 'somewhere-else'; assert.ok(value, true);",
		"import assert from 'somewhere-else'; assert(value, true);",

		// Calls on unrelated objects are ignored
		"const other = { ok: () => {} }; other.ok(value, true);",
		"const other = { throws: () => {} }; other.throws(fn, 'whatever');",
		"const other = () => {}; other(value, true);",

		// let-declared aliases are not propagated (could be reassigned)
		"import assert from 'node:assert/strict'; let a = assert; a.ok(value, true);",
		"import assert from 'node:assert/strict'; let a = assert; a(value, true);",
		"import { ok } from 'node:assert/strict'; let okay = ok; okay(value, true);",

		// Computed member access where the property cannot be statically resolved
		"import assert from 'node:assert/strict'; assert[someKey](value, true);",

		// Calls before the import declaration cannot resolve a binding
		"someCall(value, true); import assert from 'node:assert/strict'; assert.ok(value, 'msg');",

		// CommonJS require is intentionally not tracked
		"const assert = require('node:assert/strict'); assert.ok(value, true);",
		"const { ok } = require('node:assert/strict'); ok(value, true);",
		"const { throws } = require('node:assert/strict'); throws(fn, 'boom');"
	],
	invalid: [
		// assert.ok with primitive constant in the second slot
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(result, false);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(count, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(count, 0);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(count, 42n);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, null);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, undefined);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, NaN);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, Infinity);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, -1);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, !true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, void 0);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, /pattern/);",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// assert.ok with array / object literals
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, []);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, [1, 2]);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, {});",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(user, { name: 'Alice' });",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// Namespace-callable assert(value, expected)
		{
			code: "import assert from 'node:assert/strict'; assert(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert(user, { name: 'Alice' });",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// Three-argument call still flags the (constant) second argument
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, 3, 'msg');",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// Named imports of ok
		{
			code: "import { ok } from 'node:assert/strict'; ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { ok } from 'node:assert/strict'; ok(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { ok as okay } from 'node:assert/strict'; okay(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// Namespace import: member call and namespace-callable form
		{
			code: "import * as assert from 'node:assert/strict'; assert.ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// strict re-export through named import
		{
			code: "import { strict } from 'node:assert'; strict.ok(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { strict } from 'node:assert'; strict(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { strict as s } from 'node:assert'; s.ok(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { strict as s } from 'node:assert'; s(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// strict re-export through const destructuring
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.ok(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// Bare specifiers
		{
			code: "import assert from 'assert'; assert.ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'assert/strict'; assert.ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { ok } from 'assert/strict'; ok(value, 3);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { throws } from 'assert'; throws(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},

		// const namespace and method aliases (alias chains)
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a.ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { ok } = assert; ok(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { ok: okay } = assert; okay(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import { ok } from 'node:assert/strict'; const okay = ok; okay(value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},

		// Computed member access
		{
			code: "import assert from 'node:assert/strict'; assert['ok'](value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`ok`](value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const k = 'ok'; assert[k](value, true);",
			errors: [{ messageId: "expected-value-as-message" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['throws'](fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},

		// throws / rejects / doesNotThrow / doesNotReject with string literal second argument (issue #535)
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, 'invalid input');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(() => doThing(), 'invalid input');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(() => doThing(), `invalid input`);",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotThrow(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, 'invalid input');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, `invalid input`);",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.doesNotReject(promise, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},

		// throws / rejects via named import (issue #535)
		{
			code: "import { throws } from 'node:assert/strict'; throws(fn, 'invalid input');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import { throws as t } from 'node:assert/strict'; t(fn, 'invalid input');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import { rejects } from 'node:assert/strict'; await rejects(promise, 'invalid input');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import { doesNotThrow } from 'node:assert/strict'; doesNotThrow(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import { doesNotReject } from 'node:assert/strict'; await doesNotReject(promise, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},

		// throws / rejects via base specifier
		{
			code: "import assert from 'node:assert'; assert.throws(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'assert'; assert.rejects(promise, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},

		// throws via strict re-export
		{
			code: "import { strict } from 'node:assert'; strict.throws(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},

		// throws via const aliases and destructuring
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a.throws(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { throws } = assert; throws(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},
		{
			code: "import { throws } from 'node:assert/strict'; const t = throws; t(fn, 'boom');",
			errors: [{ messageId: "string-as-error-matcher" }]
		},

		// Multiple violations in the same file
		{
			code: "import assert from 'node:assert/strict'; assert.ok(value, 3); assert.throws(fn, 'boom');",
			errors: [{ messageId: "expected-value-as-message" }, { messageId: "string-as-error-matcher" }]
		},
		{
			code: "import assert, { throws } from 'node:assert/strict'; assert(value, true); throws(fn, 'boom');",
			errors: [{ messageId: "expected-value-as-message" }, { messageId: "string-as-error-matcher" }]
		},

		// throws three-argument form: a constant string in the SECOND slot is still wrong even when a real
		// message follows in the third slot (the user thinks they are matching the error)
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, 'boom', 'failure message');",
			errors: [{ messageId: "string-as-error-matcher" }]
		}
	]
});
