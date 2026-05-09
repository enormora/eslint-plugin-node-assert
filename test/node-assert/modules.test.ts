import * as assert from "node:assert/strict";
import { suite, test } from "mocha";
import { ASSERT_MODULES, isAssertModuleSpecifier } from "../../source/node-assert/modules.js";

const NUMERIC_NON_STRING = 42;

const SUPPORTED_SPECIFIERS: readonly string[] = ["node:assert", "node:assert/strict", "assert", "assert/strict"];

const REJECTED_SPECIFIERS: readonly string[] = ["node:fs", "chai", "node:assert/something-else", "./assert", ""];

suite("node-assert/modules", function () {
	test("ASSERT_MODULES contains exactly the supported specifiers", function () {
		assert.strictEqual(ASSERT_MODULES.size, SUPPORTED_SPECIFIERS.length);
		for (const specifier of SUPPORTED_SPECIFIERS) {
			assert.ok(ASSERT_MODULES.has(specifier), `expected ASSERT_MODULES to contain ${specifier}`);
		}
	});

	test("isAssertModuleSpecifier() returns true for every supported specifier", function () {
		for (const specifier of SUPPORTED_SPECIFIERS) {
			assert.strictEqual(isAssertModuleSpecifier(specifier), true, `expected ${specifier} to be accepted`);
		}
	});

	test("isAssertModuleSpecifier() returns false for unrelated specifiers", function () {
		for (const specifier of REJECTED_SPECIFIERS) {
			assert.strictEqual(isAssertModuleSpecifier(specifier), false, `expected ${specifier} to be rejected`);
		}
	});

	test("isAssertModuleSpecifier() returns false for non-string values", function () {
		assert.strictEqual(isAssertModuleSpecifier(NUMERIC_NON_STRING), false);
		assert.strictEqual(isAssertModuleSpecifier(null), false);
		assert.strictEqual(isAssertModuleSpecifier(undefined), false);
		assert.strictEqual(isAssertModuleSpecifier({}), false);
	});
});
