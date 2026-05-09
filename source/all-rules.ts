import { consistentImportRule } from "./rules/consistent-import.js";
import { noConstantActualRule } from "./rules/no-constant-actual.js";
import { requireStrictRule } from "./rules/require-strict.js";

const allRules = {
	"consistent-import": consistentImportRule,
	"no-constant-actual": noConstantActualRule,
	"require-strict": requireStrictRule
};

export default {
	rules: allRules
};
