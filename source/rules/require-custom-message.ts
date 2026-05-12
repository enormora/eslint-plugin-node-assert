import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const OK_STYLE_MESSAGE_INDEX = 1;
const COMPARISON_MESSAGE_INDEX = 2;

const MESSAGE_SLOT_BY_METHOD: ReadonlyMap<string, number> = new Map([
	["ok", OK_STYLE_MESSAGE_INDEX],
	["equal", COMPARISON_MESSAGE_INDEX],
	["notEqual", COMPARISON_MESSAGE_INDEX],
	["strictEqual", COMPARISON_MESSAGE_INDEX],
	["notStrictEqual", COMPARISON_MESSAGE_INDEX],
	["deepEqual", COMPARISON_MESSAGE_INDEX],
	["notDeepEqual", COMPARISON_MESSAGE_INDEX],
	["deepStrictEqual", COMPARISON_MESSAGE_INDEX],
	["notDeepStrictEqual", COMPARISON_MESSAGE_INDEX],
	["partialDeepStrictEqual", COMPARISON_MESSAGE_INDEX],
	["match", COMPARISON_MESSAGE_INDEX],
	["doesNotMatch", COMPARISON_MESSAGE_INDEX],
	["throws", COMPARISON_MESSAGE_INDEX],
	["doesNotThrow", COMPARISON_MESSAGE_INDEX],
	["rejects", COMPARISON_MESSAGE_INDEX],
	["doesNotReject", COMPARISON_MESSAGE_INDEX]
]);

type MessageSlotStatus = "filled" | "missing" | "unknown";

function isAssertMethodName(name: string): boolean {
	return MESSAGE_SLOT_BY_METHOD.has(name);
}

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function classifyMessageSlot(args: readonly TSESTree.CallExpressionArgument[], slotIndex: number): MessageSlotStatus {
	const argumentsUpToSlot = args.slice(0, slotIndex + 1);
	const hasSpreadBeforeOrAtSlot = argumentsUpToSlot.some((argumentNode) => {
		return argumentNode.type === AST_NODE_TYPES.SpreadElement;
	});
	if (hasSpreadBeforeOrAtSlot) {
		return "unknown";
	}
	return args.length > slotIndex ? "filled" : "missing";
}

export const requireCustomMessageRule = createRule({
	name: "require-custom-message",
	meta: {
		docs: {
			description: "Require a custom failure message argument in Node.js assert calls"
		},
		messages: {
			"require-custom-message": "Provide a custom failure message as the last argument to '{{methodName}}'"
		},
		type: "suggestion",
		schema: []
	},
	defaultOptions: [],

	create(context) {
		const tracker = createAssertBindingTracker<null>({
			isAssertMethod: isAssertMethodName,
			classifyModule(specifier) {
				return isAssertModuleSpecifier(specifier) ? null : NOT_ASSERT_MODULE;
			},
			resolveNamespaceProperty: resolveStrictReExport,
			namespaceCallableMethod: "ok"
		});
		const { sourceCode } = context;

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			CallExpression(node) {
				const resolved = tracker.resolveMethodCall(node.callee, sourceCode.getScope(node));
				if (resolved === undefined) {
					return;
				}
				const slotIndex = MESSAGE_SLOT_BY_METHOD.get(resolved.methodName);
				if (slotIndex === undefined) {
					return;
				}
				if (classifyMessageSlot(node.arguments, slotIndex) !== "missing") {
					return;
				}
				context.report({
					messageId: "require-custom-message",
					node,
					data: { methodName: resolved.methodName }
				});
			}
		};
	}
});
