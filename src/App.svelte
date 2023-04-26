<script lang="ts">
  import katex from 'katex'
  import * as monaco from 'monaco-editor'
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
  import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
  import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
  import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

  import { onMount } from 'svelte'

  const backgroundColors = {
    dark: '#181818',
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
      { token: 'custom-bracket', foreground: '888888' },
    ],
    colors: {
      'editor.background': backgroundColors.light,
    },
  })

  monaco.editor.defineTheme('tex-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'custom-newline', foreground: 'A948B9' },
      { token: 'custom-bracket', foreground: '888888' },
    ],
    colors: {
      'editor.background': backgroundColors.dark,
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
      monaco.editor.setTheme(event.matches ? 'tex-dark' : 'tex-light')
      editorContainerWrapper.style.backgroundColor = event.matches ? backgroundColors.dark : backgroundColors.light
    })
  })
</script>

<main class="m-0 flex h-screen gap-10">
  <div
    bind:this={editorContainerWrapper}
    class="w-full max-w-2xl py-5 pr-5"
    style="background-color: {preferredColorScheme == 'light' ? backgroundColors.light : backgroundColors.dark}"
  >
    <div bind:this={editorContainer} class="h-full w-full" style:backgroundColor={backgroundColors.dark} />
  </div>
  <div bind:this={preview} class="w-full overflow-scroll py-5" />
</main>
