import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const errorValidatorMethodNames: ReadonlySet<string> = new Set(["throws", "doesNotThrow", "rejects", "doesNotReject"]);
const trackedAssertMethodNames: ReadonlySet<string> = new Set([
	"ok",
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
	"doesNotReject",
	"ifError",
	"fail"
]);

type FlowAnalysis = {
	readonly known: boolean;
	readonly mayCompleteNormally: boolean;
	readonly mayReturnInvalid: boolean;
	readonly mayReturnTrue: boolean;
};

type ConstantEvaluation = {
	readonly known: boolean;
	readonly value?: unknown;
};

const continues: FlowAnalysis = {
	known: true,
	mayCompleteNormally: true,
	mayReturnInvalid: false,
	mayReturnTrue: false
};
const throwsAnalysis: FlowAnalysis = {
	known: true,
	mayCompleteNormally: false,
	mayReturnInvalid: false,
	mayReturnTrue: false
};
const unknown: FlowAnalysis = {
	known: false,
	mayCompleteNormally: false,
	mayReturnInvalid: false,
	mayReturnTrue: false
};
const nonExpressionPatternTypes: ReadonlySet<TSESTree.Node["type"]> = new Set([
	AST_NODE_TYPES.ArrayPattern,
	AST_NODE_TYPES.AssignmentPattern,
	AST_NODE_TYPES.ObjectPattern,
	AST_NODE_TYPES.RestElement
]);
const continuingStatementTypes: ReadonlySet<TSESTree.Statement["type"]> = new Set([
	AST_NODE_TYPES.ClassDeclaration,
	AST_NODE_TYPES.DebuggerStatement,
	AST_NODE_TYPES.EmptyStatement,
	AST_NODE_TYPES.ExpressionStatement,
	AST_NODE_TYPES.FunctionDeclaration,
	AST_NODE_TYPES.TSDeclareFunction,
	AST_NODE_TYPES.TSEnumDeclaration,
	AST_NODE_TYPES.TSImportEqualsDeclaration,
	AST_NODE_TYPES.TSInterfaceDeclaration,
	AST_NODE_TYPES.TSModuleDeclaration,
	AST_NODE_TYPES.TSTypeAliasDeclaration,
	AST_NODE_TYPES.VariableDeclaration
]);
const zeroNumber = 0;
const zeroBigInt = 0n;
type FalsyConstantScalar = bigint | boolean | number | string | null | undefined;

const falsyConstantScalars: ReadonlySet<FalsyConstantScalar> = new Set([
	false,
	null,
	undefined,
	"",
	zeroNumber,
	zeroBigInt
]);

