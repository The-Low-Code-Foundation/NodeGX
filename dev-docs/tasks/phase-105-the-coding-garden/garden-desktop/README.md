# Olive's Island desktop — the coding game with its own backend and its own owl (P105 CG-004)

**The name.** A person sees "Olive's Island" (FR "L'île d'Olive", P105 ruling 7): the window title, the Mac bundle
(`Olive's Island.app`), the Windows exe, its Task-Manager name and its Start-menu shortcut, the Documents backups folder,
the shell's dialogs. Everything internal keeps its slug: this folder and the package are `garden-desktop` (so the
Windows install folder stays `%LOCALAPPDATA%\Programs\garden-desktop`), the appId `io.digitalbricks.garden` (the NSIS
GUID, so a new installer upgrades an old one in place), the doors `/__garden/`, the template `templates/bot-garden`,
the storage key `bot-garden`. **Her saves stay put:** Electron names `userData` after the app, and the family lives
in the page's localStorage under it, so `main.js` pins `userData` AND `sessionData` to `garden.json userDataDirName`
("Bot Garden", the folder every build before the rename wrote) — `config.test.js` loads `main.js` with a fake Electron
to prove it. The installer's FILE name (`OlivesIsland-Setup-<v>.exe`) has no apostrophe and no space.

An Electron shell that runs a NodeGX app, its `nodegx-backend`, and a 0.8B language model on one computer, with no
network. Forked from the Nightbook shell (`../../phase-78-the-templates/nightbook-desktop/`, TPL-011) and
**parameterised**: everything that names the app is in `shell/garden.json`.

