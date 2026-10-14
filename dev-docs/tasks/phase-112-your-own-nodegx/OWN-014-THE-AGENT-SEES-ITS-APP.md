# OWN-014 — The agent sees its app: `render_report` from npm

**Opened 2026-10-12** from R18 (Richard agreed the three tasks OWN-014, OWN-015, OWN-016 after asking whether the npm
kit is ready for a tutorial video: *vibe code a Duolingo clone with Google text-to-speech, no editor*). **Model:**
**Opus** — the shape is fixed (ship the harness the checkout already has), and a gate says when it is done.

**Status: 🟡 s13 (2026-10-12): built and passing from a packed tarball — AC1 ✅, AC2 ✅ (§7). AC3 ✅ 2026-10-14: `@nodegx/mcp` 0.2.0 published after asking Richard, and `stranger-render.mjs @nodegx/mcp@0.2.0` from the registry renders clean (P112 NEXT-SESSION-PROMPT, s17; `d6414d61c`). AC4 waits on OWN-015's language app (Home measured; Lesson needs a route-parameter value, §8).**

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

## 7. Session 13: built, and graded from a tarball

**What changed.**
- `packages/noodl-mcp/build-render-harness.mjs`, run at `prepack` (and `--remove` at `postpack`, as the preview's
  `pack-runtime.mjs` does), writes `dist/render-harness/` (the three entries bundled by esbuild; the catalogs and
  `tokens.ts` in `data/`; `ws` vendored in `node_modules/ws`, because harness-paths requires it by a computed name) and
  `dist/src/external/viewer/`, a **production** viewer build (1.66 MB, classified by EXP-017's `viewerBuild.ts`; a
  development build stops the pack).
- `files` names both. `render.ts` probes `dist/render-harness/measure-from-disk.js` after the checkout and asar
  candidates, and its refusal now names the npm case.
- The tarball: 5.7 MB packed, 30.6 MB unpacked (the harness adds about 7.7 MB, 5.5 MB of it the two catalogs).
- `ws` is vendored rather than declared so the shared lockfile stays untouched. npm 10.9.4 packs a nested
  `node_modules` (measured on a scratch package first).

**AC1 ✅, the stranger's view.** `node scripts/own/stranger-render.mjs <tgz>` runs in an empty folder under the OS temp
dir, with `HOME` empty and every `NODEGX_*` override removed. It starts the server as `npm create nodegx` registers it
(`npx -y --package <tgz> noodl-mcp --allow-writes`), over stdio:
- 6 bootstrap tools → `create_project` "Lingo" → 24 tools, `render_report` among them.
- `render_report` (phone, no screenshot) → *"DONE — Rendered, and the render is clean"*, `tokens: "193 shipped
  defaults"`, 8 s.
- The harness that ran is the package's own: `…/_npx/<hash>/node_modules/@nodegx/mcp/dist/render-harness/`. No
  checkout candidate can resolve from the temp dir.
- **Control arm:** the same script on the registry's `@nodegx/mcp@0.1.0` (`--expect-refusal`) refuses: *"The render
  harness could not be located"*, with the probed paths.

**AC2 ✅, it sees a defect.** `--plant` adds a 3000px-wide Text under the Home page and renders again. The report names
it: `minimum-layout-width` (*"cannot lay out below 1560px … div.ndl-visual-text at 3000px"*) and
`text-wider-than-its-box`. 🔴 **But the first line said "the render is clean"** over *"0 errors, 2 warnings"*. That's
P112-S13-CLEANWARNINGS (medium, fixed): `verdictFor` kept "clean" apart from "done" only for the poverty tells. Now
the first line reads *"Rendered, and nothing is broken — but it warns: minimum-layout-width, text-wider-than-its-box.
Nothing here blocks; read the warnings before calling it finished."* `done` stays true (VIB-007 M1). The untouched
page still says clean. Re-run from a re-packed tarball: both lines as described.

**Gates.** `vib007PovertyFindings` 23 / 23 (one new test). `renderCli` + `vib007RenderGate` 21 / 21 (two new: the npm
layout found, and its control without the harness refuses). The editor's `uni-012` gate is 8 / 8 (§6).
`npm run typecheck` in `noodl-mcp` has one error, in a P116 test (P112-S13-WORLDTYPECAST, filed, not ours).

**Owed.** AC3: a release of `@nodegx/mcp` with the harness, published only after asking Richard (R11) and packed in a
worktree at the pushed commit (OWN-011 s10: a pack in the shared checkout inlines peers' uncommitted files; this
session's test tarballs were packed there and are tests only). The refusal says "from version 0.2.0 on", so the
release must be 0.2.0 or the sentence changes. AC4 needs OWN-015's language app.


## 8. Session 14 (2026-10-12, Opus): the stranger's agent never saw its app

OWN-015's round 2 (a real `claude -p` from the 0.2.0 tarball, `HOME` empty) called `render_report` 4 times, and every
call was killed at 240 s. The s13 control (`stranger-render.mjs`, a fresh project) failed the same way today.
Measured: the harness with the real `HOME` rendered in 2 s; with the round's `HOME` it hung. A bare headless Chrome
answered normally, and so did the harness's own server. The cause was on Richard's screen: macOS **"Keychain Not
Found"** (Cancel / Reset To Defaults), once per Chrome. A page that uses storage makes Chrome open the login
keychain, an empty `HOME` has none, and Chrome waits for the dialog. **P112-S14-KEYCHAIN fixed:**
`render-report.js` passes `--use-mock-keychain`. With the fix, the same project under the same `HOME` renders in 3 s.
AC1/AC2's s13 readings stand. The 0.2.0 tarball predates the fix and must be re-packed. **AC4 (the language app), half:**
the fixed harness measured Home (0 errors, 3 warnings incl. one console error; the backend was down at that
moment). It did **not** measure Lesson: its `urlPath` `lesson/{lessonId}` takes a route parameter the harness has
no value for, and the report says so. A page per route still needs a way to name a parameter value.
