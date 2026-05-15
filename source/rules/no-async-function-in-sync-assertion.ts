import { AST_NODE_TYPES, ASTUtils, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const asyncMethodNameBySyncMethodName: ReadonlyMap<string, string> = new Map([
	["throws", "rejects"],
	["doesNotThrow", "doesNotReject"]
]);

/* eslint-disable functional/type-declaration-immutability, @stylistic/indent-binary-ops, @stylistic/operator-linebreak -- concise union aliases for mutable AST node families */
type ResolvedAsyncFunction =
	| TSESTree.ArrowFunctionExpression
	| TSESTree.FunctionDeclaration
	| TSESTree.FunctionExpression;
type ResolvedAsyncBinding = ResolvedAsyncFunction | TSESTree.Expression;
/* eslint-enable functional/type-declaration-immutability, @stylistic/indent-binary-ops, @stylistic/operator-linebreak -- end union alias exemptions */

function isAssertMethodName(name: string): boolean {
	return asyncMethodNameBySyncMethodName.has(name);
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

function isAsyncFunctionNode(node: Readonly<TSESTree.Node>): node is ResolvedAsyncFunction {
	if (
		node.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
		node.type !== AST_NODE_TYPES.FunctionDeclaration &&
		node.type !== AST_NODE_TYPES.FunctionExpression
	) {
		return false;
	}
	return node.async;
}

function isConstVariableDeclarator(node: Readonly<TSESTree.Node>): node is TSESTree.VariableDeclarator & {
	readonly id: TSESTree.Identifier;
	readonly init: TSESTree.Expression;
	readonly parent: TSESTree.VariableDeclaration;
} {
	return (
		node.type === AST_NODE_TYPES.VariableDeclarator &&
		node.id.type === AST_NODE_TYPES.Identifier &&
		node.init !== null &&
		node.parent.kind === "const"
	);
}

/* eslint-disable functional/prefer-immutable-types -- helper signatures expose ESLint's mutable scope and AST node types */
function getAliasedInitializer(
	identifier: Readonly<TSESTree.Identifier>,
	scope: TSESLint.Scope.Scope
): ResolvedAsyncBinding | undefined {
	const variable = ASTUtils.findVariable(scope, identifier) ?? undefined;
	if (variable === undefined) {
		return undefined;
	}
	const definition = variable.defs[0];
	if (definition === undefined) {
		return undefined;
	}
	if (isAsyncFunctionNode(definition.node)) {
		return definition.node;
	}
	return isConstVariableDeclarator(definition.node) ? definition.node.init : undefined;
}

function resolveAsyncFunction(
	expression: Readonly<TSESTree.Expression | TSESTree.FunctionDeclaration>,
	scope: TSESLint.Scope.Scope,
	seenIdentifierNames: ReadonlySet<string> = new Set()
): ResolvedAsyncFunction | undefined {
	if (isAsyncFunctionNode(expression)) {
		return expression;
	}
	if (expression.type !== AST_NODE_TYPES.Identifier || seenIdentifierNames.has(expression.name)) {
		return undefined;
	}
	const aliasedInitializer = getAliasedInitializer(expression, scope);
	if (aliasedInitializer === undefined) {
		return undefined;
	}
	const nextSeenIdentifierNames = new Set(seenIdentifierNames);
	nextSeenIdentifierNames.add(expression.name);
	return resolveAsyncFunction(aliasedInitializer, scope, nextSeenIdentifierNames);
}
/* eslint-enable functional/prefer-immutable-types -- end helper signatures exposing ESLint mutable node types */

function getAsyncMethodName(syncMethodName: string): string | undefined {
	return asyncMethodNameBySyncMethodName.get(syncMethodName);
}

function getSyncAssertionArgument(
	node: Readonly<TSESTree.CallExpression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to binding and scope resolution helpers
	scope: TSESLint.Scope.Scope,
	resolveMethodCall: ReturnType<typeof createAssertBindingTracker<null>>["resolveMethodCall"]
): { readonly firstArgument: Readonly<TSESTree.Expression>; readonly methodName: string } | undefined {
	const resolved = resolveMethodCall(node.callee, scope);
	if (resolved === undefined) {
		return undefined;
	}
	const firstArgument = getFirstExpressionArgument(node.arguments);
	if (firstArgument === undefined || resolveAsyncFunction(firstArgument, scope) === undefined) {
		return undefined;
	}
	return { firstArgument, methodName: resolved.methodName };
}

export const noAsyncFunctionInSyncAssertionRule = createRule({
	name: "no-async-function-in-sync-assertion",
	meta: {
		docs: {
			description: "Disallow async functions in synchronous Node.js throw assertions"
		},
		messages: {
			"no-async-function-in-sync-assertion":
				"Use '{{asyncMethodName}}' instead of '{{syncMethodName}}' when asserting an async function"
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
			resolveNamespaceProperty: resolveStrictReExport
		});
		const { sourceCode } = context;

		function checkCallExpression(node: Readonly<TSESTree.CallExpression>): void {
			const scope = sourceCode.getScope(node);
			const syncAssertionArgument = getSyncAssertionArgument(node, scope, tracker.resolveMethodCall);
			if (syncAssertionArgument === undefined) {
				return;
			}
			const asyncMethodName = getAsyncMethodName(syncAssertionArgument.methodName);
			if (asyncMethodName === undefined) {
				return;
			}
			context.report({
				messageId: "no-async-function-in-sync-assertion",
				node: syncAssertionArgument.firstArgument,
				data: { asyncMethodName, syncMethodName: syncAssertionArgument.methodName }
			});
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression: checkCallExpression
		};
	}
});
