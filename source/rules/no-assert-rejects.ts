import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";

function ruleDocumentationUrl(name: string): string {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
}

const createRule = ESLintUtils.RuleCreator(ruleDocumentationUrl);

function isAssertRejectsCall(node: Readonly<TSESTree.CallExpression>): boolean {
	if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
		return false;
	}

	const memberExpressionNode = node.callee;

	if (memberExpressionNode.property.type === AST_NODE_TYPES.Identifier) {
		return memberExpressionNode.property.name === "rejects";
	}

	if (memberExpressionNode.property.type === AST_NODE_TYPES.Literal) {
		return memberExpressionNode.property.value === "rejects";
	}

	return false;
}

export const noAssertRejectsRule = createRule({
	name: "no-assert-rejects",
	meta: {
		docs: {
			description: "Disallow the usage of 'assert.rejects'"
		},
		messages: {
			"no-assert-rejects": "Do not use 'assert.rejects'"
		},
		type: "suggestion",
		schema: []
	},
	defaultOptions: [],

	create(context) {
		const importedAssertModuleIdentifiers = new Set<string>();

		function isAssertModuleImport(importDeclarationNode: Readonly<TSESTree.ImportDeclaration>): boolean {
			return (
				importDeclarationNode.source.value === "node:assert" ||
				importDeclarationNode.source.value === "node:assert/strict"
			);
		}

		function isObjectImportedFromAssertModule(
			importSpecifierNode: Readonly<TSESTree.ImportClause>
		): importSpecifierNode is TSESTree.ImportDefaultSpecifier | TSESTree.ImportNamespaceSpecifier {
			return (
				importSpecifierNode.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
				importSpecifierNode.type === AST_NODE_TYPES.ImportNamespaceSpecifier
			);
		}

		return {
			ImportDeclaration(node) {
				if (!isAssertModuleImport(node)) {
					return;
				}

				for (const importSpecifier of node.specifiers) {
					if (isObjectImportedFromAssertModule(importSpecifier)) {
						importedAssertModuleIdentifiers.add(importSpecifier.local.name);
					}
				}
			},

			CallExpression(node) {
				if (!isAssertRejectsCall(node)) {
					return;
				}

				if (
					node.callee.type !== AST_NODE_TYPES.MemberExpression ||
					node.callee.object.type !== AST_NODE_TYPES.Identifier ||
					!importedAssertModuleIdentifiers.has(node.callee.object.name)
				) {
					return;
				}

				context.report({
					messageId: "no-assert-rejects",
					node
				});
			}
		};
	}
});
