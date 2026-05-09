# node-assert/import-strict

📝 Enforce the usage of 'node:assert/strict'.

<!-- end auto-generated rule header -->

## Rule Details

This rule enforce the usage of `node:assert/strict` and disallows the usage of `node:assert`. This is useful when you want to have a consistent strict assertion across a large codebase.

The following patterns are considered warnings:

```js
import assert from "node:assert";
```

These patterns would not be considered warnings:

```js
import assert from "node:assert/strict";
```
