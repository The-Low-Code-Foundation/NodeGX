# OWN-015 — The backend from npm: a cloud function that keeps the key

**Opened 2026-10-12** from R18 (see OWN-014's header). **Model:** **Fable** for §3 step 1 (what the backend drags in
when it leaves the monorepo, and the secret's shape across the MCP, the backend and the cloud node). **Opus** for the
packaging, the stranger's runs and the publish.

**Status: 🟡 s15 (2026-10-12): AC1 ✅. CFPORTS, UNDEPLOYED and DETACHEDVISUAL fixed (§9). A fresh stranger round from tarballs packed at HEAD built the app from a sentence without "NodeGX", deployed it unprompted, and it SPEAKS with no repair once Richard pasted the key into `.env` (§10). Owed: P112-S15-WAVTWICE (static tail, 2/2 agents; an example), then re-pack + publish (AC4).**

## 1. The person sentence

> **Someone who set up a folder with `npm create nodegx` asks their agent for an app that calls Google text-to-speech.
> The key goes in once, lives on the backend, and the browser never sees it.**

Today, on the npm path, the key can only go into an HTTP Request node in the browser bundle.

## 2. What was measured (2026-10-12, static reads; nothing driven)

- **The pieces exist in the repo:** the `noodl.cloud.secret` node (`packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts:55`,
  in the catalog, cloud only); a `functions` namespace in `secrets.json` with a `NODEGX_SECRET_<NAME>` environment
  fallback (`packages/nodegx-backend/src/config/SecretsStore.ts:171-178`, `service.ts:874-892`); the MCP tools
  `provision_backend` and `deploy_cloud_functions` (`packages/noodl-mcp/src/tools/provisionTools.ts:162`).
- **None of it reaches npm:**
  - The backend is `@noodl/nodegx-backend` with no `files` and no `publishConfig`. It depends on two workspace
    packages, `@noodl/backend-contract` and `@noodl/runtime`, plus `nodemailer`. It wasn't among OWN-011's six
    published packages, although OWN-011 §1 reading 2 lists its `bin`.
  - `provision_backend` finds it only as a monorepo sibling, or at `node_modules/nodegx-backend`
    (`packages/noodl-mcp/src/backend/provision.ts:104-113`), which is the **wrong name** even for an install. Otherwise
    it refuses with *"Build it … in packages/nodegx-backend"* (`provision.ts:462`).
  - **No MCP tool sets a function secret.** The `set_backend_*` tools write SMTP, S3 and OAuth credentials
    (`backendTools.ts:681, 1533, 1666`), and nothing writes the `functions` namespace.
- HTTP Request's authentication presets do send the credential now (P107-C7, fixed `684d881f2`, which is in the
  published build). That fix is for the browser path. It doesn't keep a key secret.
- @noodl on npm belongs to the original Noodl team (R8). This package publishes as `@nodegx/backend`.

## 3. The work

