import { RuleTester } from "@typescript-eslint/rule-tester";
import { noAwaitArgumentInRejectsRule } from "../../source/rules/no-await-argument-in-rejects.js";

const ruleTester = new RuleTester();

ruleTester.run("no-await-argument-in-rejects", noAwaitArgumentInRejectsRule, {
	valid: [
		// Issue examples in valid form
		"import assert from 'node:assert/strict'; await assert.rejects(doThing());",
		"import assert from 'node:assert/strict'; await assert.rejects(doThing(), { message: 'invalid input' });",
		"import assert from 'node:assert/strict'; await assert.rejects(() => doThing(), { message: 'invalid input' });",
		"import assert from 'node:assert/strict'; await assert.doesNotReject(doThing());",
		"import assert from 'node:assert/strict'; await assert.doesNotReject(() => doThing());",

		// Non-await first arguments remain valid
		"import assert from 'node:assert/strict'; await assert.rejects(promise);",
		"import assert from 'node:assert/strict'; await assert.rejects(async () => doThing());",
		"import assert from 'node:assert/strict'; await assert.doesNotReject(getPromise(), TypeError);",

		// Missing and spread first arguments are ignored
		"import assert from 'node:assert/strict'; await assert.rejects();",
		"import assert from 'node:assert/strict'; await assert.rejects(...args);",

		// Other assertion methods are out of scope
		"import assert from 'node:assert/strict'; assert.throws(await doThing());",
		"import assert from 'node:assert/strict'; assert.doesNotThrow(await doThing());",

		// Binding-tracer coverage for allowed calls
		"import { rejects } from 'node:assert/strict'; await rejects(doThing());",
		"import { doesNotReject as dnr } from 'node:assert/strict'; await dnr(doThing());",
		"import * as assert from 'node:assert/strict'; await assert.rejects(doThing());",
		"import { strict } from 'node:assert'; await strict.doesNotReject(doThing());",
		"import assert from 'node:assert'; const { strict } = assert; await strict.rejects(doThing());",
		"import assert from 'node:assert'; const { strict: s } = assert; await s.doesNotReject(doThing());",
		"import assert from 'node:assert/strict'; const a = assert; const b = a; await b.rejects(doThing());",
		"import assert from 'node:assert/strict'; const { rejects } = assert; await rejects(doThing());",
		"import { rejects } from 'node:assert/strict'; const a = rejects; const b = a; await b(doThing());",
		"import assert from 'node:assert/strict'; await assert['rejects'](doThing());",
		"import assert from 'node:assert/strict'; await assert[`doesNotReject`](doThing());",
		"import assert from 'node:assert/strict'; const key = 'rejects'; await assert[key](doThing());",
		"import { rejects } from 'assert/strict'; await rejects(doThing());",
		"import assert from 'assert'; await assert.doesNotReject(doThing());",

		// Untracked sources and aliases are ignored
		"import { rejects } from 'somewhere-else'; await rejects(await doThing());",
		"const other = { rejects() {} }; await other.rejects(await doThing());",
		"const assert = require('node:assert/strict'); await assert.rejects(await doThing());",
		"import assert from 'node:assert/strict'; let a = assert; await a.rejects(await doThing());",
		"import { rejects } from 'node:assert/strict'; let r = rejects; await r(await doThing());",
		"rejects(await doThing()); import { rejects } from 'node:assert/strict';",

		// Dynamic member access that cannot be resolved is ignored
		"import assert from 'node:assert/strict'; await assert[methodName](await doThing());"
	],
	invalid: [
		// Issue examples with autofix
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert.rejects(doThing());"
		},
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"await assert.rejects(await doThing(), { message: 'invalid input' });",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert.rejects(doThing(), { message: 'invalid input' });"
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(await doThing(), TypeError);",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert.rejects(doThing(), TypeError);"
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.doesNotReject(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert.doesNotReject(doThing());"
		},

		// Fix preserves the awaited expression text
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(await (doThing()));",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert.rejects(doThing());"
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(await foo.bar());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert.rejects(foo.bar());"
		},
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(await new Promise(noop));",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert.rejects(new Promise(noop));"
		},

		// Binding-tracer coverage for tracked calls
		{
			code: "import { rejects } from 'node:assert/strict'; await rejects(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import { rejects } from 'node:assert/strict'; await rejects(doThing());"
		},
		{
			code: "import { doesNotReject as dnr } from 'node:assert/strict'; await dnr(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import { doesNotReject as dnr } from 'node:assert/strict'; await dnr(doThing());"
		},
		{
			code: "import * as assert from 'node:assert/strict'; await assert.rejects(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import * as assert from 'node:assert/strict'; await assert.rejects(doThing());"
		},
		{
			code: "import { strict } from 'node:assert'; await strict.doesNotReject(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import { strict } from 'node:assert'; await strict.doesNotReject(doThing());"
		},
		{
			code:
				"import assert from 'node:assert'; const { strict } = assert; " +
				"await strict.rejects(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert'; const { strict } = assert; await strict.rejects(doThing());"
		},
		{
			code:
				"import assert from 'node:assert'; const { strict: s } = assert; " +
				"await s.doesNotReject(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert'; const { strict: s } = assert; await s.doesNotReject(doThing());"
		},
		{
			code:
				"import assert from 'node:assert/strict'; const a = assert; const b = a; " +
				"await b.rejects(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; const a = assert; const b = a; await b.rejects(doThing());"
		},
		{
			code:
				"import assert from 'node:assert/strict'; const { rejects } = assert; " +
				"await rejects(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; const { rejects } = assert; await rejects(doThing());"
		},
		{
			code:
				"import { rejects } from 'node:assert/strict'; const a = rejects; const b = a; " +
				"await b(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import { rejects } from 'node:assert/strict'; const a = rejects; const b = a; await b(doThing());"
		},
		{
			code: "import assert from 'node:assert/strict'; await assert['rejects'](await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert['rejects'](doThing());"
		},
		{
			code: "import assert from 'node:assert/strict'; await assert[`doesNotReject`](await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; await assert[`doesNotReject`](doThing());"
		},
		{
			code: "import assert from 'node:assert/strict'; const key = 'rejects'; await assert[key](await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'node:assert/strict'; const key = 'rejects'; await assert[key](doThing());"
		},
		{
			code: "import { rejects } from 'assert/strict'; await rejects(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import { rejects } from 'assert/strict'; await rejects(doThing());"
		},
		{
			code: "import assert from 'assert'; await assert.doesNotReject(await doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: "import assert from 'assert'; await assert.doesNotReject(doThing());"
		},

		// Comments inside the removed prefix suppress autofix
		{
			code: "import assert from 'node:assert/strict'; await assert.rejects(await /* keep */ doThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }],
			output: null
		},

		// Multiple reports in one file
		{
			code:
				"import assert from 'node:assert/strict'; " +
				"await assert.rejects(await doThing()); " +
				"await assert.doesNotReject(await doOtherThing());",
			errors: [{ messageId: "no-await-argument-in-rejects" }, { messageId: "no-await-argument-in-rejects" }],
			output:
				"import assert from 'node:assert/strict'; " +
				"await assert.rejects(doThing()); " +
				"await assert.doesNotReject(doOtherThing());"
		}
	]
});
