import * as assert from "node:assert/strict";
import { suite, test } from "mocha";
import type { Rule } from "eslint";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker } from "../../source/node-assert/method-tracker.js";
import { expectNoLintFailure, runProbeRule } from "../helpers/linter-runner.js";

const ASSERT_METHODS: ReadonlySet<string> = new Set(["strictEqual", "deepStrictEqual", "ifError"]);

function isAssertMethod(name: string): boolean {
	return ASSERT_METHODS.has(name);
}

type ResolvedCall = {
	readonly calleeText: string;
	readonly resolvedMethod: string | undefined;
};

function resolveCallsIn(code: string): readonly ResolvedCall[] {
	const calls: ResolvedCall[] = [];
	const probeRule: Rule.RuleModule = {
		create(context) {
			const tracker = createAssertBindingTracker({ isAssertMethod });
			return {
				ImportDeclaration(node) {
					tracker.processImport(node as unknown as TSESTree.ImportDeclaration);
				},
				VariableDeclaration(node) {
					tracker.processVariableDeclaration(node as unknown as TSESTree.VariableDeclaration);
				},
				CallExpression(node) {
					const calleeNode = node.callee;
					const scope = context.sourceCode.getScope(node) as unknown as TSESLint.Scope.Scope;
					const resolved = tracker.resolveMethodCall(calleeNode as unknown as TSESTree.Expression, scope);
					calls.push({
						calleeText: context.sourceCode.getText(calleeNode),
						resolvedMethod: resolved
					});
				}
			};
		}
	};
	const messages = runProbeRule({ code, rule: probeRule });
	expectNoLintFailure(messages);
	return calls;
}

suite("createAssertBindingTracker()", function () {
	suite("default and namespace imports", function () {
		test("resolves member calls on a default import", function () {
			const calls = resolveCallsIn("import assert from 'node:assert/strict'; assert.strictEqual(1, 2);");
			assert.strictEqual(calls.length, 1);
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
		});

		test("resolves member calls on a namespace import", function () {
			const calls = resolveCallsIn(
				"import * as assert from 'node:assert/strict'; assert.deepStrictEqual({}, {});"
			);
			assert.strictEqual(calls[0]?.resolvedMethod, "deepStrictEqual");
		});

		test("returns undefined for methods outside the predicate", function () {
			const calls = resolveCallsIn("import assert from 'node:assert/strict'; assert.ok(value);");
			assert.strictEqual(calls[0]?.resolvedMethod, undefined);
		});
	});

	suite("named imports", function () {
		test("resolves direct named imports", function () {
			const calls = resolveCallsIn("import { strictEqual } from 'node:assert/strict'; strictEqual(1, 2);");
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
		});

		test("resolves aliased named imports", function () {
			const calls = resolveCallsIn("import { strictEqual as eq } from 'node:assert/strict'; eq(1, 2);");
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
		});
	});

	suite("module specifiers", function () {
		test("matches bare specifiers without the node: protocol", function () {
			const calls = resolveCallsIn("import assert from 'assert/strict'; assert.strictEqual(1, 2);");
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
		});

		test("ignores imports from unrelated modules", function () {
			const calls = resolveCallsIn("import { strictEqual } from 'somewhere-else'; strictEqual(1, 2);");
			assert.strictEqual(calls[0]?.resolvedMethod, undefined);
		});
	});

	suite("computed access", function () {
		test("resolves a string literal property", function () {
			const calls = resolveCallsIn("import assert from 'node:assert/strict'; assert['strictEqual'](1, 2);");
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
		});

		test("resolves a const-bound string property via getStringIfConstant", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; const key = 'strictEqual'; assert[key](1, 2);"
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("returns undefined when the property cannot be resolved", function () {
			const calls = resolveCallsIn("import assert from 'node:assert/strict'; assert[someKey](1, 2);");
			assert.strictEqual(calls[0]?.resolvedMethod, undefined);
		});
	});

	suite("const-declared aliases", function () {
		test("tracks namespace aliases", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; const a = assert; a.strictEqual(1, 2);"
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("tracks multi-hop namespace aliases", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; const a = assert; const b = a; b.strictEqual(1, 2);"
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("tracks destructured method bindings", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; const { strictEqual } = assert; strictEqual(1, 2);"
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("tracks renamed destructured method bindings", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; const { strictEqual: foo } = assert; foo(1, 2);"
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("tracks re-bindings of named imports", function () {
			const calls = resolveCallsIn(
				"import { strictEqual } from 'node:assert/strict'; const eq = strictEqual; eq(1, 2);"
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("ignores let-declared aliases", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; let a = assert; a.strictEqual(1, 2);"
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, undefined);
		});

		test("ignores destructuring of methods outside the predicate", function () {
			const calls = resolveCallsIn("import assert from 'node:assert/strict'; const { ok } = assert; ok(value);");
			assert.strictEqual(calls.at(-1)?.resolvedMethod, undefined);
		});
	});

	suite("non-tracked patterns", function () {
		test("does not match member calls on unrelated objects", function () {
			const calls = resolveCallsIn("const other = { strictEqual: () => {} }; other.strictEqual(1, 2);");
			assert.strictEqual(calls[0]?.resolvedMethod, undefined);
		});

		test("does not match calls before the import is processed", function () {
			const calls = resolveCallsIn(
				"someOtherCall(1, 2); import assert from 'node:assert/strict'; assert.strictEqual(1, 2);"
			);
			assert.strictEqual(calls[0]?.resolvedMethod, undefined);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});
	});
});
