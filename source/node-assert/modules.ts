export const ASSERT_MODULES: ReadonlySet<string> = new Set([
	"node:assert",
	"node:assert/strict",
	"assert",
	"assert/strict"
]);

export function isAssertModuleSpecifier(value: unknown): boolean {
	return typeof value === "string" && ASSERT_MODULES.has(value);
}
