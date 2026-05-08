import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { isConstant } from "../ast/is-constant.js";
import { createAssertBindingTracker } from "../node-assert/method-tracker.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const TWO_ARG_METHODS: ReadonlySet<string> = new Set([
	"equal",
	"strictEqual",
	"notEqual",
	"notStrictEqual",
	"deepEqual",
	"deepStrictEqual",
	"notDeepEqual",
	"notDeepStrictEqual",
	"partialDeepStrictEqual",
	"match",
	"doesNotMatch",
	"throws",
	"doesNotThrow",
	"rejects",
	"doesNotReject"
]);

const ONE_ARG_METHODS: ReadonlySet<string> = new Set(["ifError"]);

function isAssertMethodName(name: string): boolean {
	return TWO_ARG_METHODS.has(name) || ONE_ARG_METHODS.has(name);
}

type EqualityArguments = {
	readonly actualArg: TSESTree.Expression;
	readonly expectedArg: TSESTree.Expression;
};

function getEqualityArguments(args: readonly TSESTree.CallExpressionArgument[]): EqualityArguments | undefined {
	const [actualArg, expectedArg] = args;
	if (actualArg === undefined || expectedArg === undefined) {
		return undefined;
	}
	if (actualArg.type === AST_NODE_TYPES.SpreadElement || expectedArg.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return { actualArg, expectedArg };
}

function getSingleArgument(
	args: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [arg] = args;
	if (arg === undefined || arg.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return arg;
}

function hasCommentsBetween(
	callNode: Readonly<TSESTree.CallExpression>,
	actualArg: Readonly<TSESTree.Expression>,
	expectedArg: Readonly<TSESTree.Expression>,
	sourceCode: Readonly<TSESLint.SourceCode>
): boolean {
	return sourceCode.getCommentsInside(callNode).some((comment) => {
		return comment.range[0] >= actualArg.range[0] && comment.range[1] <= expectedArg.range[1];
	});
}

function buildSwapFix(
	actualArg: Readonly<TSESTree.Expression>,
	expectedArg: Readonly<TSESTree.Expression>,
	sourceCode: Readonly<TSESLint.SourceCode>
): TSESLint.ReportFixFunction {
	return (fixer) => {
		const actualText = sourceCode.getText(actualArg);
		const expectedText = sourceCode.getText(expectedArg);
		return [fixer.replaceText(actualArg, expectedText), fixer.replaceText(expectedArg, actualText)];
	};
}

export const noConstantActualRule = createRule({
	name: "no-constant-actual",
	meta: {
		docs: {
			description: "Disallow passing a constant value as the first argument to Node.js assert methods"
		},
		messages: {
			"no-constant-actual":
				"The first argument should be the actual value; move the constant to the second argument",
			"constant-comparison": "Both arguments are constant; one of these should be the actual value being tested",
			"constant-actual":
				"The actual value passed to this assertion is a constant; this assertion has no meaningful effect"
		},
		type: "problem",
		fixable: "code",
		schema: []
	},
	defaultOptions: [],

	create(context) {
		const tracker = createAssertBindingTracker({ isAssertMethod: isAssertMethodName });
		const { sourceCode } = context;

		function reportSwap(
			callNode: Readonly<TSESTree.CallExpression>,
			actualArg: Readonly<TSESTree.Expression>,
			expectedArg: Readonly<TSESTree.Expression>
		): void {
			const canFix = !hasCommentsBetween(callNode, actualArg, expectedArg, sourceCode);
			context.report({
				messageId: "no-constant-actual",
				node: callNode,
				fix: canFix ? buildSwapFix(actualArg, expectedArg, sourceCode) : null
			});
		}

		function handleTwoArgCall(node: Readonly<TSESTree.CallExpression>): void {
			const equality = getEqualityArguments(node.arguments);
			if (equality === undefined) {
				return;
			}
			const { actualArg, expectedArg } = equality;
			if (!isConstant(actualArg)) {
				return;
			}
			if (isConstant(expectedArg)) {
				context.report({ messageId: "constant-comparison", node });
				return;
			}
			reportSwap(node, actualArg, expectedArg);
		}

		function handleOneArgCall(node: Readonly<TSESTree.CallExpression>): void {
			const arg = getSingleArgument(node.arguments);
			if (arg === undefined || !isConstant(arg)) {
				return;
			}
			context.report({ messageId: "constant-actual", node });
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const methodName = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
				if (methodName === undefined) {
					return;
				}
				if (ONE_ARG_METHODS.has(methodName)) {
					handleOneArgCall(node);
					return;
				}
				handleTwoArgCall(node);
			}
		};
	}
});
