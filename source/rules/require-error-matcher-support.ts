import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

export type MatcherKind = "constructor" | "object" | "regex" | "validation-function";

export type MatcherClassification = {
	readonly kind: MatcherKind;
	readonly matcherObjectExpression?: Readonly<TSESTree.ObjectExpression>;
};

export type ObjectMatcherRequirements = {
	readonly propertyNamesWithAtLeastOneRequirement: readonly string[];
	readonly requiredPropertyNames: readonly string[];
};

export type ObjectPropertyCollection = {
	readonly hasUnknownShape: boolean;
	readonly propertyNames: ReadonlySet<string>;
};

type DefinitionResolutionStep = {
	readonly definition: Readonly<TSESLint.Scope.Definition>;
	readonly scope: TSESLint.Scope.Scope;
	readonly stepKind: "definition";
	readonly visitedVariableNames: ReadonlySet<string>;
};

type ExpressionResolutionStep = {
	readonly expression: Readonly<TSESTree.Expression>;
	readonly scope: TSESLint.Scope.Scope;
	readonly stepKind: "expression";
	readonly visitedVariableNames: ReadonlySet<string>;
};

type MatcherResolutionStep = DefinitionResolutionStep | ExpressionResolutionStep;

const builtInErrorConstructorNames: ReadonlySet<string> = new Set([
	"AggregateError",
	"Error",
	"EvalError",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"URIError"
]);
const matcherKindDescriptionByKind: Readonly<Record<MatcherKind, string>> = {
	constructor: "constructor matcher",
	object: "object matcher",
	regex: "regular expression matcher",
	"validation-function": "validation function matcher"
};
const pairMatcherCount = 2;
const singleMatcherCount = 1;

export const allowedMatcherKinds: readonly MatcherKind[] = ["object", "constructor", "validation-function", "regex"];
export const defaultAllowedMatchers: ReadonlySet<MatcherKind> = new Set(allowedMatcherKinds);
export const trackedAssertionMethodNames: ReadonlySet<string> = new Set(["throws", "rejects"]);

export function isTrackedAssertionMethodName(methodName: string): boolean {
	return trackedAssertionMethodNames.has(methodName);
}

export function getSecondArgument(
	callArguments: readonly TSESTree.CallExpressionArgument[]
): Readonly<TSESTree.Expression> | undefined {
	const [, secondArgument] = callArguments;
	if (secondArgument === undefined || secondArgument.type === AST_NODE_TYPES.SpreadElement) {
		return undefined;
	}
	return secondArgument;
}

export function collectObjectPropertyNames(
	matcherObjectExpression: Readonly<TSESTree.ObjectExpression>
): ObjectPropertyCollection {
	return matcherObjectExpression.properties.reduce<ObjectPropertyCollection>(
		(currentCollection, property) => {
			if (property.type === AST_NODE_TYPES.SpreadElement) {
				return { ...currentCollection, hasUnknownShape: true };
			}
			const propertyName = getStaticPropertyName(property);
			if (propertyName === undefined) {
				return { ...currentCollection, hasUnknownShape: true };
			}
			return {
				hasUnknownShape: currentCollection.hasUnknownShape,
				propertyNames: new Set([...currentCollection.propertyNames, propertyName])
			};
		},
		{ hasUnknownShape: false, propertyNames: new Set<string>() }
	);
}

export function formatAllowedMatcherKinds(allowedMatchers: ReadonlySet<MatcherKind>): string {
	const matcherDescriptions = Array.from(allowedMatchers, formatMatcherKind);
	const [firstMatcherDescription] = matcherDescriptions;
	if (matcherDescriptions.length === singleMatcherCount && firstMatcherDescription !== undefined) {
		return `${getIndefiniteArticle(firstMatcherDescription)} ${firstMatcherDescription}`;
	}
	if (matcherDescriptions.length === pairMatcherCount) {
		return `${matcherDescriptions[0]} or ${matcherDescriptions[1]}`;
	}
	const allButLastMatcherDescriptions = matcherDescriptions.slice(0, -1);
	const lastMatcherDescription = matcherDescriptions.at(-1);
	return `${allButLastMatcherDescriptions.join(", ")}, or ${lastMatcherDescription}`;
}

