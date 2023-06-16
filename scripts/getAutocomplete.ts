// At first I tried getting the number of parameters for each option, but that proved more difficult than I had expected so I settled with getting the function names
// TODO: KaTeX has a file at /src/functions.js, which loads everything from the functions directory and *I'm guessing* defines all the functions KaTeX supports (except for macros, which as determined are separate). The files in /src/functions/ seem to define the number of parameters in addition to the names, which would be a lot more reliable than guessing them from the support table below. This comment feels rambly but it's 12:53 AM and I'm tired

const katexSupportTable = await(await fetch('https://raw.githubusercontent.com/KaTeX/KaTeX/main/docs/support_table.md')).text()

// From /src/macros.js in KaTeX's git repo
const katexBuiltinMacros = `defineMacro("\\blue", "\\textcolor{##6495ed}{#1}");
defineMacro("\\orange", "\\textcolor{##ffa500}{#1}");
defineMacro("\\pink", "\\textcolor{##ff00af}{#1}");
defineMacro("\\red", "\\textcolor{##df0030}{#1}");
defineMacro("\\green", "\\textcolor{##28ae7b}{#1}");
defineMacro("\\gray", "\\textcolor{gray}{#1}");
defineMacro("\\purple", "\\textcolor{##9d38bd}{#1}");
defineMacro("\\blueA", "\\textcolor{##ccfaff}{#1}");
defineMacro("\\blueB", "\\textcolor{##80f6ff}{#1}");
defineMacro("\\blueC", "\\textcolor{##63d9ea}{#1}");
defineMacro("\\blueD", "\\textcolor{##11accd}{#1}");
defineMacro("\\blueE", "\\textcolor{##0c7f99}{#1}");
defineMacro("\\tealA", "\\textcolor{##94fff5}{#1}");
defineMacro("\\tealB", "\\textcolor{##26edd5}{#1}");
defineMacro("\\tealC", "\\textcolor{##01d1c1}{#1}");
defineMacro("\\tealD", "\\textcolor{##01a995}{#1}");
defineMacro("\\tealE", "\\textcolor{##208170}{#1}");
defineMacro("\\greenA", "\\textcolor{##b6ffb0}{#1}");
defineMacro("\\greenB", "\\textcolor{##8af281}{#1}");
defineMacro("\\greenC", "\\textcolor{##74cf70}{#1}");
defineMacro("\\greenD", "\\textcolor{##1fab54}{#1}");
defineMacro("\\greenE", "\\textcolor{##0d923f}{#1}");
defineMacro("\\goldA", "\\textcolor{##ffd0a9}{#1}");
defineMacro("\\goldB", "\\textcolor{##ffbb71}{#1}");
defineMacro("\\goldC", "\\textcolor{##ff9c39}{#1}");
defineMacro("\\goldD", "\\textcolor{##e07d10}{#1}");
defineMacro("\\goldE", "\\textcolor{##a75a05}{#1}");
defineMacro("\\redA", "\\textcolor{##fca9a9}{#1}");
defineMacro("\\redB", "\\textcolor{##ff8482}{#1}");
defineMacro("\\redC", "\\textcolor{##f9685d}{#1}");
defineMacro("\\redD", "\\textcolor{##e84d39}{#1}");
defineMacro("\\redE", "\\textcolor{##bc2612}{#1}");
defineMacro("\\maroonA", "\\textcolor{##ffbde0}{#1}");
defineMacro("\\maroonB", "\\textcolor{##ff92c6}{#1}");
defineMacro("\\maroonC", "\\textcolor{##ed5fa6}{#1}");
defineMacro("\\maroonD", "\\textcolor{##ca337c}{#1}");
defineMacro("\\maroonE", "\\textcolor{##9e034e}{#1}");
defineMacro("\\purpleA", "\\textcolor{##ddd7ff}{#1}");
defineMacro("\\purpleB", "\\textcolor{##c6b9fc}{#1}");
defineMacro("\\purpleC", "\\textcolor{##aa87ff}{#1}");
defineMacro("\\purpleD", "\\textcolor{##7854ab}{#1}");
defineMacro("\\purpleE", "\\textcolor{##543b78}{#1}");
defineMacro("\\mintA", "\\textcolor{##f5f9e8}{#1}");
defineMacro("\\mintB", "\\textcolor{##edf2df}{#1}");
defineMacro("\\mintC", "\\textcolor{##e0e5cc}{#1}");
defineMacro("\\grayA", "\\textcolor{##f6f7f7}{#1}");
defineMacro("\\grayB", "\\textcolor{##f0f1f2}{#1}");
defineMacro("\\grayC", "\\textcolor{##e3e5e6}{#1}");
defineMacro("\\grayD", "\\textcolor{##d6d8da}{#1}");
defineMacro("\\grayE", "\\textcolor{##babec2}{#1}");
defineMacro("\\grayF", "\\textcolor{##888d93}{#1}");
defineMacro("\\grayG", "\\textcolor{##626569}{#1}");
defineMacro("\\grayH", "\\textcolor{##3b3e40}{#1}");
defineMacro("\\grayI", "\\textcolor{##21242c}{#1}");
defineMacro("\\kaBlue", "\\textcolor{##314453}{#1}");
defineMacro("\\kaGreen", "\\textcolor{##71B307}{#1}");`

const functionsFormats = new Map()

function getFunctionNames(string: string) {
	const regex = /\\[a-zA-Z]+/g

	const matches = string.matchAll(regex)

	for (const match of matches) {
		let name = match[0].substring(1)
		if (!functionsFormats.has(name)) functionsFormats.set(name, [])
		let bracketParameters = 0
		let curlyBracketParameters = 0

		let justClosed = true

		let bracketsDeep = 0
		for (let index = (match.index || 0) + name.length; true; index++) {
			const c = katexSupportTable[index]

			if (justClosed && (c == '{' || c == '[' || c == ' ')) {
				bracketsDeep++
				justClosed = false
			} else if (bracketsDeep && (c == '}' || c == ']' || c == ' ')) {
				bracketsDeep--
				justClosed = true
				if (c == '}' || c == ' ') curlyBracketParameters++
				else bracketParameters++
			} else if (bracketsDeep == 0) {
				break
			}
		}

		const format = {
			bracketParameters: bracketParameters,
			curlyBracketParameters: curlyBracketParameters,
		}

		if (!functionsFormats.get(name).some(i => i.bracketParameters == format.bracketParameters && i.curlyBracketParameters == format.curlyBracketParameters)) {
			functionsFormats.get(name).push(format)
		}
	}
}

getFunctionNames(katexSupportTable)
getFunctionNames(katexBuiltinMacros)

console.log(functionsFormats)

// Deno.writeTextFile('./texfunctionformats.json', JSON.stringify([...[...functionsFormats.entries()].map(i => ({name: i[0], parameterOptions: i[1]}))]))
await Deno.writeTextFile('./texFunctionNames.json', JSON.stringify([...functionsFormats.keys()]))

// console.log(katexSupportTable)
