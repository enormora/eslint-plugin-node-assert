import { baseConfig } from '@enormora/eslint-config-base';
import { mochaNodeAssertConfig } from '@enormora/eslint-config-mocha-node-assert';
import { nodeConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

const codeFilePatterns = [ '**/*.{js,ts}' ];

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
        files: [ '**/*.ts' ],
        rules: {
            ...typescriptConfig.rules,
            'import/extensions': 'off'
        }
    },
    {
        ...mochaNodeAssertConfig,
        files: [ 'test/**/*.test.ts' ]
    },
    {
        files: [ 'eslint.config.js', 'source/all-rules.ts' ],
        rules: {
            'import/no-default-export': 'off'
        }
    },
    {
        files: [ 'source/rules/**/*.ts' ],
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
