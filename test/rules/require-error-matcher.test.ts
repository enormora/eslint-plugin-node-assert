import { RuleTester } from "@typescript-eslint/rule-tester";
import { requireErrorMatcherRule } from "../../source/rules/require-error-matcher.js";

const ruleTester = new RuleTester();
const requiredMessagePropertyDescription = String.raw`property "message"`;
const requiredNamePropertyDescription = String.raw`property "name"`;

ruleTester.run("require-error-matcher", requireErrorMatcherRule, {
	valid: [
		"import assert from 'node:assert/strict'; assert.throws(fn, TypeError);",
		"import assert from 'node:assert/strict'; await assert.rejects(promise, /invalid input/);",
		"import assert from 'node:assert/strict'; assert.throws(fn, { message: 'invalid input' });",
		"import assert from 'node:assert/strict'; await assert.rejects(promise, (error) => { assert.equal(error.message, 'invalid input'); return true; });",
		"import { throws as throwsAssertion } from 'node:assert/strict'; throwsAssertion(fn, TypeError);",
		"import assert from 'node:assert/strict'; class ValidationError extends Error {} assert.throws(fn, ValidationError);",
		"import assert from 'node:assert/strict'; function matchesInvalidInput(error) { return error.message === 'invalid input'; } await assert.rejects(promise, matchesInvalidInput);",
		"import assert from 'node:assert/strict'; const expectedErrorMatcher = { message: 'invalid input' }; await assert.rejects(promise, expectedErrorMatcher);",
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, { name: 'TypeError', message: 'invalid input' });",
			options: [{ allowedMatchers: ["object"], objectMatcher: { requiredProperties: ["name", "message"] } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, { code: 'ERR_INVALID_INPUT' });",
			options: [
				{
					allowedMatchers: ["object"],
					objectMatcher: { requireAtLeastOneProperty: ["message", "code", "name"] }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, importedMatcher);",
			options: [{ allowedMatchers: ["object"] }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.throws(fn, TypeError);"
		},
		{
			code: "import { strict as strictAssert } from 'node:assert'; await strictAssert.rejects(promise, /invalid input/);"
		},
		{
			code: "import assert from 'node:assert/strict'; const strictAssert = assert; strictAssert.throws(fn, TypeError);"
		}
	],
	invalid: [
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn);",
			errors: [{ messageId: "missing-error-matcher", data: { methodName: "throws" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise);",
			errors: [{ messageId: "missing-error-matcher", data: { methodName: "rejects" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, 'invalid input');",
			errors: [{ messageId: "string-as-error-matcher", data: { methodName: "rejects" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, /^invalid input$/);",
			options: [{ allowedMatchers: ["object"] }],
			errors: [
				{
					messageId: "disallowed-error-matcher-kind",
					data: { allowedMatcherDescription: "an object matcher", methodName: "rejects" }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws(fn, TypeError);",
			options: [{ allowedMatchers: ["object"] }],
			errors: [
				{
					messageId: "disallowed-error-matcher-kind",
					data: { allowedMatcherDescription: "an object matcher", methodName: "throws" }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; const expectedErrorMatcher = { code: 'ERR_INVALID_INPUT' }; await assert.rejects(promise, expectedErrorMatcher);",
			options: [{ allowedMatchers: ["object"], objectMatcher: { requiredProperties: ["message"] } }],
			errors: [
				{
					messageId: "missing-required-object-properties",
					data: { requiredPropertyDescription: requiredMessagePropertyDescription }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, { message: 'invalid input' });",
			options: [{ allowedMatchers: ["object"], objectMatcher: { requiredProperties: ["name", "message"] } }],
			errors: [
				{
					messageId: "missing-required-object-properties",
					data: { requiredPropertyDescription: requiredNamePropertyDescription }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(promise, {});",
			options: [
				{
					allowedMatchers: ["object"],
					objectMatcher: { requireAtLeastOneProperty: ["message", "code", "name"] }
				}
			],
			errors: [
				{
					messageId: "missing-useful-object-property",
					data: { allowedPropertyDescription: "message, code, name" }
				}
			]
		},
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.rejects(promise);",
			errors: [{ messageId: "missing-error-matcher", data: { methodName: "rejects" } }]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.throws(fn);",
			errors: [{ messageId: "missing-error-matcher", data: { methodName: "throws" } }]
		},
		{
			code: "import { strict as strictAssert } from 'node:assert'; strictAssert.rejects(promise);",
			errors: [{ messageId: "missing-error-matcher", data: { methodName: "rejects" } }]
		},
		{
			code: "import assert from 'node:assert/strict'; const strictAssert = assert; strictAssert.throws(fn);",
			errors: [{ messageId: "missing-error-matcher", data: { methodName: "throws" } }]
		}
	]
});
