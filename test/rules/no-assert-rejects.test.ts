import { RuleTester } from "@typescript-eslint/rule-tester";
import { noAssertRejectsRule } from "../../source/rules/no-assert-rejects.js";

const ruleTester = new RuleTester();

ruleTester.run("no-assert-rejects", noAssertRejectsRule, {
	valid: [
		"import assert from 'node:assert/strict'; assert.throws(() => new Error('x'));",
		"import assert from 'node:assert/strict'; assert.doesNotReject(async () => Promise.resolve());",
		"import assertionLibrary from 'node:assert/strict'; assertionLibrary.throws(() => new Error('x'));",
		"import assert from 'node:assert'; assert.throws(() => new Error('x'));",
		"import assertionLibrary from 'node:assert'; assertionLibrary.throws(() => new Error('x'));"
	],
	invalid: [
		{
			code: "import assert from 'node:assert/strict'; assert.rejects(async () => Promise.reject(new Error('x')));",
			errors: [{ messageId: "no-assert-rejects" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['rejects'](async () => Promise.reject(new Error('x')));",
			errors: [{ messageId: "no-assert-rejects" }]
		},
		{
			code: "import assert from 'node:assert'; assert.rejects(async () => Promise.reject(new Error('x')));",
			errors: [{ messageId: "no-assert-rejects" }]
		},
		{
			code: "import assertionLibrary from 'node:assert'; assertionLibrary.rejects(async () => Promise.reject(new Error('x')));",
			errors: [{ messageId: "no-assert-rejects" }]
		}
	]
});
