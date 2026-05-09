import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

export const NOT_ASSERT_MODULE: unique symbol = Symbol("not-assert-module");
export type NotAssertModule = typeof NOT_ASSERT_MODULE;

export type AssertBindingTrackerOptions<TMeta> = {
	readonly isAssertMethod: (methodName: string) => boolean;
	readonly classifyModule: (moduleSpecifier: unknown) => NotAssertModule | TMeta;
	readonly resolveNamespaceProperty?: (propertyName: string, sourceMeta: TMeta) => TMeta | undefined;
	readonly namespaceCallableMethod?: string;
};

export type ResolvedMethodCall<TMeta> = {
	readonly methodName: string;
	readonly meta: TMeta;
};

export type AssertBindingTracker<TMeta> = {
	readonly processImport: (node: Readonly<TSESTree.ImportDeclaration>) => void;
	readonly processVariableDeclaration: (node: Readonly<TSESTree.VariableDeclaration>) => void;
	readonly resolveMethodCall: (
		callee: Readonly<TSESTree.Expression>,
		// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to ESLint scope helpers that require the mutable Scope shape
		scope: TSESLint.Scope.Scope
	) => ResolvedMethodCall<TMeta> | undefined;
};

type NamespaceBinding<TMeta> = { readonly meta: TMeta };
type MethodBinding<TMeta> = { readonly methodName: string; readonly meta: TMeta };

type TrackerState<TMeta> = {
	readonly namespaces: Map<string, NamespaceBinding<TMeta>>;
	readonly methodBindings: Map<string, MethodBinding<TMeta>>;
	readonly options: AssertBindingTrackerOptions<TMeta>;
};

function getDestructuredAssignment(
	property: Readonly<TSESTree.ObjectLiteralElement | TSESTree.RestElement>
): { readonly localName: string; readonly propertyName: string } | undefined {
	if (property.type !== AST_NODE_TYPES.Property || property.computed) {
		return undefined;
	}
	if (property.key.type !== AST_NODE_TYPES.Identifier || property.value.type !== AST_NODE_TYPES.Identifier) {
		return undefined;
	}
	return { localName: property.value.name, propertyName: property.key.name };
}

function applyKnownProperty<TMeta>(
	state: TrackerState<TMeta>,
	localName: string,
	propertyName: string,
	sourceMeta: TMeta
): void {
	const reExportMeta = state.options.resolveNamespaceProperty?.(propertyName, sourceMeta);
	if (reExportMeta !== undefined) {
		state.namespaces.set(localName, { meta: reExportMeta });
		return;
	}
	if (state.options.isAssertMethod(propertyName)) {
		state.methodBindings.set(localName, { methodName: propertyName, meta: sourceMeta });
	}
}

function applyDestructuredProperty<TMeta>(
	state: TrackerState<TMeta>,
	property: Readonly<TSESTree.ObjectLiteralElement | TSESTree.RestElement>,
	sourceMeta: TMeta
): void {
	const assignment = getDestructuredAssignment(property);
	if (assignment === undefined) {
		return;
	}
	applyKnownProperty(state, assignment.localName, assignment.propertyName, sourceMeta);
}

function applyDestructured<TMeta>(
	state: TrackerState<TMeta>,
	pattern: Readonly<TSESTree.ObjectPattern>,
	sourceMeta: TMeta
): void {
	for (const property of pattern.properties) {
		applyDestructuredProperty(state, property, sourceMeta);
	}
}

function applyImportSpecifier<TMeta>(
	state: TrackerState<TMeta>,
	specifier: Readonly<TSESTree.ImportClause>,
	sourceMeta: TMeta
): void {
	if (
		specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
		specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier
	) {
		state.namespaces.set(specifier.local.name, { meta: sourceMeta });
		return;
	}
	if (specifier.imported.type !== AST_NODE_TYPES.Identifier) {
		return;
	}
	applyKnownProperty(state, specifier.local.name, specifier.imported.name, sourceMeta);
}