export function getMissingRequiredPropertyNames(
	requiredPropertyNames: readonly string[],
	propertyNames: ReadonlySet<string>
): readonly string[] {
	return requiredPropertyNames.filter((requiredPropertyName) => {
		return !propertyNames.has(requiredPropertyName);
	});
}

export function getRequiredPropertyDescription(missingRequiredPropertyNames: readonly string[]): string {
	return missingRequiredPropertyNames.length === singleMatcherCount
		? `property ${formatPropertyList(missingRequiredPropertyNames)}`
		: `properties ${formatPropertyList(missingRequiredPropertyNames)}`;
}

export function hasAnyRequiredProperty(
	allowedPropertyNames: readonly string[],
	propertyNames: ReadonlySet<string>
): boolean {
	return allowedPropertyNames.some((allowedPropertyName) => {
		return propertyNames.has(allowedPropertyName);
	});
}

export function resolveMatcherClassification(
	expression: Readonly<TSESTree.Expression>,
	scope: TSESLint.Scope.Scope
): MatcherClassification | undefined {
	const pendingResolutionSteps: MatcherResolutionStep[] = [
		{
			expression: unwrapTransparentExpression(expression),
			scope,
			stepKind: "expression",
			visitedVariableNames: new Set()
		}
	];

	while (pendingResolutionSteps.length > 0) {
		const currentStep = pendingResolutionSteps.pop();
		if (currentStep === undefined) {
			return undefined;
		}
		const matcherClassification =
			currentStep.stepKind === "expression"
				? processExpressionResolutionStep(pendingResolutionSteps, currentStep)
				: processDefinitionResolutionStep(pendingResolutionSteps, currentStep);
		if (matcherClassification !== undefined) {
			return matcherClassification;
		}
	}

	return undefined;
}

function formatMatcherKind(matcherKind: MatcherKind): string {
	return matcherKindDescriptionByKind[matcherKind];
}

function formatPropertyList(propertyNames: readonly string[]): string {
	return propertyNames
		.map((propertyName) => {
			return `"${propertyName}"`;
		})
		.join(", ");
}

function getConstVariableDeclarator(
	definition: Readonly<TSESLint.Scope.Definition>
): Readonly<TSESTree.VariableDeclarator> | undefined {
	if (
		definition.node.type !== AST_NODE_TYPES.VariableDeclarator ||
		definition.parent?.type !== AST_NODE_TYPES.VariableDeclaration ||
		definition.parent.kind !== "const"
	) {
		return undefined;
	}
	return definition.node;
}

function getDefinitionMatcherClassification(
	definition: Readonly<TSESLint.Scope.Definition>
): MatcherClassification | undefined {
	if (definition.node.type === AST_NODE_TYPES.ClassDeclaration) {
		return { kind: "constructor" };
	}
	return definition.node.type === AST_NODE_TYPES.FunctionDeclaration ? { kind: "validation-function" } : undefined;
}

function getDefinitionResolutionSteps(
	expression: Readonly<TSESTree.Expression>,
	scope: TSESLint.Scope.Scope,
	visitedVariableNames: ReadonlySet<string>
): readonly MatcherResolutionStep[] {
	if (expression.type !== AST_NODE_TYPES.Identifier || visitedVariableNames.has(expression.name)) {
		return [];
	}
	if (builtInErrorConstructorNames.has(expression.name)) {
		return [];
	}
	const variable = ASTUtils.findVariable(scope, expression.name) ?? undefined;
	if (variable === undefined) {
		return [];
	}
	const nextVisitedVariableNames = new Set([...visitedVariableNames, expression.name]);
	return variable.defs.map((definition) => {
		return {
			definition,
			scope: variable.scope,
			stepKind: "definition" as const,
			visitedVariableNames: nextVisitedVariableNames
		};
	});
}

