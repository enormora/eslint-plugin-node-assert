import type { TSESLint } from "@typescript-eslint/utils";
import { importStrictRule } from "./rules/import-strict.js";
import { noAssertRejectsRule } from "./rules/no-assert-rejects.js";

const allRules: Record<string, TSESLint.RuleModule<string, unknown[]>> = {
	"import-strict": importStrictRule,
	"no-assert-rejects": noAssertRejectsRule
};

export default {
	rules: allRules
};
