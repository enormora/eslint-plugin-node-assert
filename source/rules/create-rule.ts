import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(function (ruleName) {
    return `https://github.com/enormora/eslint-plugin-node-assert/blob/main/docs/rules/${ruleName}.md`;
});
