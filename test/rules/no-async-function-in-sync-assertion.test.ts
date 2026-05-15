import { RuleTester } from "@typescript-eslint/rule-tester";
import { noAsyncFunctionInSyncAssertionRule } from "../../source/rules/no-async-function-in-sync-assertion.js";

const ruleTester = new RuleTester();

ruleTester.run("no-async-function-in-sync-assertion", noAsyncFunctionInSyncAssertionRule, {
	valid: [
		"import assert from 'node:assert/strict'; assert.throws(() => doThing());",
		"import assert from 'node:assert/strict'; assert.doesNotThrow(function () { doThing(); });",
		"import assert from 'node:assert/strict'; await assert.rejects(async () => { await doThing(); });",
		"import assert from 'node:assert/strict'; await assert.doesNotReject(async function () { await doThing(); });",
		"import { throws } from 'node:assert/strict'; throws(() => doThing());",
		"import assert from 'node:assert'; const { strict } = assert; strict.throws(() => doThing());",
		"import assert from 'node:assert/strict'; const callback = () => doThing(); assert.throws(callback);",
		"import assert from 'node:assert/strict'; const callback = maybeAsync; assert.throws(callback);",
		"import { throws } from 'somewhere-else'; throws(async () => { await doThing(); });"
	],
	invalid: [
		{
			code: "import assert from 'node:assert/strict'; assert.throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { methodName: "throws", asyncMethodName: "rejects" }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotThrow(async function () { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { methodName: "doesNotThrow", asyncMethodName: "doesNotReject" }
				}
			]
		},
		{
			code: "import { throws } from 'node:assert/strict'; const callback = async () => { await doThing(); }; throws(callback);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { methodName: "throws", asyncMethodName: "rejects" }
				}
			]
		},
		{
			code: "import assert from 'node:assert'; const { strict } = assert; async function callback() { await doThing(); } strict.doesNotThrow(callback);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { methodName: "doesNotThrow", asyncMethodName: "doesNotReject" }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; const originalCallback = async () => { await doThing(); }; const aliasedCallback = originalCallback; assert.throws(aliasedCallback);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { methodName: "throws", asyncMethodName: "rejects" }
				}
			]
		}
	]
});
