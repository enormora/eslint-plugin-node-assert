/* eslint-disable import/max-dependencies -- central rule barrel intentionally aggregates every rule */
import { consistentImportRule } from "./rules/consistent-import.js";
import { noAsyncFunctionInSyncAssertionRule } from "./rules/no-async-function-in-sync-assertion.js";
import { noConstantActualRule } from "./rules/no-constant-actual.js";
import { noExpectedValueAsMessageRule } from "./rules/no-expected-value-as-message.js";
import { noRestrictedAssertionRule } from "./rules/no-restricted-assertion.js";
import { noUselessAssertionRule } from "./rules/no-useless-assertion.js";
import { preferComparisonAssertionRule } from "./rules/prefer-comparison-assertion.js";
import { preferDeepEqualityRule } from "./rules/prefer-deep-equality.js";
import { preferMatchRule } from "./rules/prefer-match.js";
import { preferPartialDeepStrictEqualRule } from "./rules/prefer-partial-deep-strict-equal.js";
import { requireCustomMessageRule } from "./rules/require-custom-message.js";
import { requireErrorMatcherRule } from "./rules/require-error-matcher.js";
import { requireValidErrorValidatorReturnRule } from "./rules/require-valid-error-validator-return.js";
import { requireStrictRule } from "./rules/require-strict.js";

const allRules = {
	"consistent-import": consistentImportRule,
	"no-async-function-in-sync-assertion": noAsyncFunctionInSyncAssertionRule,
	"no-constant-actual": noConstantActualRule,
	"no-expected-value-as-message": noExpectedValueAsMessageRule,
	"no-restricted-assertion": noRestrictedAssertionRule,
	"no-useless-assertion": noUselessAssertionRule,
	"prefer-comparison-assertion": preferComparisonAssertionRule,
	"prefer-deep-equality": preferDeepEqualityRule,
	"prefer-match": preferMatchRule,
	"prefer-partial-deep-strict-equal": preferPartialDeepStrictEqualRule,
	"require-custom-message": requireCustomMessageRule,
	"require-error-matcher": requireErrorMatcherRule,
	"require-valid-error-validator-return": requireValidErrorValidatorReturnRule,
	"require-strict": requireStrictRule
};

export default {
	rules: allRules
};
