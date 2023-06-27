import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import type { languages } from 'monaco-editor'

export function setMonacoEnvironment() {
	self.MonacoEnvironment = {
		getWorker(_, label) {
			if (label == 'json') return new jsonWorker()
			if (label == 'css' || label == 'scss' || label == 'less') return new cssWorker()
			if (label == 'html' || label == 'handlebars' || label == 'razor') return new htmlWorker()
			if (label == 'typescript' || label == 'javascript') return new tsWorker()
			return new editorWorker()
		},
	}
}

export function registerTexLanguage() {
	monaco.languages.register({
		id: 'tex',
	})
}

export function setTexLanguageStuff(commentMarker: string) {
	const conf: languages.LanguageConfiguration = {
		comments: {
			lineComment: commentMarker,
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
	
	const language = <languages.IMonarchLanguage>{
		tokenizer: {
			root: [
				{ regex: /\\[a-zA-Z]+/, action: { token: 'tex-command' } },
				{ regex: /(=|&=)/, action: { token: 'tex-equals-sign' } },
				{ regex: /\\\\/, action: { token: 'tex-newline' } },
				{ regex: new RegExp(`(?<!\\\\)${commentMarker}.*$`), action: { token: 'comment' } },
			],
		},
	}

	monaco.languages.setMonarchTokensProvider('tex', language)
	monaco.languages.setLanguageConfiguration('tex', conf)
}

export function registerThemes(lightModeBackground: string, darkModeBackground: string) {
	monaco.editor.defineTheme('tex-light', {
		base: 'vs',
		inherit: true,
		rules: [
			{ token: 'tex-command', foreground: 'C000E0' },
			{ token: 'tex-equals-sign', foreground: 'C000E0' },
			{ token: 'tex-newline', foreground: 'C000E0' },
		],
		colors: {
			'editor.background': lightModeBackground,
		},
	})
	
	monaco.editor.defineTheme('tex-dark', {
		base: 'vs-dark',
		inherit: true,
		rules: [
			{ token: 'tex-command', foreground: 'bf6ecc' },
			{ token: 'tex-equals-sign', foreground: 'bf6ecc' },
			{ token: 'tex-newline', foreground: 'bf6ecc' },
		],
		colors: {
			'editor.background': darkModeBackground,
		},
	})
}


export async function createAutocompleteSuggestions() {
	const functionFormats: string[] = await (await fetch('/texFunctionNames.json')).json()
	const suggestions = []

	functionFormats.forEach(fn => {
		suggestions.push({
			label: `\\${fn}`,
			kind: monaco.languages.CompletionItemKind.Function,
			insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
			insertText: fn,
		})
	})

	const snippets = ['frac{}{}', 'sqrt{}', 'sqrt[]{}', 'text{}']
	for (const fn of snippets) {
		let insertText = ''
		let placeholderNumber = 1
		for (const c of fn) {
			switch (c) {
				case '{':
					insertText += `{$${placeholderNumber++}`
					break
				case '[':
					insertText += `[$${placeholderNumber++}`
					break

				default:
					insertText += c
					break
			}
		}

		// The "0" makes Monaco sort the snippet above everything else
		suggestions.push({
			label: `\\${fn}`,
			sortText: '0',
			kind: monaco.languages.CompletionItemKind.Snippet,
			insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
			insertText: insertText,
		})
	}

	monaco.languages.registerCompletionItemProvider('tex', {
		triggerCharacters: ['\\'],
		provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext, token: monaco.CancellationToken) => {
			if (context.triggerKind != monaco.languages.CompletionTriggerKind.TriggerCharacter) return { suggestions: [] }
			return { suggestions: structuredClone(suggestions) }
		},
	})
}
