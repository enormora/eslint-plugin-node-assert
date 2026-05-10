import { consistentImportRule } from "./rules/consistent-import.js";
import { noConstantActualRule } from "./rules/no-constant-actual.js";
import { noExpectedValueAsMessageRule } from "./rules/no-expected-value-as-message.js";
import { preferMatchRule } from "./rules/prefer-match.js";
import { requireStrictRule } from "./rules/require-strict.js";

const allRules = {
	"consistent-import": consistentImportRule,
	"no-constant-actual": noConstantActualRule,
	"no-expected-value-as-message": noExpectedValueAsMessageRule,
	"prefer-match": preferMatchRule,
	"require-strict": requireStrictRule
};

export default {
	rules: allRules
};