| File | What it does |
|---|---|
| `shell/garden.json` | The app: id `garden`, `name` / `nameFr` (what a person sees), `userDataDirName` (where her saves live, pinned), port `47633`, data dir `island`, the doors' prefix `/__garden/` and header `x-garden`, the backup policy, the model's file, pinned URL, sha256 and size. |
| `shell/main.js` | One window, one instance. The backend (this binary in Node mode, `--port 0 --no-admin`), the relay on the fixed origin, the policy adopted, backups seeded, the owl woken AFTER the island is on screen, the exam run once. `GARDEN_HOME` keeps a drive's writes in a throwaway folder; `GARDEN_MODEL_PATH`, `GARDEN_CPU`, `GARDEN_VERSION`, `GARDEN_POLICY_DIR`, `GARDEN_WINDOW` are drive-only overrides. |
| `shell/relay.js` | The page's one origin. Serves a file of the app, gives a navigation `index.html`, answers the shell's doors, forwards the rest to the backend. |
| `shell/owl.js` | The sidecar: node-llama-cpp in the main process, loaded once, one context, a queue, raw ChatML exactly as `tpl-012-olive-exam/battery.mjs` (the only harness that works for Qwen3.5), a grammar per shape, ≤ 64 tokens, a 12 s timeout → `fallback:true`. Plain Node: the contract test runs it without Electron. |
| `shell/olive-templates.json` | Olive's prompt table: the twelve rungs of TPL-012 §2.6 (two entries each for rungs 2 and 8) plus `voice-hint`; per rung a system prompt, a user template with `{slot}` holes, the slot specs (a word list, a regex, or the ≤ 40-character text slot), shape, temperature, must-contain. The word lists in both languages. **The renderer never sends prompt text.** |
| `shell/olive-check.js` | Slot validation with named reasons (`not-in-list`, `too-long`, `control-char`, `regex`, `blocklist`, `missing-slot`, `unknown-slot`); prompt composition from the table; output checks (grammar parsed with a bounded closing repair, the caps, the FR/EN blocklist, must-contain, U+FFFD and leaked `</think>` stripped). |
| `shell/olive-route.js` | `POST /__garden/olive` `{rung, slots, lang, shape?, temperature?, options?}` → `{ok, value¦text, ms, fallback?, reason?}`; `GET /__garden/olive/status`; `POST /__garden/olive/exam`. POSTs need `x-garden: 1`. |
| `shell/exam.js` | Olive's exam: 23 probes trimmed from the battery, each with the readout's expectation, sampled up to 3× (majority), one pass/fail per rung, kept in `<data>/olive-exam.json`. A 🎓 rung passes when she FAILS as the readout says. |
| `shell/model-check.js` | The GGUF's sha256 at first launch, remembered on size + mtime; a mismatch refuses the model (`status.model = refused`). |
| `shell/timings.js` | `timings.log`: the launch line, `model-load`, `exam-probe`, `olive` — one JSON object per line. |
| `shell/policy.js`, `fit.js`, `copies.js` | Nightbook's, unchanged in behaviour (the copies' prefix and header come from garden.json). `policy.js` also holds `CLOSED_POLICY`, the backend's policy for an app that ships none (every rule `nobody`); `fit.js` also holds `windowTitle` (only the game's two names reach the window). |
| `shell/tests/*.test.js` | `node --test tests/*.test.js` — 59 tests: Nightbook's 23 plus config, the checks, the owl (fake engine), the route, the model check, the exam. |
| `tests/olive-contract.mjs` | The contract test: the exam against the route with the REAL model, in plain node. `--cpu` for the tablet's path. Prints per-probe ms and the per-rung table; exit 1 if a ✅ probe is not met or a 🎓 probe does not fail. |
| `fetch-model.mjs` | The model by pinned URL + sha256 into `shell/build-output/model/` (`--from <file>` links a local copy; `--check` verifies). Never committed. |
| `build-app.js` | Assembles `shell/build-output/` (app export with the origin baked and the page titled with the game's name, backend, policy — the project's, or the shell's closed one when it ships none, as `templates/bot-garden` does — workflows, licences; the model verified). `--project` defaults to `templates/bot-garden`. Reads the deploy engine's JSON verdict (it exits 0 on a refusal). |
| `drive-lib.js`, `drive-upgrade.js` | The drives (Electron, CDP): a v2 over a used v1 keeps the exam, adopts the policy, and keeps a family made on the real pages (a new player, her robot named, renamed on My robot; read back in storage, on her card and on My robot) (AC8); every request's host is 127.0.0.1 (AC9); with no model it asks once and reads the fallback instead of waiting for an exam (AC4). `--exe` drives an installed app. |
| `licenses/` | Qwen (Apache 2.0), node-llama-cpp (MIT), llama.cpp (MIT), NOTICE — shipped in `extraResources/licenses/`. |
| `../../../../.github/workflows/garden-desktop.yml` | CI: the shell tests and the contract test on Linux CPU (the model cached on its sha); the Windows installer built from `templates/bot-garden`, installed silently, its name read back, egress blocked, and driven (`drive-upgrade.js --exe`). Started by a push to `p105-garden-desktop` (it is not on the default branch, so no dispatch). |

## The Olive contract (what a page sends and gets)

```
POST http://127.0.0.1:47633/__garden/olive        header  x-garden: 1
{ "rung": "words-to-blocks", "slots": { "route": "Avance de deux cases puis tourne à gauche." }, "lang": "fr",
  "shape": "blocks", "temperature": 0.2 }                      shape/temperature optional (the rung's by default)
→ { "ok": true, "value": ["avancer","avancer","gauche"], "ms": 1216 }
→ { "ok": true, "text": "Merci Mamie Rose !", "ms": 455 }      prose shapes carry text
→ { "ok": false, "fallback": true, "reason": "timeout", "ms": 12004 }   show the written line
GET  /__garden/olive/status  → { model: ready|loading|none|refused|failed, reason, gpu, loadMs, lastMs, busy, queued, exam: { at, passed, failed, rungs: { <rung>: { ladder, pass, probes } } } }
POST /__garden/olive/exam    → the results (409 while one runs)
```

Shapes: `one_word`, `list_of_3`, `yes_no` (value `oui`/`non` or `yes`/`no` by `lang`), `one_of` (`options` from the rung's
list), `integer`, `blocks` (the enum `avancer gauche droite arroser`), `sentence` (≤ 25 words, trimmed), `two_lines`.
Temperatures: `0`, `0.2`, `0.5`, `0.8`, `1.2` (the dial). A rung the exam failed on this machine is `rungs[<rung>].pass = false`:
CG-005 withholds it.

## Run it on a Mac

```bash
# from the repo root; needs packages/nodegx-backend/dist/cli.js and packages/noodl-preview/dist/nodegx-deploy.cjs
(cd dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell && npm ci && npm test)
node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/fetch-model.mjs --from ~/.ollama/models/blobs/sha256-bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517
node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs          # Metal
node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs --cpu    # the tablet's path
node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/build-app.js --allow-development-engine   # templates/bot-garden; the dev engine for a LOCAL smoke only
node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/drive-upgrade.js
(cd dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell && npm run dist:mac)   # dist/mac-arm64/Olive's Island.app
# the packaged app (the drive strips ELECTRON_RUN_AS_NODE from what it launches; quote the apostrophe)
node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/drive-upgrade.js --exe "dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/dist/mac-arm64/Olive's Island.app/Contents/MacOS/Olive's Island"
```

`shell/` is deliberately **not** a workspace package, so installing it never rewrites the root `package-lock.json`.
`shell/node_modules`, `shell/build-output` (the model lives there), `shell/dist` are gitignored.
