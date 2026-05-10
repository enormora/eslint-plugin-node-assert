import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { isConstant } from "../ast/is-constant.js";
import { isConstantString } from "../ast/is-constant-string.js";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const OK_STYLE_METHODS: ReadonlySet<string> = new Set(["ok"]);
const ERROR_MATCHER_METHODS: ReadonlySet<string> = new Set(["throws", "doesNotThrow", "rejects", "doesNotReject"]);

function isAssertMethodName(name: string): boolean {
	return OK_STYLE_METHODS.has(name) || ERROR_MATCHER_METHODS.has(name);
}

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function getSecondArgument(
	args: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [, secondArgument] = args;
	if (secondArgument === undefined || secondArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return secondArgument;
}

export const noExpectedValueAsMessageRule = createRule({
	name: "no-expected-value-as-message",
	meta: {
		docs: {
			description:
				"Disallow passing an expected value where a message or error matcher belongs in Node.js assert calls"
		},
		messages: {
			"expected-value-as-message":
				"The second argument is the assertion message; this constant looks like an expected value. " +
				"Use a comparison method (e.g. strictEqual, deepStrictEqual) instead",
			"string-as-error-matcher":
				"A string literal does not match the error; use a RegExp, Error class, object matcher, or " +
				"validation function (a custom failure message goes in the third argument)"
		},
		type: "problem",
		schema: []
	},
	defaultOptions: [],

	create(context) {
		const tracker = createAssertBindingTracker<null>({
			isAssertMethod: isAssertMethodName,
			classifyModule(specifier) {
				return isAssertModuleSpecifier(specifier) ? null : NOT_ASSERT_MODULE;
			},
			resolveNamespaceProperty: resolveStrictReExport,
			namespaceCallableMethod: "ok"
		});
		const { sourceCode } = context;

		function checkOkStyleCall(node: Readonly<TSESTree.CallExpression>): void {
			const secondArgument = getSecondArgument(node.arguments);
			if (secondArgument === undefined) {
				return;
			}
			if (!isConstant(secondArgument) || isConstantString(secondArgument)) {
				return;
			}
			context.report({ messageId: "expected-value-as-message", node: secondArgument });
		}

		function checkErrorMatcherCall(node: Readonly<TSESTree.CallExpression>): void {
			const secondArgument = getSecondArgument(node.arguments);
			if (secondArgument === undefined) {
				return;
			}
			if (!isConstantString(secondArgument)) {
				return;
			}
			context.report({ messageId: "string-as-error-matcher", node: secondArgument });
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const resolved = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
				if (resolved === undefined) {
					return;
				}
				if (OK_STYLE_METHODS.has(resolved.methodName)) {
					checkOkStyleCall(node);
					return;
				}
				if (ERROR_MATCHER_METHODS.has(resolved.methodName)) {
					checkErrorMatcherCall(node);
				}
			}
		};
	}
});
