import { config } from "@remotion/eslint-config-flat";

export default [
	...config,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"no-case-declarations": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@remotion/deterministic-randomness": "off",
		},
	},
];
