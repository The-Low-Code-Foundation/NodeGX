# The NOWRAP render (P18 session 112, 2026-10-15)

`wrap-desk` has one page with four Texts, one per `white-space` arm of `Text.tsx`, inside a 200 px column:

| Text | what it is | runtime | export at HEAD `52318ee89` | export, patched |
|---|---|---|---|---|
| breakText | `"Line one\nLine two"`, 240 px | 2 lines, `pre-wrap` | **1 line**: "Line one Line two" (JSX ate the break) | 2 lines, `pre-wrap` |
| wordText | one 34-letter word, 80 px | 4 lines, `overflow-wrap: anywhere` | **1 line, overflows its box** | 4 lines |
| contentText | Size Mode Content Size, a 474 px sentence | 1 line, `pre`, runs past the parent | **3 lines**, wrapped at the parent | 1 line, `pre` |
| ellipsisText | Text Overflow Ellipsis, 120 px | 1 line, clipped, **no "…"** | **3 lines**, nothing truncated | 1 line, clipped, "…" |

`readings.json` has every measured field (computed `white-space`, `overflow-wrap`, `text-overflow`, `overflow`, width,
line count, whether the text overflows its box). The three PNGs are the same page in each arm. The patched export
equals the runtime on every field. The runtime's missing "…" is its own defect, P18-S112-FLEXELLIPSIS: its Text is
`display: flex` (`nodes/visual/text.ts` default CSS), and `text-overflow` does nothing on a flex container's text.

## Running it again

From the repo root, with `X` set to this folder:

1. Emit both arms. `emit.ts` takes the export's `src` directory, the project and an output directory. Bundle it with
   `node_modules/.bin/esbuild emit.ts --bundle --platform=node --format=cjs --external:typescript` after pointing its
   three `require`s at the `src` you want. For HEAD's arm that `src` is a `git archive` of
   `packages/nodegx-export/src`, with `node-catalog.json` and the two ledger JSONs copied beside it, built with
   `NODE_PATH=node_modules`. Write them to `$X/out-head` and `$X/out-work`.
2. In each `out-*`, replace `src/App.tsx` with `import { HomePage } from './pages/Home'; export function App() { return <HomePage />; }`.
   The repo has react-router-dom 5 and the export targets 7, and the router shell has no bearing on a Text. Bundle
   `src/main.tsx` with esbuild (`--loader:.module.css=local-css --jsx=automatic`, `NODE_PATH=node_modules`) to
   `dist/`, and write a `serve.html` that loads `dist/main.css` and `dist/main.js`.
3. `node $X/drive.cjs`. It serves the runtime with `scripts/devtools/render-from-disk.js` and both builds statically,
   opens one headless Chrome on a free port (`--use-mock-keychain`), and prints the readings and the screenshots.