1. **Measure what leaves with it.** Bundle `@noodl/backend-contract` and `@noodl/runtime` into the backend's build
   (as the MCP and the preview bundle the editor's code), or publish them? List what each pulls in, and whether
   anything native or GPL-only comes with it (the licence follows R12–R14's reading).
2. **Publish `@nodegx/backend`**: a `files` list, a production build, the `bin` kept. `provision_backend` resolves it
   with `require.resolve` from its own location, `NODEGX_BACKEND_ENTRY` still overriding. Decide whether
   `@nodegx/mcp` depends on it or the refusal says `npm i @nodegx/backend`, and record which in this file.
3. **A tool that sets a function secret**, e.g. `set_function_secret {name, value}`, writing the `functions` namespace.
   It never echoes the value back, and doesn't leave it in the project folder or anything git would see. Reading the
   secret is the cloud node's job, not the agent's.
4. **The fixture: the language app.** A small Duolingo-style project (lessons from Static Data, a page per exercise,
   progress in a persisted Global Store). A cloud function takes `{text, voice}`, reads the key through the secret
   node, calls Google's `text:synthesize`, and returns `audioContent`. Playback is a node the agent writes with
   `create_node_kit` (shipped in `@nodegx/mcp@0.1.0`; there is no Audio node in the catalog). If the kit node meets a
   gap, that's a filed finding, not a workaround.

## 4. Acceptance criteria

- **AC1 — the stranger's view.** In an empty folder with `HOME` empty, from packed tarballs (then from the registry), a
  fresh agent is given one sentence. It runs `provision_backend`, sets the secret, deploys the function, and the app
  speaks a sentence in the preview.
- **AC2 — the key is never in the browser.** Search the preview's served files, the project folder and a capture of
  every request the page makes for the key's value: zero hits. **Control arm:** the same search on a build where the
  key was put in an HTTP Request node must find it, otherwise the search can't see the key and AC2 proves nothing.
- **AC3 — the refusals.** With no backend installed, `provision_backend` names the one command that adds it. With no
  secret set, the function's error says which secret is missing, not "401".
- **AC4 — the published version**, after asking Richard (R11). AC1 is re-run from the registry.

## 5. Not this task

- Hosting the backend somewhere other than the person's machine: OWN-016.
- A Worker or D1 backend: P115 HST-004 and HST-006, still parked.
- The admin dashboard: P104.

## 6. Session 13 (2026-10-12, Opus): built, and graded from a tarball

**Step 1, measured.** No design question was left for Fable:
- The backend already builds into **one self-contained file**, `nodegx-backend/dist/cli.js` (4.6 MB, its
  `scripts/build.js`: *"copy this file and run it"*). The packaged editor ships exactly that file.
- At runtime it requires Node built-ins and `node:sqlite` only, with `sharp`, `pg-native` and `better-sqlite3` as
  guarded optional requires.
- Everything it inlines is MIT (`noodl-runtime`, `noodl-viewer-cloud`, `nodegx-backend-contract`). It declares
  `engines.node >=22.13.0`.

**Step 2, decided: it ships inside `@nodegx/mcp`**, not as a dependency.
- `build-backend-copy.mjs` (prepack, `--remove` at postpack) bundles it with the backend's own exported esbuild config
  to `dist/backend/cli.js`. It writes there, never over the `dist/` a running editor or peer uses.
- `provision.ts` probes `dist/backend/cli.js`, and its refusal names the npm case. The old "installed copy" candidate
  names `node_modules/nodegx-backend`, a package that has never existed.
- Why not a dependency: no workspace is called `@nodegx/backend`, so declaring one would send the monorepo's own
  install to the registry. A standalone package for a server is OWN-016's question.
- The tarball grows to 6.8 MB packed.

**Step 3: two tools in the deferred backend group.** `set_function_secret {name, value}` (write-gated) and
`list_function_secrets` (names only), both over CWF-009's existing `PUT/GET /admin/secrets`. The value is never
echoed. The resident surface is unchanged at 8,279 of 8,280, measured with and without them.

**Found and fixed: P112-S13-CLOUDDEPLOY (high).** `deploy_cloud_functions` failed on every npm install, with
*"[@noodl/platform] Cannot find package.json"*. The installed NodeGX 0.3.0's bundler fails the same way from any
folder that isn't an npm package (measured). This is C68's defect, and the fix is C68's: a `package.json` beside the
bundle, shipped by npm and by the editor's `extraResources`. New spec `own015CloudBundleCwd`, 3/3 with its control.
ISL-042's spec runs with `cwd: PKG`, which is why it never saw this.

**The fixture and the run.** `node scripts/own/stranger-backend.mjs <tgz>` runs in an empty folder, with `HOME`
empty and `NODEGX_*` removed, the MCP over stdio. Google is a local stand-in that returns audio **only** for the right
key in `x-goog-api-key`.
- `create_project` "Lingo" with `backend: nodegx` → `find_tools` → `provision_backend` (from `dist/backend/cli.js`).
- `create_component #__cloud__/speak` is Request(text, voice) → Secret `GOOGLE_TTS_KEY` → Function (`fetch`
  text:synthesize, MP3) → Response `audioContent`, with failures to a second Response. It reported 0 errors, then
  `deploy_cloud_functions` deployed it.
- **AC3:** `POST /functions/speak` before the secret is set → **400**, *"Secret: "GOOGLE_TTS_KEY" is not provisioned
  on this machine. Add it under the "functions" section of …/secrets.json, or set NODEGX_SECRET_GOOGLE_TTS_KEY"*, with
  no call to the API. With no backend at all, the registry's `@nodegx/mcp@0.1.0` refuses `provision_backend` and has no
  `set_function_secret` (control arm).
- `set_function_secret` → `list_function_secrets` shows the name and not the value → `POST /functions/speak` →
  **200**, the audio decodes to the sentence, and the stand-in saw the right key.
- **AC2 (files and results):** the key's value appears in **0** of the project's 18 files and in **0** tool results or
  HTTP answers the agent saw. It is in **1** file, the backend's own `secrets.json` under `~/.noodl/backends/<id>/`.
  **Control:** the same key in an HTTP Request node in a page is found by the same search
  (`components/Control/KeyInThePage/nodes.json`).
- The fixture differs from what ships only in its endpoint constant (the real one is `FIXTURE_ENDPOINT` in the script).

**Found: P112-S13-SECRETPATH (low, open, a question for the fix).** That AC3 message carries the server's
`secrets.json` path. The fixture routed the Secret node's `Error` into the public Response, the obvious wiring, so
anyone calling the function learns the home directory and backend id. No value leaks.

**Owed.**
- **AC1's stranger.** A fresh agent with one sentence builds this itself, plus the page: a button wired to a Cloud
  Function call and playback through a `create_node_kit` node. The app must speak in the preview. Driving a real Claude
  Code in an empty folder is the honest form.
- **AC2's last third.** A capture of every request the page makes in the preview.
- **AC4.** Publish, after asking Richard (R11), in a worktree at the pushed commit.
- **A real Google key** for the video. The stand-in proves the path, not Google.


## 7. Session 14 (2026-10-12, Opus): two stranger rounds, and the app speaks after four repairs

**The setup.** `create-nodegx-0.2.0.tgz` ran in an empty folder under the scratchpad. `.mcp.json` was pointed at
`nodegx-mcp-0.2.0.tgz` (0.2.0 isn't on the registry yet), with `env.HOME` an empty folder. Then `claude -p`
(Sonnet 5), `--strict-mcp-config`, `--setting-sources project,local`, `--allowedTools mcp__nodegx Read Write Edit Glob
Grep` (Bash not pre-approved, so it was denied in `-p`), `--no-session-persistence`.

**The key never went to an agent (Richard's ruling).** Handing the real key to a fresh agent in its first message
was refused by Claude Code's own safety check ("Credential Leakage"). Richard ruled that the agent never sees it: the
sentence says *"I'll add my Gemini API key myself afterwards under the name GEMINI_API_KEY; it must stay on the
server"*, and Richard ran a script that copied it from `.env` into the backend's `secrets.json`. This is filed as
P112-S14-PERSONKEY (ruled R26 and built, §8): on the npm path a person has no way to set a function secret without the agent
seeing it.

**Round 1** (the sentence without "NodeGX"): 14 turns, $0.53. The agent wrote an Express server and plain HTML and
**called no NodeGX tool** → P112-S14-NOTNODEGX (high; ruled R27 = both and built, §8: the server's instructions and/or a `CLAUDE.md`
should say that apps in this folder are NodeGX apps).

**Round 2** ("Using NodeGX, …"): 89 turns, $4.29, 39 min.
- It built `bonjour`: `provision_backend` with `Lesson` and `Phrase` seeded (3 × 5 phrases), Home and Lesson pages,
  `PhraseRow`, and `#__cloud__/Functions/Speak` (Request → Secret `GEMINI_API_KEY` → Function calling
  `gemini-3.8-flash-tts`, PCM wrapped as WAV → Response `audioDataUrl`).
- Playback is a hidden `Video` node, not a `create_node_kit` node.
- `validate_project`: 0 errors.
- `render_report` was killed at 240 s on all 4 calls, so the agent never saw its app.

**What it took to hear it.** Each step was measured, then repaired on a **copy** (`bonjour-repaired`). The original
is kept unrepaired as evidence.

| # | what stood in the way | bug | status |
|---|---|---|---|
| 1 | Every render hung: Chrome under an empty `HOME` opened macOS's "Keychain Not Found" dialog **on Richard's screen**, once per launch, and waited for an answer | P112-S14-KEYCHAIN | ✅ fixed (`--use-mock-keychain`); renders in 3 s under the same `HOME` |
| 2 | The agent never deployed the function, and no tool result told it to | P112-S14-UNDEPLOYED | open |
| 3 | Day two: `provision_backend` refused to restart the project's own stopped backend, and `deploy_cloud_functions` sent the agent to an editor panel | P112-S14-DAYTWO | ✅ fixed + spec (mutant red) |
| 4 | The npm preview blanked the project's local backend, so no data loaded ("no backend configured") | P112-S14-NOBACKEND | ✅ fixed + 5 specs |
| 5 | Every cloud port wired without its prefix (`text`, `audioDataUrl`, `success` … for `in-`/`out-`/`pm-`), as the published example teaches, and the checker accepted them, so nothing was sent and the function returned `{}` in 10 ms | P112-S14-CFPORTS (+ P107-S89-CFEXAMPLES) | open, high |
| 6 | The Video player sat outside the visual tree, so it was never mounted | P112-S14-DETACHEDVISUAL | open |
| — | A copy of a project can't redeploy to the same backend ("Duplicate component name") | P112-S14-MOVEDDEPLOY | open |

**AC1, measured on the repaired copy.** The preview is the checkout's build with the NOBACKEND fix. The backend is
the round's own (`backend_mv53wqaxdal0j`, restarted with `force: true` as 0.2.0's refusal says), `Speak` is deployed,
and the key is in `secrets.json`.
- `POST /functions/Functions%2FSpeak {"text":"Bonjour"}` → 200, a 59,918-byte RIFF/WAVE data URL, 1.8 s. That's real
  Gemini speech through the stranger's own function.
- Driven in headless Chrome (a real CDP press, `elementFromPoint` checked, no autoplay flag): Home (3 lesson cards
  from the backend) → *Greetings* → tap *Bonjour* → the `playing` event at 2.8 s (desktop) and 2.3 s (phone,
  390×844). The phone run played to the end, 1.45 s of 1.45 s. 0 console errors.
- **The original, unrepaired:** the tap calls `Speak` and nothing plays (rows 5 and 6).

**AC2's last third ✅.** Every request the page made (15, including the backend's `classes/*` and the function call),
every request body and every response body (17.3 MB) was searched for the key's value: **0 hits**, and 0 in the page's
HTML. The known-firing control, the seeded word "Bonjour", was found 6 times by the same search. The key exists in
one file, the backend's `secrets.json`.

**Also seen:** the function's "not provisioned" error reaches the person's screen, with the server's `secrets.json`
path in it (P112-S13-SECRETPATH, now in a stranger's build). The agent wired the Secret's `error` to a visible Text.

**Owed:** rows 2, 5 and 6 are the agent-path defects between "built" and "speaks". With them fixed, a fresh round
2 should speak without any repair, and that round is AC1 as written. Then the 0.2.0 tarballs are re-packed (they
predate rows 1, 3 and 4) and published after asking (R11).

## 8. Session 14, continued: Richard's two rulings, the static, and `.env` in the preview

**The static.** Richard listened to the repaired copy: *"After each generated audio, there's a loud static noise for
half a second."* Measured on a clip: the level falls to RMS 5 at 0.9 s, then climbs to 7,600, 17,900 and 25,700 (of
32,767). Cause: **`gemini-3.8-flash-tts` returns a finished WAV file** (`fmt `, `data`, then a 6,062-byte `C2PA`
provenance chunk), not raw PCM. The agent's function, written from older Gemini TTS, wrapped a second 44-byte
header around the whole file, so the inner header played as a click and the C2PA bytes as noise. This is the agent's
code, not a NodeGX defect. lingo.nodegx.io (s13's function passes the file through) has a clean tail. Repaired on the
copy (a `RIFF` payload is passed through as it is): the tail now decays to RMS 5, and Gemini's C2PA chunk is kept
where players skip it. **For the video:** a playback kit or an example that handles both shapes would stop the next
agent making the same mistake.

**Ruling 1, NOTNODEGX = both.** The unbound server's instructions say to build the app with this server, and
`create-nodegx` writes `CLAUDE.md` and `AGENTS.md` saying the same (fixed; see the bug file). A fresh round 1 is owed.

**Ruling 2, PERSONKEY = the `.env` route.** *"The user just pastes the API key right after the = … then Claude runs a
script that sends it to the server. We need a better solution than tech noobs having to paste terminal commands."*
`set_function_secret` with no `value` writes `NAME=` into the project's `.env`, adds `.env` to `.gitignore`, and gives
the agent `tellThePerson` (open `.env`, paste after the `=`, save, say done). The next call sends the value from the
file to the backend and reports only its length. **Found on the way: P112-S14-ENVSERVED (high).** The preview
served every file in the project folder, `.env` included (4 path spellings, 200 with the canary). Fixed: the preview
serves only what the deploy's own ignore rules would publish. 11-case spec, with an ordinary asset as the control.

**Owed now:** UNDEPLOYED, CFPORTS and DETACHEDVISUAL; then a fresh round 1 (no "NodeGX" in the sentence, checking
NOTNODEGX) and round 2 with the `.env` route, which must speak with no repair (AC1); then the re-pack.

## 9. Session 15 (2026-10-12, Opus): the three agent-path defects fixed

s14's work was uncommitted at the `/clear`. It's committed first (`908f8f478`), after its 48 specs ran green and a
search found the key's value in 0 of the committed paths (the control file hit).

| bug | what the agent now meets | commit | spec |
|---|---|---|---|
| CFPORTS (+ P107-S89-CFEXAMPLES) | A bare cloud port is refused on all four ends, even when the instance declares it in its own `ports`; the refusal names `in-text` / `out-…` / `pm-…`. The examples taught the bare names on both sides: 10 of 109 (34 wires) are rewired, `catalog:examples` 109/109. Request, Response and Cloud Function descriptions say "wire `pm-text`, never `text`". | `5ff71216f` | `own015CloudPorts` (red before) |
| UNDEPLOYED | `create_component`, `update_component` and `apply_plan` answer a cloud write with `cloudFunctionsNotDeployed.next` ("Call deploy_cloud_functions now…", or provision first), and reveal the two tools when deferred | `787876713` | `own015DeployNote` |
| DETACHEDVISUAL | A visual node with no parent that a non-empty `visualRoots` leaves out is a `detached-visual-node` warning, with where to put it | `9505d342d` | `own015DetachedVisual` |

Measured on the round's own unrepaired `bonjour`: `validate_project` reports the 4 dead cloud wires and the
detached Video. The repaired copy reports none. Censuses: 635 cloud endpoints in templates and library, 0 bare; 820
components, 0 detached visual nodes. Not a checker matter: the round's `speak.success` on a `JavaScriptFunction` is
the node's real "script finished" signal (it also fires on an early return), not the script's own `out-success`.

Found on the way: P112-S15-SUNDAYGATE (a planner spec skipped itself on the Sunday its subject changed; fixed) and
P112-S15-TWOMCPREDS (two MCP specs red at HEAD, not from this work; filed).

## 10. Session 15: a fresh stranger round speaks with no repair (AC1)

Packed at `9505d342d` in s13's `npm-020` worktree (all six fixes found in the bundle). The packed `create-nodegx`
ran in an empty folder with `HOME` empty and wrote `.mcp.json`, `CLAUDE.md` and `AGENTS.md`. `.mcp.json` pointed at
the MCP tarball (0.2.0 is unpublished; the registry says 0.1.0). Then `claude -p` (Sonnet, `--strict-mcp-config`;
`--allowedTools` pre-approves, it doesn't restrict) got **s14's round-1 sentence, which never says "NodeGX"**.

- **NOTNODEGX ✅:** first calls `list_projects`, `create_project`. 84 turns; Claude Code on Richard's subscription (`apiKeySource: none`, the five-hour window in its log), so the $3.75 it reports is the API-price equivalent, not a charge. No Claude API anywhere. Its file tools touched only
  its own screenshot. It never opened `.env`.
- **The agent's own path:** `provision_backend` → `set_function_secret` (no value: `.env` placeholder) → a plan → 
  `apply_plan` → **`deploy_cloud_functions` with no prompting** (UNDEPLOYED ✅) → 3 `render_report` → `drive_page` ×5.
  It found and fixed two bugs of its own (the function refused the browser's unauthenticated call; an upsert
  needed a unique index), redeployed, and stopped at *"paste your Gemini API key after `GEMINI_API_KEY=`"*.
  All its cloud ports are prefixed (`in-text`, `out-audioBase64`, `out-mimeType`; CFPORTS ✅). The player is a
  JavaScript Function with a detached `new Audio()`, so DETACHEDVISUAL doesn't apply this time.
- **Day two, as the person meets it:** a fresh server, `provision_backend` with the agent's backend name and **no
  `force`** → `reused` on the same backend (DAYTWO ✅). `validate_project` 0 errors, 1 warning (FRESHFONT, known).
- **The key, Richard's way (R26):** he pasted it into the project's `.env` and saved. `set_function_secret {name}`
  answered `set: true, characters: 53` from the file. The packed preview answers `/.env` with 404 (ENVSERVED ✅).
- **It speaks, unrepaired**, in the packed preview (headless Chrome, real CDP press, `elementFromPoint` checked, no
  autoplay flag). Desktop: `playing` 2.0 s after the tap on *Bonjour*, played to the end (1.25 s of 1.25 s). Phone
  (390×844): 3.0 s, to the end. 0 console errors. **The key is in 0 of 2.05 MB of requests and responses, and 0 in
  the DOM; the control string is found 4 times.**
  - The first drive read "not played": its probe listened on `document`, and a detached `Audio`'s events never get
    there. The probe now wraps `HTMLMediaElement.prototype.play`.
- **The static is back: P112-S15-WAVTWICE (filed).** Gemini returns a finished WAV with a C2PA chunk. This agent, like
  s14's, wrapped it in a second header, so the tail after the speech measures RMS `5 → 15066 → 17174`. 2 of 2 agents,
  so the kit has to show the right shape (an example first).

**AC1 ✅ as written** (built from one sentence, speaks in the preview with no repair, key server-side). The video
still needs WAVTWICE fixed. **Next:** WAVTWICE's example; re-pack; publish 0.2.0 after asking (AC4, R11); deploy this
app to the VM for the phone check (OWN-016).
