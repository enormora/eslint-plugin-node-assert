import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

type RestrictedAssertion = {
	readonly name: string;
	readonly message?: string;
};

type NoRestrictedAssertionOptions = readonly [
	{
		readonly assertions: readonly RestrictedAssertion[];
	}
];

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function createRestrictedAssertionByName(
	restrictedAssertions: readonly RestrictedAssertion[]
): ReadonlyMap<string, RestrictedAssertion> {
	return new Map(
		restrictedAssertions.map((restrictedAssertion) => {
			return [restrictedAssertion.name, restrictedAssertion];
		})
	);
}

function getCustomReportMessage(restrictedAssertion: RestrictedAssertion): string | undefined {
	return restrictedAssertion.message;
}

export const noRestrictedAssertionRule = createRule<
	NoRestrictedAssertionOptions,
	"custom-message" | "restricted-assertion"
>({
	name: "no-restricted-assertion",
	meta: {
		docs: {
			description: "Disallow configured Node.js assert methods"
		},
		messages: {
			"custom-message": "{{customMessage}}",
			"restricted-assertion": "Use of assert.{{methodName}}() is restricted."
		},
		type: "problem",
		schema: [
			{
				type: "object",
				properties: {
					assertions: {
						type: "array",
						items: {
							type: "object",
							properties: {
								name: {
									type: "string",
									minLength: 1
								},
								message: {
									type: "string",
									minLength: 1
								}
							},
							required: ["name"],
							additionalProperties: false
						},
						uniqueItems: true
					}
				},
				required: ["assertions"],
				additionalProperties: false
			}
		]
	},
	defaultOptions: [{ assertions: [] }],
	create(context, ruleOptions) {
		const restrictedAssertionByName = createRestrictedAssertionByName(ruleOptions[0].assertions);
		const tracker = createAssertBindingTracker<null>({
			isAssertMethod(methodName) {
				return restrictedAssertionByName.has(methodName);
			},
			classifyModule(moduleSpecifier) {
				return isAssertModuleSpecifier(moduleSpecifier) ? null : NOT_ASSERT_MODULE;
			},
			resolveNamespaceProperty: resolveStrictReExport,
			namespaceCallableMethod: "ok"
		});
		const { sourceCode } = context;

		function reportRestrictedAssertion(node: Readonly<TSESTree.CallExpression>, methodName: string): void {
			const restrictedAssertion = restrictedAssertionByName.get(methodName);
			if (restrictedAssertion === undefined) {
				return;
			}
			const customMessage = getCustomReportMessage(restrictedAssertion);
			if (customMessage !== undefined) {
				context.report({
					messageId: "custom-message",
					data: { customMessage },
					node
				});
				return;
			}
			context.report({
				messageId: "restricted-assertion",
				node,
				data: { methodName }
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
				reportRestrictedAssertion(node, resolved.methodName);
			}
		};
	}
});
