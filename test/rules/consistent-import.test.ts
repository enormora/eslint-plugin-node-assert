import { RuleTester } from "@typescript-eslint/rule-tester";
import { consistentImportRule } from "../../source/rules/consistent-import.js";

const ruleTester = new RuleTester();

ruleTester.run("consistent-import", consistentImportRule, {
	valid: [
		"import assert from 'node:assert/strict';",
		"import { equal } from 'assert/strict';",
		{
			code: "import assert from 'node:assert';",
			options: [{ style: "base" }]
		},
		{
			code: "import { strict as assert } from 'node:assert';",
			options: [{ style: "strict-export" }]
		},
		{
			code: "import { strict } from 'assert';",
			options: [{ style: "strict-export" }]
		}
	],
	invalid: [
		{
			code: "import assert from 'node:assert';",
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import assert from 'node:assert/strict';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict as assert } from 'node:assert';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import assert from 'node:assert';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import assert from 'node:assert/strict';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		}
	]
});
