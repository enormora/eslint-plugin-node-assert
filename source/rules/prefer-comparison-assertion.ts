import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import {
	createAssertBindingTracker,
	NOT_ASSERT_MODULE,
	type ResolvedMethodCall
} from "../node-assert/method-tracker.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const BOOLEAN_ASSERTION_METHOD_NAMES: ReadonlySet<string> = new Set(["ok", "equal", "strictEqual"]);
const STRICT_MODULE_SPECIFIERS: ReadonlySet<string> = new Set(["node:assert/strict", "assert/strict"]);
const BASE_MODULE_SPECIFIERS: ReadonlySet<string> = new Set(["node:assert", "assert"]);
const ONE_ASSERTION_ARGUMENT = 1;
const TWO_ASSERTION_ARGUMENTS = 2;

type ReplacementMethodName = "equal" | "notEqual" | "notStrictEqual" | "strictEqual";
type SupportedBinaryOperator = "!=" | "!==" | "==" | "===";
type SupportedComparisonExpression = Readonly<TSESTree.BinaryExpression> & {
	readonly operator: SupportedBinaryOperator;
};
type ComparisonPlan = {
	readonly consumedArgumentCount: typeof ONE_ASSERTION_ARGUMENT | typeof TWO_ASSERTION_ARGUMENTS;
	readonly leftExpression: TSESTree.Expression;
	readonly replacementMethodName: ReplacementMethodName;
	readonly rightExpression: TSESTree.Expression;
};

const AFFIRMATIVE_REPLACEMENT_METHOD_NAMES = new Map<SupportedBinaryOperator, ReplacementMethodName>([
	["!=", "notEqual"],
	["!==", "notStrictEqual"],
	["==", "equal"],
	["===", "strictEqual"]
]);
const NEGATED_REPLACEMENT_METHOD_NAMES = new Map<SupportedBinaryOperator, ReplacementMethodName>([
	["!=", "equal"],
	["!==", "strictEqual"],
	["==", "notEqual"],
	["===", "notStrictEqual"]
]);

function isAssertMethodName(methodName: string): boolean {
	return BOOLEAN_ASSERTION_METHOD_NAMES.has(methodName);
}

// eslint-disable-next-line sonarjs/function-return-type -- the sentinel signals "not an assert module" and is intentionally distinct from the boolean strictness meta
function classifyModule(moduleSpecifier: unknown): boolean | typeof NOT_ASSERT_MODULE {
	if (typeof moduleSpecifier !== "string") {
		return NOT_ASSERT_MODULE;
	}
	if (STRICT_MODULE_SPECIFIERS.has(moduleSpecifier)) {
		return true;
	}
	if (BASE_MODULE_SPECIFIERS.has(moduleSpecifier)) {
		return false;
	}
	return NOT_ASSERT_MODULE;
}

function resolveStrictReExport(propertyName: string): boolean | undefined {
	return propertyName === "strict" ? true : undefined;
}

