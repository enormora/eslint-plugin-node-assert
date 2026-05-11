import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const ELIGIBLE_METHODS: ReadonlySet<string> = new Set(["strictEqual", "deepStrictEqual"]);

const ARGS_WITHOUT_MESSAGE = 2;
const MIN_RUN_LENGTH = 2;

type RunCandidate = {
	readonly rootName: string;
	readonly call: Readonly<TSESTree.CallExpression>;
};

function isAssertMethodName(name: string): boolean {
	return ELIGIBLE_METHODS.has(name);
}

function resolveStrictReExport(propertyName: string): null | undefined {
	return propertyName === "strict" ? null : undefined;
}

function getMemberRoot(expression: Readonly<TSESTree.Expression>): Readonly<TSESTree.Identifier> | undefined {
	if (expression.type !== AST_NODE_TYPES.MemberExpression || expression.computed) {
		return undefined;
	}
	const { object } = expression;
	if (object.type === AST_NODE_TYPES.Identifier) {
		return object;
	}
	if (object.type === AST_NODE_TYPES.MemberExpression) {
		return getMemberRoot(object);
	}
	return undefined;
}

function getEligibleCallExpression(node: Readonly<TSESTree.Node>): Readonly<TSESTree.CallExpression> | undefined {
	if (node.type !== AST_NODE_TYPES.ExpressionStatement) {
		return undefined;
	}
	if (node.expression.type !== AST_NODE_TYPES.CallExpression) {
		return undefined;
	}
	return node.expression;
}

function isPlainMemberExpression(
	argument: Readonly<TSESTree.CallExpressionArgument>
): argument is Readonly<TSESTree.MemberExpression> {
	return argument.type === AST_NODE_TYPES.MemberExpression && !argument.computed;
}

function getActualMemberExpression(
	call: Readonly<TSESTree.CallExpression>
): Readonly<TSESTree.MemberExpression> | undefined {
	if (call.arguments.length !== ARGS_WITHOUT_MESSAGE) {
		return undefined;
	}
	const [actual, expected] = call.arguments;
	if (actual === undefined || expected === undefined) {
		return undefined;
	}
	if (expected.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return isPlainMemberExpression(actual) ? actual : undefined;
}

function shouldBreakRun(current: readonly RunCandidate[], candidate: RunCandidate | undefined): boolean {
	if (candidate === undefined) {
		return true;
	}
	const head = current[0];
	return head !== undefined && head.rootName !== candidate.rootName;
}

/* eslint-disable max-statements -- the grouping reducer reads more clearly as a single pass than artificially split */
function groupConsecutiveCandidates(
	candidates: readonly (RunCandidate | undefined)[]
): readonly (readonly RunCandidate[])[] {
	const groups: RunCandidate[][] = [];
	let current: RunCandidate[] = [];
	for (const candidate of candidates) {
		if (shouldBreakRun(current, candidate)) {
			if (current.length > 0) {
				groups.push(current);
			}
			current = [];
		}
		if (candidate !== undefined) {
			current.push(candidate);
		}
	}
	if (current.length > 0) {
		groups.push(current);
	}
	return groups;
}
/* eslint-enable max-statements -- re-enable for the rest of the file */

export const preferPartialDeepStrictEqualRule = createRule({
	name: "prefer-partial-deep-strict-equal",
	meta: {
		docs: {
			description:
				// eslint-disable-next-line @stylistic/max-len -- the description renders as a single sentence in the generated rules table
				"Prefer a single `partialDeepStrictEqual` over multiple consecutive equality assertions on properties of the same object"
		},
		messages: {
			"prefer-partial-deep-strict-equal":
				"Multiple consecutive equality assertions on properties of '{{rootName}}' can be combined " +
				"into a single 'partialDeepStrictEqual' call"
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
			resolveNamespaceProperty: resolveStrictReExport
		});
		const { sourceCode } = context;

		function resolveCandidate(call: Readonly<TSESTree.CallExpression>, rootName: string): RunCandidate | undefined {
			const resolved = tracker.resolveMethodCall(call.callee, sourceCode.getScope(call));
			if (resolved === undefined || !ELIGIBLE_METHODS.has(resolved.methodName)) {
				return undefined;
			}
			return { rootName, call };
		}

		function classifyNode(node: Readonly<TSESTree.Node>): RunCandidate | undefined {
			const call = getEligibleCallExpression(node);
			if (call === undefined) {
				return undefined;
			}
			const actual = getActualMemberExpression(call);
			const root = actual === undefined ? undefined : getMemberRoot(actual);
			if (root === undefined) {
				return undefined;
			}
			return resolveCandidate(call, root.name);
		}

		function reportRun(group: readonly RunCandidate[]): void {
			const head = group[0];
			if (head === undefined || group.length < MIN_RUN_LENGTH) {
				return;
			}
			context.report({
				messageId: "prefer-partial-deep-strict-equal",
				node: head.call,
				data: { rootName: head.rootName }
			});
		}

		function visitNodeList(nodes: readonly Readonly<TSESTree.Node>[]): void {
			const candidates = nodes.map(classifyNode);
			const groups = groupConsecutiveCandidates(candidates);
			for (const group of groups) {
				reportRun(group);
			}
		}

		return {
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration,
			"Program:exit"(node) {
				visitNodeList(node.body);
			},
			"BlockStatement:exit"(node) {
				visitNodeList(node.body);
			},
			"SwitchCase:exit"(node) {
				visitNodeList(node.consequent);
			},
			"StaticBlock:exit"(node) {
				visitNodeList(node.body);
			}
		};
	}
});