function getDirectMatcherClassification(expression: Readonly<TSESTree.Expression>): MatcherClassification | undefined {
	return (
		getObjectMatcherClassification(expression) ??
		getValidationFunctionMatcherClassification(expression) ??
		getConstructorMatcherClassification(expression) ??
		getRegexMatcherClassification(expression)
	);
}

function getIndefiniteArticle(nounPhrase: string): "a" | "an" {
	return /^[aeiou]/iu.test(nounPhrase) ? "an" : "a";
}

function getStaticPropertyName(property: Readonly<TSESTree.Property>): string | undefined {
	if (property.computed) {
		return undefined;
	}
	if (property.key.type === AST_NODE_TYPES.Identifier) {
		return property.key.name;
	}
	if (typeof property.key.value === "string" || typeof property.key.value === "number") {
		return String(property.key.value);
	}
	return undefined;
}

function getConstructorMatcherClassification(
	expression: Readonly<TSESTree.Expression>
): MatcherClassification | undefined {
	if (expression.type === AST_NODE_TYPES.ClassExpression) {
		return { kind: "constructor" };
	}
	return expression.type === AST_NODE_TYPES.Identifier && builtInErrorConstructorNames.has(expression.name)
		? { kind: "constructor" }
		: undefined;
}

function getObjectMatcherClassification(expression: Readonly<TSESTree.Expression>): MatcherClassification | undefined {
	return expression.type === AST_NODE_TYPES.ObjectExpression
		? { kind: "object", matcherObjectExpression: expression }
		: undefined;
}

function getRegexMatcherClassification(expression: Readonly<TSESTree.Expression>): MatcherClassification | undefined {
	return expression.type === AST_NODE_TYPES.Literal && expression.value instanceof RegExp
		? { kind: "regex" }
		: undefined;
}

function getValidationFunctionMatcherClassification(
	expression: Readonly<TSESTree.Expression>
): MatcherClassification | undefined {
	if (
		expression.type === AST_NODE_TYPES.ArrowFunctionExpression ||
		expression.type === AST_NODE_TYPES.FunctionExpression
	) {
		return { kind: "validation-function" };
	}
	return undefined;
}

function processDefinitionResolutionStep(
	pendingResolutionSteps: MatcherResolutionStep[],
	currentStep: DefinitionResolutionStep
): MatcherClassification | undefined {
	const definitionMatcherClassification = getDefinitionMatcherClassification(currentStep.definition);
	if (definitionMatcherClassification !== undefined) {
		return definitionMatcherClassification;
	}
	const initializerExpression = getConstVariableDeclarator(currentStep.definition)?.init;
	if (initializerExpression !== undefined && initializerExpression !== null) {
		pendingResolutionSteps.push({
			expression: unwrapTransparentExpression(initializerExpression),
			scope: currentStep.scope,
			stepKind: "expression",
			visitedVariableNames: currentStep.visitedVariableNames
		});
	}
	return undefined;
}

function processExpressionResolutionStep(
	pendingResolutionSteps: MatcherResolutionStep[],
	currentStep: ExpressionResolutionStep
): MatcherClassification | undefined {
	const directMatcherClassification = getDirectMatcherClassification(currentStep.expression);
	if (directMatcherClassification !== undefined) {
		return directMatcherClassification;
	}
	pendingResolutionSteps.push(
		...getDefinitionResolutionSteps(currentStep.expression, currentStep.scope, currentStep.visitedVariableNames)
	);
	return undefined;
}

function unwrapTransparentExpression(node: Readonly<TSESTree.Expression>): Readonly<TSESTree.Expression> {
	if (
		node.type === AST_NODE_TYPES.TSAsExpression ||
		node.type === AST_NODE_TYPES.TSNonNullExpression ||
		node.type === AST_NODE_TYPES.TSSatisfiesExpression ||
		node.type === AST_NODE_TYPES.TSTypeAssertion
	) {
		return unwrapTransparentExpression(node.expression);
	}
	return node;
}