function getSingleExpressionArgument(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [argument] = callArguments;
	if (argument === undefined || argument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return argument;
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

function isSupportedBinaryOperator(
	operator: TSESTree.BinaryExpression["operator"]
): operator is SupportedBinaryOperator {
	return operator === "==" || operator === "!=" || operator === "===" || operator === "!==";
}

function getBooleanLiteralValue(node: Readonly<TSESTree.Expression>): boolean | undefined {
	if (node.type !== AST_NODE_TYPES.Literal || typeof node.value !== "boolean") {
		return undefined;
	}
	return node.value;
}

function isSupportedComparisonExpression(
	node: Readonly<TSESTree.Expression>
): node is Readonly<SupportedComparisonExpression> {
	return node.type === AST_NODE_TYPES.BinaryExpression && isSupportedBinaryOperator(node.operator);
}

function isComparisonOperand(
	node: Readonly<TSESTree.Expression | TSESTree.PrivateIdentifier>
): node is TSESTree.Expression {
	return node.type !== AST_NODE_TYPES.PrivateIdentifier;
}

function usesLooseEqualityOperator(operator: SupportedBinaryOperator): boolean {
	return operator === "!=" || operator === "==";
}

function getReplacementMethodName(
	operator: SupportedBinaryOperator,
	isStrictModule: boolean,
	expectedBooleanValue: boolean
): ReplacementMethodName | undefined {
	if (isStrictModule && usesLooseEqualityOperator(operator)) {
		return undefined;
	}
	const replacementMethodNames = expectedBooleanValue
		? AFFIRMATIVE_REPLACEMENT_METHOD_NAMES
		: NEGATED_REPLACEMENT_METHOD_NAMES;
	return replacementMethodNames.get(operator);
}

function buildComparisonPlan(
	comparisonExpression: Readonly<SupportedComparisonExpression>,
	consumedArgumentCount: typeof ONE_ASSERTION_ARGUMENT | typeof TWO_ASSERTION_ARGUMENTS,
	isStrictModule: boolean,
	expectedBooleanValue: boolean
): ComparisonPlan | undefined {
	if (!isComparisonOperand(comparisonExpression.left) || !isComparisonOperand(comparisonExpression.right)) {
		return undefined;
	}
	const replacementMethodName = getReplacementMethodName(
		comparisonExpression.operator,
		isStrictModule,
		expectedBooleanValue
	);
	if (replacementMethodName === undefined) {
		return undefined;
	}
	return {
		consumedArgumentCount,
		leftExpression: comparisonExpression.left,
		replacementMethodName,
		rightExpression: comparisonExpression.right
	};
}

function getOkComparisonPlan(
	assertionNode: Readonly<TSESTree.CallExpression>,
	isStrictModule: boolean
): ComparisonPlan | undefined {
	const testedExpression = getSingleExpressionArgument(assertionNode.arguments);
	if (testedExpression === undefined || !isSupportedComparisonExpression(testedExpression)) {
		return undefined;
	}
	return buildComparisonPlan(testedExpression, ONE_ASSERTION_ARGUMENT, isStrictModule, true);
}

function getBooleanAssertionComparisonPlan(
	assertionNode: Readonly<TSESTree.CallExpression>,
	isStrictModule: boolean
): ComparisonPlan | undefined {
	const assertionArguments = getTwoExpressionArguments(assertionNode.arguments);
	if (assertionArguments === undefined) {
		return undefined;
	}
	const { firstArgument, secondArgument } = assertionArguments;
	const expectedBooleanValue = getBooleanLiteralValue(secondArgument);
	if (expectedBooleanValue === undefined || !isSupportedComparisonExpression(firstArgument)) {
		return undefined;
	}
	return buildComparisonPlan(firstArgument, TWO_ASSERTION_ARGUMENTS, isStrictModule, expectedBooleanValue);
}

function getComparisonPlan(
	methodName: string,
	assertionNode: Readonly<TSESTree.CallExpression>,
	isStrictModule: boolean
): ComparisonPlan | undefined {
	if (methodName === "ok") {
		return getOkComparisonPlan(assertionNode, isStrictModule);
	}
	return getBooleanAssertionComparisonPlan(assertionNode, isStrictModule);
}

function getExpressionText(
	expression: Readonly<TSESTree.Expression>,
	sourceCode: Readonly<TSESLint.SourceCode>
): string {
	const expressionText = sourceCode.getText(expression);
	return expression.type === AST_NODE_TYPES.SequenceExpression ? `(${expressionText})` : expressionText;
}

function getComputedReplacementPropertyText(
	property: Readonly<TSESTree.Expression>,
	replacementMethodName: ReplacementMethodName
): string | undefined {
	if (property.type === AST_NODE_TYPES.Literal && typeof property.value === "string") {
		return `'${replacementMethodName}'`;
	}
	if (property.type === AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
		return `\`${replacementMethodName}\``;
	}
	return undefined;
}

function buildMemberReplacementCalleeText(
	callee: Readonly<TSESTree.MemberExpression>,
	replacementMethodName: ReplacementMethodName,
	sourceCode: Readonly<TSESLint.SourceCode>
): string | null {
	if (callee.optional || callee.property.type === AST_NODE_TYPES.PrivateIdentifier) {
		return null;
	}
	const objectText = sourceCode.getText(callee.object);
	const computedReplacementPropertyText = getComputedReplacementPropertyText(callee.property, replacementMethodName);
	if (computedReplacementPropertyText !== undefined) {
		return `${objectText}[${computedReplacementPropertyText}]`;
	}
	return `${objectText}.${replacementMethodName}`;
}

function buildReplacementCalleeText(
	callee: Readonly<TSESTree.Expression>,
	bindingKind: Readonly<ResolvedMethodCall<boolean>>["bindingKind"],
	replacementMethodName: ReplacementMethodName,
	sourceCode: Readonly<TSESLint.SourceCode>
): string | null {
	if (callee.type === AST_NODE_TYPES.Identifier && bindingKind === "namespace-callable") {
		return `${callee.name}.${replacementMethodName}`;
	}
	return callee.type === AST_NODE_TYPES.MemberExpression
		? buildMemberReplacementCalleeText(callee, replacementMethodName, sourceCode)
		: null;
}

function hasUnsafeFixingConditions(
	assertionNode: Readonly<TSESTree.CallExpression>,
	sourceCode: Readonly<TSESLint.SourceCode>
): boolean {
	return sourceCode.getCommentsInside(assertionNode).length > 0;
}

function buildFix(
	assertionNode: Readonly<TSESTree.CallExpression>,
	comparisonPlan: Readonly<ComparisonPlan>,
	resolved: Readonly<ResolvedMethodCall<boolean>>,
	sourceCode: Readonly<TSESLint.SourceCode>
): TSESLint.ReportFixFunction | null {
	if (hasUnsafeFixingConditions(assertionNode, sourceCode)) {
		return null;
	}
	const replacementCalleeText = buildReplacementCalleeText(
		assertionNode.callee,
		resolved.bindingKind,
		comparisonPlan.replacementMethodName,
		sourceCode
	);
	if (replacementCalleeText === null) {
		return null;
	}
	const preservedArguments = assertionNode.arguments.slice(comparisonPlan.consumedArgumentCount).map((argument) => {
		return sourceCode.getText(argument);
	});
	const replacementArguments = [
		getExpressionText(comparisonPlan.leftExpression, sourceCode),
		getExpressionText(comparisonPlan.rightExpression, sourceCode),
		...preservedArguments
	].join(", ");
	const replacementCallText = `${replacementCalleeText}(${replacementArguments})`;
	return (fixer) => {
		return fixer.replaceText(assertionNode, replacementCallText);
	};
}

export const preferComparisonAssertionRule = createRule({
	name: "prefer-comparison-assertion",
	meta: {
		docs: {
			description: "Prefer dedicated equality assertion methods over asserting comparison results"
		},
		messages: {
			"prefer-comparison-assertion":
				"Use '{{replacementMethodName}}' instead of asserting the result of a comparison expression"
		},
		type: "suggestion",
		fixable: "code",
		schema: []
	},
	defaultOptions: [],
	create(context) {
		const tracker = createAssertBindingTracker<boolean>({
			isAssertMethod: isAssertMethodName,
			classifyModule,
			resolveNamespaceProperty: resolveStrictReExport,
			namespaceCallableMethod: "ok"
		});
		const { sourceCode } = context;

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const resolved = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
				if (resolved === undefined) {
					return;
				}
				const comparisonPlan = getComparisonPlan(resolved.methodName, node, resolved.meta);
				if (comparisonPlan === undefined) {
					return;
				}
				context.report({
					messageId: "prefer-comparison-assertion",
					node,
					data: { replacementMethodName: comparisonPlan.replacementMethodName },
					fix: buildFix(node, comparisonPlan, resolved, sourceCode)
				});
			}
		};
	}
});
