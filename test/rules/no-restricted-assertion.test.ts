import { RuleTester } from "@typescript-eslint/rule-tester";
import { noRestrictedAssertionRule } from "../../source/rules/no-restricted-assertion.js";

const ruleTester = new RuleTester();

const restrictedLegacyEqualityOptions = [
	{
		assertions: [
			{
				name: "equal",
				message: "Use assert.strictEqual() instead of assert.equal()."
			},
			{
				name: "deepEqual",
				message: "Use assert.deepStrictEqual() instead of assert.deepEqual()."
			}
		]
	}
] as const;

const restrictedPromiseOptions = [
	{
		assertions: [
			{
				name: "doesNotReject",
				message: "Avoid assert.doesNotReject(). Await the promise directly instead."
			}
		]
	}
] as const;

const restrictedOkOptions = [
	{
		assertions: [{ name: "ok" }]
	}
] as const;

const restrictedThrowOptions = [
	{
		assertions: [{ name: "doesNotThrow" }]
	}
] as const;

ruleTester.run("no-restricted-assertion", noRestrictedAssertionRule, {
	valid: [
		"import assert from 'node:assert/strict'; assert.equal(actualValue, expectedValue);",

		// Empty options make the rule a no-op.
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actualValue, expectedValue);",
			options: [{ assertions: [] }]
		},

		// Unrestricted methods are allowed when other methods are restricted.
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},
		{
			code: "import { strictEqual } from 'node:assert/strict'; strictEqual(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},

		// Imports from unrelated modules are ignored.
		{
			code: "import assert from 'somewhere-else'; assert.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},
		{
			code: "import { equal } from 'somewhere-else'; equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},

		// Calls on unrelated objects are ignored.
		{
			code: "const unrelatedAssert = { equal() {} }; unrelatedAssert.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},

		// Dynamic member access is ignored when the property cannot be resolved.
		{
			code: "import assert from 'node:assert/strict'; assert[methodName](actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},

		// let-declared aliases are not propagated because they can be reassigned.
		{
			code:
				"import assert from 'node:assert/strict'; let assertAlias = assert; " +
				"assertAlias.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions
		},

		// Calls before the import declaration cannot resolve a binding.
		{
			code: "equal(actualValue, expectedValue); import { equal } from 'node:assert/strict';",
			options: restrictedLegacyEqualityOptions
		}
	],
	invalid: [
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code: "import assert from 'node:assert'; assert.deepEqual(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.deepStrictEqual() instead of assert.deepEqual()." }
				}
			]
		},
		{
			code: "import assert from 'assert/strict'; assert.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code: "import { equal } from 'node:assert/strict'; equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code:
				"import { equal as looselyEqual } from 'node:assert/strict'; " +
				"looselyEqual(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; const assertAlias = assert; " +
				"assertAlias.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; const { equal } = assert; " +
				"equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; const { equal: looselyEqual } = assert; " +
				"looselyEqual(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; const equalityMethodName = 'equal'; " +
				"assert[equalityMethodName](actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['equal'](actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`equal`](actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code: "import { strict } from 'node:assert'; strict.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert'; const { strict: strictAssert } = assert; " +
				"strictAssert.equal(actualValue, expectedValue);",
			options: restrictedLegacyEqualityOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Use assert.strictEqual() instead of assert.equal()." }
				}
			]
		},
		{
			code: "import { doesNotReject } from 'node:assert/strict'; await doesNotReject(promiseUnderTest);",
			options: restrictedPromiseOptions,
			errors: [
				{
					messageId: "custom-message",
					data: { customMessage: "Avoid assert.doesNotReject(). Await the promise directly instead." }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotThrow(() => runOperation());",
			options: restrictedThrowOptions,
			errors: [
				{
					messageId: "restricted-assertion",
					data: { methodName: "doesNotThrow" }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert(valueUnderTest);",
			options: restrictedOkOptions,
			errors: [
				{
					messageId: "restricted-assertion",
					data: { methodName: "ok" }
				}
			]
		}
	]
});
