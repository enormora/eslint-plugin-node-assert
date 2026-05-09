import { RuleTester } from "@typescript-eslint/rule-tester";
import { consistentImportRule } from "../../source/rules/consistent-import.js";

const ruleTester = new RuleTester();

ruleTester.run("consistent-import", consistentImportRule, {
	valid: [
		// Default style is "strict-module"
		"import assert from 'node:assert/strict';",
		"import assert from 'assert/strict';",
		"import { equal } from 'node:assert/strict';",
		"import { equal } from 'assert/strict';",
		"import * as assert from 'node:assert/strict';",
		"import 'node:assert/strict';",
		"import assert, { equal } from 'node:assert/strict';",

		// Imports from unrelated modules are out of scope
		"import { strict } from 'somewhere-else';",
		"import assert from 'somewhere-else';",
		"import * as assert from 'somewhere-else';",

		// style: base — base specifier, no `strict` named import
		{
			code: "import assert from 'node:assert';",
			options: [{ style: "base" }]
		},
		{
			code: "import assert from 'assert';",
			options: [{ style: "base" }]
		},
		{
			code: "import { equal } from 'node:assert';",
			options: [{ style: "base" }]
		},
		{
			code: "import * as assert from 'node:assert';",
			options: [{ style: "base" }]
		},
		{
			code: "import 'node:assert';",
			options: [{ style: "base" }]
		},
		{
			code: "import assert, { equal } from 'node:assert';",
			options: [{ style: "base" }]
		},

		// style: strict-export — base specifier with the `strict` named import
		{
			code: "import { strict as assert } from 'node:assert';",
			options: [{ style: "strict-export" }]
		},
		{
			code: "import { strict } from 'assert';",
			options: [{ style: "strict-export" }]
		},
		{
			code: "import { strict } from 'node:assert';",
			options: [{ style: "strict-export" }]
		},
		{
			code: "import { strict, equal } from 'node:assert';",
			options: [{ style: "strict-export" }]
		},
		{
			code: "import assert, { strict } from 'node:assert';",
			options: [{ style: "strict-export" }]
		},

		// style: strict-module — explicit reaffirmation of the default
		{
			code: "import assert from 'node:assert/strict';",
			options: [{ style: "strict-module" }]
		}
	],
	invalid: [
		// Default style: strict-module
		{
			code: "import assert from 'node:assert';",
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import assert from 'assert';",
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { equal } from 'node:assert';",
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict } from 'node:assert';",
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import * as assert from 'node:assert';",
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import 'node:assert';",
			errors: [{ messageId: "consistent-import" }]
		},

		// style: base — strict module specifiers and `strict` named imports are forbidden
		{
			code: "import assert from 'node:assert/strict';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import assert from 'assert/strict';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { equal } from 'assert/strict';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict as assert } from 'node:assert';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict } from 'node:assert';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict, equal } from 'node:assert';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import assert, { strict } from 'node:assert';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import 'node:assert/strict';",
			options: [{ style: "base" }],
			errors: [{ messageId: "consistent-import" }]
		},

		// style: strict-export — anything that isn't a base specifier with the `strict` named import
		{
			code: "import assert from 'node:assert';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import assert from 'node:assert/strict';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { equal } from 'node:assert';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import * as assert from 'node:assert';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict } from 'node:assert/strict';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict as foo } from 'assert/strict';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import 'node:assert';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import 'node:assert/strict';",
			options: [{ style: "strict-export" }],
			errors: [{ messageId: "consistent-import" }]
		},

		// style: strict-module explicit
		{
			code: "import assert from 'node:assert';",
			options: [{ style: "strict-module" }],
			errors: [{ messageId: "consistent-import" }]
		},
		{
			code: "import { strict } from 'node:assert';",
			options: [{ style: "strict-module" }],
			errors: [{ messageId: "consistent-import" }]
		}
	]
});
