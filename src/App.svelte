<script lang="ts">
  import katex from 'katex'
  import * as monaco from 'monaco-editor'
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
  import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
  import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
  import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

  import { onMount } from 'svelte'

  import { conf, language } from './lib/texlanguage'

  const editorBackgroundColors = {
    dark: '#1D1D1D',
    light: '#F8F8F8',
  }

  let darkTheme = false
  let colorSchemeOverridden = false

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    darkTheme = true
  }

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

  let mounted = false
  let editor: monaco.editor.IStandaloneCodeEditor
  let editorContainer: HTMLDivElement
  let editorContainerWrapper: HTMLDivElement
  let preview: HTMLDivElement

  $: ((darkTheme) => {
    if (!mounted) return
    monaco.editor.setTheme(darkTheme ? 'tex-dark' : 'tex-light')
    editorContainerWrapper.style.backgroundColor = darkTheme
      ? editorBackgroundColors.dark
      : editorBackgroundColors.light
  })(darkTheme)

  onMount(() => {
    mounted = true
    editor = monaco.editor.create(editorContainer, {
      value: '\\frac{1}{2} \\\\[20pt]\n\n\\begin{aligned}\n\t2x &= 10 \\\\\n\tx &= 5\n\\end{aligned}',
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
      contextmenu: false,
      lineNumbers: 'off',
    })
    katex.render(editor.getValue(), preview, { throwOnError: false })

    editor.onDidChangeModelContent(() => {
      katex.render(editor.getValue(), preview, { throwOnError: false })
    })

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (colorSchemeOverridden) return
      darkTheme = event.matches
    })
  })
</script>

<main
  class="m-0 flex h-screen"
  style:background-color={darkTheme ? '#242424' : '#FFFFFF'}
  style:color={darkTheme ? 'rgba(255, 255, 255, 0.87)' : 'black'}
>
  <div bind:this={editorContainerWrapper} class="w-full max-w-2xl pr-8 pt-8">
    <div bind:this={editorContainer} class="h-full w-full" style:backgroundColor={editorBackgroundColors.dark} />
  </div>
  <div bind:this={preview} class="w-full overflow-scroll p-8" />

  <div class="absolute bottom-5 right-5 flex flex-col items-center gap-5">
    <button
      on:click={() => {
        darkTheme = !darkTheme
        colorSchemeOverridden = true
      }}
      class="rounded-full opacity-50 hover:opacity-90"
      aria-label="Toggle Dark Mode"
    >
      {#if darkTheme}
        <!-- light mode icon -->
        <svg aria-hidden="true" width="45" xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960"
          ><path
            fill="currentColor"
            d="M479.765 716Q538 716 579 675.235q41-40.764 41-99Q620 518 579.235 477q-40.764-41-99-41Q422 436 381 476.765q-41 40.764-41 99Q340 634 380.765 675q40.764 41 99 41Zm.235 60q-83 0-141.5-58.5T280 576q0-83 58.5-141.5T480 376q83 0 141.5 58.5T680 576q0 83-58.5 141.5T480 776ZM70 606q-12.75 0-21.375-8.675Q40 588.649 40 575.825 40 563 48.625 554.5T70 546h100q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T170 606H70Zm720 0q-12.75 0-21.375-8.675-8.625-8.676-8.625-21.5 0-12.825 8.625-21.325T790 546h100q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T890 606H790ZM479.825 296Q467 296 458.5 287.375T450 266V166q0-12.75 8.675-21.375 8.676-8.625 21.5-8.625 12.825 0 21.325 8.625T510 166v100q0 12.75-8.675 21.375-8.676 8.625-21.5 8.625Zm0 720q-12.825 0-21.325-8.62-8.5-8.63-8.5-21.38V886q0-12.75 8.675-21.375 8.676-8.625 21.5-8.625 12.825 0 21.325 8.625T510 886v100q0 12.75-8.675 21.38-8.676 8.62-21.5 8.62ZM240 378l-57-56q-9-9-8.629-21.603.37-12.604 8.526-21.5 8.896-8.897 21.5-8.897Q217 270 226 279l56 57q8 9 8 21t-8 20.5q-8 8.5-20.5 8.5t-21.5-8Zm494 495-56-57q-8-9-8-21.375T678.5 774q8.5-9 20.5-9t21 9l57 56q9 9 8.629 21.603-.37 12.604-8.526 21.5-8.896 8.897-21.5 8.897Q743 882 734 873Zm-56-495q-9-9-9-21t9-21l56-57q9-9 21.603-8.629 12.604.37 21.5 8.526 8.897 8.896 8.897 21.5Q786 313 777 322l-57 56q-8 8-20.364 8-12.363 0-21.636-8ZM182.897 873.103q-8.897-8.896-8.897-21.5Q174 839 183 830l57-56q8.8-9 20.9-9 12.1 0 20.709 9Q291 783 291 795t-9 21l-56 57q-9 9-21.603 8.629-12.604-.37-21.5-8.526ZM480 576Z"
          /></svg
        >
      {:else}
        <!-- dark mode icon -->
        <svg aria-hidden="true" width="45" xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960"
          ><path
            fill="currentColor"
            d="M480 936q-150 0-255-105T120 576q0-150 105-255t255-105q8 0 17 .5t23 1.5q-36 32-56 79t-20 99q0 90 63 153t153 63q52 0 99-18.5t79-51.5q1 12 1.5 19.5t.5 14.5q0 150-105 255T480 936Zm0-60q109 0 190-67.5T771 650q-25 11-53.667 16.5Q688.667 672 660 672q-114.689 0-195.345-80.655Q384 510.689 384 396q0-24 5-51.5t18-62.5q-98 27-162.5 109.5T180 576q0 125 87.5 212.5T480 876Zm-4-297Z"
          /></svg
        >
      {/if}
    </button>

    <a
      href="https://github.com/geode42/geode42-matheditor"
      aria-label="Go to source code"
      target="_blank"
      rel="noreferrer noopener"
      class="rounded-full opacity-50 hover:opacity-90"
      style:color={darkTheme ? 'white' : 'black'}
    >
      <!-- github-mark -->
      <svg aria-hidden="true" width="35" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"
        ><path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
          fill="currentColor"
        /></svg
      >
    </a>
  </div>
</main>
