import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

const CONSTANT_GLOBALS: ReadonlySet<string> = new Set(["undefined", "NaN", "Infinity"]);

function isConstantLiteralLike(node: Readonly<TSESTree.Node>): boolean {
	if (node.type === AST_NODE_TYPES.Literal) {
		return true;
	}
	if (node.type === AST_NODE_TYPES.TemplateLiteral) {
		return node.expressions.length === 0;
	}
	if (node.type === AST_NODE_TYPES.Identifier) {
		return CONSTANT_GLOBALS.has(node.name);
	}
	return false;
}

export function isConstant(node: Readonly<TSESTree.Node>): boolean {
	if (isConstantLiteralLike(node)) {
		return true;
	}
	if (node.type === AST_NODE_TYPES.UnaryExpression) {
		return isConstant(node.argument);
	}
	if (node.type === AST_NODE_TYPES.ArrayExpression) {
		return node.elements.every((element) => {
			return element !== null && element.type !== AST_NODE_TYPES.SpreadElement && isConstant(element);
		});
	}
	if (node.type === AST_NODE_TYPES.ObjectExpression) {
		return node.properties.every((property) => {
			return property.type === AST_NODE_TYPES.Property && !property.computed && isConstant(property.value);
		});
	}
	return false;
}
