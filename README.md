# geode42-matheditor

This repo contains the source code for my online TeX editor, which you can find at [math.geode42.com](https://math.geode42.com)

The website uses the [Monaco Editor](https://microsoft.github.io/monaco-editor/) (which is VSCode's editor, in case it looks familiar :) ), which I have slightly figured out how to use after many hours and lots of help from ChatGPT

The preview is rendered with [KaTeX](https://katex.org/),

And the the image-output is created with [MathJax](https://www.mathjax.org/)'s `tex2svgPromise` function

The JPEG export tab uses the [Coloris](https://coloris.js.org/) color-picker

To download dependencies, run `npm i`<br>
You can then use `npm run dev` to preview the website in your browser :)
