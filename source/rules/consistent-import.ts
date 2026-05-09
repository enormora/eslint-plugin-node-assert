/* eslint-disable complexity -- this rule performs explicit style branching for readability */
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

type ConsistentImportStyle = "base" | "strict-export" | "strict-module";
type ConsistentImportOptions = readonly [
	{
		readonly style?: ConsistentImportStyle;
	}
];

const BASE_MODULE_SPECIFIERS: ReadonlySet<string> = new Set(["node:assert", "assert"]);
const STRICT_MODULE_SPECIFIERS: ReadonlySet<string> = new Set(["node:assert/strict", "assert/strict"]);

function includesStrictNamedImport(specifiers: readonly TSESTree.ImportClause[]): boolean {
	return specifiers.some((specifier) => {
		if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) {
			return false;
		}
		return specifier.imported.type === AST_NODE_TYPES.Identifier && specifier.imported.name === "strict";
	});
}

function isBaseModuleSpecifier(moduleSpecifier: unknown): moduleSpecifier is string {
	return typeof moduleSpecifier === "string" && BASE_MODULE_SPECIFIERS.has(moduleSpecifier);
}

function isStrictModuleSpecifier(moduleSpecifier: unknown): moduleSpecifier is string {
	return typeof moduleSpecifier === "string" && STRICT_MODULE_SPECIFIERS.has(moduleSpecifier);
}

export const consistentImportRule = createRule<ConsistentImportOptions, "consistent-import">({
	name: "consistent-import",
	meta: {
		docs: {
			description: "Enforce a consistent Node.js assert import style"
		},
		messages: {
			"consistent-import": "Use the configured assert import style"
		},
		type: "suggestion",
		schema: [
			{
				type: "object",
				properties: {
					style: {
						type: "string",
						enum: ["base", "strict-module", "strict-export"]
					}
				},
				additionalProperties: false
			}
		]
	},
	defaultOptions: [{ style: "strict-module" }],

	create(context, options) {
		const configuredStyle = options[0].style ?? "strict-module";
		function isInvalidImport(node: Readonly<TSESTree.ImportDeclaration>): boolean {
			const moduleSpecifier = node.source.value;
			if (!isBaseModuleSpecifier(moduleSpecifier) && !isStrictModuleSpecifier(moduleSpecifier)) {
				return false;
			}
			if (configuredStyle === "base") {
				return !isBaseModuleSpecifier(moduleSpecifier) || includesStrictNamedImport(node.specifiers);
			}
			if (configuredStyle === "strict-module") {
				return !isStrictModuleSpecifier(moduleSpecifier);
			}
			return !isBaseModuleSpecifier(moduleSpecifier) || !includesStrictNamedImport(node.specifiers);
		}

		return {
			ImportDeclaration(node) {
				if (isInvalidImport(node)) {
					context.report({ messageId: "consistent-import", node });
				}
			}
		};
	}
});
/* eslint-enable complexity -- re-enable for the rest of the codebase */
