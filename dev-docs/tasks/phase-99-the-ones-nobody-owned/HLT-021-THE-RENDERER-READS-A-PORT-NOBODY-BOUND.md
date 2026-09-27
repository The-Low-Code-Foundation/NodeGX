# HLT-021 — The renderer reads a port nobody bound

## ✅ Verdict — BUILT 2026-09-23 (P99 s22)

**Launched at `NOODLPORT=0` on the same gate drive: HEAD dials `ws://localhost:0/` ×39 and logs
`GUEST_VIEW_MANAGER_CALL` ×68, and all four surface arms miss. The fix logs 0 and 0, and all four
arms land on the port main bound.** Records: `verdicts/HLT-021/2026-09-23/*.txt`.

| arm (final instrument) | `ws://localhost:0/` | `GUEST_VIEW_…` | socket / canvas / inspector on the bound port | gate exit |
|---|---|---|---|---|
| HEAD control, `--port 0` | **39** | **68** | ✗ ✗ ✗ (inspector built `http://localhost:0/…`) | 2 |
| fixed, `--port 0` | 0 | 0 | ✓ ✓ ✓ (bound 63267) | **0** |
| fixed, `--port 9123` (AC3) | 0 | 0 | ✓ ✓ ✓ (bound 9123) | **0** |
| fixed, `--port unset` (AC3) | 0 | 0 | ✓ ✓ ✓ (bound 8574) | **0** |

**What shipped:**
- `web-server.js` sets `global.noodlBoundPort` on `listening` (null on stop). `process.env` is
  per-process; the global is what `@electron/remote` can read.
- `viewerOrigin.ts` is now the renderer's **only** reader: `viewerPort()` asks
  `remote.getGlobal('noodlBoundPort')` **on every call** and falls back to the request only when
  nothing is bound yet. `'0'` before the bind stays `0`, loud, rather than a guessed 8574 that may
  be another editor's server. `ViewerConnection`, `CanvasView` ×2 and `InspectPopup` call it. The
  commented-out fourth copy in `CanvasView.refresh()` is gone.
- AC5: **the gate now launches at `NOODLPORT=0`** (`freePortPair` is gone), so every CI run grades
  this fix. It carries four `HLT-021` arms, read on the surfaces themselves: the relay socket's
  URL and `readyState`, the canvas webview's `src`, and the JSON inspector's `<img src>`. That last
  one is rendered by the drive into an **inert** document, so the probe makes no request of its
  own. `--port <n|unset>` drives AC3.

**ACs:** AC1 ✅ (the control above). AC2 ✅ (0/0 with every surface reached). AC3 ✅ (both driven).
AC4 ✅ `tests-unit/hlt-021/viewerPort.test.ts` counts code reads under `editor/src` against the
helper's own `NOODLPORT_READERS`, next to a scan-finds-a-read control. AC5 ✅. AC6: `test:main`
543/543 + 8593/8593, typechecks 0, `test:ci` at the floor (3033 specs, 8 by name, seed 27727).
Mutants run, not argued: (1) main never publishes, (2) a sixth reader, (3) the port read at module
load. Each reddens exactly one spec. `tests-main/hlt021-bound-port.test.js` starts the real server
at `NOODLPORT=0` and reads the global beside the socket's port.

⚠️ **Three instrument faults before the reading counted.** Each printed a verdict first. (a) In
the drive's `ev()` template literal, a regex `\/` collapses to `/` and ends the literal
("Invalid regular expression flags"), so the drive stopped before save/reopen. (b) In the dev
build `node_modules` are webpack **externals**, so React is not in `__wreq.m`; use the renderer's
own `require('react')`. (c) The first "fixed" run FAILED on a 404 for the probe's own
`hlt-021.png`, which was the instrument's request, not the product's. So the control was re-run on
the final script ([[a-control-pair-proves-what-you-varied-only]]).
⚠️ **Two gate runs launched back to back with no gap died at startup after 6 log lines.** The
next launch came as the previous stack tore down. They re-ran clean after a 45 s pause. This is
not the product, but anyone scripting several gate runs needs the gap.
⚠️ `scripts/devtools/cdp.js:439` left as is: it runs in the tool's process, and
`Number('0') || 8574` is correct by accident there (§5).

🔴 **Opened 2026-09-22 (P99 s21), from [HLT-010](./HLT-010-THE-GATE-THAT-WOULD-HAVE-CAUGHT-IT.md)'s
verdict, which found it and explicitly left it unowned** — *"Owner needed; the fix is the renderer
asking main for the bound port."* This row is that owner.

⚠️ **It is here because this phase's §7 forbids the alternative:** *"No row leaves this phase as an
observation. If a task finds something out of its scope, it gets a row here with an owner, or it is
not recorded at all."* §2 of the README is what leaving it as a note costs
([[an-unowned-row-gets-rediscovered-at-full-price]]).

## 1. The person sentence

> **A second editor, or a harness, can bring the app up on a port the OS chose, and the canvas,
> the preview and the JSON inspector all talk to the server that is actually listening.**

## 2. What is measured (HLT-010 s13–s16, 2026-09-22, and re-read here)

**`NOODLPORT=0` means "give me any free port".** The main process handles it correctly and the
renderer does not.

