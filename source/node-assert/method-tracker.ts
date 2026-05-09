import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { isAssertModuleSpecifier } from "./modules.js";

export type AssertBindingTrackerOptions = {
	readonly isAssertMethod: (name: string) => boolean;
};

export type AssertBindingTracker = {
	readonly processImport: (node: Readonly<TSESTree.ImportDeclaration>) => void;
	readonly processVariableDeclaration: (node: Readonly<TSESTree.VariableDeclaration>) => void;
	readonly resolveMethodCall: (
		callee: Readonly<TSESTree.Expression>,
		// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to ESLint scope helpers that require the mutable Scope shape
		scope: TSESLint.Scope.Scope
	) => string | undefined;
};

type TrackerState = {
	readonly namespaces: Set<string>;
	readonly methodBindings: Map<string, string>;
	readonly isAssertMethod: (name: string) => boolean;
};

function getDestructuredMethod(
	property: Readonly<TSESTree.ObjectLiteralElement | TSESTree.RestElement>,
	isAssertMethod: (name: string) => boolean
): { readonly localName: string; readonly methodName: string } | undefined {
	if (property.type !== AST_NODE_TYPES.Property || property.computed) {
		return undefined;
	}
	if (property.key.type !== AST_NODE_TYPES.Identifier || !isAssertMethod(property.key.name)) {
		return undefined;
	}
	if (property.value.type !== AST_NODE_TYPES.Identifier) {
		return undefined;
	}
	return { localName: property.value.name, methodName: property.key.name };
}

function addDestructured(state: TrackerState, pattern: Readonly<TSESTree.ObjectPattern>): void {
	for (const property of pattern.properties) {
		const destructured = getDestructuredMethod(property, state.isAssertMethod);
		if (destructured !== undefined) {
			state.methodBindings.set(destructured.localName, destructured.methodName);
		}
	}
}

function addImportSpecifier(state: TrackerState, specifier: Readonly<TSESTree.ImportClause>): void {
	if (
		specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
		specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier
	) {
		state.namespaces.add(specifier.local.name);
		return;
	}
	if (specifier.imported.type !== AST_NODE_TYPES.Identifier) {
		return;
	}
	if (state.isAssertMethod(specifier.imported.name)) {
		state.methodBindings.set(specifier.local.name, specifier.imported.name);
	}
}

function addFromNamespace(state: TrackerState, id: Readonly<TSESTree.Node>): void {
	if (id.type === AST_NODE_TYPES.Identifier) {
		state.namespaces.add(id.name);
		return;
	}
	if (id.type === AST_NODE_TYPES.ObjectPattern) {
		addDestructured(state, id);
	}
}

function addDeclarator(state: TrackerState, declarator: Readonly<TSESTree.VariableDeclarator>): void {
	if (declarator.init?.type !== AST_NODE_TYPES.Identifier) {
		return;
	}
	const sourceName = declarator.init.name;
	if (state.namespaces.has(sourceName)) {
		addFromNamespace(state, declarator.id);
		return;
	}
	const aliased = state.methodBindings.get(sourceName);
	if (aliased !== undefined && declarator.id.type === AST_NODE_TYPES.Identifier) {
		state.methodBindings.set(declarator.id.name, aliased);
	}
}

function resolveMemberMethod(
	state: TrackerState,
	callee: Readonly<TSESTree.MemberExpression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- ESLint's getPropertyName needs the mutable Scope shape
	scope: TSESLint.Scope.Scope
): string | undefined {
	if (callee.object.type !== AST_NODE_TYPES.Identifier || !state.namespaces.has(callee.object.name)) {
		return undefined;
	}
	const propertyName = ASTUtils.getPropertyName(callee, scope);
	if (propertyName === null || !state.isAssertMethod(propertyName)) {
		return undefined;
	}
	return propertyName;
}

export function createAssertBindingTracker(options: AssertBindingTrackerOptions): AssertBindingTracker {
	const state: TrackerState = {
		namespaces: new Set<string>(),
		methodBindings: new Map<string, string>(),
		isAssertMethod: options.isAssertMethod
	};

	function processImport(node: Readonly<TSESTree.ImportDeclaration>): void {
		if (!isAssertModuleSpecifier(node.source.value)) {
			return;
		}
		for (const specifier of node.specifiers) {
			addImportSpecifier(state, specifier);
		}
	}

	function processVariableDeclaration(node: Readonly<TSESTree.VariableDeclaration>): void {
		if (node.kind !== "const") {
			return;
		}
		for (const declarator of node.declarations) {
			addDeclarator(state, declarator);
		}
	}

	function resolveMethodCall(
		callee: Readonly<TSESTree.Expression>,
		// eslint-disable-next-line functional/prefer-immutable-types -- forwarded to ESLint scope helpers
		scope: TSESLint.Scope.Scope
	): string | undefined {
		if (callee.type === AST_NODE_TYPES.MemberExpression) {
			return resolveMemberMethod(state, callee, scope);
		}
		if (callee.type === AST_NODE_TYPES.Identifier) {
			return state.methodBindings.get(callee.name);
		}
		return undefined;
	}

	return { processImport, processVariableDeclaration, resolveMethodCall };
}
