import type { languages } from 'monaco-editor'

export const conf: languages.LanguageConfiguration = {
	comments: {
		lineComment: '%',
	},

	brackets: [
		['{', '}'],
		['[', ']'],
		['(', ')'],
	],

	autoClosingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
	],

	surroundingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
	],

	folding: {
		markers: {
			start: /\\begin{[a-zA-Z]+}/,
			end: /\\end{[a-zA-Z]+}/,
		},
	},
}

export const language = <languages.IMonarchLanguage>{
	tokenizer: {
		root: [
			{ regex: /\\[a-zA-Z]+/, action: { token: 'tex-command' } },
			{ regex: /(=|&=)/, action: { token: 'tex-equals-sign' } },
			{ regex: /\\\\/, action: { token: 'tex-newline' } },
			{ regex: /^%.*$/, action: { token: 'comment' } },
		],
	},
}
