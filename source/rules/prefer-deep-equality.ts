import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const SHALLOW_TO_DEEP_METHOD_NAME = new Map<string, string>([
	["strictEqual", "deepStrictEqual"],
	["equal", "deepEqual"]
]);

const TWO_ARGUMENTS = 2;

type EqualityArguments = {
	readonly actualArg: TSESTree.Expression;
	readonly expectedArg: TSESTree.Expression;
};

function isAssertMethodName(name: string): boolean {
	return SHALLOW_TO_DEEP_METHOD_NAME.has(name);
}

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function getEqualityArguments(args: readonly TSESTree.CallExpressionArgument[]): EqualityArguments | undefined {
	if (args.length < TWO_ARGUMENTS) {
		return undefined;
	}
	const [actualArg, expectedArg] = args;
	if (actualArg === undefined || expectedArg === undefined) {
		return undefined;
	}
	if (actualArg.type === AST_NODE_TYPES.SpreadElement || expectedArg.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return { actualArg, expectedArg };
}

function isObjectOrArrayLiteral(node: Readonly<TSESTree.Node>): boolean {
	return node.type === AST_NODE_TYPES.ObjectExpression || node.type === AST_NODE_TYPES.ArrayExpression;
}

/* eslint-disable complexity -- explicit guarded branches per autofix shape make this clearer than splitting */
function buildPropertyReplacementFix(
	callee: Readonly<TSESTree.MemberExpression>,
	deepMethodName: string
): TSESLint.ReportFixFunction | null {
	const { property } = callee;
	if (property.type === AST_NODE_TYPES.Identifier && !callee.computed) {
		return (fixer) => {
			return fixer.replaceText(property, deepMethodName);
		};
	}
	if (property.type === AST_NODE_TYPES.Literal && typeof property.value === "string") {
		return (fixer) => {
			return fixer.replaceText(property, `'${deepMethodName}'`);
		};
	}
	if (property.type === AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
		return (fixer) => {
			return fixer.replaceText(property, `\`${deepMethodName}\``);
		};
	}
	return null;
}
/* eslint-enable complexity -- re-enable for the rest of the file */

function buildFix(callee: Readonly<TSESTree.Expression>, deepMethodName: string): TSESLint.ReportFixFunction | null {
	if (callee.type !== AST_NODE_TYPES.MemberExpression) {
		return null;
	}
	return buildPropertyReplacementFix(callee, deepMethodName);
}

export const preferDeepEqualityRule = createRule({
	name: "prefer-deep-equality",
	meta: {
		docs: {
			description: "Prefer deep equality assertions when comparing object or array literals"
		},
		messages: {
			"prefer-deep-equality":
				"Use '{{deepMethodName}}' instead of '{{shallowMethodName}}' when comparing object or array literals"
		},
		type: "problem",
		fixable: "code",
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

		function reportShallowEquality(
			node: Readonly<TSESTree.CallExpression>,
			shallowMethodName: string,
			deepMethodName: string
		): void {
			context.report({
				messageId: "prefer-deep-equality",
				node,
				data: { shallowMethodName, deepMethodName },
				fix: buildFix(node.callee, deepMethodName)
			});
		}

		function comparesObjectOrArrayLiteral(node: Readonly<TSESTree.CallExpression>): boolean {
			const equality = getEqualityArguments(node.arguments);
			if (equality === undefined) {
				return false;
			}
			return isObjectOrArrayLiteral(equality.actualArg) || isObjectOrArrayLiteral(equality.expectedArg);
		}

		function handleCall(node: Readonly<TSESTree.CallExpression>): void {
			const resolved = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
			if (resolved === undefined) {
				return;
			}
			const deepMethodName = SHALLOW_TO_DEEP_METHOD_NAME.get(resolved.methodName);
			if (deepMethodName === undefined) {
				return;
			}
			if (!comparesObjectOrArrayLiteral(node)) {
				return;
			}
			reportShallowEquality(node, resolved.methodName, deepMethodName);
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression: handleCall
		};
	}
});
