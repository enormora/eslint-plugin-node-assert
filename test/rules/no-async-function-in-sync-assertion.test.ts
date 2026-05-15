import { RuleTester } from "@typescript-eslint/rule-tester";
import { noAsyncFunctionInSyncAssertionRule } from "../../source/rules/no-async-function-in-sync-assertion.js";

const ruleTester = new RuleTester();

ruleTester.run("no-async-function-in-sync-assertion", noAsyncFunctionInSyncAssertionRule, {
	valid: [
		// Synchronous throw assertions may keep synchronous callbacks
		"import assert from 'node:assert/strict'; assert.throws(() => doThing());",
		"import assert from 'node:assert/strict'; assert.doesNotThrow(function () { doThing(); });",

		// Async throw assertions are the correct API for async callbacks
		"import assert from 'node:assert/strict'; await assert.rejects(async () => { await doThing(); });",
		"import assert from 'node:assert/strict'; await assert.doesNotReject(async function () { await doThing(); });",
		"import { rejects } from 'node:assert/strict'; await rejects(async () => { await doThing(); });",
		"import { strict } from 'node:assert'; await strict.rejects(async () => { await doThing(); });",

		// Non-async functions remain out of scope, even if they return a promise
		"import assert from 'node:assert/strict'; assert.throws(() => doThingAsync());",
		"import assert from 'node:assert/strict'; assert.throws(function () { return doThingAsync(); });",

		// Missing and spread first arguments are ignored
		"import assert from 'node:assert/strict'; assert.throws();",
		"import assert from 'node:assert/strict'; assert.throws(...args);",

		// Binding-tracer coverage for allowed calls
		"import { throws } from 'node:assert/strict'; throws(() => doThing());",
		"import { doesNotThrow as dnt } from 'node:assert/strict'; dnt(() => doThing());",
		"import * as assert from 'node:assert/strict'; assert.throws(() => doThing());",
		"import assert from 'node:assert'; const { strict } = assert; strict.doesNotThrow(() => doThing());",
		"import assert from 'node:assert'; const { strict: s } = assert; s.throws(() => doThing());",
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b.throws(() => doThing());",
		"import assert from 'node:assert/strict'; const { throws } = assert; throws(() => doThing());",
		"import { throws } from 'node:assert/strict'; const a = throws; const b = a; b(() => doThing());",
		"import assert from 'node:assert/strict'; assert['throws'](() => doThing());",
		"import assert from 'node:assert/strict'; assert[`throws`](() => doThing());",
		"import assert from 'node:assert/strict'; const key = 'throws'; assert[key](() => doThing());",
		"import { doesNotThrow } from 'assert'; doesNotThrow(() => doThing());",

		// Async function identifiers are ignored when the binding cannot be resolved safely
		"import assert from 'node:assert/strict'; const run = async () => { await doThing(); }; let alias = run; assert.throws(alias);",
		"import assert from 'node:assert/strict'; assert.throws(importedAsyncFunction);",

		// Untracked sources and aliases are ignored
		"import { throws } from 'somewhere-else'; throws(async () => { await doThing(); });",
		"const other = { throws() {} }; other.throws(async () => { await doThing(); });",
		"const assert = require('node:assert/strict'); assert.throws(async () => { await doThing(); });",
		"import assert from 'node:assert/strict'; let a = assert; a.throws(async () => { await doThing(); });",
		"import { throws } from 'node:assert/strict'; let t = throws; t(async () => { await doThing(); });",
		"throws(async () => { await doThing(); }); import { throws } from 'node:assert/strict';"
	],
	invalid: [
		// Issue examples
		{
			code: "import assert from 'node:assert/strict'; assert.throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"assert.doesNotThrow(async function () { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "doesNotReject", syncMethodName: "doesNotThrow" }
				}
			]
		},

		// Async function identifier tracing
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"async function run() { await doThing(); } " +
				"assert.throws(run);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"const run = async () => { await doThing(); }; " +
				"assert.throws(run);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"const run = async function () { await doThing(); }; " +
				"assert.doesNotThrow(run);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "doesNotReject", syncMethodName: "doesNotThrow" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"async function run() { await doThing(); } " +
				"const a = run; const b = a; assert.throws(b);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},

		// Binding-tracer coverage for tracked sync assertion methods
		{
			code: "import { throws } from 'node:assert/strict'; throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code: "import { doesNotThrow as dnt } from 'node:assert/strict'; dnt(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "doesNotReject", syncMethodName: "doesNotThrow" }
				}
			]
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code: "import { strict } from 'node:assert'; strict.throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert'; const { strict } = assert; " +
				"strict.doesNotThrow(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "doesNotReject", syncMethodName: "doesNotThrow" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert'; const { strict: s } = assert; " +
				"s.throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; const a = assert; const b = a; " +
				"b.throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; const { throws } = assert; " +
				"throws(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import { throws } from 'node:assert/strict'; const a = throws; const b = a; " +
				"b(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert['throws'](async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code: "import assert from 'node:assert/strict'; assert[`throws`](async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code:
				"import assert from 'node:assert/strict'; const key = 'throws'; " +
				"assert[key](async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				}
			]
		},
		{
			code: "import { doesNotThrow } from 'assert'; doesNotThrow(async () => { await doThing(); });",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "doesNotReject", syncMethodName: "doesNotThrow" }
				}
			]
		},

		// Multiple reports in one file
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"assert.throws(async () => { await doThing(); }); " +
				"const run = async () => { await doThingElse(); }; " +
				"assert.doesNotThrow(run);",
			errors: [
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "rejects", syncMethodName: "throws" }
				},
				{
					messageId: "no-async-function-in-sync-assertion",
					data: { asyncMethodName: "doesNotReject", syncMethodName: "doesNotThrow" }
				}
			]
		}
	]
});