**Main, correctly:** `web-server.js:363-372` reads `server.address().port` in the `listening`
handler — *"the port the OS actually gave us … a rebind that reused the request rather than the
result would move the server to a different port every time"* — and writes it back:
`process.env.NOODLPORT = String(listeningPort)`.

🔴 **That write-back cannot reach the renderer.** The renderer is a different process; its
`process.env` was copied when the window was created, which is **before** the server binds. So
five renderer sites read the *requested* value and get `'0'`:

| site | line |
|---|---|
| `editor/src/ViewerConnection.ts` | `14` |
| `editor/src/views/VisualCanvas/CanvasView.ts` | `174`, `253` |
| `editor/src/views/SandboxSurface/viewerOrigin.ts` | `22` |
| `editor/src/views/nodegrapheditor/InspectJSONView/InspectPopup.tsx` | `186` |

All five are the same expression: `const port = process.env.NOODLPORT || 8574;`

⚠️ **And `|| 8574` cannot save it.** `'0'` is a non-empty string, so it is **truthy** — the fallback
never fires for the one value that needs it. A reader who checks this line for a default will see
one and conclude it is handled ([[an-arm-with-no-predicate-in-it]] is the same family: the guard is
present and grades nothing).

**What it produces, measured on HLT-010's run 2:**

- `ws://localhost:0/` × **28** — `ERR_UNSAFE_PORT`
- `GUEST_VIEW_MANAGER_CALL: UnknownVizError` × **67**

**Both are 0 at a concrete port** (HLT-010 runs 3–8). ✅ That pair is the control: the same build,
the same drive, one variable changed.

⚠️ **So HLT-010's gate does not run at `NOODLPORT=0`** — `scripts/renderer-errors/run.js:187-190`
picks a concrete free port whose +1 is free too, and says why in a comment. The gate is honest
about the hole; the hole is this row.

## 3. The shape

**The renderer asks main for the port that was bound, and never reads `process.env.NOODLPORT`
again.**

The route already exists and is already used by renderer code: `main.js` sets `global.useLocalDocs`
(`:290-315`) and `utils/getContentEndpoint.ts` reads it through
`require('@electron/remote').getGlobal('useLocalDocs')`. The same pair carries a port.

**One reader, not five.** The five sites become one helper — the count is the point: five copies of
a defaulting expression is how a value gets fixed in four places and stays wrong in the fifth
([[a-second-copy-of-a-palette-drifts-silently]]).

⚠️ **The helper must resolve at CALL time, not at module load.** A `const` at the top of a module
evaluates when the bundle loads, which can be before `listening` fires — that is the *same* defect
one layer along, and it would pass any spec that calls the helper late.

## 4. Acceptance criteria

1. **The control first, on HEAD**: launch with `NOODLPORT=0` and count `ws://localhost:0/` and
   `GUEST_VIEW_MANAGER_CALL` in `.logs/dev.log`. Non-zero, both, recorded.
2. With the fix, on the same drive: **both 0**, and the canvas, the preview and the JSON inspector
   each **reached** — an arm that says which surfaces the drive actually touched, because a count of
   0 on a drive that opened nothing is the reading HLT-001 got twice
   (README §5a).
3. **`NOODLPORT` unset** and **`NOODLPORT=<concrete>`** both still work, driven, not argued.
4. **Zero renderer reads of `process.env.NOODLPORT` remain** — a grep arm, asserted as a count, and
   the number is the constant the helper is defined in, never a literal typed into the spec
   ([[a-gate-can-have-a-hole-shaped-like-the-defect]]).
5. `scripts/renderer-errors/run.js` drops its concrete-port workaround **or** its comment is
   rewritten to say why a concrete port is still preferred. It may not keep a comment describing a
   defect that has been fixed ([[a-known-hazard-in-a-docblock-is-not-a-guard]]).
6. `test:ci` at the floor **and** `test:main` green.

## 5. Landmines

- 🔴 **The design-tool import server binds `NOODLPORT + 1`** (`design-tool-import-server.js:25-29`),
  and it has its own `NOODLPORT=0` branch — `Number('0') + 1` is **port 1**, which killed the editor
  at startup until HLT-010 s13 fixed it. Do not re-derive that arithmetic here; read it first.
- ⚠️ **`scripts/devtools/cdp.js:439`** also reads `Number(process.env.NOODLPORT) || 8574` to probe
  the web server. That one is in the *tool's* process, not the renderer, and `Number('0') || 8574`
  is 8574 — correct by accident. Leave it or fix it deliberately; do not fix it by reflex and call
  the row done.
- ⚠️ **`main.bundle.js` is a built artefact** and carries copies of all of this. It is gitignored
  and rebuilt on every dev launch. A grep that counts hits there is counting the build
  ([[the-on-disk-editor-bundle-is-not-the-one-running]]).
- 🔴 **Editing editor `src/` full-reloads a peer's editor.** Announce the launch, and announce the
  teardown to everyone you announced the launch to.

## 6. Out of scope

- The preview `<webview>`'s own runtime errors — HLT-010 §2b names them and they are outside its
  gate.
- Anything about *which* port is chosen. This row is about the renderer learning the answer, not
  about changing it.

## 7. Owner

P99. Unblocked. Small, and it closes the one hole HLT-010's gate documents in itself.
