import { ESLintUtils } from '@typescript-eslint/utils';

type RuleDocs = {
    readonly recommended: boolean;
};

export const createRule = ESLintUtils.RuleCreator<RuleDocs>(function (ruleName) {
    return `https://github.com/enormora/eslint-plugin-node-assert/blob/main/docs/rules/${ruleName}.md`;
});
