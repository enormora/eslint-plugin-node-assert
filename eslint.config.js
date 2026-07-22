import { baseConfig } from '@enormora/eslint-config-base';
import { createEslintPluginConfig } from '@enormora/eslint-config-eslint-plugin';
import { mochaNodeAssertConfig } from '@enormora/eslint-config-mocha-node-assert';
import { nodeConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

const codeFilePatterns = [ '**/*.{js,ts}' ];

const eslintPluginConfig = createEslintPluginConfig({
    docsUrlPattern: 'https://github.com/enormora/eslint-plugin-node-assert/blob/main/docs/rules/{{name}}.md',
    descriptionPattern: '^(Enforce|Require|Disallow|Prefer)'
});

export default [
    {
        ignores: [ 'package-lock.json', 'target/**' ]
    },
    ...baseConfig,
    {
        ...nodeConfig,
        files: codeFilePatterns
    },
    {
        ...typescriptConfig,
        files: [ '**/*.ts' ]
    },
    {
        ...mochaNodeAssertConfig,
        files: [ 'test/**/*.test.ts' ]
    },
    {
        ...eslintPluginConfig,
        files: [ 'source/rules/**/*.ts' ],
        rules: {
            ...eslintPluginConfig.rules,
            // Blocked by @typescript-eslint/utils: RuleCreator's RuleMetaData does not type `meta.languages`
            // (still missing as of 8.65.0, pinned here at 8.62.1), so setting it is a type error. ESLint core
            // added the property in https://github.com/eslint/eslint/pull/20571; re-enable once the type ships.
            'eslint-plugin/require-meta-languages': 'off'
        }
    },
    {
        files: [ 'eslint.config.js', 'source/all-rules.ts' ],
        rules: {
            'import/no-default-export': 'off'
        }
    },
    {
        files: [ 'source/rules/create-rule.ts' ],
        rules: {
            'new-cap': 'off'
        }
    },
    {
        files: [
            'source/ast/is-constant.ts',
            'source/rules/no-async-function-in-sync-assertion.ts',
            'source/rules/prefer-partial-deep-strict-equal.ts',
            'source/rules/require-error-matcher-support.ts'
        ],
        rules: {
            'unicorn/no-useless-recursion': 'off'
        }
    },
    {
        files: [
            'source/rules/require-error-matcher-support.ts',
            'source/rules/require-valid-error-validator-return.ts',
            'test/node-assert/method-tracker.test.ts'
        ],
        rules: {
            '@stylistic/indent': 'off',
            '@stylistic/indent-binary-ops': 'off'
        }
    },
    {
        files: [ 'source/node-assert/method-tracker.ts' ],
        rules: {
            '@typescript-eslint/no-unsafe-call': 'off',
            'enormora-typescript/prefer-readonly-types': 'off',
            'functional/type-declaration-immutability': 'off'
        }
    },
    {
        files: [ 'source/rules/require-error-matcher.ts', 'source/rules/require-error-matcher-support.ts' ],
        rules: {
            '@typescript-eslint/no-use-before-define': 'off',
            'functional/prefer-immutable-types': 'off'
        }
    }
];
