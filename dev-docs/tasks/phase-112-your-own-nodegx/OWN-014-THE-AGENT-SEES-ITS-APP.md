# OWN-014 — The agent sees its app: `render_report` from npm

**Opened 2026-10-12** from R18 (Richard agreed the three tasks OWN-014, OWN-015, OWN-016 after asking whether the npm
kit is ready for a tutorial video: *vibe code a Duolingo clone with Google text-to-speech, no editor*). **Model:**
**Opus** — the shape is fixed (ship the harness the checkout already has), and a gate says when it is done.

**Status: 📋 not started.**

## 1. The person sentence

> **Someone who set up a folder with `npm create nodegx` asks their agent to build a page, and the agent looks at what
> it built before saying it is done.**

Today it cannot. It builds blind, and the person is the only one who looks at the preview.

## 2. What was measured (2026-10-12, static reads; nothing driven)

- `render_report` is in the published `@nodegx/mcp@0.1.0`, but its harness is found in only two places
  (`packages/noodl-mcp/src/render.ts:297-318`): `scripts/devtools/measure-from-disk.js` in a checkout, or
  `app.asar/render-harness/` inside the installed editor (UNI-012). Anywhere else it refuses (`render.ts:424-432`).
  `NODEGX_RENDER_CLI` overrides it, but nothing documents that, and nothing on npm ships a file to point it at.
- The packaged copy ships inside the asar because *"the asar already carries the 14MB viewer bundle, `ws` and
  `@nodegx/render-measure`"* (the UNI-012 comment). The npm route has the same need: the harness, a viewer runtime,
  and a browser to draw in.
- `@nodegx/preview@0.1.0` already ships a **production** viewer runtime in `dist/external` (OWN-011 s9, built by
  `prepack`), and the preview tarball also carries `dist/nodegx-deploy.cjs`. So a build of the runtime already
  reaches npm. The harness and the browser don't.
- 🔴 **How this was missed:** OWN-011's stranger's test graded *"the installed preview renders in 19 ms and Chrome
  draws the page in 426 ms"*, but **our** script drove Chrome, not the stranger's agent. No AC asked whether that
  agent can see its own screen.

## 3. The work

1. **Measure first:** what `measure-from-disk.js` loads (runtime path, `ws`, `@nodegx/render-measure`, how it finds a
   browser). List each item's source and whether it already ships in an npm tarball.
2. **Ship the harness where the runtime already is.** The likely home is `@nodegx/preview`, which already has the
   production runtime. Decide this from step 1's list, not from this sentence. `render.ts` gets a third candidate:
   the installed package, resolved with `require.resolve` from the MCP's own location (not by directory depth; see
   register row C72).
3. **The browser.** Use the machine's Chrome, Edge or Chromium if one is installed. If none is found, refuse in plain
   words, saying what to install. Never download a browser silently.
4. **The refusal names the fix.** If it still refuses, it says which piece is missing and the one command that adds it.

## 4. Acceptance criteria

- **AC1 — the stranger's view.** In an empty folder with `HOME` empty, from packed tarballs (then from the registry):
  `npm create nodegx` → `create_project` → `render_report` on the made page returns the render, with no checkout and
  no editor installed. **Control arm:** the same with the harness removed, which must refuse and name the fix.
- **AC2 — it sees a defect.** Plant one defect a person would see (text off-screen at phone width, or a blank page).
  `render_report` must report it. A green render on an untouched page proves nothing by itself.
- **AC3 — the published version.** The packages that change are published after asking Richard (R11), and AC1 is
  re-run from the registry.
- **AC4 — the language app (OWN-015's fixture)** gets a `render_report` per page from npm.

## 5. Not this task

- The render harness's own measurement rules: the existing harness is reused as it is.
- Live values over the observe protocol (`nodegx-observe`): that's a separate question.

## 6. Session 13 (2026-10-12, Opus): step 1 measured

**What the harness loads.** Three entry scripts (`measure-from-disk.js`, `render-from-disk.js`, `drive-steps.js`), with
`render-report.js` and `harness-paths.js` inside them; `@nodegx/render-measure` and `@nodegx/module-inject` by static
`require` (both private workspace packages, inlinable); `ws` by a computed `require` (harness-paths' `WS_MODULE`, so it
can't be inlined); data files resolved by `harness-paths.js` (the viewer at `<harness>/../src/external/viewer`, the
two catalogs and the token declarations in `<harness>/data/`); and Chrome, found by `findChrome()` in
`render-report.js` (macOS, Linux and Windows paths, `CHROME_PATH` first). **None of the harness is in an npm tarball
today.** `@nodegx/preview@0.1.0` ships a production *deploy* runtime (`dist/external/deploy`, 2.0 MB) and
`nodegx-deploy.cjs`, but no *viewer* build, which is what `render-from-disk.js` loads (`/noodl.viewer.js`).

**The home: `@nodegx/mcp` itself**, because it's the package that calls the harness and the one a stranger already has.
`build-render-harness.mjs` runs at prepack and writes the packaged editor's layout one level down (`dist/render-harness/`
plus `dist/src/external/viewer`), so `harness-paths.js` resolves it with no new rule. `render.ts` gets one more candidate.

**Found on the way: P112-S13-HARNESSTOKENS (high, fixed).** The packaged editor's harness (0.3.0's `app.asar`
included) ships `StyleTokensModel/DefaultTokens.ts`, a 12-line re-export since HLS-001, as its token source. The
fallback's regex finds 0 declarations in it, against 193 in `nodegx-project-contract/tokens.ts`, so every packaged
`render_report` rendered with no shipped defaults. UNI-012's gate checked that the file existed, and it did. The fix
packages `tokens.ts` itself and the gate now compares contents. Its control arm (the old mapping) fails the new test
alone: 1 failed, 7 passed.
