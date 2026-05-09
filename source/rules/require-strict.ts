/* eslint-disable complexity, max-statements -- binding resolution requires explicit guarded branches */
import { AST_NODE_TYPES, ASTUtils, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

type AssertMode = "explicit" | "semantic";
type RequireStrictOptions = readonly [
	{
		readonly mode?: AssertMode;
	}
];

type AssertionMethodCall = {
	readonly methodName: string;
	readonly fromStrictBinding: boolean;
};

type BindingState = {
	readonly namespaceStrictnessByName: Map<string, boolean>;
	readonly methodBindingByName: Map<string, AssertionMethodCall>;
};

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const LEGACY_TO_STRICT_METHOD_NAME = new Map<string, string>([
	["equal", "strictEqual"],
	["notEqual", "notStrictEqual"],
	["deepEqual", "deepStrictEqual"],
	["notDeepEqual", "notDeepStrictEqual"]
]);

const STRICT_METHOD_NAMES: ReadonlySet<string> = new Set([
	"strictEqual",
	"notStrictEqual",
	"deepStrictEqual",
	"notDeepStrictEqual"
]);

const STRICT_MODULE_SPECIFIERS: ReadonlySet<string> = new Set(["node:assert/strict", "assert/strict"]);
const BASE_MODULE_SPECIFIERS: ReadonlySet<string> = new Set(["node:assert", "assert"]);

function isStrictModuleSpecifier(moduleSpecifier: unknown): moduleSpecifier is string {
	return typeof moduleSpecifier === "string" && STRICT_MODULE_SPECIFIERS.has(moduleSpecifier);
}

function isBaseModuleSpecifier(moduleSpecifier: unknown): moduleSpecifier is string {
	return typeof moduleSpecifier === "string" && BASE_MODULE_SPECIFIERS.has(moduleSpecifier);
}

function getMethodImportName(specifier: Readonly<TSESTree.ImportSpecifier>): string | undefined {
	if (specifier.imported.type !== AST_NODE_TYPES.Identifier) {
		return undefined;
	}
	if (specifier.imported.name === "strict") {
		return undefined;
	}
	if (LEGACY_TO_STRICT_METHOD_NAME.has(specifier.imported.name) || STRICT_METHOD_NAMES.has(specifier.imported.name)) {
		return specifier.imported.name;
	}
	return undefined;
}

function processImportDeclaration(state: BindingState, node: Readonly<TSESTree.ImportDeclaration>): void {
	const moduleSpecifier = node.source.value;
	if (!isStrictModuleSpecifier(moduleSpecifier) && !isBaseModuleSpecifier(moduleSpecifier)) {
		return;
	}

	const importedFromStrictModule = isStrictModuleSpecifier(moduleSpecifier);
	for (const specifier of node.specifiers) {
		if (
			specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
			specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier
		) {
			state.namespaceStrictnessByName.set(specifier.local.name, importedFromStrictModule);
		} else if (specifier.imported.type === AST_NODE_TYPES.Identifier && specifier.imported.name === "strict") {
			state.namespaceStrictnessByName.set(specifier.local.name, true);
		} else {
			const methodName = getMethodImportName(specifier);
			if (methodName !== undefined) {
				state.methodBindingByName.set(specifier.local.name, {
					methodName,
					fromStrictBinding: importedFromStrictModule || STRICT_METHOD_NAMES.has(methodName)
				});
			}
		}
	}
}

function processVariableDeclaration(state: BindingState, node: Readonly<TSESTree.VariableDeclaration>): void {
	if (node.kind !== "const") {
		return;
	}
	for (const declarator of node.declarations) {
		if (declarator.id.type === AST_NODE_TYPES.Identifier && declarator.init?.type === AST_NODE_TYPES.Identifier) {
			const sourceIdentifierName = declarator.init.name;
			const strictNamespaceBinding = state.namespaceStrictnessByName.get(sourceIdentifierName);
			if (strictNamespaceBinding === undefined) {
				const methodBinding = state.methodBindingByName.get(sourceIdentifierName);
				if (methodBinding !== undefined) {
					state.methodBindingByName.set(declarator.id.name, methodBinding);
				}
			} else {
				state.namespaceStrictnessByName.set(declarator.id.name, strictNamespaceBinding);
			}
		}
	}
}

function resolveCall(
	state: BindingState,
	callee: Readonly<TSESTree.Expression>,
	// eslint-disable-next-line functional/prefer-immutable-types -- required by ESLint scope utilities
	scope: TSESLint.Scope.Scope
): AssertionMethodCall | undefined {
	if (callee.type === AST_NODE_TYPES.Identifier) {
		return state.methodBindingByName.get(callee.name);
	}
	if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.object.type !== AST_NODE_TYPES.Identifier) {
		return undefined;
	}
	const strictness = state.namespaceStrictnessByName.get(callee.object.name);
	if (strictness === undefined) {
		return undefined;
	}
	const propertyName = ASTUtils.getPropertyName(callee, scope);
	if (propertyName === null) {
		return undefined;
	}
	if (!LEGACY_TO_STRICT_METHOD_NAME.has(propertyName) && !STRICT_METHOD_NAMES.has(propertyName)) {
		return undefined;
	}
	return { methodName: propertyName, fromStrictBinding: strictness || STRICT_METHOD_NAMES.has(propertyName) };
}

export const requireStrictRule = createRule<RequireStrictOptions, "require-strict">({
	name: "require-strict",
	meta: {
		docs: {
			description: "Require strict assertion semantics for Node.js assert equality methods"
		},
		messages: {
			"require-strict": "Use '{{strictMethodName}}' instead of '{{legacyMethodName}}'"
		},
		type: "suggestion",
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					mode: {
						type: "string",
						enum: ["semantic", "explicit"]
					}
				},
				additionalProperties: false
			}
		]
	},
	defaultOptions: [{ mode: "semantic" }],
	create(context, options) {
		const mode = options[0].mode ?? "semantic";
		const state: BindingState = {
			namespaceStrictnessByName: new Map<string, boolean>(),
			methodBindingByName: new Map<string, AssertionMethodCall>()
		};
		const { sourceCode } = context;

		return {
			ImportDeclaration(node) {
				processImportDeclaration(state, node);
			},
			VariableDeclaration(node) {
				processVariableDeclaration(state, node);
			},
			CallExpression(node) {
				const assertionMethodCall = resolveCall(state, node.callee, sourceCode.getScope(node));
				if (assertionMethodCall === undefined) {
					return;
				}
				const strictMethodName = LEGACY_TO_STRICT_METHOD_NAME.get(assertionMethodCall.methodName);
				if (strictMethodName === undefined) {
					return;
				}
				const shouldReport = mode === "explicit" ? true : !assertionMethodCall.fromStrictBinding;
				if (!shouldReport) {
					return;
				}

				context.report({
					messageId: "require-strict",
					node,
					data: {
						legacyMethodName: assertionMethodCall.methodName,
						strictMethodName
					},
					fix(fixer) {
						if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
							const { property } = node.callee;
							if (property.type === AST_NODE_TYPES.Identifier) {
								return fixer.replaceText(property, strictMethodName);
							}
							if (property.type === AST_NODE_TYPES.Literal && typeof property.value === "string") {
								return fixer.replaceText(property, `'${strictMethodName}'`);
							}
							if (property.type === AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
								return fixer.replaceText(property, `\`${strictMethodName}\``);
							}
							return null;
						}
						return null;
					}
				});
			}
		};
	}
});
/* eslint-enable complexity, max-statements -- re-enable for the rest of the codebase */
