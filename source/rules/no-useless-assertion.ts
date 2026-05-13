import assert from "node:assert";
import strictAssert from "node:assert/strict";
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { isConstant } from "../ast/is-constant.js";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const ONE_ARGUMENT_METHOD_NAMES = ["ok", "ifError"] as const;
const TWO_ARGUMENT_METHOD_NAMES = [
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
	"doesNotMatch"
] as const;

/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-use-before-define, functional/prefer-immutable-types, functional/type-declaration-immutability, perfectionist/sort-union-types, sonarjs/function-return-type -- internal constant-evaluator helpers rely on recursive readonly shapes and mutual recursion */
type OneArgumentMethodName = (typeof ONE_ARGUMENT_METHOD_NAMES)[number];
type TwoArgumentMethodName = (typeof TWO_ARGUMENT_METHOD_NAMES)[number];
type CoveredMethodName = OneArgumentMethodName | TwoArgumentMethodName;
type ConstantScalarValue = bigint | boolean | null | number | RegExp | string | undefined;
type ConstantArrayValue = readonly ConstantValue[];
interface ConstantObjectValue {
	readonly [key: string]: ConstantValue;
}
type ConstantValue = ConstantArrayValue | ConstantObjectValue | ConstantScalarValue;
type ExpressionPair = {
	readonly firstArgument: TSESTree.Expression;
	readonly secondArgument: TSESTree.Expression;
};
type RuntimeAssertModule = Pick<typeof assert, CoveredMethodName>;

type ConstantExpressionArguments = {
	readonly methodName: CoveredMethodName;
	readonly strictness: boolean;
	readonly values: readonly ConstantValue[];
};

const COVERED_METHOD_NAMES: ReadonlySet<string> = new Set([...ONE_ARGUMENT_METHOD_NAMES, ...TWO_ARGUMENT_METHOD_NAMES]);
const ONE_ARGUMENT_METHODS: ReadonlySet<string> = new Set(ONE_ARGUMENT_METHOD_NAMES);
const NON_EXPRESSION_PATTERN_TYPES: ReadonlySet<TSESTree.Node["type"]> = new Set([
	AST_NODE_TYPES.ArrayPattern,
	AST_NODE_TYPES.AssignmentPattern,
	AST_NODE_TYPES.ObjectPattern,
	AST_NODE_TYPES.RestElement
]);

const NOT_EVALUATABLE: unique symbol = Symbol("not-evaluatable");
type NotEvaluatable = typeof NOT_EVALUATABLE;
type ConstantEvaluation = ConstantValue | NotEvaluatable;

const LOOSE_ASSERT: RuntimeAssertModule = assert;
const STRICT_ASSERT: RuntimeAssertModule = strictAssert;

const UNARY_OPERATOR_EVALUATORS = {
	"-"(value: ConstantValue): ConstantEvaluation {
		return typeof value === "bigint" ? -value : -Number(value);
	},
	"+"(value: ConstantValue): ConstantEvaluation {
		return typeof value === "bigint" ? NOT_EVALUATABLE : Number(value);
	},
	"!"(value: ConstantValue): ConstantEvaluation {
		// eslint-disable-next-line no-extra-boolean-cast -- explicit coercion keeps mixed constant values acceptable to strict-boolean-expressions
		return !Boolean(value);
	},
	"~"(value: ConstantValue): ConstantEvaluation {
		// eslint-disable-next-line no-bitwise -- evaluating a bitwise literal is part of the supported constant subset
		return typeof value === "bigint" ? ~value : ~Number(value);
	},
	void(): ConstantEvaluation {
		return undefined;
	},
	typeof(value: ConstantValue): ConstantEvaluation {
		return typeof value;
	},
	delete(): ConstantEvaluation {
		return true;
	}
} satisfies Readonly<Record<TSESTree.UnaryExpression["operator"], (value: ConstantValue) => ConstantEvaluation>>;

function isCoveredMethodName(name: string): name is CoveredMethodName {
	return COVERED_METHOD_NAMES.has(name);
}

function isOneArgumentMethodName(name: CoveredMethodName): name is OneArgumentMethodName {
	return ONE_ARGUMENT_METHODS.has(name);
}

