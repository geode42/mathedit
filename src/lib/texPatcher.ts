export interface TexPatcherConfig {
	autoNewlines?: boolean
	commentMarker?: string
	baseEnvironment?: string
	equalsSignToAmpersandEquals?: boolean
}

export function compile(config: TexPatcherConfig, patchedTex: string): string {
	const newlinesWithoutACommentBeforeThemRegex = /(?<!%.*)\n/g
	
	let text = patchedTex
	
	if (config.commentMarker) {
		text = text.replaceAll('%', '\\%')
		text = text.replaceAll(new RegExp(`(?<!\\\\)${config.commentMarker}`, 'g'), '%')
	}

	if (config.autoNewlines) {
		text = text.replaceAll(newlinesWithoutACommentBeforeThemRegex, '\\\\\n')
	}

	if (config.baseEnvironment) {
		text = `\\begin{${config.baseEnvironment}}\n` + text + `\n\\end{${config.baseEnvironment}}`
	}

	if (config.equalsSignToAmpersandEquals) {
		text = text.replaceAll('=', '&=')
	}

	return text
}

export function texPositionToTexPatchPosition(config: TexPatcherConfig, patchedTex: string, texPosition: number) {
	// TODO: Make multi-character-long comment markers work

	let srcLocation = 0
	let outLocation = 0

	if (config.baseEnvironment) outLocation += `\\begin{${config.baseEnvironment}}\n`.length

	for (const c of patchedTex) {
		if (outLocation >= texPosition) break

		switch (c) {
			case '\n':
				if (!config.autoNewlines) break
				outLocation += 3
				break
			case '=':
				if (!config.equalsSignToAmpersandEquals) break
				outLocation += 2
				break

			default:
				outLocation += 1
				break
		}

		srcLocation += 1
	}

	return srcLocation
}