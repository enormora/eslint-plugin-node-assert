/* eslint-disable import/max-dependencies -- central rule barrel intentionally aggregates every rule */
import type { ESLint } from 'eslint';
import { consistentImportRule } from './rules/consistent-import.ts';
import { noAsyncFunctionInSyncAssertionRule } from './rules/no-async-function-in-sync-assertion.ts';
import { noAwaitArgumentInRejectsRule } from './rules/no-await-argument-in-rejects.ts';
import { noConstantActualRule } from './rules/no-constant-actual.ts';
import { noExpectedValueAsMessageRule } from './rules/no-expected-value-as-message.ts';
import { noRestrictedAssertionRule } from './rules/no-restricted-assertion.ts';
import { noUselessAssertionRule } from './rules/no-useless-assertion.ts';
import { preferComparisonAssertionRule } from './rules/prefer-comparison-assertion.ts';
import { preferDeepEqualityRule } from './rules/prefer-deep-equality.ts';
import { preferMatchRule } from './rules/prefer-match.ts';
import { preferPartialDeepStrictEqualRule } from './rules/prefer-partial-deep-strict-equal.ts';
import { requireCustomMessageRule } from './rules/require-custom-message.ts';
import { requireErrorMatcherRule } from './rules/require-error-matcher.ts';
import { requireValidErrorValidatorReturnRule } from './rules/require-valid-error-validator-return.ts';
import { requireStrictRule } from './rules/require-strict.ts';

export type NodeAssertPlugin = ESLint.Plugin;

const allRules = {
    'consistent-import': consistentImportRule,
    'no-async-function-in-sync-assertion': noAsyncFunctionInSyncAssertionRule,
    'no-await-argument-in-rejects': noAwaitArgumentInRejectsRule,
    'no-constant-actual': noConstantActualRule,
    'no-expected-value-as-message': noExpectedValueAsMessageRule,
    'no-restricted-assertion': noRestrictedAssertionRule,
    'no-useless-assertion': noUselessAssertionRule,
    'prefer-comparison-assertion': preferComparisonAssertionRule,
    'prefer-deep-equality': preferDeepEqualityRule,
    'prefer-match': preferMatchRule,
    'prefer-partial-deep-strict-equal': preferPartialDeepStrictEqualRule,
    'require-custom-message': requireCustomMessageRule,
    'require-error-matcher': requireErrorMatcherRule,
    'require-valid-error-validator-return': requireValidErrorValidatorReturnRule,
    'require-strict': requireStrictRule
};

const plugin = {
    rules: allRules
};

export default plugin;
