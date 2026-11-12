/**
 * P125 CCN-001 — Studio's page, rewritten to run at a foreign origin (an MCP Apps host's sandbox) and talk to
 * Studio at `origin`.
 *
 * ⚠️ The same five rewrites as `nodegx-studio/editor/serve.mjs` `panelHtml`, which serves them as `GET /panel`.
 * They live here too because the MCP App resource is read before any Studio runs (the host prefetches it), so it
 * is built from the Studio INSTALL's `editor/studio.html`, not asked of a Studio process. Change one, change both.
 *
 * 1. The bridge, before the page's first script: Studio's origin on `window`, then `hosted/hosted.js`.
 * 2. Root-relative `src`/`href` → absolute.
 * 3. The in-page preview's `runtimeBase` → absolute.
 * 4. Module imports, root-relative AND relative (`from './specs.js'` resolves against `about:srcdoc` in a sandbox,
 *    which is nowhere: run 4's panel drew Studio's chrome and an empty tree for exactly this reason).
 * 5. Studio's own module waits for `window.__studioReady` — the bridge's poll of `/api/hold` through the proxy —
 *    so the page does not ask for the project before Studio is up. A page served by Studio itself resolves at once.
 */
export function panelHtml(studioHtml: string, origin: string): string {
  return studioHtml
    .replace(
      /<script\b/i,
      (tag) =>
        `<script>window.__STUDIO_ORIGIN=${JSON.stringify(origin)}</script>` +
        `<script type="module" src="${origin}/hosted/hosted.js"></script>${tag}`
    )
    .replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`)
    .replace(/runtimeBase:\s*'\/runtime\/'/g, `runtimeBase: '${origin}/runtime/'`)
    .replace(/(import\(|from\s+)(['"])\.?\/(?!\/)/g, `$1$2${origin}/`)
    .replace(/<script type="module">/, '<script type="module">\nawait window.__studioReady;\n');
}
