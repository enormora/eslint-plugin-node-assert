import { RuleTester } from "@typescript-eslint/rule-tester";
import { requireStrictRule } from "../../source/rules/require-strict.js";

const ruleTester = new RuleTester();

ruleTester.run("require-strict", requireStrictRule, {
	valid: [
		"import assert from 'node:assert'; assert.strictEqual(actual, expected);",
		"import assert from 'node:assert/strict'; assert.equal(actual, expected);",
		"import { strict as assert } from 'node:assert'; assert.deepEqual(actual, expected);",
		"import { strictEqual } from 'node:assert'; strictEqual(actual, expected);",
		"import { equal } from 'somewhere'; equal(actual, expected);",
		"import assert from 'node:assert'; const alias = assert; alias.strictEqual(actual, expected);",
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actual, expected);",
			options: [{ mode: "semantic" }]
		}
	],
	invalid: [
		{
			code: "import assert from 'node:assert'; assert.equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert.strictEqual(actual, expected);"
		},
		{
			code: "import { equal } from 'node:assert'; equal(actual, expected);",
			errors: [{ messageId: "require-strict" }]
		},
		{
			code: "import assert from 'node:assert'; const alias = assert; alias['deepEqual'](actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; const alias = assert; alias['deepStrictEqual'](actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; const { equal: strictEqual } = assert; strictEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }]
		},
		{
			code: "import assert from 'node:assert'; const key = 'equal'; assert[key](actual, expected);",
			errors: [{ messageId: "require-strict" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);"
		}
	]
});
