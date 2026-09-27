# CG-004 — The shell and the model: Electron, a local backend, an owl in the main process

**Opened 2026-09-27**, scoped from TPL-012 §2.4–§2.5 and briefing §3–§4, §C2. **Status: ⬜ not
started.** Depends on nothing. Lane C.

## 1. The person sentence

> **A grown-up installs one file. The game opens offline with its own backend and its own owl, both on
> the loopback, and the Grown-ups page says exactly where the owl runs, how fast, and which of her
> tricks passed her exam on this machine.**

## 2. What it is

`garden-desktop/` beside this file (the Nightbook precedent: `../phase-78-the-templates/nightbook-desktop/`),
kept outside the npm workspaces:

- **The shell**, forked from Nightbook's and **parameterised** (name, port, data dir, policy, backup
  cron from one `garden.json`; no "Nightbook" left in `main.js` or `package.json`): one window, one
  instance, the backend spawned with `ELECTRON_RUN_AS_NODE --port 0 --no-admin`, `relay.js` on a fixed
  loopback origin serving the app and proxying the rest, `policy.js` adopting a changed shipped policy,
  nightly backups, `fit.js`, `timings.log`.
- **The owl sidecar**, new: `owl.js` in the main process, `node-llama-cpp` with the GGUF from
  `extraResources/model/`, loaded once, one context, one request at a time (a queue), raw ChatML with
  `SpecialTokensText` and the empty think block prefilled, a grammar per shape, `temperature` per rung,
  `maxTokens` ≤ 64, a 12 s timeout, the incomplete trailing UTF-8 stripped.
- **The route** on the relay: `POST /__garden/olive` with `{rung, slots, lang, shape, temperature}`;
  the shell **composes the prompt from its own template table** (the renderer never sends prompt text);
  slots are validated against the rung's word list, regex and length before anything reaches the model;
  the output passes the grammar, the cap, the FR/EN blocklist and a per-rung must-contain check;
  the reply is `{ok, value|text, ms, fallback}`. `GET /__garden/olive/status` returns model, load time,
  last ms, the exam's results. `POST /__garden/olive/exam` runs the exam.
- **Olive's exam**: the battery (`../phase-78-the-templates/tpl-012-olive-exam/battery.mjs`) trimmed to
  ~20 canned probes with expected answers, run on first launch and on demand, results stored in the app
  data, one pass/fail per rung; a rung the machine fails is withheld by CG-005.
- **The model file** is fetched at build by pinned URL and sha256 (`unsloth/Qwen3.5-0.8B-GGUF`,
  `Qwen3.5-0.8B-Q4_K_M.gguf`, 532 MB), cached in CI, never committed; `LICENSE` and `NOTICE` for
  Qwen (Apache 2.0), node-llama-cpp and llama.cpp (MIT) ship in `extraResources/licenses/`.
- **The app**: `build-app.js --project templates/bot-garden` exports with the loopback origin baked in
  (an EMPTY `cloudservices.endpoint` means NO backend).

## 3. Acceptance criteria

1. Shell unit tests: config parameterisation, the relay's routing, the slot validation (a slot with a
   word outside the list, over 40 characters or with a control character is refused with a named
   reason), the output checks (blocklist, must-contain, cap), the queue (two concurrent requests are
   served in order), the timeout → `fallback:true`.
2. The contract test runs the exam against the route with the real model on CPU: every "consistent"
   probe from briefing §C2 passes its expectation, every "fails reliably" probe is recorded as failing,
   and the run is green on the Mac and on a Linux runner (correctness, not timing).
3. `GET /__garden/olive/status` answers within 1 s while a completion is running.
4. The shell starts with no model file present: the game runs, every Olive block uses the written line,
   status says "no model".
5. `node-llama-cpp`'s native binary lives outside the asar (`asarUnpack`), and the packaged app on
   Windows x64 loads it CPU-only; the packaged app on macOS loads it with Metal.
6. The GGUF's sha256 is checked at build and at first launch; a mismatch refuses the model and says so
   on the Grown-ups page.
7. `timings.log` records model load ms, each exam probe's ms, and each request's ms.
8. Upgrade: a v2 installer over a used v1 data dir keeps the island, the profiles and the exam results,
   and adopts the new policy (seed the old version's leavings in the drive).
9. Nothing on the wire leaves the loopback: the drive's network log shows no host but 127.0.0.1.

## 4. How to build it

- Read `../phase-78-the-templates/TPL-011-DESKTOP-THE-JOURNAL-ON-WINDOWS.md` (untracked, on this Mac) and
  the P78 NEXT-SESSION-PROMPT s7 recipe for building the installer on macOS without CI.
- node-llama-cpp's Electron guide: main process only, prebuilt binaries per platform, its CI workflow
  as the template for ours.
- The prompt template table and the word lists are data files the exam and the game share.
- Keep the system prompt short; prompt processing is the slow part on the tablet.

## 5. Gates

`garden-desktop/shell/tests/` (AC1, AC3–AC7), `garden-desktop/tests/olive-contract.mjs` (AC2), the
upgrade drive (AC8), the network log clause in CG-008's installed-app drive (AC9).

## 6. Traps

Ollama cannot load this model (0.13.5 → 412) and is not used; the `Qwen` chat wrapper leaks `</think>`
and the Jinja wrapper returns "" — raw ChatML only; a packaged backend installs its policy only into a
folder with none; an empty endpoint is no backend; `build:editor:_viewer` rewrites a peer's `external/`
— build the prod engine into a scratch `OUT_PATH`.
