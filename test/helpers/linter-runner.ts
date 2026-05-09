import { Linter, type Rule } from "eslint";

type LinterRule = Readonly<Rule.RuleModule>;

export type RunRuleOptions = {
	readonly code: string;
	readonly rule: LinterRule;
	readonly sourceType?: "module" | "script";
};

export function runProbeRule(options: RunRuleOptions): readonly Linter.LintMessage[] {
	const linter = new Linter();
	const sourceType = options.sourceType ?? "module";
	const messages = linter.verify(options.code, {
		plugins: {
			"probe-plugin": {
				rules: { probe: options.rule }
			}
		},
		languageOptions: { ecmaVersion: 2024, sourceType },
		rules: { "probe-plugin/probe": "error" }
	});
	return messages;
}

const SEVERITY_ERROR = 2;

export function expectNoLintFailure(messages: readonly Linter.LintMessage[]): void {
	const fatal = messages.filter((message) => {
		return message.fatal === true || message.severity === SEVERITY_ERROR;
	});
	if (fatal.length > 0) {
		const text = fatal
			.map((message) => {
				return `${message.ruleId ?? "<parser>"}: ${message.message}`;
			})
			.join("\n");
		throw new Error(`Probe rule reported failures:\n${text}`);
	}
}
