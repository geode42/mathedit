<script lang="ts">
	import katex from 'katex'
	import * as monaco from 'monaco-editor'
	import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
	import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
	import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
	import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
	import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
	import RadioButton from './lib/RadioButton.svelte'

	import '@melloware/coloris/dist/coloris.css'
	import Coloris from '@melloware/coloris'
	Coloris.init()
	Coloris({ el: '#coloris', parent: '#export-dialog', alpha: false, swatches: [] })

	import { onMount } from 'svelte'

	import { conf, language } from './lib/texlanguage'

	const editorBackgroundColors = {
		dark: '#1D1D1D',
		light: '#F8F8F8',
	}

	let darkTheme = false
	let colorSchemeOverridden = false
	let useConvenientTex = false

	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		darkTheme = true
	}

	const defaultTexText = '% Fractions\n\\frac{1}{2} \\\\\n\n% Square roots\n\\sqrt{2} \\\\\n\n% Equations\n\\begin{aligned}\n\t2x &= 10 \\\\\n\tx &= 5\n\\end{aligned}\n'
	const defaultConvenientTexText = '% Fractions\n\\frac{1}{2}\n\n% Square roots\n\\sqrt{2}\n\n% Equations\n2x = 10\nx = 5\n'

	self.MonacoEnvironment = {
		getWorker(_, label) {
			if (label == 'json') return new jsonWorker()
			if (label == 'css' || label == 'scss' || label == 'less') return new cssWorker()
			if (label == 'html' || label == 'handlebars' || label == 'razor') return new htmlWorker()
			if (label == 'typescript' || label == 'javascript') return new tsWorker()
			return new editorWorker()
		},
	}

	monaco.languages.register({
		id: 'tex',
	})

	monaco.languages.setMonarchTokensProvider('tex', language)

	monaco.languages.setLanguageConfiguration('tex', conf)

	monaco.editor.defineTheme('tex-light', {
		base: 'vs',
		inherit: true,
		rules: [
			{ token: 'tex-command', foreground: 'C000E0' },
			{ token: 'tex-equals-sign', foreground: 'C000E0' },
			{ token: 'tex-newline', foreground: 'C000E0' },
		],
		colors: {
			'editor.background': editorBackgroundColors.light,
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
			'editor.background': editorBackgroundColors.dark,
		},
	})

	async function createAutocompleteSuggestions() {
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
	createAutocompleteSuggestions()

	let mounted = false
	let editorAndPreviewContainer: HTMLDivElement
	let editor: monaco.editor.IStandaloneCodeEditor
	let editorContainer: HTMLDivElement
	let editorContainerWrapper: HTMLDivElement
	let editorDragIndicator: SVGElement
	let preview: HTMLDivElement
	let exportDialog: HTMLDialogElement

	$: (darkTheme => {
		if (!mounted) return
		monaco.editor.setTheme(darkTheme ? 'tex-dark' : 'tex-light')
		editorContainerWrapper.style.backgroundColor = darkTheme ? editorBackgroundColors.dark : editorBackgroundColors.light
	})(darkTheme)

	let renderPreview = () => {}
	let getFinalLatexFromEditor = () => ''
	onMount(() => {
		mounted = true
		editor = monaco.editor.create(editorContainer, {
			value: useConvenientTex ? defaultConvenientTexText : defaultTexText,
			language: 'tex',
			theme: darkTheme ? 'tex-dark' : 'tex-light',
			minimap: { enabled: false },
			automaticLayout: true,
			overviewRulerLanes: 0,
			scrollbar: {
				vertical: 'hidden',
			},
			fontFamily: 'JetBrains Mono',
			fontLigatures: true,
			contextmenu: true,
			lineNumbers: 'on',
			wordBasedSuggestions: false,
		})

		const convertConvenientTexToNormalTex = (convenientTex: string) => '\\begin{aligned}\n' + convenientTex.replaceAll(/(?<!%.*)\n/g, '\n\\\\').replaceAll('=', '&=') + '\n\\end{aligned}'

		getFinalLatexFromEditor = () => (useConvenientTex ? convertConvenientTexToNormalTex(editor.getValue()) : editor.getValue())

		renderPreview = () => {
			try {
				const previewElement = katex.renderToString(getFinalLatexFromEditor())
				preview.innerHTML = previewElement
				monaco.editor.setModelMarkers(editor.getModel(), 'tex', [])
			} catch (error) {
				let position = editor.getModel().getPositionAt(error.position)
				if (useConvenientTex) {
					let srcLocation = 0
					let outLocation = '\\begin{aligned}\n'.length
					for (const c of editor.getValue()) {
						if (outLocation >= error.position) {
							break
						}
						switch (c) {
							case '\n':
								outLocation += 3
								break
							case '=':
								outLocation += 2
								break

							default:
								outLocation += 1
								break
						}
						srcLocation += 1
					}
					position = editor.getModel().getPositionAt(srcLocation)
				}

				monaco.editor.setModelMarkers(editor.getModel(), 'tex', [
					{
						severity: 8,
						message: error.message.split(' at position')[0].split('KaTeX parse error: ').at(-1),
						startLineNumber: position.lineNumber,
						startColumn: position.column,
						endLineNumber: position.lineNumber,
						endColumn: position.column + 1,
					},
				])
			}
		}

		renderPreview()

		editor.onDidChangeModelContent(() => {
			renderPreview()
		})

		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
			if (colorSchemeOverridden) return
			darkTheme = event.matches
		})
		editorContainerWrapper.style.width = `${Math.min(document.body.clientWidth / 2, 600)}px`

		exportDialog.addEventListener('mousedown', e => {
			if (e.buttons == 1 && e.target == exportDialog) {
				exportDialog.close()
			}
		})
	})

	let resizingEditor = false
	const draggableBorderRadius = 14
	const collapsedEditorWidth = 20
	const editorPaddingRight = 32
	document.addEventListener('mousedown', event => {
		if (!(editorContainerWrapper.contains(event.target) || preview.contains(event.target))) return
		const editorWidth = editorContainerWrapper.offsetWidth
		if (Math.abs(event.clientX - editorWidth) <= draggableBorderRadius || (editorWidth == collapsedEditorWidth && event.clientX <= editorWidth)) {
			resizingEditor = true
		}
	})
	document.addEventListener('mouseup', event => {
		resizingEditor = false
	})
	document.addEventListener('mousemove', event => {
		if (!editorAndPreviewContainer.contains(event.target)) {
			return
		}
		const editorWidth = editorContainerWrapper.offsetWidth
		if (Math.abs(event.clientX - editorWidth) <= draggableBorderRadius || (editorWidth == collapsedEditorWidth && event.clientX <= editorWidth) || resizingEditor)
			document.body.classList.add('horizontal-resize-cursor')
		else document.body.classList.remove('horizontal-resize-cursor')

		if (!resizingEditor) return

		if (event.clientX <= collapsedEditorWidth) {
			editorContainerWrapper.style.width = `${collapsedEditorWidth}px`
			editorDragIndicator.removeAttribute('hidden')
		} else {
			editorContainerWrapper.style.width = `${event.clientX}px`
			editorContainerWrapper.style.paddingRight = `${editorPaddingRight}px`
			editorDragIndicator.setAttribute('hidden', '')
		}
		if (event.clientX < editorPaddingRight) {
			editorContainerWrapper.style.paddingRight = '0'
		}
	})

	let exportFormat = 'svg'
	let exportRasterScale = 10
	let exportLossyQualityScale = 100
	let exportJpegBackgroundColor = '#FFFFFF'
	let exportPreview = document.createElement('img')
	let exportRes = { width: 0, height: 0 }

	$: exportFormat, exportRasterScale, exportLossyQualityScale, exportJpegBackgroundColor, renderExportPreview()

	async function renderExportPreview() {
		if (typeof editor === 'undefined') return
		const svg = (await MathJax.tex2svgPromise(getFinalLatexFromEditor())).firstChild
		if (exportFormat == 'svg') {
			exportPreview.src = `data:image/svg+xml;base64,${btoa(svg.outerHTML)}`
			return
		}
		const img = document.createElement('img')
		img.src = `data:image/svg+xml;base64,${btoa(svg.outerHTML)}`
		img.onload = () => {
			const canvas = document.createElement('canvas')
			exportRes.width = Math.ceil(img.width * exportRasterScale)
			exportRes.height = Math.ceil(img.height * exportRasterScale)
			canvas.width = Math.ceil(img.width * exportRasterScale)
			canvas.height = Math.ceil(img.height * exportRasterScale)
			const ctx = canvas.getContext('2d')

			// Jpeg doesn't support transparency
			if (exportFormat == 'jpeg') {
				ctx.fillStyle = exportJpegBackgroundColor
				ctx.fillRect(0, 0, canvas.width, canvas.height)
			}

			ctx.drawImage(img, 0, 0, img.width * exportRasterScale, img.height * exportRasterScale)
			exportPreview.src = canvas.toDataURL(`image/${exportFormat}`, exportLossyQualityScale / 100)
		}
	}

	const HexToRGB = (hex: string) => {
		if (hex.startsWith('#')) hex = hex.substring(1)
		switch (hex.length) {
			case 3:
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
				break
			case 4:
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
				break
			case 8:
				hex = hex.slice(0, -2)
				break
		}

		const bigint = parseInt(hex, 16)
		return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
	}

	function getUseDarkForegroundBasedOnBackgroundColor(bgHex: string) {
		const [r, g, b] = HexToRGB(bgHex)
		const uicolors = [r / 255, g / 255, b / 255]
		const c = uicolors.map(col => {
			if (col <= 0.03928) {
				return col / 12.92
			}
			return Math.pow((col + 0.055) / 1.055, 2.4)
		})
		const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
		return L > 0.179
	}

	$: darkTheme, document.documentElement.style.setProperty('--background', darkTheme ? '#242424' : '#FFFFFF')
	$: darkTheme, document.documentElement.style.setProperty('--foreground', darkTheme ? 'rgba(255, 255, 255, 0.87)' : 'black')
	$: darkTheme, document.documentElement.style.setProperty('--button-background', darkTheme ? '#222' : '#F4F4F4')
	$: darkTheme, document.documentElement.style.setProperty('--button-border', darkTheme ? '#444' : '#CCC')
	$: darkTheme, document.documentElement.style.setProperty('--button-hover-background', darkTheme ? '#444' : '#CCC')
	$: darkTheme, document.documentElement.style.setProperty('--radio-button-active-background', darkTheme ? '#56E05280' : '#3AFF3380')
	$: darkTheme, document.documentElement.style.setProperty('--radio-button-active-border', darkTheme ? '#36A932' : '#60D65C')
	$: darkTheme, document.documentElement.style.setProperty('--input-background', darkTheme ? '#090909' : '#EEE')
