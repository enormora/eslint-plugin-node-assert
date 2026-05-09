import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

export function isConstantString(node: Readonly<TSESTree.Node>): boolean {
	if (node.type === AST_NODE_TYPES.Literal) {
		return typeof node.value === "string";
	}
	if (node.type === AST_NODE_TYPES.TemplateLiteral) {
		return node.expressions.length === 0;
	}
	return false;
}
