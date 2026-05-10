import { RuleTester } from "@typescript-eslint/rule-tester";
import { preferMatchRule } from "../../source/rules/prefer-match.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-match", preferMatchRule, {
	valid: [
		"import assert from 'node:assert/strict'; assert.match(value, /foo/);",
		"import assert from 'node:assert/strict'; assert.doesNotMatch(value, /foo/);",
		"import { match } from 'node:assert/strict'; match(value, /foo/);",
		"import { doesNotMatch } from 'node:assert/strict'; doesNotMatch(value, /foo/);",
		"import assert from 'node:assert/strict'; assert.ok(predicate(value));",
		"import assert from 'node:assert/strict'; assert.equal(compare(value), true);",
		"import assert from 'node:assert/strict'; assert.strictEqual(compare(value), false);",
		"import assert from 'node:assert/strict'; assert.equal(pattern.test(value), expected);",
		"import assert from 'node:assert/strict'; assert.strictEqual(result, true);",
		"import { ok } from 'somewhere-else'; ok(pattern.test(value));",
		"const assert = { ok() {} }; assert.ok(pattern.test(value));",
		"import assert from 'node:assert/strict'; assert.ok(pattern[methodName](value));",
		"import assert from 'node:assert/strict'; assert.ok(pattern.test(...values));",
		"import assert from 'node:assert/strict'; assert.equal(pattern.test(value), maybeTrue);"
	],
	invalid: [
		{
			code: "import assert from 'node:assert/strict'; assert.ok(/foo/.test(value));",
			errors: [{ messageId: "prefer-match" }],
			output: "import assert from 'node:assert/strict'; assert.match(value, /foo/);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(pattern.test(value));",
			errors: [{ messageId: "prefer-match" }],
			output: "import assert from 'node:assert/strict'; assert.match(value, pattern);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(pattern.test('value'), 'message');",
			errors: [{ messageId: "prefer-match" }],
			output: "import assert from 'node:assert/strict'; assert.match('value', pattern, 'message');"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.equal(/foo/.test(value), true);",
			errors: [{ messageId: "prefer-match" }],
			output: "import assert from 'node:assert/strict'; assert.match(value, /foo/);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(pattern.test(value), true, 'message');",
			errors: [{ messageId: "prefer-match" }],
			output: "import assert from 'node:assert/strict'; assert.match(value, pattern, 'message');"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.equal(/foo/.test(value), false);",
			errors: [{ messageId: "prefer-match" }],
			output: "import assert from 'node:assert/strict'; assert.doesNotMatch(value, /foo/);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(pattern.test(value), false, 'message');",
			errors: [{ messageId: "prefer-match" }],
			output: "import assert from 'node:assert/strict'; assert.doesNotMatch(value, pattern, 'message');"
		},
		{
			code: "import { ok } from 'node:assert/strict'; ok(/foo/.test(value));",
			errors: [{ messageId: "prefer-match" }],
			output: null
		},
		{
			code: "import { strictEqual } from 'node:assert/strict'; strictEqual(pattern.test(value), true);",
			errors: [{ messageId: "prefer-match" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(getPattern().test(value));",
			errors: [{ messageId: "prefer-match" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(pattern.test(getValue()));",
			errors: [{ messageId: "prefer-match" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ok(pattern./* comment */test(value));",
			errors: [{ messageId: "prefer-match" }],
			output: null
		}
	]
});