function applyAliasFromNamespace<TMeta>(
	state: TrackerState<TMeta>,
	id: Readonly<TSESTree.Node>,
	sourceMeta: TMeta
): void {
	if (id.type === AST_NODE_TYPES.Identifier) {
		state.namespaces.set(id.name, { meta: sourceMeta });
		return;
	}
	if (id.type === AST_NODE_TYPES.ObjectPattern) {
		applyDestructured(state, id, sourceMeta);
	}
}

function applyDeclarator<TMeta>(state: TrackerState<TMeta>, declarator: Readonly<TSESTree.VariableDeclarator>): void {
	if (declarator.init?.type !== AST_NODE_TYPES.Identifier) {
		return;
	}
	const sourceName = declarator.init.name;
	const sourceNamespace = state.namespaces.get(sourceName);
	if (sourceNamespace !== undefined) {
		applyAliasFromNamespace(state, declarator.id, sourceNamespace.meta);
		return;
	}
	const aliasedMethod = state.methodBindings.get(sourceName);
	if (aliasedMethod !== undefined && declarator.id.type === AST_NODE_TYPES.Identifier) {
		state.methodBindings.set(declarator.id.name, aliasedMethod);
	}
}

function resolveMemberMethod<TMeta>(
	state: TrackerState<TMeta>,
	callee: Readonly<TSESTree.MemberExpression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- ESLint's getPropertyName needs the mutable Scope shape
	scope: TSESLint.Scope.Scope
): ResolvedMethodCall<TMeta> | undefined {
	if (callee.object.type !== AST_NODE_TYPES.Identifier) {
		return undefined;
	}
	const namespace = state.namespaces.get(callee.object.name);
	if (namespace === undefined) {
		return undefined;
	}
	const propertyName = ASTUtils.getPropertyName(callee, scope);
	if (propertyName === null || !state.options.isAssertMethod(propertyName)) {
		return undefined;
	}
	return { methodName: propertyName, meta: namespace.meta };
}

function resolveIdentifierCallee<TMeta>(
	state: TrackerState<TMeta>,
	name: string
): ResolvedMethodCall<TMeta> | undefined {
	const methodBinding = state.methodBindings.get(name);
	if (methodBinding !== undefined) {
		return methodBinding;
	}
	const callableMethodName = state.options.namespaceCallableMethod;
	if (callableMethodName === undefined) {
		return undefined;
	}
	const namespace = state.namespaces.get(name);
	if (namespace === undefined) {
		return undefined;
	}
	return { methodName: callableMethodName, meta: namespace.meta };
}

export function createAssertBindingTracker<TMeta>(
	options: AssertBindingTrackerOptions<TMeta>
): AssertBindingTracker<TMeta> {
	const state: TrackerState<TMeta> = {
		namespaces: new Map(),
		methodBindings: new Map(),
		options
	};

	function processImport(node: Readonly<TSESTree.ImportDeclaration>): void {
		const classification = options.classifyModule(node.source.value);
		if (classification === NOT_ASSERT_MODULE) {
			return;
		}
		for (const specifier of node.specifiers) {
			applyImportSpecifier(state, specifier, classification);
		}
	}

	function processVariableDeclaration(node: Readonly<TSESTree.VariableDeclaration>): void {
		if (node.kind !== "const") {
			return;
		}
		for (const declarator of node.declarations) {
			applyDeclarator(state, declarator);
		}
	}

	function resolveMethodCall(
		callee: Readonly<TSESTree.Expression>,
		// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to ESLint scope helpers
		scope: TSESLint.Scope.Scope
	): ResolvedMethodCall<TMeta> | undefined {
		if (callee.type === AST_NODE_TYPES.MemberExpression) {
			return resolveMemberMethod(state, callee, scope);
		}
		if (callee.type === AST_NODE_TYPES.Identifier) {
			return resolveIdentifierCallee(state, callee.name);
		}
		return undefined;
	}

	return { processImport, processVariableDeclaration, resolveMethodCall };
}
