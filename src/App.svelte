<script lang="ts">
	// Misc
	import katex from 'katex'
	import RadioButton from './lib/RadioButton.svelte'
	import TexPatcherInput from './lib/TexPatcherInput.svelte'
	import { onMount } from 'svelte'
	import { closeDialogIfClickedOn } from './lib/closeDialogIfClickedOnAction'

	// Monaco
	import * as monaco from 'monaco-editor'
	import * as monacoInits from './lib/monacoInits'
	import * as texPatcher from './lib/texPatcher'

	// Coloris
	import '@melloware/coloris/dist/coloris.css'
	import Coloris from '@melloware/coloris'

	/* ------------------------------ HTML elements ----------------------------- */
	let editorAndPreviewContainer: HTMLDivElement
	let editor: monaco.editor.IStandaloneCodeEditor
	let editorContainer: HTMLDivElement
	let editorContainerWrapper: HTMLDivElement
	let editorDragIndicator: SVGElement
	let preview: HTMLDivElement
	let exportDialog: HTMLDialogElement
	let texPatcherDialog: HTMLDialogElement


	/* ------------------------------ Color picker ------------------------------ */
	Coloris.init()

	/* -------------------- The editor portion of the editor -------------------- */
	const editorBackgroundColors = {
		dark: '#1D1D1D',
		light: '#F8F8F8',
	}
	const defaultTexText = '% Fractions\n\\frac{1}{2} \\\\\n\n% Square roots\n\\sqrt{2} \\\\\n\n% Equations\n\\begin{aligned}\n\t2x &= 10 \\\\\n\tx &= 5\n\\end{aligned}\n'

	let darkTheme = false
	let colorSchemeOverridden = false
	let mounted = false
	const texPatcherConfig: texPatcher.TexPatcherConfig = {
		autoNewlines: false,
		commentMarker: '',
		baseEnvironment: '',
		equalsSignToAmpersandEquals: false,
	}

	monacoInits.setMonacoEnvironment()
	monacoInits.registerTexLanguage()
	monacoInits.registerThemes('#389535', '#22BF1D')  // Very bad
	monacoInits.createAutocompleteSuggestions()

	// Update comment stuff when comment marker changes
	$: texPatcherConfig.commentMarker, monacoInits.setTexLanguageStuff(texPatcherConfig.commentMarker || '%')


	/* ------------------------------- Dark theme ------------------------------- */
	function updateEditorTheme() {
		if (!mounted) return
		monaco.editor.setTheme(darkTheme ? 'tex-dark' : 'tex-light')
		editorContainerWrapper.style.backgroundColor = darkTheme ? editorBackgroundColors.dark : editorBackgroundColors.light
	}

	// Auto enable dark theme
	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) darkTheme = true
	
	// Detect changes in preferred theme
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
		if (colorSchemeOverridden) return
		darkTheme = event.matches
	})

	// Automatically switch themes
	$: darkTheme, updateEditorTheme()

	
	function getFinalLatexFromEditor() {
		if (!mounted) return ''
		return texPatcher.compile(texPatcherConfig, editor.getValue())
	}

	function renderPreview() {
		try {
			preview.innerHTML = katex.renderToString(getFinalLatexFromEditor())
			monaco.editor.setModelMarkers(editor.getModel(), 'tex', [])
		} catch (error) {
			let position = editor.getModel().getPositionAt(texPatcher.texPositionToTexPatchPosition(texPatcherConfig, editor.getValue(), error.position))

			monaco.editor.setModelMarkers(editor.getModel(), 'tex', [
				{
					severity: monaco.MarkerSeverity.Error,
					message: error.message.split(' at position')[0].split('KaTeX parse error: ').at(-1),
					startLineNumber: position.lineNumber,
					startColumn: position.column,
					endLineNumber: position.lineNumber,
					endColumn: position.column + 1,
				},
			])
		}
	}


	onMount(() => {
		mounted = true
		editor = monaco.editor.create(editorContainer, {
			value: defaultTexText,
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

		editor.onDidChangeModelContent(() => {
			renderPreview()
		})

		editorContainerWrapper.style.width = `${Math.min(document.body.clientWidth / 2, 600)}px`

		renderPreview()
		updateEditorTheme()
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

	let exportFormat = 'png'
	let exportRasterScale = 10
	let exportLossyQualityScale = 100
	let exportBackgroundColor = '#FFFFFF'
	let exportForegroundColor = '#000000'
	let exportPreview = document.createElement('img')
	let exportRes = { width: 0, height: 0 }

	function patchTexForMathJax(tex: string) {
		const katexColors = {
			blue: '#6495ed',
			orange: '#ffa500',
			pink: '#ff00af',
			red: '#df0030',
			green: '#28ae7b',
			gray: 'gray',
			purple: '#9d38bd',
			blueA: '#ccfaff',
			blueB: '#80f6ff',
			blueC: '#63d9ea',
			blueD: '#11accd',
			blueE: '#0c7f99',
			tealA: '#94fff5',
			tealB: '#26edd5',
			tealC: '#01d1c1',
			tealD: '#01a995',
			tealE: '#208170',
			greenA: '#b6ffb0',
			greenB: '#8af281',
			greenC: '#74cf70',
			greenD: '#1fab54',
			greenE: '#0d923f',
			goldA: '#ffd0a9',
			goldB: '#ffbb71',
			goldC: '#ff9c39',
			goldD: '#e07d10',
			goldE: '#a75a05',
			redA: '#fca9a9',
			redB: '#ff8482',
			redC: '#f9685d',
			redD: '#e84d39',
			redE: '#bc2612',
			maroonA: '#ffbde0',
			maroonB: '#ff92c6',
			maroonC: '#ed5fa6',
			maroonD: '#ca337c',
			maroonE: '#9e034e',
			purpleA: '#ddd7ff',
			purpleB: '#c6b9fc',
			purpleC: '#aa87ff',
			purpleD: '#7854ab',
			purpleE: '#543b78',
			mintA: '#f5f9e8',
			mintB: '#edf2df',
			mintC: '#e0e5cc',
			grayA: '#f6f7f7',
			grayB: '#f0f1f2',
			grayC: '#e3e5e6',
			grayD: '#d6d8da',
			grayE: '#babec2',
			grayF: '#888d93',
			grayG: '#626569',
			grayH: '#3b3e40',
			grayI: '#21242c',
			kaBlue: '#314453',
			kaGreen: '#71B307',
		}

		// Add support for KaTeX's color macros (e.g. \red, \blue, etc.)
		for (const color in katexColors) {
			tex = tex.replaceAll(`\\${color}`, `\\color{${katexColors[color]}}`)
		}

		return tex
	}

	$: exportFormat, exportRasterScale, exportLossyQualityScale, exportBackgroundColor, exportForegroundColor, renderExportPreview()

	function exportSetColorPicker(alpha=true) {
		Coloris.setInstance('.export-menu-color-picker', {parent: '#export-dialog', alpha: alpha, swatches: []})
	}
	exportSetColorPicker()

	async function renderExportPreview() {
		if (typeof editor === 'undefined') return
		const svg = (await MathJax.tex2svgPromise(patchTexForMathJax(getFinalLatexFromEditor()))).firstChild

		// console.log(svg.outerHTML.length)
		// svg.innerHTML = svg.outerHTML.replace(/[^\x00-\x7F]/g, '')
		// svg.innerHTML = 'a'

		
		
		// Background && Foreground
		// I'm placing two ampersands
		// What has JS done to me
		const styleElement = document.createElement('style')
		styleElement.innerHTML = `svg{background: ${exportBackgroundColor}}`
		if (exportForegroundColor != '#000000') {  // Allow other colors
			styleElement.innerHTML += `*{fill: ${exportForegroundColor}}`
		}
		svg.append(styleElement)


		
		// Padding is the bane of my existance

		// console.log(svg.viewBox)
		// const padding = 1000
		// svg.viewBox.baseVal.x -= padding
		// svg.viewBox.baseVal.y -= padding
		// svg.viewBox.baseVal.width += padding * 2
		// svg.viewBox.baseVal.height += padding * 2
		// console.log(svg.viewBox)

		// const SVGNamespace = 'http://www.w3.org/2000/svg'

		// const outerSVG = document.createElementNS(SVGNamespace, 'svg')
		// console.log(svg.viewBox.baseVal.width)
		// outerSVG.setAttribute('viewbox', `-${padding} -${padding} ${svg.viewBox.baseVal.width + padding * 2} ${svg.viewBox.baseVal.height + padding * 2}`)
		// // outerSVG.viewBox.baseVal.setAtt = svg.width + padding * 2
		// // outerSVG.viewBox.baseVal.height = svg.height + padding * 2

		// const innerSVG = document.createElementNS(SVGNamespace, 'image')
		// innerSVG.setAttribute('href', `data:image/svg+xml;base64,${btoa(svg.outerHTML)}`)
		// innerSVG.setAttribute('x', padding + 'px')
		// innerSVG.setAttribute('y', padding + 'px')


		// outerSVG.append(innerSVG)



		// const backgroundRect = document.createElementNS(SVGNamespace, 'rect')
		// backgroundRect.setAttribute('x', 0)
		// backgroundRect.setAttribute('y', 0)
		// backgroundRect.setAttribute('width', svg.viewBox.baseVal.width)
		// backgroundRect.setAttribute('height', svg.viewBox.baseVal.height)
		// backgroundRect.style.fill = exportBackgroundColor
		// svg.insertBefore(backgroundRect, svg.firstChild)
		// svg.viewBox.baseVal.x += padding
		// svg.viewBox.baseVal.y += padding



		// const viewBoxValues = svg.viewBox.split(' ')
		// console.log(svg)
		// console.log(svg.viewBox)
		
		if (exportFormat == 'svg') {
			exportPreview.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg.outerHTML)))}`
			return
		}
		const img = document.createElement('img')
		img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg.outerHTML)))}`
		img.onload = () => {
			const canvas = document.createElement('canvas')
			exportRes.width = Math.ceil(img.width * exportRasterScale)
			exportRes.height = Math.ceil(img.height * exportRasterScale)
			canvas.width = Math.ceil(img.width * exportRasterScale)
			canvas.height = Math.ceil(img.height * exportRasterScale)
			const ctx = canvas.getContext('2d')

			ctx.drawImage(img, 0, 0, img.width * exportRasterScale, img.height * exportRasterScale)
			exportPreview.src = canvas.toDataURL(`image/${exportFormat}`, exportLossyQualityScale / 100)
		}
	}

	const HexToRGB = (hex: string) => {
		if (hex.startsWith('#')) hex = hex.substring(1)
		switch (hex.length) {
			case 3:
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + 'FF'
				break
			case 4:
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
				break
			case 6:
				hex += 'FF'
				break
		}

		const bigint = parseInt(hex, 16)
		return [(bigint >> 24) & 255, (bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
	}

	function multiplyAlpha(alpha: number, rgb: number[]) {
		let [r, g, b] = rgb
		r = Math.round(r * alpha)
		g = Math.round(g * alpha)
		b = Math.round(b * alpha)
		return [r, g, b]
	}

	const RGBAToHex = rgba => rgba.map(x => x.toString(16).padStart(2, '0')).join('')

	function applyAlphaForForeground(bgHex: string) {
		const [r, g, b, a] = HexToRGB(bgHex)
		const [r2, g2, b2] = multiplyAlpha(a/255, [r, g, b])

		// This is awful pls fix
		const [br, bg, bb, ba] = HexToRGB(darkTheme ? '#242424' : '#FFFFFF')
		const [br2, bg2, bb2] = multiplyAlpha(1-a/255, [br, bg, bb])

		const [r3, g3, b3] = [r2 + br2, g2 + bg2, b2 + bb2]

		return RGBAToHex([r3, g3, b3, 255])
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
	$: darkTheme, document.documentElement.style.setProperty('--accent', darkTheme ? '#389535' : '#22BF1D')
	$: darkTheme, document.documentElement.style.setProperty('--inactive', darkTheme ? '#9993' : '#9993')
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
				texPatcherDialog.showModal()
			}}
		>
		
		<!-- If currentColor is semi-opaque, the rectangles overlap each other which looks a bit weird -->
		<!-- Maybe combine rects into path so that's there's only one shape with no overlap -->
		<!-- Or make the shapes not overlap but that seems even harder -->
		<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 100 100"><style>rect{fill:currentColor}</style><rect x=11.5 y=11.5 width=77 height=77 rx=8 stroke=currentColor fill-opacity=0 stroke-width=6.8/><rect x=31.8 y=0 width=6.8 height=23 rx=3.4/><rect x=46.6 y=0 width=6.8 height=23 rx=3.4/><rect x=61.4 y=0 width=6.8 height=23 rx=3.4/><rect x=0 y=31.8 width=23 height=6.8 rx=3.4/><rect x=0 y=46.6 width=23 height=6.8 rx=3.4/><rect x=0 y=61.4 width=23 height=6.8 rx=3.4/><rect x=31.8 y=77 width=6.8 height=23 rx=3.4/><rect x=46.6 y=77 width=6.8 height=77 rx=3.4/><rect x=61.4 y=77 width=6.8 height=23 rx=3.4/><rect x=77 y=31.8 width=23 height=6.8 rx=3.4/><rect x=77 y=46.6 width=23 height=6.8 rx=3.4/><rect x=77 y=61.4 width=23 height=6.8 rx=3.4/></svg>
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
	<dialog bind:this={exportDialog} use:closeDialogIfClickedOn id="export-dialog">
		<div id="export-menu">
			<div id="export-format-buttons">
				<RadioButton onclick={() => {exportFormat = 'svg'; exportSetColorPicker()}}>SVG</RadioButton>
				<RadioButton onclick={() => {exportFormat = 'png'; exportSetColorPicker()}} active={true}>PNG</RadioButton>
				<RadioButton onclick={() => {exportFormat = 'jpeg'; exportSetColorPicker(false)}}>JPEG</RadioButton>
				<RadioButton onclick={() => {exportFormat = 'webp'; exportSetColorPicker()}}>WebP</RadioButton>
			</div>
			<div id="export-options">
				<div>
					<!-- Background Color -->
					<label for="export-background-color">Background</label>
					<input
						style="background: {exportBackgroundColor}; color: {getUseDarkForegroundBasedOnBackgroundColor(applyAlphaForForeground(exportBackgroundColor)) ? 'black' : 'white'}"
						id="export-background-color"
						class='export-menu-color-picker'
						bind:value={exportBackgroundColor}
						data-coloris
					/>
					<!-- Foreground Color -->
					<label for="export-foreground-color">Foreground</label>
					<input
						style="background: {exportForegroundColor}; color: {getUseDarkForegroundBasedOnBackgroundColor(applyAlphaForForeground(exportForegroundColor)) ? 'black' : 'white'}"
						id="export-foreground-color"
						class='export-menu-color-picker'
						bind:value={exportForegroundColor}
						data-coloris
					/>
				</div>
				<div>
					<!-- Scale -->
					<label for="export-ex-scale-input" class={['png','jpeg','webp'].includes(exportFormat)?'':'hidden'}>Scale</label>
					<input id="export-ex-scale-input" class={['png','jpeg','webp'].includes(exportFormat)?'':'hidden'} bind:value={exportRasterScale} type="number" />
					
					<!-- Quality -->
					<label for="export-quality-input" class={['jpeg','webp'].includes(exportFormat)?'':'hidden'}>Quality</label>
					<input id="export-quality-input" class={['jpeg','webp'].includes(exportFormat)?'':'hidden'} bind:value={exportLossyQualityScale} type="number" />
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
	<dialog bind:this={texPatcherDialog} use:closeDialogIfClickedOn id="tex-patcher-dialog">
		<div id="tex-patcher-menu">
			<h2>TeX Patcher (WIP)</h2>
			<TexPatcherInput bind:value={texPatcherConfig.autoNewlines} on:input={renderPreview} name='Auto Newlines' description='Automatically insert a `\\` at the end of each line' />
			<TexPatcherInput bind:value={texPatcherConfig.commentMarker} on:input={renderPreview} name='Custom Comment Marker' description="Change the comment marker from `%` to whatever you'd like" />
			<TexPatcherInput bind:value={texPatcherConfig.baseEnvironment} on:input={renderPreview} name='Base Environment' description='Automatically add a `\begin` and `\end` for this environment' />
			<TexPatcherInput bind:value={texPatcherConfig.equalsSignToAmpersandEquals} on:input={renderPreview} name='Aligned Equal Signs' description='Replace `=` with `&=`' />
			<!-- <label>
				<input type="checkbox" bind:checked={texPatcherConfig.autoNewlines} on:change={renderPreview}>
				Insert a "\\\\" with every newline
			</label>
			<label>
				<input bind:value={texPatcherConfig.commentMarker} on:input={renderPreview}>
				Change the comment marker
			</label>
			<label>
				<input style:width='10ch' bind:value={texPatcherConfig.baseEnvironment} on:input={renderPreview}>
				Base environment (automatically adds "\begin" and "\end" functions for this environment)
			</label>
			<label>
				<input type="checkbox" bind:checked={texPatcherConfig.equalsSignToAmpersandEquals} on:change={renderPreview}>
				Replace every equals sign with an ampersand equals ("&=")
			</label> -->
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
		filter: drop-shadow(0 0 20px #0002);

		// &::backdrop {
		// 	backdrop-filter: blur(20px);
		// }
	}

	* {
		transition: background-color 300ms, color 300ms;
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
		--accent: asdsad;
		--inactive: asdddsa;
	}

	:global(*::selection) {
		color: white;
		background-color: var(--accent);
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

	dialog {
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

	dialog > div {
		padding: 1.5rem;
	}

	#tex-patcher-menu {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	#tex-patcher-menu h2 {
		font-weight: 700;
		text-align: center;
	}

	#tex-patcher-menu input:not([type]), #tex-patcher-menu input[type=text] {
		width: 2ch;
		text-align: center;
	}

	#export-options {
		display: flex;
		gap: 1rem;
		margin-block: 0.6rem;

		> * {
			display: grid;
			grid-template-columns: min-content min-content;
			align-items: center;
			row-gap: 0.15rem;
			column-gap: 0.1rem;
			grid-auto-rows: minmax(auto, max-content);
			grid-auto-columns: minmax(auto, max-content);

			input {
				width: 9ch;
				text-align: center;
			}

			label {
				width: 10ch;
				text-align: right;
			}

			> * {
				padding: 0.4rem;
				padding-inline: 0.5rem;
			}
		}
	}

	#export-format-buttons {
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

	input {
		font-family: 'JetBrains Mono';
		background: var(--inactive);
		padding: 0.15rem;
		border-radius: 0.35rem;
		font-size: 0.95rem;
		transition: all 50ms;
		outline: 0 solid var(--accent);
		padding-inline: 0.3rem;
		margin-bottom: 0.1rem;
		box-sizing: unset;

		&:focus {
			outline: 3px solid var(--accent)
		}
	}

	// input {
	// 	box-sizing: unset;
	// 	width: 7ch;
	// 	font-family: 'JetBrains Mono';
	// 	margin-bottom: 0.1rem;
	// 	border-radius: 0.3rem;
	// 	padding-inline: 0.2rem;
	// }

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
