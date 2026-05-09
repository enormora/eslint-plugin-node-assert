import * as assert from "node:assert/strict";
import { suite, test } from "mocha";
import type { Rule } from "eslint";
import type { TSESTree } from "@typescript-eslint/utils";
import { isConstant } from "../../source/ast/is-constant.js";
import { expectNoLintFailure, runProbeRule } from "../helpers/linter-runner.js";

function evaluate(expressionSource: string): boolean {
	const observations: boolean[] = [];
	const code = `(${expressionSource});`;
	const probeRule: Rule.RuleModule = {
		create() {
			return {
				ExpressionStatement(node) {
					const { expression } = node as unknown as TSESTree.ExpressionStatement;
					observations.push(isConstant(expression));
				}
			};
		}
	};
	const messages = runProbeRule({ code, rule: probeRule });
	expectNoLintFailure(messages);
	const [first] = observations;
	if (first === undefined) {
		throw new Error(`No expression encountered for source: ${expressionSource}`);
	}
	return first;
}

const CONSTANT_SAMPLES: readonly string[] = [
	"42",
	"-1",
	"3.14",
	"'foo'",
	"`hello`",
	"true",
	"false",
	"null",
	"42n",
	"/foo/",
	"undefined",
	"NaN",
	"Infinity",
	"-Infinity",
	"!true",
	"~0",
	"void 0",
	"typeof 'foo'",
	"[]",
	"[1, 2, 3]",
	"[[1], [2]]",
	"{}",
	"{ a: 1 }",
	"{ a: { b: 1 } }",
	"{ 'string-key': 1 }"
];

// eslint-disable-next-line no-template-curly-in-string -- intentional template expression in fixture source
const TEMPLATE_WITH_EXPRESSION = "`hi ${name}`";

const NON_CONSTANT_SAMPLES: readonly string[] = [
	"foo",
	"foo()",
	"obj.prop",
	"new Date()",
	"new Date(42)",
	"Symbol('x')",
	TEMPLATE_WITH_EXPRESSION,
	"typeof actualThing",
	"a + b",
	"a || b",
	"a ? b : c",
	"async () => 1",
	"[foo]",
	"[1, foo]",
	"[...rest]",
	"{ a: foo }",
	"{ [k]: 1 }",
	"{ ...other }",
	"{ method() {} }",
	"{ get x() { return 1; } }"
];

suite("isConstant()", function () {
	test("returns true for every constant sample", function () {
		for (const sample of CONSTANT_SAMPLES) {
			assert.strictEqual(evaluate(sample), true, `expected isConstant(${sample}) to be true`);
		}
	});

	test("returns false for every non-constant sample", function () {
		for (const sample of NON_CONSTANT_SAMPLES) {
			assert.strictEqual(evaluate(sample), false, `expected isConstant(${sample}) to be false`);
		}
	});
});
