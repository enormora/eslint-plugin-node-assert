import { RuleTester } from "@typescript-eslint/rule-tester";
import { noConstantActualRule } from "../../source/rules/no-constant-actual.js";

const ruleTester = new RuleTester();

ruleTester.run("no-constant-actual", noConstantActualRule, {
	valid: [
		// Correct argument order, one per covered method
		"import assert from 'node:assert/strict'; assert.equal(actual, 'foo');",
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, 42);",
		"import assert from 'node:assert/strict'; assert.notEqual(actual, 'foo');",
		"import assert from 'node:assert/strict'; assert.notStrictEqual(value, null);",
		"import assert from 'node:assert/strict'; assert.deepEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.notDeepEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.notDeepStrictEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.partialDeepStrictEqual(result, { ok: true });",
		"import assert from 'node:assert/strict'; assert.match(myString, /pattern/);",
		"import assert from 'node:assert/strict'; assert.doesNotMatch(myString, /pattern/);",
		"import assert from 'node:assert/strict'; assert.throws(() => fn(), Error);",
		"import assert from 'node:assert/strict'; assert.doesNotThrow(() => fn(), Error);",
		"import assert from 'node:assert/strict'; assert.rejects(asyncFn(), Error);",
		"import assert from 'node:assert/strict'; assert.doesNotReject(asyncFn(), Error);",
		"import assert from 'node:assert/strict'; assert.ifError(err);",

		// Named imports in correct order
		"import { strictEqual } from 'node:assert/strict'; strictEqual(actual, 42);",
		"import { deepStrictEqual } from 'node:assert/strict'; deepStrictEqual(result, { ok: true });",
		"import { ifError } from 'node:assert/strict'; ifError(err);",

		// Renamed import in correct order
		"import { strictEqual as eq } from 'node:assert/strict'; eq(actual, 42);",

		// Various primitive constants on the expected side (correct order)
		"import assert from 'node:assert/strict'; assert.strictEqual(value, true);",
		"import assert from 'node:assert/strict'; assert.strictEqual(value, false);",
		"import assert from 'node:assert/strict'; assert.strictEqual(value, 42n);",
		"import assert from 'node:assert/strict'; assert.strictEqual(value, /foo/);",
		"import assert from 'node:assert/strict'; assert.strictEqual(value, null);",
		"import assert from 'node:assert/strict'; assert.strictEqual(value, NaN);",
		"import assert from 'node:assert/strict'; assert.strictEqual(value, Infinity);",

		// Both sides non-constant: ambiguous, do not report
		"import assert from 'node:assert/strict'; assert.strictEqual(foo(), bar());",
		"import assert from 'node:assert/strict'; assert.strictEqual(obj.actual, obj.expected);",

		// Actual side has dynamic content (so it is non-constant): do not report
		// eslint-disable-next-line no-template-curly-in-string -- intentional template expression in fixture source
		"import assert from 'node:assert/strict'; assert.strictEqual(`hi ${name}`, message);",
		"import assert from 'node:assert/strict'; assert.strictEqual(typeof actualThing, 'string');",
		"import assert from 'node:assert/strict'; assert.strictEqual(Symbol('x'), value);",
		"import assert from 'node:assert/strict'; assert.strictEqual(new Date(), value);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual(new Date(42), value);",
		"import assert from 'node:assert/strict'; assert.strictEqual(obj.value, value);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual({ a: foo }, value);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual({ [k]: 1 }, value);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual({ ...other }, value);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual([foo], value);",
		"import assert from 'node:assert/strict'; assert.deepStrictEqual([...rest], value);",

		// Three-argument form (actual, expected, message) in correct order
		"import assert from 'node:assert/strict'; assert.strictEqual(actual, 42, 'message');",

		// Insufficient arguments: nothing to report
		"import assert from 'node:assert/strict'; assert.strictEqual(42);",
		"import assert from 'node:assert/strict'; assert.strictEqual();",
		"import assert from 'node:assert/strict'; assert.ifError();",

		// Spread as the first argument: opaque, do not report
		"import assert from 'node:assert/strict'; assert.strictEqual(...args);",
		"import assert from 'node:assert/strict'; assert.ifError(...args);",

		// Not from node:assert
		"import { strictEqual } from 'somewhere-else'; strictEqual(42, actual);",
		"import { ifError } from 'somewhere-else'; ifError('foo');",

		// Method not in the targeted set
		"import assert from 'node:assert/strict'; assert.ok(42, actual);",
		"import assert from 'node:assert/strict'; assert.fail('boom');",

		// Member call on an unrelated object
		"const other = { strictEqual: () => {} }; other.strictEqual(42, actual);",
		"const other = { ifError: () => {} }; other.ifError('foo');",

		// Re-binding via const, computed member access, namespace alias, destructuring — all in correct order
		"import assert from 'node:assert/strict'; assert['strictEqual'](actual, 42);",
		"import assert from 'node:assert/strict'; const key = 'strictEqual'; assert[key](actual, 42);",
		"import assert from 'node:assert/strict'; const a = assert; a.strictEqual(actual, 42);",
		"import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(actual, 42);",
		"import assert from 'node:assert/strict'; const { strictEqual: foo } = assert; foo(actual, 42);",
		"import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(actual, 42);",
		"import { strictEqual as foo } from 'node:assert/strict'; foo(actual, 42);",

		// Bare module specifiers without the node: protocol
		"import assert from 'assert/strict'; assert.strictEqual(actual, 42);",
		"import assert from 'assert'; assert.strictEqual(actual, 42);",
		"import { strictEqual } from 'assert/strict'; strictEqual(actual, 42);",

		// Multi-hop alias chains
		"import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(actual, 42);",
		"import { strictEqual } from 'node:assert/strict'; const eq1 = strictEqual; const eq2 = eq1; eq2(actual, 42);",

		// Computed access via template literal or constant expression
		"import assert from 'node:assert/strict'; assert[`strictEqual`](actual, 42);",

		// Computed member access where the property name cannot be resolved statically
		"import assert from 'node:assert/strict'; assert[someKey](42, actual);",

		// let-declared aliases are not tracked (could be reassigned)
		"import assert from 'node:assert/strict'; let a = assert; a.strictEqual(42, actual);"
	],
	invalid: [
		// Each two-argument method with autofix
		{
			code: "import assert from 'node:assert/strict'; assert.equal('foo', result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.equal(result, 'foo');"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(actual, 42);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notEqual('foo', result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.notEqual(result, 'foo');"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notStrictEqual(null, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.notStrictEqual(value, null);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepEqual({ ok: true }, result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.deepEqual(result, { ok: true });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual({ ok: true }, result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { ok: true });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notDeepEqual({ ok: true }, result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.notDeepEqual(result, { ok: true });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.notDeepStrictEqual({ ok: true }, result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.notDeepStrictEqual(result, { ok: true });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.partialDeepStrictEqual({ ok: true }, result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.partialDeepStrictEqual(result, { ok: true });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.match(/pattern/, myString);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.match(myString, /pattern/);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotMatch(/pattern/, myString);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.doesNotMatch(myString, /pattern/);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.throws({ message: 'foo' }, fn);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.throws(fn, { message: 'foo' });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotThrow({ message: 'foo' }, fn);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.doesNotThrow(fn, { message: 'foo' });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.rejects({ message: 'foo' }, asyncFn);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.rejects(asyncFn, { message: 'foo' });"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.doesNotReject({ message: 'foo' }, asyncFn);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.doesNotReject(asyncFn, { message: 'foo' });"
		},

		// Named imports
		{
			code: "import { strictEqual } from 'node:assert/strict'; strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import { strictEqual } from 'node:assert/strict'; strictEqual(actual, 42);"
		},
		{
			code: "import { strictEqual as eq } from 'node:assert/strict'; eq(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import { strictEqual as eq } from 'node:assert/strict'; eq(actual, 42);"
		},

		// Default + named import combined; both forms should fire
		{
			code: "import assert, { equal } from 'node:assert/strict'; assert.notEqual(42, value); equal('x', other);",
			errors: [{ messageId: "no-constant-actual" }, { messageId: "no-constant-actual" }],
			output: "import assert, { equal } from 'node:assert/strict'; assert.notEqual(value, 42); equal(other, 'x');"
		},

		// Non-strict node:assert and namespace import
		{
			code: "import assert from 'node:assert'; assert.strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert'; assert.strictEqual(actual, 42);"
		},
		{
			code: "import * as assert from 'node:assert/strict'; assert.equal('foo', result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import * as assert from 'node:assert/strict'; assert.equal(result, 'foo');"
		},

		// Primitive literal types
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(true, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, true);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(false, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, false);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(42n, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, 42n);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(/foo/, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, /foo/);"
		},

		// Constant identifiers
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(undefined, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, undefined);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(NaN, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, NaN);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(Infinity, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, Infinity);"
		},

		// Unary expressions over constants
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(-1, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, -1);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(-Infinity, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, -Infinity);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(!true, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, !true);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(void 0, value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, void 0);"
		},

		// Template literal without expressions
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(`hi`, message);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(message, `hi`);"
		},

		// `typeof` of a literal collapses to a constant string at runtime
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(typeof 'foo', value);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, typeof 'foo');"
		},

		// Empty / nested array and object literals
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual([], items);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(items, []);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual([1, 2, 3], items);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(items, [1, 2, 3]);"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual({}, result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, {});"
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual({ a: { b: 1 } }, result);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.deepStrictEqual(result, { a: { b: 1 } });"
		},

		// Non-constant call expression as the second argument
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(42, foo());",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(foo(), 42);"
		},

		// Three-argument form with message
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(42, value, 'should match');",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert.strictEqual(value, 42, 'should match');"
		},

		// Comments between args disable the autofix
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(42 /* expected */, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: null
		},

		// Both arguments are constant: report with a distinct messageId, no autofix
		{
			code: "import assert from 'node:assert/strict'; assert.equal('foo', 'bar');",
			errors: [{ messageId: "constant-comparison" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(1, 2);",
			errors: [{ messageId: "constant-comparison" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(NaN, NaN);",
			errors: [{ messageId: "constant-comparison" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.deepStrictEqual({ a: 1 }, { a: 2 });",
			errors: [{ messageId: "constant-comparison" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.strictEqual(typeof 'foo', 'string');",
			errors: [{ messageId: "constant-comparison" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.match('foo', /bar/);",
			errors: [{ messageId: "constant-comparison" }],
			output: null
		},

		// Weird usage patterns: computed access, alias, destructuring, re-binding
		{
			code: "import assert from 'node:assert/strict'; assert['strictEqual'](42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert['strictEqual'](actual, 42);"
		},
		{
			code: "import assert from 'node:assert/strict'; const key = 'strictEqual'; assert[key](42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; const key = 'strictEqual'; assert[key](actual, 42);"
		},
		{
			code: "import assert from 'node:assert/strict'; const a = assert; a.strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; const a = assert; a.strictEqual(actual, 42);"
		},
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(actual, 42);"
		},
		{
			code: "import assert from 'node:assert/strict'; const { strictEqual: foo } = assert; foo(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; const { strictEqual: foo } = assert; foo(actual, 42);"
		},
		{
			code: "import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(actual, 42);"
		},
		{
			code: "import { strictEqual as foo } from 'node:assert/strict'; foo(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import { strictEqual as foo } from 'node:assert/strict'; foo(actual, 42);"
		},
		{
			code: "import assert from 'node:assert/strict'; const { ifError } = assert; ifError('foo');",
			errors: [{ messageId: "constant-actual" }],
			output: null
		},

		// Bare module specifiers without the node: protocol
		{
			code: "import assert from 'assert/strict'; assert.strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'assert/strict'; assert.strictEqual(actual, 42);"
		},
		{
			code: "import assert from 'assert'; assert.strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'assert'; assert.strictEqual(actual, 42);"
		},
		{
			code: "import { strictEqual } from 'assert/strict'; strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import { strictEqual } from 'assert/strict'; strictEqual(actual, 42);"
		},

		// Multi-hop alias chains
		{
			code: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(actual, 42);"
		},
		{
			code: "import { strictEqual } from 'node:assert/strict'; const eq1 = strictEqual; const eq2 = eq1; eq2(42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import { strictEqual } from 'node:assert/strict'; const eq1 = strictEqual; const eq2 = eq1; eq2(actual, 42);"
		},

		// Computed access with a template literal or constant expression resolves via getStringIfConstant
		{
			code: "import assert from 'node:assert/strict'; assert[`strictEqual`](42, actual);",
			errors: [{ messageId: "no-constant-actual" }],
			output: "import assert from 'node:assert/strict'; assert[`strictEqual`](actual, 42);"
		},

		// ifError: single-argument method called with a constant value (no autofix)
		{
			code: "import assert from 'node:assert/strict'; assert.ifError('foo');",
			errors: [{ messageId: "constant-actual" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ifError(null);",
			errors: [{ messageId: "constant-actual" }],
			output: null
		},
		{
			code: "import assert from 'node:assert/strict'; assert.ifError(undefined);",
			errors: [{ messageId: "constant-actual" }],
			output: null
		},
		{
			code: "import { ifError } from 'node:assert/strict'; ifError(42);",
			errors: [{ messageId: "constant-actual" }],
			output: null
		}
	]
});