function classifyStrictness(specifier: unknown): boolean | typeof NOT_ASSERT_MODULE {
	if (specifier === "node:assert" || specifier === "assert") {
		return false;
	}
	if (specifier === "node:assert/strict" || specifier === "assert/strict") {
		return true;
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
): ExpressionPair | undefined {
	const [firstArgument, secondArgument] = callArguments;
	if (firstArgument === undefined || secondArgument === undefined) {
		return undefined;
	}
	if (firstArgument.type === AST_NODE_TYPES.SpreadElement || secondArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return { firstArgument, secondArgument };
}

function getPropertyName(property: Readonly<TSESTree.Property>): string | undefined {
	if (property.computed) {
		return undefined;
	}
	return property.key.type === AST_NODE_TYPES.Identifier ? property.key.name : String(property.key.value);
}

function isExpressionNode(node: Readonly<TSESTree.Node>): node is TSESTree.Expression {
	return !NON_EXPRESSION_PATTERN_TYPES.has(node.type);
}

function evaluateLiteralConstant(node: Readonly<TSESTree.Literal>): ConstantValue {
	return node.value;
}

function evaluateIdentifierConstant(node: Readonly<TSESTree.Identifier>): ConstantEvaluation {
	if (node.name === "undefined") {
		return undefined;
	}
	if (node.name === "NaN") {
		return Number.NaN;
	}
	if (node.name === "Infinity") {
		return Number.POSITIVE_INFINITY;
	}
	return NOT_EVALUATABLE;
}

function evaluateTemplateLiteralConstant(node: Readonly<TSESTree.TemplateLiteral>): ConstantValue {
	return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? "";
}

function evaluateUnaryConstant(node: Readonly<TSESTree.UnaryExpression>): ConstantEvaluation {
	const argumentValue = evaluateConstant(node.argument);
	return argumentValue === NOT_EVALUATABLE
		? NOT_EVALUATABLE
		: UNARY_OPERATOR_EVALUATORS[node.operator](argumentValue);
}

function evaluateArrayConstant(node: Readonly<TSESTree.ArrayExpression>): readonly ConstantValue[] | NotEvaluatable {
	const values: ConstantValue[] = [];
	for (const element of node.elements) {
		if (element === null || element.type === AST_NODE_TYPES.SpreadElement) {
			return NOT_EVALUATABLE;
		}
		const elementValue = evaluateConstant(element);
		if (elementValue === NOT_EVALUATABLE) {
			return NOT_EVALUATABLE;
		}
		values.push(elementValue);
	}
	return values;
}

function evaluatePropertyConstant(
	property: Readonly<TSESTree.Property>
): { readonly propertyName: string; readonly propertyValue: ConstantValue } | NotEvaluatable {
	const propertyName = getPropertyName(property);
	if (propertyName === undefined || !isExpressionNode(property.value)) {
		return NOT_EVALUATABLE;
	}
	const propertyValue = evaluateConstant(property.value);
	if (propertyValue === NOT_EVALUATABLE) {
		return NOT_EVALUATABLE;
	}
	return { propertyName, propertyValue };
}

function evaluateObjectConstant(
	node: Readonly<TSESTree.ObjectExpression>
): Readonly<Record<string, ConstantValue>> | NotEvaluatable {
	const value: Record<string, ConstantValue> = {};
	for (const property of node.properties) {
		if (property.type !== AST_NODE_TYPES.Property) {
			return NOT_EVALUATABLE;
		}
		const propertyConstant = evaluatePropertyConstant(property);
		if (propertyConstant === NOT_EVALUATABLE) {
			return NOT_EVALUATABLE;
		}
		value[propertyConstant.propertyName] = propertyConstant.propertyValue;
	}
	return value;
}

function evaluateStructuredConstant(node: Readonly<TSESTree.Expression>): ConstantEvaluation {
	if (node.type === AST_NODE_TYPES.UnaryExpression) {
		return evaluateUnaryConstant(node);
	}
	if (node.type === AST_NODE_TYPES.ArrayExpression) {
		return evaluateArrayConstant(node);
	}
	if (node.type === AST_NODE_TYPES.ObjectExpression) {
		return evaluateObjectConstant(node);
	}
	return NOT_EVALUATABLE;
}

function evaluateConstant(node: Readonly<TSESTree.Expression>): ConstantEvaluation {
	if (node.type === AST_NODE_TYPES.Literal) {
		return evaluateLiteralConstant(node);
	}
	if (node.type === AST_NODE_TYPES.TemplateLiteral) {
		return evaluateTemplateLiteralConstant(node);
	}
	if (node.type === AST_NODE_TYPES.Identifier) {
		return evaluateIdentifierConstant(node);
	}
	return evaluateStructuredConstant(node);
}

function getConstantValue(node: Readonly<TSESTree.Expression>): ConstantEvaluation {
	if (!isConstant(node)) {
		return NOT_EVALUATABLE;
	}
	return evaluateConstant(node);
}

function getOneArgumentAssertionArguments(
	methodName: OneArgumentMethodName,
	strictness: boolean,
	callArguments: readonly TSESTree.CallExpressionArgument[]
): ConstantExpressionArguments | undefined {
	const argument = getSingleExpressionArgument(callArguments);
	if (argument === undefined) {
		return undefined;
	}
	const value = getConstantValue(argument);
	return value === NOT_EVALUATABLE ? undefined : { methodName, strictness, values: [value] };
}

function getTwoArgumentAssertionArguments(
	methodName: TwoArgumentMethodName,
	strictness: boolean,
	callArguments: readonly TSESTree.CallExpressionArgument[]
): ConstantExpressionArguments | undefined {
	const argumentsPair = getTwoExpressionArguments(callArguments);
	if (argumentsPair === undefined) {
		return undefined;
	}
	const firstValue = getConstantValue(argumentsPair.firstArgument);
	const secondValue = getConstantValue(argumentsPair.secondArgument);
	return firstValue === NOT_EVALUATABLE || secondValue === NOT_EVALUATABLE
		? undefined
		: { methodName, strictness, values: [firstValue, secondValue] };
}

function getAssertionArguments(
	methodName: CoveredMethodName,
	strictness: boolean,
	callArguments: readonly TSESTree.CallExpressionArgument[]
): ConstantExpressionArguments | undefined {
	return isOneArgumentMethodName(methodName)
		? getOneArgumentAssertionArguments(methodName, strictness, callArguments)
		: getTwoArgumentAssertionArguments(methodName, strictness, callArguments);
}

function getRuntimeAssert(strictness: boolean): RuntimeAssertModule {
	return strictness ? STRICT_ASSERT : LOOSE_ASSERT;
}

function assertionAlwaysPasses(assertionArguments: Readonly<ConstantExpressionArguments>): boolean {
	const runtimeAssert = getRuntimeAssert(assertionArguments.strictness);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the rule only admits names from CoveredMethodName
	const assertionMethod = runtimeAssert[assertionArguments.methodName] as (
		...values: readonly ConstantValue[]
	) => void;
	try {
		assertionMethod(...assertionArguments.values);
		return true;
	} catch {
		return false;
	}
}
/* eslint-enable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-use-before-define, functional/prefer-immutable-types, functional/type-declaration-immutability, perfectionist/sort-union-types, sonarjs/function-return-type -- end internal constant-evaluator helper exemptions */

export const noUselessAssertionRule = createRule({
	name: "no-useless-assertion",
	meta: {
		docs: {
			description: "Disallow Node.js assertions whose outcome is fully determined by constant inputs"
		},
		messages: {
			"always-passes": "This assertion always passes because every checked input is constant",
			"always-fails": "This assertion always fails because every checked input is constant"
		},
		type: "problem",
		schema: []
	},
	defaultOptions: [],

	create(context) {
		const tracker = createAssertBindingTracker<boolean>({
			isAssertMethod: isCoveredMethodName,
			classifyModule: classifyStrictness,
			resolveNamespaceProperty: resolveStrictReExport,
			namespaceCallableMethod: "ok"
		});
		const { sourceCode } = context;

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const resolved = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
				if (resolved === undefined || !isCoveredMethodName(resolved.methodName)) {
					return;
				}
				const assertionArguments = getAssertionArguments(resolved.methodName, resolved.meta, node.arguments);
				if (assertionArguments === undefined) {
					return;
				}
				context.report({
					messageId: assertionAlwaysPasses(assertionArguments) ? "always-passes" : "always-fails",
					node
				});
			}
		};
	}
});
