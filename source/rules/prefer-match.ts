import { AST_NODE_TYPES, ASTUtils, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const TARGET_ASSERT_METHOD_NAMES: ReadonlySet<string> = new Set(["ok", "equal", "strictEqual"]);
const AFFIRMATIVE_ASSERTION_METHOD_NAME = "match";
const NEGATIVE_ASSERTION_METHOD_NAME = "doesNotMatch";
const ONE_ASSERTION_ARGUMENT = 1;
const TWO_ASSERTION_ARGUMENTS = 2;

type MatchedRegularExpressionTest = {
	readonly regularExpressionExpression: TSESTree.Expression;
	readonly actualValueExpression: TSESTree.Expression;
};

type ReplacementPlan = {
	readonly consumedArgumentCount: typeof ONE_ASSERTION_ARGUMENT | typeof TWO_ASSERTION_ARGUMENTS;
	readonly replacementMethodName: typeof AFFIRMATIVE_ASSERTION_METHOD_NAME | typeof NEGATIVE_ASSERTION_METHOD_NAME;
	readonly regularExpressionExpression: TSESTree.Expression;
	readonly actualValueExpression: TSESTree.Expression;
};

type BooleanComparison = {
	readonly firstArgument: TSESTree.Expression;
	readonly replacementMethodName: typeof AFFIRMATIVE_ASSERTION_METHOD_NAME | typeof NEGATIVE_ASSERTION_METHOD_NAME;
};

function isTargetAssertMethodName(methodName: string): boolean {
	return TARGET_ASSERT_METHOD_NAMES.has(methodName);
}

function getSingleExpressionArgument(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [firstArgument] = callArguments;
	if (firstArgument === undefined || firstArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return firstArgument;
}

function getTwoExpressionArguments(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): { readonly firstArgument: TSESTree.Expression; readonly secondArgument: TSESTree.Expression } | undefined {
	const [firstArgument, secondArgument] = callArguments;
	if (firstArgument === undefined || secondArgument === undefined) {
		return undefined;
	}
	if (firstArgument.type === AST_NODE_TYPES.SpreadElement || secondArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return { firstArgument, secondArgument };
}

function getBooleanLiteralValue(node: Readonly<TSESTree.Expression>): boolean | undefined {
	if (node.type !== AST_NODE_TYPES.Literal || typeof node.value !== "boolean") {
		return undefined;
	}
	return node.value;
}

function getRegularExpressionTestMemberExpression(
	callExpression: Readonly<TSESTree.CallExpression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- required by getPropertyName
	scope: TSESLint.Scope.Scope
): Readonly<TSESTree.MemberExpression> | undefined {
	const { callee } = callExpression;
	if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.optional) {
		return undefined;
	}
	if (ASTUtils.getPropertyName(callee, scope) !== "test" || callee.object.type === AST_NODE_TYPES.Super) {
		return undefined;
	}
	return callee;
}

function getRegularExpressionTestCall(
	expression: Readonly<TSESTree.Expression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- required by getPropertyName
	scope: TSESLint.Scope.Scope
): MatchedRegularExpressionTest | undefined {
	const callExpression = expression.type === AST_NODE_TYPES.CallExpression ? expression : undefined;
	if (callExpression === undefined) {
		return undefined;
	}
	const memberExpression = getRegularExpressionTestMemberExpression(callExpression, scope);
	if (memberExpression === undefined) {
		return undefined;
	}
	const actualValueExpression = getSingleExpressionArgument(callExpression.arguments);
	if (actualValueExpression === undefined) {
		return undefined;
	}
	return {
		regularExpressionExpression: memberExpression.object,
		actualValueExpression
	};
}

function getOkReplacementPlan(
	assertionNode: Readonly<TSESTree.CallExpression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to helper that needs the mutable Scope shape
	scope: TSESLint.Scope.Scope
): ReplacementPlan | undefined {
	const testedExpression = getSingleExpressionArgument(assertionNode.arguments);
	if (testedExpression === undefined) {
		return undefined;
	}
	const regularExpressionTest = getRegularExpressionTestCall(testedExpression, scope);
	if (regularExpressionTest === undefined) {
		return undefined;
	}
	return {
		consumedArgumentCount: ONE_ASSERTION_ARGUMENT,
		replacementMethodName: AFFIRMATIVE_ASSERTION_METHOD_NAME,
		...regularExpressionTest
	};
}

function getBooleanComparison(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): BooleanComparison | undefined {
	const comparisonArguments = getTwoExpressionArguments(callArguments);
	if (comparisonArguments === undefined) {
		return undefined;
	}
	const { firstArgument, secondArgument } = comparisonArguments;
	const expectedBooleanValue = getBooleanLiteralValue(secondArgument);
	if (expectedBooleanValue === undefined) {
		return undefined;
	}
	return {
		firstArgument,
		replacementMethodName: expectedBooleanValue ? AFFIRMATIVE_ASSERTION_METHOD_NAME : NEGATIVE_ASSERTION_METHOD_NAME
	};
}

function getEqualityReplacementPlan(
	assertionNode: Readonly<TSESTree.CallExpression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to helper that needs the mutable Scope shape
	scope: TSESLint.Scope.Scope
): ReplacementPlan | undefined {
	const booleanComparison = getBooleanComparison(assertionNode.arguments);
	if (booleanComparison === undefined) {
		return undefined;
	}
	const { firstArgument, replacementMethodName } = booleanComparison;
	const regularExpressionTest = getRegularExpressionTestCall(firstArgument, scope);
	if (regularExpressionTest === undefined) {
		return undefined;
	}
	return {
		consumedArgumentCount: TWO_ASSERTION_ARGUMENTS,
		replacementMethodName,
		...regularExpressionTest
	};
}

function getReplacementPlan(
	assertMethodName: string,
	assertionNode: Readonly<TSESTree.CallExpression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to helper that needs the mutable Scope shape
	scope: TSESLint.Scope.Scope
): ReplacementPlan | undefined {
	return assertMethodName === "ok"
		? getOkReplacementPlan(assertionNode, scope)
		: getEqualityReplacementPlan(assertionNode, scope);
}

function isDefinitelySideEffectFreeExpression(expression: Readonly<TSESTree.Expression>): boolean {
	return (
		expression.type === AST_NODE_TYPES.Identifier ||
		expression.type === AST_NODE_TYPES.ThisExpression ||
		expression.type === AST_NODE_TYPES.Literal
	);
}

function hasUnsafeFixingConditions(
	assertionNode: Readonly<TSESTree.CallExpression>,
	replacementPlan: Readonly<ReplacementPlan>,
	sourceCode: Readonly<TSESLint.SourceCode>
): boolean {
	if (sourceCode.getCommentsInside(assertionNode).length > 0) {
		return true;
	}
	if (!isDefinitelySideEffectFreeExpression(replacementPlan.regularExpressionExpression)) {
		return true;
	}
	if (!isDefinitelySideEffectFreeExpression(replacementPlan.actualValueExpression)) {
		return true;
	}
	return false;
}

function getComputedReplacementPropertyText(
	property: Readonly<TSESTree.Expression>,
	replacementMethodName: string
): string | undefined {
	if (property.type === AST_NODE_TYPES.Literal && typeof property.value === "string") {
		return `'${replacementMethodName}'`;
	}
	if (property.type === AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
		return `\`${replacementMethodName}\``;
	}
	return undefined;
}

function buildReplacementCalleeText(
	callee: Readonly<TSESTree.Expression>,
	replacementMethodName: string,
	sourceCode: Readonly<TSESLint.SourceCode>
): string | null {
	if (callee.type !== AST_NODE_TYPES.MemberExpression) {
		return null;
	}
	const objectText = sourceCode.getText(callee.object);
	if (callee.property.type === AST_NODE_TYPES.Identifier && !callee.computed) {
		return `${objectText}.${replacementMethodName}`;
	}
	if (callee.property.type === AST_NODE_TYPES.PrivateIdentifier) {
		return null;
	}
	const computedPropertyText = getComputedReplacementPropertyText(callee.property, replacementMethodName);
	return computedPropertyText === undefined ? null : `${objectText}[${computedPropertyText}]`;
}

function buildReplacementFix(
	assertionNode: Readonly<TSESTree.CallExpression>,
	replacementPlan: Readonly<ReplacementPlan>,
	sourceCode: Readonly<TSESLint.SourceCode>
): TSESLint.ReportFixFunction | null {
	const replacementCalleeText = buildReplacementCalleeText(
		assertionNode.callee,
		replacementPlan.replacementMethodName,
		sourceCode
	);
	if (replacementCalleeText === null) {
		return null;
	}
	return (fixer) => {
		const actualValueText = sourceCode.getText(replacementPlan.actualValueExpression);
		const regularExpressionText = sourceCode.getText(replacementPlan.regularExpressionExpression);
		const trailingArguments = assertionNode.arguments
			.slice(replacementPlan.consumedArgumentCount)
			.map((argumentNode) => {
				return sourceCode.getText(argumentNode);
			});
		const replacementArguments = [actualValueText, regularExpressionText, ...trailingArguments].join(", ");
		return fixer.replaceText(assertionNode, `${replacementCalleeText}(${replacementArguments})`);
	};
}

export const preferMatchRule = createRule({
	name: "prefer-match",
	meta: {
		docs: {
			description: "Prefer assert.match() or assert.doesNotMatch() for regular expression assertions"
		},
		messages: {
			"prefer-match":
				"Prefer assert.match() or assert.doesNotMatch() when asserting against a regular expression."
		},
		type: "suggestion",
		fixable: "code",
		schema: []
	},
	defaultOptions: [],
	create(context) {
		const tracker = createAssertBindingTracker<null>({
			isAssertMethod: isTargetAssertMethodName,
			classifyModule(specifier) {
				return isAssertModuleSpecifier(specifier) ? null : NOT_ASSERT_MODULE;
			}
		});
		const { sourceCode } = context;

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const scope = sourceCode.getScope(node);
				const resolvedMethodCall = tracker.resolveMethodCall(node.callee, scope);
				if (resolvedMethodCall === undefined) {
					return;
				}
				const replacementPlan = getReplacementPlan(resolvedMethodCall.methodName, node, scope);
				if (replacementPlan === undefined) {
					return;
				}
				const canFix = !hasUnsafeFixingConditions(node, replacementPlan, sourceCode);
				context.report({
					messageId: "prefer-match",
					node,
					fix: canFix ? buildReplacementFix(node, replacementPlan, sourceCode) : null
				});
			}
		};
	}
});
