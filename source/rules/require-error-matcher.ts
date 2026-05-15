import { ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import type { JSONSchema4 } from "@typescript-eslint/utils/json-schema";
import { isConstantString } from "../ast/is-constant-string.js";
import { createAssertBindingTracker, NOT_ASSERT_MODULE } from "../node-assert/method-tracker.js";
import { isAssertModuleSpecifier } from "../node-assert/modules.js";
import {
	collectObjectPropertyNames,
	defaultAllowedMatchers,
	formatAllowedMatcherKinds,
	getMissingRequiredPropertyNames,
	getRequiredPropertyDescription,
	getSecondArgument,
	hasAnyRequiredProperty,
	isTrackedAssertionMethodName,
	type MatcherClassification,
	type MatcherKind,
	type ObjectMatcherRequirements,
	resolveMatcherClassification
} from "./require-error-matcher-support.js";

type RequireErrorMatcherOptions = readonly [
	{
		readonly allowedMatchers?: readonly MatcherKind[];
		readonly objectMatcher?: {
			readonly requireAtLeastOneProperty?: readonly string[];
			readonly requiredProperties?: readonly string[];
		};
	}
];

const createRule = ESLintUtils.RuleCreator((name) => {
	return `https://github.com/screendriver/eslint-plugin-node-assert/blob/master/docs/rules/${name}.md`;
});

const ruleMessages = {
	"disallowed-error-matcher-kind": "This project requires {{allowedMatcherDescription}} in `assert.{{methodName}}()`",
	"missing-error-matcher":
		"Expected `assert.{{methodName}}()` to include an error matcher; without one it only checks that " +
		"some error was thrown or rejected",
	"missing-required-object-properties":
		"Expected the error matcher object to include {{requiredPropertyDescription}}",
	"missing-useful-object-property":
		"Expected the error matcher object to include at least one of: {{allowedPropertyDescription}}",
	"string-as-error-matcher":
		"A string second argument is the assertion failure message, not an error matcher for " +
		"`assert.{{methodName}}()`"
};
type RuleMessageId = keyof typeof ruleMessages;

type RuleRuntime = {
	readonly allowedMatchers: ReadonlySet<MatcherKind>;
	readonly context: Readonly<TSESLint.RuleContext<RuleMessageId, RequireErrorMatcherOptions>>;
	readonly objectMatcherRequirements: ObjectMatcherRequirements;
	readonly sourceCode: Readonly<TSESLint.SourceCode>;
	readonly tracker: ReturnType<typeof createAssertBindingTracker<null>>;
};
type MissingMatcherCheck = { readonly checkKind: "missing"; readonly methodName: string };
type ResolvedMatcherClassificationCheck = {
	readonly checkKind: "matcher";
	readonly matcherClassification: MatcherClassification;
	readonly methodName: string;
	readonly secondArgument: Readonly<TSESTree.Expression>;
};
type SkipMatcherCheck = { readonly checkKind: "skip" };
type StringMatcherCheck = {
	readonly checkKind: "string";
	readonly methodName: string;
	readonly node: Readonly<TSESTree.Expression>;
};
type NonMatcherCheck = MissingMatcherCheck | SkipMatcherCheck | StringMatcherCheck;
type ResolvedMatcherCheck = NonMatcherCheck | ResolvedMatcherClassificationCheck;
const ruleSchema: JSONSchema4[] = [
	{
		type: "object",
		properties: {
			allowedMatchers: {
				type: "array",
				items: {
					type: "string",
					enum: ["object", "constructor", "validation-function", "regex"]
				},
				minItems: 1,
				uniqueItems: true
			},
			objectMatcher: {
				type: "object",
				properties: {
					requiredProperties: {
						type: "array",
						items: { type: "string" },
						minItems: 1,
						uniqueItems: true
					},
					requireAtLeastOneProperty: {
						type: "array",
						items: { type: "string" },
						minItems: 1,
						uniqueItems: true
					}
				},
				additionalProperties: false
			}
		},
		additionalProperties: false
	}
];

function checkAssertionCall(runtime: RuleRuntime, node: Readonly<TSESTree.CallExpression>): void {
	const resolvedMatcherCheck = getResolvedMatcherCheck(runtime, node);
	if (skipResolvedMatcherCheck(runtime, node, resolvedMatcherCheck)) {
		return;
	}
	if (reportDisallowedMatcherCheck(runtime, resolvedMatcherCheck)) {
		return;
	}
	const matcherObjectExpression = getMatcherObjectExpression(resolvedMatcherCheck.matcherClassification);
	if (matcherObjectExpression !== undefined) {
		checkObjectMatcherRequirements(runtime.context, runtime.objectMatcherRequirements, matcherObjectExpression);
	}
}

function skipResolvedMatcherCheck(
	runtime: RuleRuntime,
	node: Readonly<TSESTree.CallExpression>,
	resolvedMatcherCheck: ResolvedMatcherCheck
): resolvedMatcherCheck is NonMatcherCheck {
	if (resolvedMatcherCheck.checkKind === "skip") {
		return true;
	}
	if (resolvedMatcherCheck.checkKind === "matcher") {
		return false;
	}
	reportNonMatcherCheck(runtime, node, resolvedMatcherCheck);
	return true;
}

function reportDisallowedMatcherCheck(
	runtime: RuleRuntime,
	resolvedMatcherCheck: ResolvedMatcherClassificationCheck
): boolean {
	if (runtime.allowedMatchers.has(resolvedMatcherCheck.matcherClassification.kind)) {
		return false;
	}
	runtime.context.report({
		messageId: "disallowed-error-matcher-kind",
		node: resolvedMatcherCheck.secondArgument,
		data: {
			allowedMatcherDescription: formatAllowedMatcherKinds(runtime.allowedMatchers),
			methodName: resolvedMatcherCheck.methodName
		}
	});
	return true;
}

function reportNonMatcherCheck(
	runtime: RuleRuntime,
	node: Readonly<TSESTree.CallExpression>,
	resolvedMatcherCheck: MissingMatcherCheck | StringMatcherCheck
): void {
	if (resolvedMatcherCheck.checkKind === "missing") {
		runtime.context.report({
			messageId: "missing-error-matcher",
			node,
			data: { methodName: resolvedMatcherCheck.methodName }
		});
		return;
	}
	runtime.context.report({
		messageId: "string-as-error-matcher",
		node: resolvedMatcherCheck.node,
		data: { methodName: resolvedMatcherCheck.methodName }
	});
}

function getResolvedMatcherCheck(runtime: RuleRuntime, node: Readonly<TSESTree.CallExpression>): ResolvedMatcherCheck {
	const scope = runtime.sourceCode.getScope(node);
	const resolvedMethodCall = runtime.tracker.resolveMethodCall(node.callee, scope);
	if (resolvedMethodCall === undefined) {
		return { checkKind: "skip" };
	}
	return getMethodCallMatcherCheck(node.arguments, resolvedMethodCall.methodName, scope);
}

function getMethodCallMatcherCheck(
	callArguments: readonly TSESTree.CallExpressionArgument[],
	methodName: string,
	scope: TSESLint.Scope.Scope
): ResolvedMatcherCheck {
	const secondArgument = getSecondArgument(callArguments);
	if (secondArgument === undefined) {
		return { checkKind: "missing", methodName };
	}
	if (isConstantString(secondArgument)) {
		return { checkKind: "string", methodName, node: secondArgument };
	}
	const matcherClassification = resolveMatcherClassification(secondArgument, scope);
	if (matcherClassification === undefined) {
		return { checkKind: "skip" };
	}
	return {
		checkKind: "matcher",
		matcherClassification,
		methodName,
		secondArgument
	};
}

function getMatcherObjectExpression(
	matcherClassification: MatcherClassification
): Readonly<TSESTree.ObjectExpression> | undefined {
	return matcherClassification.kind === "object" ? matcherClassification.matcherObjectExpression : undefined;
}

function checkObjectMatcherRequirements(
	context: Readonly<TSESLint.RuleContext<RuleMessageId, RequireErrorMatcherOptions>>,
	objectMatcherRequirements: ObjectMatcherRequirements,
	matcherObjectExpression: Readonly<TSESTree.ObjectExpression>
): void {
	const objectPropertyCollection = collectObjectPropertyNames(matcherObjectExpression);
	const missingRequiredPropertyNames = getMissingRequiredPropertyNames(
		objectMatcherRequirements.requiredPropertyNames,
		objectPropertyCollection.propertyNames
	);
	if (!objectPropertyCollection.hasUnknownShape && missingRequiredPropertyNames.length > 0) {
		context.report({
			messageId: "missing-required-object-properties",
			node: matcherObjectExpression,
			data: {
				requiredPropertyDescription: getRequiredPropertyDescription(missingRequiredPropertyNames)
			}
		});
		return;
	}
	if (
		objectPropertyCollection.hasUnknownShape ||
		objectMatcherRequirements.propertyNamesWithAtLeastOneRequirement.length === 0 ||
		hasAnyRequiredProperty(
			objectMatcherRequirements.propertyNamesWithAtLeastOneRequirement,
			objectPropertyCollection.propertyNames
		)
	) {
		return;
	}
	context.report({
		messageId: "missing-useful-object-property",
		node: matcherObjectExpression,
		data: {
			allowedPropertyDescription: objectMatcherRequirements.propertyNamesWithAtLeastOneRequirement.join(", ")
		}
	});
}

export const requireErrorMatcherRule = createRule<RequireErrorMatcherOptions, RuleMessageId>({
	name: "require-error-matcher",
	meta: {
		docs: {
			description: "Require assert.throws() and assert.rejects() to include an error matcher"
		},
		messages: ruleMessages,
		type: "problem",
		schema: ruleSchema
	},
	defaultOptions: [{}],

	create(context, options) {
		const tracker = createAssertBindingTracker<null>({
			isAssertMethod: isTrackedAssertionMethodName,
			classifyModule(specifier) {
				return isAssertModuleSpecifier(specifier) ? null : NOT_ASSERT_MODULE;
			},
			resolveNamespaceProperty(propertyName) {
				return propertyName === "strict" ? null : undefined;
			}
		});
		const runtime: RuleRuntime = {
			allowedMatchers: new Set(options[0].allowedMatchers ?? defaultAllowedMatchers),
			context,
			objectMatcherRequirements: {
				propertyNamesWithAtLeastOneRequirement: options[0].objectMatcher?.requireAtLeastOneProperty ?? [],
				requiredPropertyNames: options[0].objectMatcher?.requiredProperties ?? []
			},
			sourceCode: context.sourceCode,
			tracker
		};

		return {
			CallExpression(node) {
				checkAssertionCall(runtime, node);
			},
			ImportDeclaration: tracker.processImport,
			VariableDeclaration: tracker.processVariableDeclaration
		};
	}
});