function isAssertMethodName(name: string): boolean {
	return trackedAssertMethodNames.has(name);
}

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function getSecondArgument(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [, secondArgument] = callArguments;
	if (secondArgument === undefined || secondArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return secondArgument;
}

function isValidatorFunction(
	node: Readonly<TSESTree.Expression>
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
	return node.type === AST_NODE_TYPES.ArrowFunctionExpression || node.type === AST_NODE_TYPES.FunctionExpression;
}

function isBooleanTrueLiteral(node: Readonly<TSESTree.Expression>): boolean {
	return node.type === AST_NODE_TYPES.Literal && node.value === true;
}

function isExpressionNode(node: Readonly<TSESTree.Node>): node is TSESTree.Expression {
	return !nonExpressionPatternTypes.has(node.type);
}

function knownConstant(value: unknown): ConstantEvaluation {
	return { known: true, value };
}

function unknownConstant(): ConstantEvaluation {
	return { known: false };
}

function isFalsyConstantScalar(value: unknown): value is FalsyConstantScalar {
	return (
		value === null ||
		value === undefined ||
		typeof value === "bigint" ||
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	);
}

function isTruthyConstantValue(value: unknown): boolean {
	return (
		!(typeof value === "number" && Number.isNaN(value)) &&
		(!isFalsyConstantScalar(value) || !falsyConstantScalars.has(value))
	);
}

/* eslint-disable @typescript-eslint/no-use-before-define -- recursive constant-evaluation helpers reference the public evaluator */
function evaluateTemplateLiteral(node: Readonly<TSESTree.TemplateLiteral>): ConstantEvaluation {
	return node.expressions.length === 0
		? knownConstant(node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? "")
		: unknownConstant();
}

function evaluateIdentifier(node: Readonly<TSESTree.Identifier>): ConstantEvaluation {
	if (node.name === "Infinity") {
		return knownConstant(Number.POSITIVE_INFINITY);
	}
	if (node.name === "NaN") {
		return knownConstant(Number.NaN);
	}
	return node.name === "undefined" ? knownConstant(undefined) : unknownConstant();
}

function evaluateArrayExpression(node: Readonly<TSESTree.ArrayExpression>): ConstantEvaluation {
	return node.elements.every((element) => {
		return (
			element !== null &&
			element.type !== AST_NODE_TYPES.SpreadElement &&
			evaluateConstantExpression(element).known
		);
	})
		? knownConstant([])
		: unknownConstant();
}

function evaluateObjectExpression(node: Readonly<TSESTree.ObjectExpression>): ConstantEvaluation {
	return node.properties.every((property) => {
		return (
			property.type === AST_NODE_TYPES.Property &&
			!property.computed &&
			isExpressionNode(property.value) &&
			evaluateConstantExpression(property.value).known
		);
	})
		? knownConstant({})
		: unknownConstant();
}

function evaluateNegation(value: unknown): ConstantEvaluation {
	return knownConstant(!isTruthyConstantValue(value));
}

function evaluateNumericUnary(operator: "+" | "-", value: unknown): ConstantEvaluation {
	if (operator === "+") {
		return knownConstant(Number(value));
	}
	return knownConstant(typeof value === "bigint" ? -value : -Number(value));
}

function evaluateUnaryExpression(node: Readonly<TSESTree.UnaryExpression>): ConstantEvaluation {
	const evaluatedArgument = evaluateConstantExpression(node.argument);
	if (!evaluatedArgument.known) {
		return unknownConstant();
	}
	if (node.operator === "!") {
		return evaluateNegation(evaluatedArgument.value);
	}
	if (node.operator === "+" || node.operator === "-") {
		return evaluateNumericUnary(node.operator, evaluatedArgument.value);
	}
	return node.operator === "void" ? knownConstant(undefined) : unknownConstant();
}

function evaluateConstantExpression(node: Readonly<TSESTree.Expression>): ConstantEvaluation {
	if (node.type === AST_NODE_TYPES.Literal) {
		return knownConstant(node.value);
	}
	return evaluateNonLiteralConstantExpression(node);
}

function evaluateNonLiteralConstantExpression(node: Readonly<TSESTree.Expression>): ConstantEvaluation {
	if (node.type === AST_NODE_TYPES.TemplateLiteral) {
		return evaluateTemplateLiteral(node);
	}
	if (node.type === AST_NODE_TYPES.Identifier) {
		return evaluateIdentifier(node);
	}
	if (node.type === AST_NODE_TYPES.ArrayExpression) {
		return evaluateArrayExpression(node);
	}
	if (node.type === AST_NODE_TYPES.ObjectExpression) {
		return evaluateObjectExpression(node);
	}
	return node.type === AST_NODE_TYPES.UnaryExpression ? evaluateUnaryExpression(node) : unknownConstant();
}
/* eslint-enable @typescript-eslint/no-use-before-define -- recursive constant-evaluation helper exemption ends here */

function analyzeReturnExpression(
	expression: Readonly<TSESTree.Expression>,
	resolveAssertCall: (node: Readonly<TSESTree.CallExpression>) => boolean
): FlowAnalysis {
	if (isBooleanTrueLiteral(expression)) {
		return {
			known: true,
			mayCompleteNormally: false,
			mayReturnInvalid: false,
			mayReturnTrue: true
		};
	}
	if (expression.type === AST_NODE_TYPES.CallExpression && resolveAssertCall(expression)) {
		return {
			known: true,
			mayCompleteNormally: false,
			mayReturnInvalid: true,
			mayReturnTrue: false
		};
	}
	const evaluation = evaluateConstantExpression(expression);
	if (!evaluation.known) {
		return unknown;
	}
	return {
		known: true,
		mayCompleteNormally: false,
		mayReturnInvalid: evaluation.value !== true,
		mayReturnTrue: evaluation.value === true
	};
}

function mergeBranches(left: Readonly<FlowAnalysis>, right: Readonly<FlowAnalysis>): FlowAnalysis {
	if (!left.known || !right.known) {
		return unknown;
	}
	return {
		known: true,
		mayCompleteNormally: left.mayCompleteNormally || right.mayCompleteNormally,
		mayReturnInvalid: left.mayReturnInvalid || right.mayReturnInvalid,
		mayReturnTrue: left.mayReturnTrue || right.mayReturnTrue
	};
}

function isContinuingStatement(statement: Readonly<TSESTree.Statement>): boolean {
	return continuingStatementTypes.has(statement.type);
}

/* eslint-disable @typescript-eslint/no-use-before-define -- these small helpers are intentionally mutually recursive */
function analyzeStatements(
	statements: readonly TSESTree.Statement[],
	resolveAssertCall: (node: Readonly<TSESTree.CallExpression>) => boolean
): FlowAnalysis {
	let analysis = continues;
	for (const statement of statements) {
		if (!analysis.mayCompleteNormally) {
			return analysis;
		}
		const statementAnalysis = analyzeStatement(statement, resolveAssertCall);
		if (!statementAnalysis.known) {
			return unknown;
		}
		analysis = {
			known: true,
			mayCompleteNormally: statementAnalysis.mayCompleteNormally,
			mayReturnInvalid: analysis.mayReturnInvalid || statementAnalysis.mayReturnInvalid,
			mayReturnTrue: analysis.mayReturnTrue || statementAnalysis.mayReturnTrue
		};
	}
	return analysis;
}

function analyzeIfStatement(
	statement: Readonly<TSESTree.IfStatement>,
	resolveAssertCall: (node: Readonly<TSESTree.CallExpression>) => boolean
): FlowAnalysis {
	return mergeBranches(
		analyzeStatement(statement.consequent, resolveAssertCall),
		statement.alternate === null ? continues : analyzeStatement(statement.alternate, resolveAssertCall)
	);
}

function analyzeReturnStatement(
	statement: Readonly<TSESTree.ReturnStatement>,
	resolveAssertCall: (node: Readonly<TSESTree.CallExpression>) => boolean
): FlowAnalysis {
	if (statement.argument === null) {
		return {
			known: true,
			mayCompleteNormally: false,
			mayReturnInvalid: true,
			mayReturnTrue: false
		};
	}
	return analyzeReturnExpression(statement.argument, resolveAssertCall);
}

function analyzeStatement(
	statement: Readonly<TSESTree.Statement>,
	resolveAssertCall: (node: Readonly<TSESTree.CallExpression>) => boolean
): FlowAnalysis {
	if (statement.type === AST_NODE_TYPES.BlockStatement) {
		return analyzeStatements(statement.body, resolveAssertCall);
	}
	if (statement.type === AST_NODE_TYPES.IfStatement) {
		return analyzeIfStatement(statement, resolveAssertCall);
	}
	if (statement.type === AST_NODE_TYPES.ReturnStatement) {
		return analyzeReturnStatement(statement, resolveAssertCall);
	}
	if (statement.type === AST_NODE_TYPES.ThrowStatement) {
		return throwsAnalysis;
	}
	return isContinuingStatement(statement) ? continues : unknown;
}
/* eslint-enable @typescript-eslint/no-use-before-define -- flow-analysis helper recursion ends here */

function analyzeValidatorFunction(
	validatorFunction: Readonly<TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression>,
	resolveAssertCall: (node: Readonly<TSESTree.CallExpression>) => boolean
): FlowAnalysis {
	return validatorFunction.body.type === AST_NODE_TYPES.BlockStatement
		? analyzeStatements(validatorFunction.body.body, resolveAssertCall)
		: analyzeReturnExpression(validatorFunction.body, resolveAssertCall);
}

function isInvalidValidatorAnalysis(analysis: Readonly<FlowAnalysis>): boolean {
	return analysis.known && (analysis.mayCompleteNormally || analysis.mayReturnInvalid || !analysis.mayReturnTrue);
}

export const requireValidErrorValidatorReturnRule = createRule({
	name: "require-valid-error-validator-return",
	meta: {
		docs: {
			description: "Require custom Node.js assert error validators to return true when their checks pass"
		},
		messages: {
			"require-valid-error-validator-return":
				"Error validator functions passed to '{{methodName}}' must return true when validation succeeds"
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

		function resolveAssertCall(node: Readonly<TSESTree.CallExpression>): boolean {
			return tracker.resolveMethodCall(node.callee, sourceCode.getScope(node)) !== undefined;
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const resolved = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
				if (resolved === undefined || !errorValidatorMethodNames.has(resolved.methodName)) {
					return;
				}
				const validatorArgument = getSecondArgument(node.arguments);
				if (validatorArgument === undefined || !isValidatorFunction(validatorArgument)) {
					return;
				}
				if (!isInvalidValidatorAnalysis(analyzeValidatorFunction(validatorArgument, resolveAssertCall))) {
					return;
				}
				context.report({
					messageId: "require-valid-error-validator-return",
					node: validatorArgument,
					data: { methodName: resolved.methodName }
				});
			}
		};
	}
});
