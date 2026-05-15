import * as assert from "node:assert/strict";
import { suite, test } from "mocha";
import type { Rule } from "eslint";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../../source/node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../../source/node-assert/modules.js";
import { expectNoLintFailure, runProbeRule } from "../helpers/linter-runner.js";

const ASSERT_METHODS: ReadonlySet<string> = new Set(["strictEqual", "deepStrictEqual", "ifError"]);

function isAssertMethod(name: string): boolean {
	return ASSERT_METHODS.has(name);
}

// eslint-disable-next-line sonarjs/function-return-type -- the sentinel signals "not an assert module" and is intentionally distinct from the boolean strictness meta
function classifyStrictness(specifier: unknown): boolean | typeof NOT_ASSERT_MODULE {
	if (specifier === "node:assert" || specifier === "assert") {
		return false;
	}
	if (specifier === "node:assert/strict" || specifier === "assert/strict") {
		return true;
	}
	return NOT_ASSERT_MODULE;
}

type ResolvedCall<TMeta> = {
	readonly bindingKind: "member-expression" | "method-binding" | "namespace-callable" | undefined;
	readonly calleeText: string;
	readonly resolvedMethod: string | undefined;
	readonly meta: TMeta | undefined;
};

type ProbeOptions<TMeta> = {
	readonly classifyModule?: (specifier: unknown) => TMeta | typeof NOT_ASSERT_MODULE;
	readonly resolveNamespaceProperty?: (propertyName: string, sourceMeta: TMeta) => TMeta | undefined;
	readonly namespaceCallableMethod?: string;
};

