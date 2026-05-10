[![NPM Version](https://img.shields.io/npm/v/eslint-plugin-node-assert.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-node-assert)
[![GitHub Actions status](https://github.com/screendriver/eslint-plugin-node-assert/workflows/CI/badge.svg)](https://github.com/screendriver/eslint-plugin-node-assert/actions)
[![NPM Downloads](https://img.shields.io/npm/dm/eslint-plugin-node-assert.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-node-assert)

# eslint-plugin-node-assert

ESLint rules for [Node.js assert module](https://nodejs.org/docs/latest/api/assert.html).

## Rules

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                               | Description                                                                                                             | 🔧 |
| :--------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :- |
| [consistent-import](docs/rules/consistent-import.md)                               | Enforce a consistent Node.js assert import style                                                                        |    |
| [no-constant-actual](docs/rules/no-constant-actual.md)                             | Disallow passing a constant value as the first argument to Node.js assert methods                                       | 🔧 |
| [no-expected-value-as-message](docs/rules/no-expected-value-as-message.md)         | Disallow passing an expected value where a message or error matcher belongs in Node.js assert calls                     |    |
| [prefer-deep-equality](docs/rules/prefer-deep-equality.md)                         | Prefer deep equality assertions when comparing object or array literals                                                 | 🔧 |
| [prefer-match](docs/rules/prefer-match.md)                                         | Prefer assert.match() or assert.doesNotMatch() for regular expression assertions                                        | 🔧 |
| [prefer-partial-deep-strict-equal](docs/rules/prefer-partial-deep-strict-equal.md) | Prefer a single `partialDeepStrictEqual` over multiple consecutive equality assertions on properties of the same object |    |
| [require-strict](docs/rules/require-strict.md)                                     | Require strict assertion semantics for Node.js assert equality methods                                                  | 🔧 |

<!-- end auto-generated rules list -->