</script>

<main>
	<div bind:this={editorAndPreviewContainer} id="editor-and-preview-container">
		<div bind:this={editorContainerWrapper} id="editor-container-wrapper">
			<div bind:this={editorContainer} id="editor-container" style:backgroundColor={editorBackgroundColors.dark} />
			<svg
				bind:this={editorDragIndicator}
				hidden
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 -960 960 960"
				width="20"
				style="position: absolute; top: 50%; left: 50%; translate: -50% -50%; opacity: 0.5"
				><path
					fill="currentColor"
					d="M349.911-160Q321-160 300.5-180.589q-20.5-20.588-20.5-49.5Q280-259 300.589-279.5q20.588-20.5 49.5-20.5Q379-300 399.5-279.411q20.5 20.588 20.5 49.5Q420-201 399.411-180.5q-20.588 20.5-49.5 20.5Zm260 0Q581-160 560.5-180.589q-20.5-20.588-20.5-49.5Q540-259 560.589-279.5q20.588-20.5 49.5-20.5Q639-300 659.5-279.411q20.5 20.588 20.5 49.5Q680-201 659.411-180.5q-20.588 20.5-49.5 20.5Zm-260-250Q321-410 300.5-430.589q-20.5-20.588-20.5-49.5Q280-509 300.589-529.5q20.588-20.5 49.5-20.5Q379-550 399.5-529.411q20.5 20.588 20.5 49.5Q420-451 399.411-430.5q-20.588 20.5-49.5 20.5Zm260 0Q581-410 560.5-430.589q-20.5-20.588-20.5-49.5Q540-509 560.589-529.5q20.588-20.5 49.5-20.5Q639-550 659.5-529.411q20.5 20.588 20.5 49.5Q680-451 659.411-430.5q-20.588 20.5-49.5 20.5Zm-260-250Q321-660 300.5-680.589q-20.5-20.588-20.5-49.5Q280-759 300.589-779.5q20.588-20.5 49.5-20.5Q379-800 399.5-779.411q20.5 20.588 20.5 49.5Q420-701 399.411-680.5q-20.588 20.5-49.5 20.5Zm260 0Q581-660 560.5-680.589q-20.5-20.588-20.5-49.5Q540-759 560.589-779.5q20.588-20.5 49.5-20.5Q639-800 659.5-779.411q20.5 20.588 20.5 49.5Q680-701 659.411-680.5q-20.588 20.5-49.5 20.5Z"
				/></svg
			>
		</div>
		<div bind:this={preview} class="select-none p-8" />
	</div>

	<div id="bottom-right-buttons">
		<button
			on:click={() => {
				exportDialog.showModal()
				renderExportPreview()
			}}
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"
				><path
					fill="currentColor"
					d="M220-40q-24 0-42-18t-18-42v-509q0-24 18-42t42-18h169v60H220v509h520v-509H569v-60h171q24 0 42 18t18 42v509q0 24-18 42t-42 18H220Zm229-307v-457l-88 88-43-43 161-161 161 161-43 43-88-88v457h-60Z"
				/></svg
			>
		</button>
		<button
			on:click={() => {
				if (editor.getValue() == (useConvenientTex ? defaultConvenientTexText : defaultTexText)) {
					editor.setValue(useConvenientTex ? defaultTexText : defaultConvenientTexText)
				}
				useConvenientTex = !useConvenientTex
				renderPreview()
			}}
		>
			{#if useConvenientTex}
				<svg
					style="vertical-align: -0.488ex;"
					xmlns="http://www.w3.org/2000/svg"
					width="4.672ex"
					height="2.033ex"
					role="img"
					focusable="false"
					viewBox="0 -683 2065 898.5"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					aria-hidden="true"
					><defs
						><path
							id="MJX-24-TEX-I-1D447"
							d="M40 437Q21 437 21 445Q21 450 37 501T71 602L88 651Q93 669 101 677H569H659Q691 677 697 676T704 667Q704 661 687 553T668 444Q668 437 649 437Q640 437 637 437T631 442L629 445Q629 451 635 490T641 551Q641 586 628 604T573 629Q568 630 515 631Q469 631 457 630T439 622Q438 621 368 343T298 60Q298 48 386 46Q418 46 427 45T436 36Q436 31 433 22Q429 4 424 1L422 0Q419 0 415 0Q410 0 363 1T228 2Q99 2 64 0H49Q43 6 43 9T45 27Q49 40 55 46H83H94Q174 46 189 55Q190 56 191 56Q196 59 201 76T241 233Q258 301 269 344Q339 619 339 625Q339 630 310 630H279Q212 630 191 624Q146 614 121 583T67 467Q60 445 57 441T43 437H40Z"
						/><path
							id="MJX-24-TEX-I-1D438"
							d="M492 213Q472 213 472 226Q472 230 477 250T482 285Q482 316 461 323T364 330H312Q311 328 277 192T243 52Q243 48 254 48T334 46Q428 46 458 48T518 61Q567 77 599 117T670 248Q680 270 683 272Q690 274 698 274Q718 274 718 261Q613 7 608 2Q605 0 322 0H133Q31 0 31 11Q31 13 34 25Q38 41 42 43T65 46Q92 46 125 49Q139 52 144 61Q146 66 215 342T285 622Q285 629 281 629Q273 632 228 634H197Q191 640 191 642T193 659Q197 676 203 680H757Q764 676 764 669Q764 664 751 557T737 447Q735 440 717 440H705Q698 445 698 453L701 476Q704 500 704 528Q704 558 697 578T678 609T643 625T596 632T532 634H485Q397 633 392 631Q388 629 386 622Q385 619 355 499T324 377Q347 376 372 376H398Q464 376 489 391T534 472Q538 488 540 490T557 493Q562 493 565 493T570 492T572 491T574 487T577 483L544 351Q511 218 508 216Q505 213 492 213Z"
						/><path
							id="MJX-24-TEX-I-1D44B"
							d="M42 0H40Q26 0 26 11Q26 15 29 27Q33 41 36 43T55 46Q141 49 190 98Q200 108 306 224T411 342Q302 620 297 625Q288 636 234 637H206Q200 643 200 645T202 664Q206 677 212 683H226Q260 681 347 681Q380 681 408 681T453 682T473 682Q490 682 490 671Q490 670 488 658Q484 643 481 640T465 637Q434 634 411 620L488 426L541 485Q646 598 646 610Q646 628 622 635Q617 635 609 637Q594 637 594 648Q594 650 596 664Q600 677 606 683H618Q619 683 643 683T697 681T738 680Q828 680 837 683H845Q852 676 852 672Q850 647 840 637H824Q790 636 763 628T722 611T698 593L687 584Q687 585 592 480L505 384Q505 383 536 304T601 142T638 56Q648 47 699 46Q734 46 734 37Q734 35 732 23Q728 7 725 4T711 1Q708 1 678 1T589 2Q528 2 496 2T461 1Q444 1 444 10Q444 11 446 25Q448 35 450 39T455 44T464 46T480 47T506 54Q523 62 523 64Q522 64 476 181L429 299Q241 95 236 84Q232 76 232 72Q232 53 261 47Q262 47 267 47T273 46Q276 46 277 46T280 45T283 42T284 35Q284 26 282 19Q279 6 276 4T261 1Q258 1 243 1T201 2T142 2Q64 2 42 0Z"
						/></defs
					><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)"
						><g data-mml-node="math"
							><g data-mml-node="mi"><use data-c="1D447" xlink:href="#MJX-24-TEX-I-1D447" /></g><g data-mml-node="mspace" transform="translate(704,0)" /><g
								data-mml-node="mpadded"
								transform="translate(564,0)"
								><g transform="translate(0,-215.5)"
									><g data-mml-node="TeXAtom" data-mjx-texclass="ORD"><g data-mml-node="mi"><use data-c="1D438" xlink:href="#MJX-24-TEX-I-1D438" /></g></g></g
								></g
							><g data-mml-node="mspace" transform="translate(1328,0)" /><g data-mml-node="mi" transform="translate(1213,0)"
								><use data-c="1D44B" xlink:href="#MJX-24-TEX-I-1D44B" /></g
							></g
						></g
					></svg
				>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
					<rect width="90" height="12" x="5" y="28" fill="currentColor" />
					<rect width="90" height="12" x="5" y="60" fill="currentColor" />
				</svg>
			{/if}
		</button>

		<button
			on:click={() => {
				darkTheme = !darkTheme
				colorSchemeOverridden = true
			}}
			aria-label="Toggle Dark Mode"
		>
			{#if darkTheme}
				<!-- light mode icon -->
				<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 96 880 880"
					><path
						fill="currentColor"
						d="M439.765 676Q498 676 539 635.235q41-40.764 41-99Q580 478 539.235 437q-40.764-41-99-41Q382 396 341 436.765q-41 40.764-41 99Q300 594 340.765 635q40.764 41 99 41zm.235 60q-83 0-141.5-58.5T240 536q0-83 58.5-141.5T440 336q83 0 141.5 58.5T640 536q0 83-58.5 141.5T440 736ZM30 566q-12.75 0-21.375-8.675Q0 548.649 0 535.825 0 523 8.625 514.5T30 506h100q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T130 566Zm720 0q-12.75 0-21.375-8.675-8.625-8.676-8.625-21.5 0-12.825 8.625-21.325T750 506h100q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T850 566ZM439.825 256Q427 256 418.5 247.375T410 226V126q0-12.75 8.675-21.375Q427.351 96 440.175 96 453 96 461.5 104.625T470 126v100q0 12.75-8.675 21.375-8.676 8.625-21.5 8.625zm0 720Q427 976 418.5 967.38 410 958.75 410 946V846q0-12.75 8.675-21.375 8.676-8.625 21.5-8.625 12.825 0 21.325 8.625T470 846v100q0 12.75-8.675 21.38-8.676 8.62-21.5 8.62zM200 338l-57-56q-9-9-8.629-21.603.37-12.604 8.526-21.5 8.896-8.897 21.5-8.897Q177 230 186 239l56 57q8 9 8 21t-8 20.5q-8 8.5-20.5 8.5t-21.5-8zm494 495-56-57q-8-9-8-21.375T638.5 734q8.5-9 20.5-9t21 9l57 56q9 9 8.629 21.603-.37 12.604-8.526 21.5-8.896 8.897-21.5 8.897Q703 842 694 833Zm-56-495q-9-9-9-21t9-21l56-57q9-9 21.603-8.629 12.604.37 21.5 8.526 8.897 8.896 8.897 21.5Q746 273 737 282l-57 56q-8 8-20.364 8-12.363 0-21.636-8zM142.897 833.103q-8.897-8.896-8.897-21.5Q134 799 143 790l57-56q8.8-9 20.9-9 12.1 0 20.709 9Q251 743 251 755t-9 21l-56 57q-9 9-21.603 8.629-12.604-.37-21.5-8.526zM440 536Z"
					/></svg
				>
			{:else}
				<!-- dark mode icon -->
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 720 720"
					><path
						d="M360 816q-150 0-255-105T0 456q0-150 105-255T360 96q8 0 17 .5t23 1.5q-36 32-56 79t-20 99q0 90 63 153t153 63q52 0 99-18.5t79-51.5q1 12 1.5 19.5t.5 14.5q0 150-105 255T360 816zm0-60q109 0 190-67.5T651 530q-25 11-53.667 16.5Q568.667 552 540 552q-114.689 0-195.345-80.655Q264 390.689 264 276q0-24 5-51.5t18-62.5q-98 27-162.5 109.5T60 456q0 125 87.5 212.5T360 756Zm-4-297z"
					/></svg
				>
			{/if}
		</button>

		<a href="https://github.com/geode42/geode42-matheditor" aria-label="Go to source code" target="_blank" rel="noreferrer noopener" style:color={darkTheme ? 'white' : 'black'}>
			<!-- github-mark -->
			<svg aria-hidden="true" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"
				><path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
					fill="currentColor"
				/></svg
			>
		</a>
	</div>
	<dialog bind:this={exportDialog} id="export-dialog">
		<div id="export-menu">
			<div id="export-options">
				<div id="export-option-buttons">
					<RadioButton onclick={() => (exportFormat = 'svg')} active={true}>SVG</RadioButton>
					<RadioButton onclick={() => (exportFormat = 'png')}>PNG</RadioButton>
					<RadioButton onclick={() => (exportFormat = 'jpeg')}>JPEG</RadioButton>
					<RadioButton onclick={() => (exportFormat = 'webp')}>WebP</RadioButton>
				</div>

				<img bind:this={exportPreview} src="" alt="" />

				<div class={['png', 'jpeg', 'webp'].includes(exportFormat) ? '' : 'hidden'}>
					<label for="export-ex-scale-input">Scale</label>
					<input id="export-ex-scale-input" bind:value={exportRasterScale} type="number" />
				</div>
				<div class={['jpeg', 'webp'].includes(exportFormat) ? '' : 'hidden'}>
					<label for="export-quality-input">Quality</label>
					<input id="export-quality-input" bind:value={exportLossyQualityScale} type="number" />
				</div>
				<div class={exportFormat == 'jpeg' ? '' : 'hidden'}>
					<label for="export-jpeg-background-color">Background Color (jpeg doesn't support transparency)</label>
					<input
						style="background: {exportJpegBackgroundColor}; color: {getUseDarkForegroundBasedOnBackgroundColor(exportJpegBackgroundColor) ? 'black' : 'white'}"
						id="export-jpeg-background-color"
						bind:value={exportJpegBackgroundColor}
						type="text"
						data-coloris
					/>
				</div>
			</div>
			<div id="export-preview-wrapper">
				<img id="export-preview" bind:this={exportPreview} src="" alt="" />
			</div>
			<div id="export-info" style:display={exportFormat == 'svg' ? 'none' : 'flex'}>
				<span>{exportRes.width}</span><span>&times;</span><span>{exportRes.height}</span>
			</div>
			<div id="export-instructions">Right-click on the image above and copy it, save it, do whatever you like :)</div>
		</div>
	</dialog>
</main>

<style lang="scss">
	main {
		margin: 0;
		display: flex;
		height: 100vh;
		background-color: var(--background);
		color: var(--foreground);
	}

	dialog {
		background-color: var(--background);
		color: var(--foreground);
	}

	:global(:root) {
		--button-background: #f4f4f4;
		--button-border: #ccc;
		--button-hover-background: var(--button-border);
		--radio-button-active-background: hsla(118, 100%, 60%, 0.5);
		--radio-button-active-border: hsl(118, 60%, 60%);

		// These are defined in JS
		--background: asd;
		--foreground: asdf;
		--radio-button-active-background: dasd;
		--radio-button-active-border: asdwq;
		--input-background: asddsad;
	}

	.radio-button.active {
		background-color: var(--radio-button-active-background);
		border-color: var(--radio-button-active-border);
	}

	input {
		background-color: var(--input-background);
	}

	#editor-and-preview-container {
		height: 100%;
		width: 100%;

		display: flex;
	}

	#editor-container-wrapper {
		position: relative;
		width: 50%;
		padding-right: 2rem;
		padding-top: 2rem;
		border-right: 1.5px solid #80808020;
	}

	#editor-container {
		width: 100%;
		height: 100%;
	}

	#export-dialog {
		padding: 0;
		border-radius: 2rem;
		overflow: visible; // To get the color picker to work
		opacity: 0;
		display: block;
		transition: opacity 100ms;
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		pointer-events: none;

		&[open] {
			opacity: 1;
			top: 0;
			translate: none;
			pointer-events: initial;

			// &::backdrop {
			// opacity: 1;
			// background-color: #000000;
			// }
		}

		// &::backdrop {
		// opacity: 0;
		// background-color: #FFFFFF;
		// transition: all 1000ms
		// }

		// The backdrop doesn't feel like animating :(
	}

	#export-menu {
		padding: 1.5rem;
	}

	#export-options {
		height: 8rem;
	}

	#export-option-buttons {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 0.3rem;
		margin-bottom: 0.3rem;
	}

	#export-preview-wrapper {
		width: 100%;
		display: grid;
		position: relative;
		place-items: center;
		background-color: white;
		border-radius: 1rem;
	}

	img#export-preview {
		width: 45rem;
		height: 20rem;
		object-fit: contain;
		box-sizing: unset;
		padding-inline: calc((100% - 45rem) / 2);
		padding-block: 3rem;
	}

	#export-info {
		float: right;
		margin-right: 0.5rem;
		display: flex;
		gap: 0.2rem;
		opacity: 0.4;
		font-weight: 500;
		font-size: 0.95rem;
	}

	#export-options label {
		font-weight: 500;
		opacity: 0.8;
	}

	#export-options input {
		box-sizing: unset;
		width: 7ch;
		font-family: 'JetBrains Mono';
		margin-bottom: 0.1rem;
		border-radius: 0.3rem;
		padding-inline: 0.2rem;
	}

	input#export-ex-scale-input {
		width: 2ch;
	}

	input#export-quality-input {
		width: 3ch;
	}

	#export-instructions {
		margin-top: 2rem;
		margin-bottom: -0.5rem;
		text-align: center;
	}

	#bottom-right-buttons {
		position: absolute;
		bottom: 1.25rem;
		right: 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
	}

	#bottom-right-buttons > * {
		border-radius: 9999px;
		opacity: 0.5;
		width: 45px;
		height: 45px;
		background-color: transparent;
		border: none;
		padding: 0;

		&:hover {
			opacity: 0.9;
		}
	}

	#bottom-right-buttons > * > svg {
		width: 45px;
	}
</style>
