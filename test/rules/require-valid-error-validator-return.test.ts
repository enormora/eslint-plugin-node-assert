import { RuleTester } from "@typescript-eslint/rule-tester";
import { requireValidErrorValidatorReturnRule } from "../../source/rules/require-valid-error-validator-return.js";

const ruleTester = new RuleTester();

ruleTester.run("require-valid-error-validator-return", requireValidErrorValidatorReturnRule, {
	valid: [
		// Non-function matchers remain out of scope
		"import assert from 'node:assert/strict'; assert.throws(fn, Error);",
		"import assert from 'node:assert/strict'; assert.throws(fn, /pattern/);",
		"import assert from 'node:assert/strict'; assert.throws(fn, { message: 'boom' });",
		"import assert from 'node:assert/strict'; assert.rejects(promise, validator);",
		"import assert from 'node:assert/strict'; assert.throws(fn);",
		"import assert from 'node:assert/strict'; assert.throws(fn, ...rest);",

		// Explicit true returns are valid
		"import assert from 'node:assert/strict'; assert.throws(fn, () => true);",
		"import assert from 'node:assert/strict'; assert.throws(fn, () => !false);",
		"import assert from 'node:assert/strict'; assert.throws(fn, function (error) { assert.strictEqual(error.message, 'boom'); return true; });",
		"import assert from 'node:assert/strict'; await assert.rejects(promise, (error) => { assert.strictEqual(error.message, 'boom'); return true; });",
		"import assert from 'node:assert/strict'; assert.doesNotThrow(fn, (error) => { if (error instanceof TypeError) { return true; } throw error; });",
		"import assert from 'node:assert/strict'; await assert.doesNotReject(promise, (error) => { if (error.code === 'ERR_INPUT') return true; throw error; });",
		"import assert from 'node:assert/strict'; assert.throws(fn, (error) => { if (error.code === 'ERR_INPUT') { return true; } return true; });",

		// Complex control flow is intentionally skipped rather than guessed
		"import assert from 'node:assert/strict'; assert.throws(fn, (error) => { try { assert.strictEqual(error.message, 'boom'); return true; } finally { cleanup(); } });",
		"import assert from 'node:assert/strict'; assert.throws(fn, (error) => { while (predicate(error)) { return true; } });",

		// Binding-tracer coverage across import styles and aliases
		"import { throws } from 'node:assert/strict'; throws(fn, () => true);",
		"import { throws as t } from 'node:assert/strict'; t(fn, () => true);",
		"import * as assert from 'node:assert/strict'; assert.rejects(promise, () => true);",
		"import { strict } from 'node:assert'; strict.throws(fn, () => true);",
		"import assert from 'node:assert'; const { strict } = assert; strict.rejects(promise, () => true);",
		"import assert from 'node:assert'; const { strict: s } = assert; s.doesNotReject(promise, () => true);",
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b.throws(fn, () => true);",
		"import assert from 'node:assert/strict'; const { throws } = assert; throws(fn, () => true);",
		"import { throws } from 'node:assert/strict'; const a = throws; const b = a; b(fn, () => true);",
		"import assert from 'node:assert/strict'; assert['throws'](fn, () => true);",
		"import assert from 'node:assert/strict'; assert[`throws`](fn, () => true);",
		"import assert from 'node:assert/strict'; const key = 'throws'; assert[key](fn, () => true);",
		"import { rejects } from 'assert/strict'; await rejects(promise, () => true);",
		"import assert from 'assert'; assert.doesNotThrow(fn, () => true);",

		// Untracked sources and aliases are ignored
		"import { throws } from 'somewhere-else'; throws(fn, () => assert.strictEqual(value, 1));",
		"const other = { throws() {} }; other.throws(fn, () => assert.strictEqual(value, 1));",
		"const assert = require('node:assert/strict'); assert.throws(fn, () => assert.strictEqual(value, 1));",
		"import assert from 'node:assert/strict'; let a = assert; a.throws(fn, () => assert.strictEqual(value, 1));",
		"import { throws } from 'node:assert/strict'; let t = throws; t(fn, () => assert.strictEqual(value, 1));",
		"throws(fn, () => assert.strictEqual(value, 1)); import { throws } from 'node:assert/strict';"
	],
	invalid: [
		// Issue examples
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, (error) => { assert.strictEqual(error.message, 'invalid input'); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, (error) => assert.strictEqual(error.message, 'invalid input'));",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "rejects" } }]
		},

		// Other covered methods
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotThrow(fn, (error) => { assert.strictEqual(error.code, 'ERR_INPUT'); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "doesNotThrow" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.doesNotReject(promise, (error) => assert.ok(error));",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "doesNotReject" } }]
		},

		// Explicit invalid returns
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, () => false);",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, () => 0);",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, () => undefined);",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, () => { return; });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, () => { return false; });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},

		// Falling through without returning true is still invalid
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, (error) => { if (error.code === 'ERR_INPUT') { return true; } });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, (error) => { if (error.code === 'ERR_INPUT') { return true; } return false; });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},

		// Binding-tracer coverage for invalid inline validators
		{
			code: "import assert, { throws } from 'node:assert/strict'; throws(fn, () => assert.strictEqual(value, 1));",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import { throws as t } from 'node:assert/strict'; t(fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.rejects(promise, () => assert.ok(value));",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "rejects" } }]
		},
		{
			code: "import { strict } from 'node:assert'; strict.throws(fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.rejects(promise, () => assert(value));",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "rejects" } }]
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.doesNotReject(promise, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "doesNotReject" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.throws(fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { throws } = assert; throws(fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import { throws } from 'node:assert/strict'; const a = throws; const b = a; b(fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['throws'](fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`throws`](fn, () => assert.strictEqual(value, 1));",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const key = 'throws'; assert[key](fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } }]
		},
		{
			code: "import assert, { rejects } from 'assert/strict'; await rejects(promise, () => assert.strictEqual(value, 1));",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "rejects" } }]
		},
		{
			code: "import assert from 'assert'; assert.doesNotThrow(fn, () => { assert.strictEqual(value, 1); });",
			errors: [{ messageId: "require-valid-error-validator-return", data: { methodName: "doesNotThrow" } }]
		},

		// Multiple reports in one file
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, () => { assert.strictEqual(value, 1); }); await assert.rejects(promise, () => assert.strictEqual(value, 2));",
			errors: [
				{ messageId: "require-valid-error-validator-return", data: { methodName: "throws" } },
				{ messageId: "require-valid-error-validator-return", data: { methodName: "rejects" } }
			]
		}
	]
});
