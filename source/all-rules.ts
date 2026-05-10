import { consistentImportRule } from "./rules/consistent-import.js";
import { noConstantActualRule } from "./rules/no-constant-actual.js";
import { noExpectedValueAsMessageRule } from "./rules/no-expected-value-as-message.js";
import { preferDeepEqualityRule } from "./rules/prefer-deep-equality.js";
import { preferMatchRule } from "./rules/prefer-match.js";
import { preferPartialDeepStrictEqualRule } from "./rules/prefer-partial-deep-strict-equal.js";
import { requireStrictRule } from "./rules/require-strict.js";

const allRules = {
	"consistent-import": consistentImportRule,
	"no-constant-actual": noConstantActualRule,
	"no-expected-value-as-message": noExpectedValueAsMessageRule,
	"prefer-deep-equality": preferDeepEqualityRule,
	"prefer-match": preferMatchRule,
	"prefer-partial-deep-strict-equal": preferPartialDeepStrictEqualRule,
	"require-strict": requireStrictRule
};

export default {
	rules: allRules
};
