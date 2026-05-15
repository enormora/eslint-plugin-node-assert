import { AST_NODE_TYPES, ASTUtils, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const synchronousAssertionMethodNames: ReadonlySet<string> = new Set(["throws", "doesNotThrow"]);
const asynchronousReplacementMethodNames: Readonly<Record<string, string>> = {
	doesNotThrow: "doesNotReject",
	throws: "rejects"
};

type AsyncFunctionNode = Readonly<
	TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression
>;

function isTrackedAssertionMethodName(methodName: string): boolean {
	return synchronousAssertionMethodNames.has(methodName);
}

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function getFirstArgument(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [firstArgument] = callArguments;
	if (firstArgument === undefined || firstArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return firstArgument;
}

function unwrapTransparentExpression(node: Readonly<TSESTree.Expression>): Readonly<TSESTree.Expression> {
	if (
		node.type === AST_NODE_TYPES.TSAsExpression ||
		node.type === AST_NODE_TYPES.TSSatisfiesExpression ||
		node.type === AST_NODE_TYPES.TSNonNullExpression ||
		node.type === AST_NODE_TYPES.TSTypeAssertion
	) {
		return unwrapTransparentExpression(node.expression);
	}
	return node;
}

function isAsyncFunctionNode(node: Readonly<TSESTree.Node>): node is AsyncFunctionNode {
	if (!("async" in node) || !node.async) {
		return false;
	}
	return (
		node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
		node.type === AST_NODE_TYPES.FunctionExpression ||
		node.type === AST_NODE_TYPES.FunctionDeclaration
	);
}

function getConstVariableDeclarator(
	definition: Readonly<TSESLint.Scope.Definition>
): Readonly<TSESTree.VariableDeclarator> | undefined {
	if (
		definition.node.type !== AST_NODE_TYPES.VariableDeclarator ||
		definition.parent?.type !== AST_NODE_TYPES.VariableDeclaration ||
		definition.parent.kind !== "const"
	) {
		return undefined;
	}
	return definition.node;
}

function getAliasedVariable(
	variable: Readonly<TSESLint.Scope.Variable>,
	identifier: Readonly<TSESTree.Identifier>,
	visitedVariableNames: ReadonlySet<string>
): Readonly<TSESLint.Scope.Variable> | undefined {
	if (visitedVariableNames.has(identifier.name)) {
		return undefined;
	}
	return ASTUtils.findVariable(variable.scope, identifier.name) ?? undefined;
}

function getNextVisitedVariableNames(
	visitedVariableNames: ReadonlySet<string>,
	variableName: string
): ReadonlySet<string> {
	return new Set([...visitedVariableNames, variableName]);
}

function resolveAsyncFunctionFromExpression(
	expression: Readonly<TSESTree.Expression>,
	variable: Readonly<TSESLint.Scope.Variable>,
	visitedVariableNames: ReadonlySet<string>
): AsyncFunctionNode | undefined {
	const resolvedExpression = unwrapTransparentExpression(expression);
	if (isAsyncFunctionNode(resolvedExpression)) {
		return resolvedExpression;
	}
	if (resolvedExpression.type !== AST_NODE_TYPES.Identifier) {
		return undefined;
	}
	const aliasedVariable = getAliasedVariable(variable, resolvedExpression, visitedVariableNames);
	if (aliasedVariable === undefined) {
		return undefined;
	}
	// eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutually recursive alias resolution
	return resolveAsyncFunctionFromVariable(
		aliasedVariable,
		getNextVisitedVariableNames(visitedVariableNames, resolvedExpression.name)
	);
}

function getAsyncFunctionDeclaration(
	definition: Readonly<TSESLint.Scope.Definition>
): Readonly<TSESTree.FunctionDeclaration> | undefined {
	return definition.node.type === AST_NODE_TYPES.FunctionDeclaration && definition.node.async
		? definition.node
		: undefined;
}

function resolveAsyncFunctionFromDefinition(
	definition: Readonly<TSESLint.Scope.Definition>,
	variable: Readonly<TSESLint.Scope.Variable>,
	visitedVariableNames: ReadonlySet<string>
): AsyncFunctionNode | undefined {
	const asyncFunctionDeclaration = getAsyncFunctionDeclaration(definition);
	if (asyncFunctionDeclaration !== undefined) {
		return asyncFunctionDeclaration;
	}
	const variableDeclarator = getConstVariableDeclarator(definition);
	if (variableDeclarator?.init === null || variableDeclarator?.init === undefined) {
		return undefined;
	}
	return resolveAsyncFunctionFromExpression(variableDeclarator.init, variable, visitedVariableNames);
}

function resolveAsyncFunctionFromVariable(
	variable: Readonly<TSESLint.Scope.Variable>,
	visitedVariableNames: ReadonlySet<string>
): AsyncFunctionNode | undefined {
	return variable.defs
		.map((definition) => {
			return resolveAsyncFunctionFromDefinition(definition, variable, visitedVariableNames);
		})
		.find((asyncFunctionNode) => {
			return asyncFunctionNode !== undefined;
		});
}

function resolveAsyncFunctionArgument(
	firstArgument: Readonly<TSESTree.Expression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- ESLint scope helpers require the mutable Scope shape
	scope: TSESLint.Scope.Scope
): AsyncFunctionNode | undefined {
	const resolvedFirstArgument = unwrapTransparentExpression(firstArgument);
	if (isAsyncFunctionNode(resolvedFirstArgument)) {
		return resolvedFirstArgument;
	}
	if (resolvedFirstArgument.type !== AST_NODE_TYPES.Identifier) {
		return undefined;
	}
	const variable = ASTUtils.findVariable(scope, resolvedFirstArgument.name) ?? undefined;
	if (variable === undefined) {
		return undefined;
	}
	return resolveAsyncFunctionFromVariable(variable, new Set([resolvedFirstArgument.name]));
}

function reportAsyncFunctionArgument(
	context: Readonly<TSESLint.RuleContext<"no-async-function-in-sync-assertion", readonly []>>,
	methodName: string,
	asyncFunctionArgument: AsyncFunctionNode
): void {
	context.report({
		messageId: "no-async-function-in-sync-assertion",
		node: asyncFunctionArgument,
		data: {
			methodName,
			asyncMethodName: asynchronousReplacementMethodNames[methodName]
		}
	});
}

type ReportableAsyncAssertion = {
	readonly asyncFunctionArgument: AsyncFunctionNode;
	readonly methodName: string;
};

function getReportableAsyncAssertion(
	tracker: ReturnType<typeof createAssertBindingTracker<null>>,
	sourceCode: Readonly<TSESLint.SourceCode>,
	node: Readonly<TSESTree.CallExpression>
): ReportableAsyncAssertion | undefined {
	const scope = sourceCode.getScope(node);
	const resolvedMethodCall = tracker.resolveMethodCall(node.callee, scope);
	if (resolvedMethodCall === undefined) {
		return undefined;
	}
	const firstArgument = getFirstArgument(node.arguments);
	if (firstArgument === undefined) {
		return undefined;
	}
	const asyncFunctionArgument = resolveAsyncFunctionArgument(firstArgument, scope);
	return asyncFunctionArgument === undefined
		? undefined
		: { methodName: resolvedMethodCall.methodName, asyncFunctionArgument };
}

function checkSyncAssertionCall(
	context: Readonly<TSESLint.RuleContext<"no-async-function-in-sync-assertion", readonly []>>,
	tracker: ReturnType<typeof createAssertBindingTracker<null>>,
	sourceCode: Readonly<TSESLint.SourceCode>,
	node: Readonly<TSESTree.CallExpression>
): void {
	const reportableAsyncAssertion = getReportableAsyncAssertion(tracker, sourceCode, node);
	if (reportableAsyncAssertion === undefined) {
		return;
	}
	reportAsyncFunctionArgument(
		context,
		reportableAsyncAssertion.methodName,
		reportableAsyncAssertion.asyncFunctionArgument
	);
}

export const noAsyncFunctionInSyncAssertionRule = createRule({
	name: "no-async-function-in-sync-assertion",
	meta: {
		docs: {
			description: "Disallow passing async functions to synchronous Node.js assert methods"
		},
		messages: {
			"no-async-function-in-sync-assertion":
				"`assert.{{methodName}}()` does not await async functions. Use `assert.{{asyncMethodName}}()` instead"
		},
		type: "problem",
		schema: []
	},
	defaultOptions: [],

	create(context) {
		const tracker = createAssertBindingTracker<null>({
			isAssertMethod: isTrackedAssertionMethodName,
			classifyModule(specifier) {
				return isAssertModuleSpecifier(specifier) ? null : NOT_ASSERT_MODULE;
			},
			resolveNamespaceProperty: resolveStrictReExport
		});
		const { sourceCode } = context;

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				checkSyncAssertionCall(context, tracker, sourceCode, node);
			}
		};
	}
});
