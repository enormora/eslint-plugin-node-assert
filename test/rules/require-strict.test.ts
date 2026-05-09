import { RuleTester } from "@typescript-eslint/rule-tester";
import { requireStrictRule } from "../../source/rules/require-strict.js";

const ruleTester = new RuleTester();

ruleTester.run("require-strict", requireStrictRule, {
	valid: [
		// Already-strict bindings on either module (semantic default)
		"import assert from 'node:assert'; assert.strictEqual(actual, expected);",
		"import assert from 'node:assert'; assert.notStrictEqual(actual, expected);",
		"import assert from 'node:assert'; assert.deepStrictEqual(actual, expected);",
		"import assert from 'node:assert'; assert.notDeepStrictEqual(actual, expected);",
		"import assert from 'node:assert/strict'; assert.equal(actual, expected);",
		"import assert from 'node:assert/strict'; assert.notEqual(actual, expected);",
		"import assert from 'node:assert/strict'; assert.deepEqual(actual, expected);",
		"import assert from 'node:assert/strict'; assert.notDeepEqual(actual, expected);",

		// Strict default re-export via named import
		"import { strict as assert } from 'node:assert'; assert.deepEqual(actual, expected);",
		"import { strict } from 'node:assert'; strict.equal(actual, expected);",

		// Already-strict named imports from either module
		"import { strictEqual } from 'node:assert'; strictEqual(actual, expected);",
		"import { strictEqual } from 'node:assert/strict'; strictEqual(actual, expected);",

		// Renamed already-strict named import
		"import { strictEqual as eq } from 'node:assert'; eq(actual, expected);",

		// Method imports from a strict module use legacy names safely (semantic)
		"import { equal } from 'node:assert/strict'; equal(actual, expected);",
		"import { equal as eq } from 'node:assert/strict'; eq(actual, expected);",

		// Imports from unrelated modules are ignored
		"import { equal } from 'somewhere'; equal(actual, expected);",
		"import assert from 'somewhere'; assert.equal(actual, expected);",

		// Namespace imports
		"import * as assert from 'node:assert'; assert.strictEqual(actual, expected);",
		"import * as assert from 'node:assert/strict'; assert.equal(actual, expected);",

		// Bare specifiers without the node: protocol
		"import assert from 'assert'; assert.strictEqual(actual, expected);",
		"import assert from 'assert/strict'; assert.equal(actual, expected);",
		"import { strictEqual } from 'assert'; strictEqual(actual, expected);",
		"import { equal } from 'assert/strict'; equal(actual, expected);",

		// Default + named combined
		"import assert, { strictEqual } from 'node:assert'; assert.strictEqual(a, b); strictEqual(c, d);",

		// Const aliases of namespaces
		"import assert from 'node:assert'; const alias = assert; alias.strictEqual(actual, expected);",
		"import assert from 'node:assert/strict'; const alias = assert; alias.equal(actual, expected);",

		// Multi-hop alias chains preserve strictness
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b.equal(actual, expected);",
		"import { equal } from 'node:assert/strict'; const eq1 = equal; const eq2 = eq1; eq2(actual, expected);",

		// Strict namespace destructured from a base namespace
		"import assert from 'node:assert'; const { strict } = assert; strict.equal(actual, expected);",
		"import assert from 'node:assert'; const { strict: s } = assert; s.equal(actual, expected);",
		"import assert from 'node:assert'; const { strict } = assert; const s = strict; s.equal(actual, expected);",

		// Destructured method bindings from a strict namespace
		"import assert from 'node:assert/strict'; const { equal } = assert; equal(actual, expected);",
		"import assert from 'node:assert/strict'; const { equal: eq } = assert; eq(actual, expected);",

		// Re-bound named imports keep their strictness
		"import { strictEqual } from 'node:assert'; const eq = strictEqual; eq(actual, expected);",
		"import { equal } from 'node:assert/strict'; const eq = equal; eq(actual, expected);",

		// Methods outside the legacy mapping are ignored
		"import assert from 'node:assert'; assert.match(actual, /x/);",
		"import assert from 'node:assert'; assert.doesNotMatch(actual, /x/);",
		"import assert from 'node:assert'; assert.ok(actual);",
		"import assert from 'node:assert'; assert.ifError(actual);",
		"import assert from 'node:assert'; assert.fail('boom');",
		"import assert from 'node:assert'; assert.throws(() => fn(), Error);",
		"import assert from 'node:assert'; assert.partialDeepStrictEqual(a, b);",

		// Calls on unrelated objects must not be tracked
		"const other = { equal: () => {} }; other.equal(actual, expected);",
		"const other = { strictEqual: () => {} }; other.strictEqual(actual, expected);",

		// `let`-declared aliases are not propagated (they could be reassigned)
		"import assert from 'node:assert'; let a = assert; a.equal(actual, expected);",
		"import { equal } from 'node:assert'; let eq = equal; eq(actual, expected);",

		// Computed access where the property name cannot be resolved statically
		"import assert from 'node:assert'; assert[someKey](actual, expected);",

		// Computed access via literal forms on already-strict bindings
		"import assert from 'node:assert/strict'; assert['equal'](actual, expected);",
		"import assert from 'node:assert/strict'; assert[`equal`](actual, expected);",
		"import assert from 'node:assert/strict'; const k = 'equal'; assert[k](actual, expected);",

		// Side-effect-only import: no specifiers, no crash
		"import 'node:assert';",
		"import 'node:assert/strict';",

		// Calls before the import declaration cannot resolve a binding
		"someOtherCall(actual, expected); import assert from 'node:assert/strict'; assert.equal(actual, expected);",

		// Explicit option mode keeps already-strict calls valid
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);",
			options: [{ mode: "explicit" }]
		},
		{
			code: "import { strictEqual } from 'node:assert'; strictEqual(actual, expected);",
			options: [{ mode: "explicit" }]
		},
		{
			code: "import assert from 'node:assert/strict'; assert.match(actual, /x/);",
			options: [{ mode: "explicit" }]
		},
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(actual, expected);",
			options: [{ mode: "explicit" }]
		},

		// Semantic mode is the default; reaffirm one case for clarity
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actual, expected);",
			options: [{ mode: "semantic" }]
		}
	],
	invalid: [
		// Each legacy method via member access on a default import (autofixable)
		{
			code: "import assert from 'node:assert'; assert.equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert.strictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; assert.notEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert.notStrictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; assert.deepEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert.deepStrictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; assert.notDeepEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert.notDeepStrictEqual(actual, expected);"
		},

		// Each legacy method via named import (no autofix on identifier callees)
		{
			code: "import { equal } from 'node:assert'; equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},
		{
			code: "import { notEqual } from 'node:assert'; notEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},
		{
			code: "import { deepEqual } from 'node:assert'; deepEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},
		{
			code: "import { notDeepEqual } from 'node:assert'; notDeepEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},

		// Renamed legacy named import is still flagged but the call site cannot be safely renamed
		{
			code: "import { equal as eq } from 'node:assert'; eq(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},

		// Namespace import with a legacy method
		{
			code: "import * as assert from 'node:assert'; assert.equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import * as assert from 'node:assert'; assert.strictEqual(actual, expected);"
		},

		// Bare specifiers without the node: protocol
		{
			code: "import assert from 'assert'; assert.equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'assert'; assert.strictEqual(actual, expected);"
		},
		{
			code: "import { equal } from 'assert'; equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},

		// Default + named combined: every legacy call site is flagged
		{
			code: "import assert, { equal } from 'node:assert'; assert.equal(a, b); equal(c, d);",
			errors: [{ messageId: "require-strict" }, { messageId: "require-strict" }],
			output: "import assert, { equal } from 'node:assert'; assert.strictEqual(a, b); equal(c, d);"
		},

		// Const aliases of a base namespace propagate non-strictness
		{
			code: "import assert from 'node:assert'; const alias = assert; alias.equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; const alias = assert; alias.strictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; const alias = assert; alias['deepEqual'](actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; const alias = assert; alias['deepStrictEqual'](actual, expected);"
		},

		// Multi-hop alias chains
		{
			code: "import assert from 'node:assert'; const a = assert; const b = a; b.equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; const a = assert; const b = a; b.strictEqual(actual, expected);"
		},
		{
			code: "import { equal } from 'node:assert'; const eq1 = equal; const eq2 = eq1; eq2(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},

		// Destructured method bindings from a base namespace
		{
			code: "import assert from 'node:assert'; const { equal } = assert; equal(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},
		{
			code: "import assert from 'node:assert'; const { equal: eq } = assert; eq(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},
		{
			code: "import assert from 'node:assert'; const { equal: strictEqual } = assert; strictEqual(actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},

		// Computed access via string and template literals
		{
			code: "import assert from 'node:assert'; assert['equal'](actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert['strictEqual'](actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; assert[`equal`](actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert[`strictEqual`](actual, expected);"
		},

		// Computed access via a const-bound key (resolved through getPropertyName)
		{
			code: "import assert from 'node:assert'; const key = 'equal'; assert[key](actual, expected);",
			errors: [{ messageId: "require-strict" }],
			output: null
		},

		// Three-argument form preserves the trailing message argument
		{
			code: "import assert from 'node:assert'; assert.equal(actual, expected, 'oops');",
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; assert.strictEqual(actual, expected, 'oops');"
		},

		// Strict default re-export via named import in explicit mode
		{
			code: "import { strict as s } from 'node:assert'; s.equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: "import { strict as s } from 'node:assert'; s.strictEqual(actual, expected);"
		},
		{
			code: "import { strict } from 'node:assert'; strict.equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: "import { strict } from 'node:assert'; strict.strictEqual(actual, expected);"
		},

		// Explicit mode flags every legacy call site, even on a strict module
		{
			code: "import assert from 'node:assert/strict'; assert.equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert/strict'; const { equal } = assert; equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(actual, expected);"
		},

		// Strict-namespace destructured from a base namespace (the bug fixed earlier)
		{
			code: "import assert from 'node:assert'; const { strict } = assert; strict.equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; const { strict } = assert; strict.strictEqual(actual, expected);"
		},
		{
			code: "import assert from 'node:assert'; const { strict: s } = assert; s.equal(actual, expected);",
			options: [{ mode: "explicit" }],
			errors: [{ messageId: "require-strict" }],
			output: "import assert from 'node:assert'; const { strict: s } = assert; s.strictEqual(actual, expected);"
		}
	]
});
