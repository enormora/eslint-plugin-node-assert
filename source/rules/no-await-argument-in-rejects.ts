import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const asyncAssertionMethodNames: ReadonlySet<string> = new Set(["rejects", "doesNotReject"]);

function isAssertMethodName(name: string): boolean {
	return asyncAssertionMethodNames.has(name);
}

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function getFirstExpressionArgument(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [firstArgument] = callArguments;
	if (firstArgument === undefined || firstArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return firstArgument;
}

function getAwaitedFirstArgument(
	node: Readonly<TSESTree.CallExpression>
): Readonly<TSESTree.AwaitExpression> | undefined {
	const firstArgument = getFirstExpressionArgument(node.arguments);
	return firstArgument?.type === AST_NODE_TYPES.AwaitExpression ? firstArgument : undefined;
}

function hasRemovedPrefixComments(
	awaitExpression: Readonly<TSESTree.AwaitExpression>,
	sourceCode: Readonly<TSESLint.SourceCode>
): boolean {
	return sourceCode.getCommentsInside(awaitExpression).some((comment) => {
		return comment.range[1] <= awaitExpression.argument.range[0];
	});
}

function buildAwaitRemovalFix(
	awaitExpression: Readonly<TSESTree.AwaitExpression>,
	sourceCode: Readonly<TSESLint.SourceCode>
): TSESLint.ReportFixFunction {
	return (fixer) => {
		return fixer.replaceText(awaitExpression, sourceCode.getText(awaitExpression.argument));
	};
}

function reportAwaitedArgument(
	context: Readonly<TSESLint.RuleContext<"no-await-argument-in-rejects", readonly []>>,
	awaitExpression: Readonly<TSESTree.AwaitExpression>,
	sourceCode: Readonly<TSESLint.SourceCode>
): void {
	context.report({
		messageId: "no-await-argument-in-rejects",
		node: awaitExpression,
		fix: hasRemovedPrefixComments(awaitExpression, sourceCode)
			? null
			: buildAwaitRemovalFix(awaitExpression, sourceCode)
	});
}

export const noAwaitArgumentInRejectsRule = createRule<readonly [], "no-await-argument-in-rejects">({
	name: "no-await-argument-in-rejects",
	meta: {
		docs: {
			description: "Disallow awaiting the argument passed to assert.rejects() and assert.doesNotReject()"
		},
		messages: {
			"no-await-argument-in-rejects":
				"Do not await the argument passed to assert.rejects() or assert.doesNotReject(). " +
				"Pass the promise itself, or pass a function that returns the promise."
		},
		type: "problem",
		fixable: "code",
		schema: []
	},
	defaultOptions: [],

	create(context) {
		const tracker = createAssertBindingTracker<null>({
			isAssertMethod: isAssertMethodName,
			classifyModule(specifier) {
				return isAssertModuleSpecifier(specifier) ? null : NOT_ASSERT_MODULE;
			},
			resolveNamespaceProperty: resolveStrictReExport
		});
		const { sourceCode } = context;

		function checkCallExpression(node: Readonly<TSESTree.CallExpression>): void {
			const resolvedMethodCall = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
			if (resolvedMethodCall === undefined) {
				return;
			}
			const awaitedFirstArgument = getAwaitedFirstArgument(node);
			if (awaitedFirstArgument === undefined) {
				return;
			}
			reportAwaitedArgument(context, awaitedFirstArgument, sourceCode);
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression: checkCallExpression
		};
	}
});
