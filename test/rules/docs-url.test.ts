import * as assert from 'node:assert/strict';
import { suite, test } from 'mocha';
import plugin from '../../source/all-rules.ts';

const RULE_DOCUMENTATION_URL_PREFIX = 'https://github.com/enormora/eslint-plugin-node-assert/blob/main/docs/rules/';

suite('rule docs urls', function () {
    test('every exported rule links to this repository documentation', function () {
        const exportedRules = plugin.rules;

        assert.notDeepStrictEqual(Object.keys(exportedRules), []);

        for (const [ ruleName, rule ] of Object.entries(exportedRules)) {
            const expectedDocumentationUrl = `${RULE_DOCUMENTATION_URL_PREFIX}${ruleName}.md`;
            const ruleDocumentation = rule.meta.docs;

            if (ruleDocumentation === undefined) {
                assert.fail(`expected ${ruleName} to define rule documentation metadata`);
            }

            assert.strictEqual(ruleDocumentation.url, expectedDocumentationUrl);
        }
    });
});
