import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";

type AssertMode = "explicit" | "semantic";
type RequireStrictOptions = readonly [
	{
		readonly mode?: AssertMode;
	}
];

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

function isAssertMethodName(name: string): boolean {
	return LEGACY_TO_STRICT_METHOD_NAME.has(name) || STRICT_METHOD_NAMES.has(name);
}

// eslint-disable-next-line sonarjs/function-return-type -- the sentinel signals "not an assert module" and is intentionally distinct from the boolean strictness meta
function classifyModule(moduleSpecifier: unknown): boolean | typeof NOT_ASSERT_MODULE {
	if (typeof moduleSpecifier !== "string") {
		return NOT_ASSERT_MODULE;
	}
	if (STRICT_MODULE_SPECIFIERS.has(moduleSpecifier)) {
		return true;
	}
	if (BASE_MODULE_SPECIFIERS.has(moduleSpecifier)) {
		return false;
	}
	return NOT_ASSERT_MODULE;
}

function resolveStrictReExport(propertyName: string): boolean | undefined {
	if (propertyName === "strict") {
		return true;
	}
	return undefined;
}

/* eslint-disable complexity -- explicit guarded branches per autofix shape make this clearer than splitting */
function buildPropertyReplacementFix(
	callee: Readonly<TSESTree.MemberExpression>,
	strictMethodName: string
): TSESLint.ReportFixFunction | null {
	const { property } = callee;
	if (property.type === AST_NODE_TYPES.Identifier && !callee.computed) {
		return (fixer) => {
			return fixer.replaceText(property, strictMethodName);
		};
	}
	if (property.type === AST_NODE_TYPES.Literal && typeof property.value === "string") {
		return (fixer) => {
			return fixer.replaceText(property, `'${strictMethodName}'`);
		};
	}
	if (property.type === AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
		return (fixer) => {
			return fixer.replaceText(property, `\`${strictMethodName}\``);
		};
	}
	return null;
}
/* eslint-enable complexity -- re-enable for the rest of the file */

function buildFix(callee: Readonly<TSESTree.Expression>, strictMethodName: string): TSESLint.ReportFixFunction | null {
	if (callee.type !== AST_NODE_TYPES.MemberExpression) {
		return null;
	}
	return buildPropertyReplacementFix(callee, strictMethodName);
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
		const tracker = createAssertBindingTracker<boolean>({
			isAssertMethod: isAssertMethodName,
			classifyModule,
			resolveNamespaceProperty: resolveStrictReExport
		});
		const { sourceCode } = context;

		function reportLegacyCall(
			node: Readonly<TSESTree.CallExpression>,
			legacyMethodName: string,
			strictMethodName: string
		): void {
			context.report({
				messageId: "require-strict",
				node,
				data: { legacyMethodName, strictMethodName },
				fix: buildFix(node.callee, strictMethodName)
			});
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const resolved = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
				if (resolved === undefined) {
					return;
				}
				const strictMethodName = LEGACY_TO_STRICT_METHOD_NAME.get(resolved.methodName);
				if (strictMethodName === undefined) {
					return;
				}
				const shouldReport = mode === "explicit" || !resolved.meta;
				if (!shouldReport) {
					return;
				}
				reportLegacyCall(node, resolved.methodName, strictMethodName);
			}
		};
	}
});