function resolveCallsIn<TMeta = null>(
	code: string,
	probeOptions: ProbeOptions<TMeta> = {}
): readonly ResolvedCall<TMeta>[] {
	const classifyModule =
		probeOptions.classifyModule ??
		((specifier: unknown): TMeta | typeof NOT_ASSERT_MODULE => {
			return isAssertModuleSpecifier(specifier) ? (null as TMeta) : NOT_ASSERT_MODULE;
		});
	const calls: ResolvedCall<TMeta>[] = [];
	const probeRule: Rule.RuleModule = {
		create(context) {
			const tracker = createAssertBindingTracker<TMeta>({
				isAssertMethod,
				classifyModule,
				...(probeOptions.resolveNamespaceProperty === undefined
					? {}
					: { resolveNamespaceProperty: probeOptions.resolveNamespaceProperty }),
				...(probeOptions.namespaceCallableMethod === undefined
					? {}
					: { namespaceCallableMethod: probeOptions.namespaceCallableMethod })
			});
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
						bindingKind: resolved?.bindingKind,
						calleeText: context.sourceCode.getText(calleeNode),
						resolvedMethod: resolved?.methodName,
						meta: resolved?.meta
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
			const [firstCall] = calls;
			if (firstCall === undefined) {
				throw new Error("expected the call to be resolved");
			}
			assert.strictEqual(firstCall.bindingKind, "member-expression");
			assert.strictEqual(calls.length, 1);
			assert.strictEqual(firstCall.resolvedMethod, "strictEqual");
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
			const [firstCall] = calls;
			if (firstCall === undefined) {
				throw new Error("expected the call to be resolved");
			}
			assert.strictEqual(firstCall.bindingKind, "method-binding");
			assert.strictEqual(firstCall.resolvedMethod, "strictEqual");
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

	suite("namespace metadata", function () {
		test("propagates module-level metadata through default imports", function () {
			const baseCalls = resolveCallsIn<boolean>("import assert from 'node:assert'; assert.strictEqual(1, 2);", {
				classifyModule: classifyStrictness
			});
			assert.strictEqual(baseCalls[0]?.meta, false);

			const strictCalls = resolveCallsIn<boolean>(
				"import assert from 'node:assert/strict'; assert.strictEqual(1, 2);",
				{ classifyModule: classifyStrictness }
			);
			assert.strictEqual(strictCalls[0]?.meta, true);
		});

		test("propagates metadata through alias chains and destructuring", function () {
			const calls = resolveCallsIn<boolean>(
				"import assert from 'node:assert/strict'; const a = assert; const b = a; const { strictEqual } = b; strictEqual(1, 2); b.deepStrictEqual({}, {});",
				{ classifyModule: classifyStrictness }
			);
			assert.strictEqual(calls[0]?.meta, true);
			assert.strictEqual(calls[1]?.meta, true);
		});

		test("attaches the source module metadata to method bindings from named imports", function () {
			const calls = resolveCallsIn<boolean>("import { strictEqual } from 'node:assert'; strictEqual(1, 2);", {
				classifyModule: classifyStrictness
			});
			assert.strictEqual(calls[0]?.meta, false);
		});
	});

	suite("resolveNamespaceProperty hook", function () {
		function resolveStrictReExport(propertyName: string): boolean | undefined {
			return propertyName === "strict" ? true : undefined;
		}

		test("registers a re-exported namespace through a named import", function () {
			const calls = resolveCallsIn<boolean>("import { strict } from 'node:assert'; strict.strictEqual(1, 2);", {
				classifyModule: classifyStrictness,
				resolveNamespaceProperty: resolveStrictReExport
			});
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
			assert.strictEqual(calls[0].meta, true);
		});

		test("registers a re-exported namespace through const destructuring", function () {
			const calls = resolveCallsIn<boolean>(
				"import assert from 'node:assert'; const { strict } = assert; strict.strictEqual(1, 2);",
				{ classifyModule: classifyStrictness, resolveNamespaceProperty: resolveStrictReExport }
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
			assert.strictEqual(calls.at(-1)?.meta, true);
		});

		test("registers a renamed re-exported namespace through const destructuring", function () {
			const calls = resolveCallsIn<boolean>(
				"import assert from 'node:assert'; const { strict: s } = assert; s.strictEqual(1, 2);",
				{ classifyModule: classifyStrictness, resolveNamespaceProperty: resolveStrictReExport }
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
			assert.strictEqual(calls.at(-1)?.meta, true);
		});

		test("does not register a re-export when the hook returns undefined", function () {
			const calls = resolveCallsIn<boolean>(
				"import assert from 'node:assert'; const { something } = assert; something.strictEqual(1, 2);",
				{ classifyModule: classifyStrictness, resolveNamespaceProperty: resolveStrictReExport }
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, undefined);
		});
	});

	suite("namespaceCallableMethod option", function () {
		test("treats a direct namespace call as the configured method", function () {
			const calls = resolveCallsIn("import assert from 'node:assert/strict'; assert(value, message);", {
				namespaceCallableMethod: "strictEqual"
			});
			const [firstCall] = calls;
			if (firstCall === undefined) {
				throw new Error("expected the call to be resolved");
			}
			assert.strictEqual(firstCall.bindingKind, "namespace-callable");
			assert.strictEqual(firstCall.resolvedMethod, "strictEqual");
		});

		test("treats a direct namespace-import call as the configured method", function () {
			const calls = resolveCallsIn("import * as assert from 'node:assert/strict'; assert(value, message);", {
				namespaceCallableMethod: "strictEqual"
			});
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
		});

		test("propagates namespace metadata through the namespace-callable form", function () {
			const baseCalls = resolveCallsIn<boolean>("import assert from 'node:assert'; assert(value, message);", {
				classifyModule: classifyStrictness,
				namespaceCallableMethod: "strictEqual"
			});
			assert.strictEqual(baseCalls[0]?.meta, false);

			const strictCalls = resolveCallsIn<boolean>(
				"import assert from 'node:assert/strict'; assert(value, message);",
				{ classifyModule: classifyStrictness, namespaceCallableMethod: "strictEqual" }
			);
			assert.strictEqual(strictCalls[0]?.meta, true);
		});

		test("resolves namespace-callable form through const aliases", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; const a = assert; const b = a; b(value, message);",
				{ namespaceCallableMethod: "strictEqual" }
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("resolves namespace-callable form through a re-exported strict namespace", function () {
			function resolveStrictReExport(propertyName: string): boolean | undefined {
				return propertyName === "strict" ? true : undefined;
			}
			const calls = resolveCallsIn<boolean>("import { strict } from 'node:assert'; strict(value, message);", {
				classifyModule: classifyStrictness,
				resolveNamespaceProperty: resolveStrictReExport,
				namespaceCallableMethod: "strictEqual"
			});
			assert.strictEqual(calls[0]?.resolvedMethod, "strictEqual");
			assert.strictEqual(calls[0].meta, true);
		});

		test("prefers a destructured method binding over the callable namespace shortcut", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; const { strictEqual: foo } = assert; foo(1, 2);",
				{ namespaceCallableMethod: "deepStrictEqual" }
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, "strictEqual");
		});

		test("does not resolve namespace-callable form for untracked identifiers", function () {
			const calls = resolveCallsIn("foo(value, message);", { namespaceCallableMethod: "strictEqual" });
			assert.strictEqual(calls[0]?.resolvedMethod, undefined);
		});

		test("ignores namespace-callable form when the option is not set", function () {
			const calls = resolveCallsIn("import assert from 'node:assert/strict'; assert(value, message);");
			assert.strictEqual(calls[0]?.resolvedMethod, undefined);
		});

		test("ignores namespace-callable form for let-declared aliases", function () {
			const calls = resolveCallsIn(
				"import assert from 'node:assert/strict'; let a = assert; a(value, message);",
				{ namespaceCallableMethod: "strictEqual" }
			);
			assert.strictEqual(calls.at(-1)?.resolvedMethod, undefined);
		});
	});
});
