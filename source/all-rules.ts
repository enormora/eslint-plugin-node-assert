import type { TSESLint } from "@typescript-eslint/utils";
import { importStrictRule } from "./rules/import-strict.js";
import { noConstantActualRule } from "./rules/no-constant-actual.js";

const allRules: Record<string, TSESLint.RuleModule<string, unknown[]>> = {
	"import-strict": importStrictRule,
	"no-constant-actual": noConstantActualRule
};

export default {
	rules: allRules
};
