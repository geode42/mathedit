<script lang="ts">
  import katex from 'katex'
  import * as monaco from 'monaco-editor'
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
  import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
  import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
  import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

  import { onMount } from 'svelte'

  const editorBackgroundColors = {
    dark: '#1D1D1D',
    light: '#F8F8F8',
  }

  let preferredColorScheme = 'light'

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    preferredColorScheme = 'dark'
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

  monaco.languages.setMonarchTokensProvider('tex', {
    tokenizer: {
      root: [
        [/\\\\/, 'custom-newline'],
        [/(\{|\})/, 'custom-bracket'],
        [/(=|&=)/, 'custom-equals-sign'],
      ],
    },
  })

  monaco.languages.setLanguageConfiguration('tex', {
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '{', close: '}' },
      { open: '[', close: ']' },
    ],
  })

  monaco.editor.defineTheme('tex-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'custom-newline', foreground: 'C000E0' },
      { token: 'custom-equals-sign', foreground: 'C000E0' },
      { token: 'custom-bracket', foreground: '888888' },
    ],
    colors: {
      'editor.background': editorBackgroundColors.light,
    },
  })

  monaco.editor.defineTheme('tex-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'custom-newline', foreground: 'b779c1' },
      { token: 'custom-equals-sign', foreground: 'b779c1' },
      { token: 'custom-bracket', foreground: '888888' },
    ],
    colors: {
      'editor.background': editorBackgroundColors.dark,
    },
  })

  let editorContainer: HTMLDivElement
  let editorContainerWrapper: HTMLDivElement
  let preview: HTMLDivElement
  onMount(() => {
    const editor = monaco.editor.create(editorContainer, {
      value: '\\frac{1}{2} \\\\[20pt]\n\n\\begin{aligned}\n\t2x &= 10 \\\\\n\tx &= 5\n\\end{aligned}',
      language: 'tex',
      theme: preferredColorScheme == 'light' ? 'tex-light' : 'tex-dark',
      minimap: { enabled: false },
      automaticLayout: true,
      overviewRulerLanes: 0,
      scrollbar: {
        vertical: 'hidden',
      },
      fontFamily: 'JetBrains Mono',
      contextmenu: false,
    })
    katex.render(editor.getValue(), preview, { throwOnError: false })

    editor.onDidChangeModelContent(() => {
      katex.render(editor.getValue(), preview, { throwOnError: false })
    })

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      preferredColorScheme = event.matches ? 'dark' : 'light'
      monaco.editor.setTheme(preferredColorScheme == 'light' ? 'tex-light' : 'tex-dark')
      editorContainerWrapper.style.backgroundColor = event.matches ? editorBackgroundColors.dark : editorBackgroundColors.light
    })
  })
</script>

<main class="m-0 flex h-screen">
  <div
    bind:this={editorContainerWrapper}
    class="w-full max-w-2xl py-5 pr-5"
    style="background-color: {preferredColorScheme == 'light' ? editorBackgroundColors.light : editorBackgroundColors.dark}"
  >
    <div bind:this={editorContainer} class="h-full w-full" style:backgroundColor={editorBackgroundColors.dark} />
  </div>
  <div bind:this={preview} class="w-full overflow-scroll p-5" />

  <a
    href="https://github.com/geode42/geode42-matheditor"
    aria-label="Go to source code"
    target="_blank"
    rel="noreferrer noopener"
    class="absolute bottom-5 right-5 opacity-50 hover:opacity-90"
    style:color={preferredColorScheme == 'dark' ? 'white' : 'black'}
  >
    <!-- GitHub's mark -->
    <svg aria-hidden="true" width="35" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"
      ><path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
        fill="currentColor"
      /></svg
    >
  </a>
</main>
