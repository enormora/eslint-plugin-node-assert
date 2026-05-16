# @enormora/node-assert/consistent-import

📝 Enforce a consistent Node.js assert import style.

<!-- end auto-generated rule header -->

## Rule Details

This rule enforces a single import style for the Node.js assert module.

### Options

- `style: "strict-module"` (default): require `node:assert/strict` (or `assert/strict`)
- `style: "base"`: require `node:assert` (or `assert`) and disallow importing `{ strict }`
- `style: "strict-export"`: require importing `{ strict }` from `node:assert` (or `assert`)

Examples for `style: "strict-module"`:

Invalid:

```js
import assert from "node:assert";
```

Valid:

```js
import assert from "node:assert/strict";
```
