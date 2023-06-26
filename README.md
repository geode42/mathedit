# geode42-matheditor

This repo contains the source code for my LaTeX math editor, which you can find at [math.geode42.com](https://math.geode42.com)

## Running locally
Clone this repo, cd into the directory that's created, then run `npm install`, `npm run dev`

## Credits
The website is built with [Vite](https://vitejs.dev/) and [Svelte](https://svelte.dev/)

The editor portion of the editor uses the [Monaco Editor](https://microsoft.github.io/monaco-editor/) which is a pretty good editor that's used in the VSCode editor

The preview is rendered with [KaTeX](https://katex.org/) because speed

The image output is rendered with [MathJax](https://www.mathjax.org/)'s `tex2svgPromise` function because KaTeX doesn't have one

The JPEG export tab uses the [Coloris](https://coloris.js.org/) color picker


