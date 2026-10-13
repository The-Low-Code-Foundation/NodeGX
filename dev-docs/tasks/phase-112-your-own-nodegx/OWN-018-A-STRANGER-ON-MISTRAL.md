# OWN-018 — A stranger on Mistral

**Opened 2026-10-12** (Richard: *"a challenge to test Mistral Large 4 as the LLM building with the nodegx npm 0.2.0
package … an internal data management system as a case study … all the data stays in Europe with an EU LLM. Do the
same 'stranger's Claude Code' method we used for the Lingo app."*).
**Depends on** OWN-015's 0.2.0 tarballs (packed at `9505d342d`; nothing shipped has changed since).
**Status: 🟡 s2 done (2026-10-13). Mistral Large 4 on OpenCode builds the quiz 12/12 from one paragraph, finishing by itself, for $1.41 at 81% cached (run 9; Sonnet's yardstick 12/12 at $6.30 API-equivalent). Two runtime defects, five kit lessons and three config facts on the way (§14). FANOUT needs a ruling. Next: repeat run 10's verdict, then the same series in Mistral Vibe on a subscription.**
**Model:** the session that runs the rounds and reads them: Opus. The stranger: **Mistral Large 4 (`mistral-large-4`)
in Mistral Vibe**, on purpose — the test is whether the kit is enough for an agent that isn't Claude.

## 1. The person sentence

> **A team that wants its data and its AI in Europe asks Mistral's own coding agent, running Mistral Large 4, for an
> internal app in one paragraph that never says "NodeGX", and gets a NodeGX app with a backend, deployed, whose "Ask"
> box answers from the team's own data through Mistral once the key is pasted into `.env`.**

## 2. Why

OWN-015 proved the npm kit with Claude (Sonnet). Every sentence in the kit — the server's instructions, `AGENTS.md`,
tool descriptions, examples, refusals — has only ever been read by Claude. R3 says the brief is "recommended for
Claude but can be used with any AI coder"; nothing has measured that. Mistral is also the case study's point: a
European team that leaves Airtable, Notion, n8n and Slack for its own app on its own server doesn't then send its
data to an American model.

## 3. Decisions taken here (and why)

- **The harness is Mistral Vibe, not Claude Code and not Cline.** Claude Code only talks to other models through a
  translation proxy (LiteLLM or claude-code-router behind `ANTHROPIC_BASE_URL`), and its system prompt and tool
  shapes are tuned for Claude: a failure there would grade the proxy. Cline speaks to Mistral directly but is an
  editor extension first. Vibe is what a Mistral user is given: Mistral's own CLI (Apache-2.0), `vibe -p` headless,
  MCP over stdio, reads `AGENTS.md` (which `create-nodegx` already writes), and caps a run with `--max-price`.
- **Vibe 2.26.1 ships no Mistral Large 4 entry.** Its default model is *routed* to `glm-5-3` (GLM-5.3, a Z.ai model
  Mistral hosts); its only Mistral entry is Medium 3.5. The person adds Large 4 by copying the Medium entry and
  changing the name and prices (temperature 1.0, thinking high — Vibe's defaults for a Mistral model, not tuned).
- **`mistral-large-4` is pinned, never `mistral-large-latest`.** Measured 2026-10-12: `-latest` answers as a different
  model (it refuses `reasoning_effort`: "not enabled for this model").
- **No Mistral-specific edits to `AGENTS.md` before round 1.** The round measures what the kit says today; what
  Mistral gets wrong is the finding (OWN-011's rule: the first round's failure IS the finding). Fixes go into the kit
  for every agent, then a fresh round.
- **Parity with s15:** shell and web search are off (s15's `claude -p` had neither approved); file tools and every
  NodeGX tool are approved; HOME empty; the app's key is never in the agent's sight (R26, the `.env` route).

## 4. What the research says to watch for (2026-10-06 release, public preview)

- **Ending a turn without delivering** (MindStudio's coding test: 0 on two tasks for stopping early) — `vibe -p`
  stops at the agent's first final answer, so an early stop ends the round.
- **Reasoning on = long output and cost**; one test only produced a working file with reasoning off. Round 1 keeps
  Vibe's default (high); a second arm with `thinking = "off"` is the control if round 1 stalls.
- **Hallucinated APIs and flags** in fast-moving JS frameworks — here: invented node types and port names, which the
  MCP's validation should catch and name.
- **Multi-file coordination** is its weak spot — a NodeGX app is many components wired by name.
- Preview speed ~50 tok/s, 15–20 s to first token; 429s on low tiers.

## 5. The run

`own-018/round.mjs <root> <tgz-dir> <prompt-file>`: the packed `create-nodegx` in an empty folder (HOME empty), a Vibe
config the person would write, then `uvx --from mistral-vibe==2.26.1 vibe -p` with `own-018/sentence.txt`.
`own-018/peek.mjs <root>` reads the round as it goes and, after, the real cost.

**Smoke rounds (s1, 2026-10-12)** measured the harness before the paid round:
- The MCP starts from the tarball over stdio; Vibe defers MCP tools behind `search_tool_functions` (as Claude Code
  defers them behind ToolSearch) and names them `mcp_nodegx.<tool>`.
- 🔴 `--disabled-tools 'bash*'` disables nothing: Vibe's shell is `file_system.bash` (and `process.*`). The first smoke
  agent ran `jq`. A regex (`re:.*(bash|powershell|process).*`) works: the call is answered *denied*.
- Vibe cuts a tool result at 40,000 characters and saves the whole result to a file the agent can read.
- 🔴 **Vibe's export says `cached_input_tokens: 0` and prices every token uncached.** Mistral does cache (measured on
  the API: 4,076 of 4,903 tokens cached on a repeat; in Vibe's per-step journal 62,856 of 82,299). Vibe's `cost_usd`
  and its `--max-price` cap therefore read about 3× the real spend; `peek.mjs` reprices from the journal. Prices used:
  launch sale, $0.68 / M input, $0.07 cached, $2.09 output (list $1.36 / $4.18).

## 6. Acceptance criteria

1. **Round 1 as written:** from `own-018/sentence.txt` alone, the agent builds a NodeGX app through the server's tools
   (no hand-written server or HTML), with a backend; deploys its cloud function(s); and stops at the `.env` step for
   `MISTRAL_API_KEY`. Recorded: turns, tool calls, real cost, wall time, every validation refusal it met and whether
   it recovered — beside s15's figures.
2. **It works for the person:** Richard pastes the key into the app's `.env`; in the packed preview, clients/projects,
   the wiki, the feed (and its automatic post on *done*) work, and the Ask box answers a question about the app's own
   data. The key is in 0 bytes of requests, responses and DOM (with a planted control found).
3. **Every defect is filed** in `dev-docs/bugs/` (`P112-OWN018-*`), sorted: kit (wording, examples, tools) vs
   Mistral/Vibe (not ours, recorded so the next round isn't confused by it).
4. **Fold back:** each kit finding becomes a fix that serves every agent, and a fresh round shows it held. If round 1
   fails for a reason the kit can't fix (the model stops early, the preview rate-limits), say so plainly, run the
   `thinking = "off"` control once, and stop.

## 7. Session 1 (2026-10-12, Opus): what Mistral got to, and why it stopped

Tarballs: s15's, packed at `9505d342d` (`nodegx-mcp-0.2.0.tgz` sha1 `5c0e4640…`); Vibe 2.26.1; the sentence in
`own-018/sentence.txt`. Real cost (repriced from Vibe's journal; its own figure in brackets):

| run | harness | what happened | steps / time | real $ |
|---|---|---|---|---|
| smoke ×2 | default | server starts from the tarball; `bash*` filter disables nothing (fixed) | 4 + 6 | 0.03 (0.08) |
| **round 1** | default | read `AGENTS.md` ("I'll build this as a NodeGX app"), `list_projects` → `list_examples` → **`create_project` "Studio Hub" with a full scope** → then 10 turns looking for tools that never came: **LISTCHANGED**. Stopped. | 17 / 2 min | 0.05 (0.29) |
| **sitting 2** | default | the person's repair (server re-registered with `studio-hub` + `--all-tools`, `vibe -c`): `provision_backend`, schema for Client/Project/WikiPage/FeedPost applied, chose the cloud `modelrequest` node pointed at Mistral's OpenAI-compatible URL by itself, read 16 examples, wrote **one 17-operation plan** — 11 of 15 staged ops refused and it **never saw why**: **OPAQUEERRORS**. Stopped. | 34 / 61 min | 1.86 (3.43) |
| error control | default vs legacy | the same refused call: *"The MCP tool returned an error"* vs the server's whole message | 5 + 1 | 0.02 |
| list-changed control | legacy | after `create_project` the model still named 6 tools | 2 | 0.03 |
| round 2 | legacy | 🔴 **contaminated, stopped**: Vibe's `grep`/`read_file`/`web_fetch` aren't confined to the folder, so it grepped my scratchpad (round 1's project, journals, my replay) and `/Applications` (the installed NodeGX), and fetched `opennoodl.dev/schemas/*` | — / 14 min | 0.29 (0.29) |

Total ≈ **$2.30** of the $10 credit. Caching is what makes it cheap: 84–91% of input tokens were cached.

**What the replay says Mistral got wrong.** Sitting 2's 15 staged graphs, replayed against the same server with
the MCP SDK (`scratchpad/own018/replay/`), so the diagnostics it never saw can be read:
- 4 staged clean (EmptyState, ClientRow, ProjectRow, WikiRow), and the Wiki editor page and App update.
- **Its own mistakes, each answered by a diagnostic that names the fix:** `width` on a content-sized Group
  (inert-dimension ×2 components); `p-clientId` / `p-wikiPageId` on RouterNavigate (the prefix is `pm-`; "available:
  target, openInNewTab, navigate"); a `mounted` input EmptyState never declared; `dataAttributes` as an array of
  names without `data-`.
- **One false refusal, ours: P112-OWN018-WIREDTARGET** — a NavItem whose `target` comes from a Component Input is
  refused as "navigates nowhere".
- Small wording note (not filed): the `dataAttributes` refusal says a name must start with `data-`, then suggests
  `"ask-loading"`.
- Not replayed: the two cloud functions (`askMistral`, `announceProjectDone`) were refused by Vibe's own argument
  check before they reached the server (`argumentsValidationErrors: [{}]`).

**Findings filed:** P112-OWN018-LISTCHANGED (high, kit), P112-OWN018-WIREDTARGET (medium, kit),
P112-OWN018-PROJECTAGENTS (medium, kit: `create_project` writes `CLAUDE.md`, no `AGENTS.md`),
P112-OWN018-OPAQUEERRORS (high, Vibe's; ours only to mitigate).

**Read so far on Mistral Large 4 itself:** it followed `AGENTS.md`, chose the NodeGX path unprompted, scoped well,
found the right nodes and examples, and recovered from its own syntax error. Nothing yet says it can't build the app;
both stops were the plumbing between it and the server. It thinks long (several 3–5 minute single steps) and writes
big batches (one 17-operation program), so one refused batch costs a lot.

## 8. Owed

1. **A ruling on LISTCHANGED** (its bug file has three options). Until it's fixed, a Vibe user's first sitting can
   only create the project.
2. Fix WIREDTARGET and PROJECTAGENTS **before 0.2.0 is published** (it isn't yet), then re-pack.
3. **A lab Vibe can't read out of** before round 3: no `--auto-approve` (Vibe asks before a path outside the
   workspace, and `-p` treats an ask as a refusal) with the NodeGX tools and in-folder file tools allowed in the config,
   `web_fetch` off; rounds in a folder with nothing beside it. Smoke it with a planted file one level up.
4. Round 3: fresh, `--legacy-harness`, from the fixed tarballs; then the key in `.env` and AC2.

## 9. Rulings and what was built (s1, continued)

**Richard (2026-10-12):** LISTCHANGED → **"Both"** (the "use any tool" tool and the self-opening folder); WIREDTARGET
and PROJECTAGENTS → **fix before 0.2.0, re-pack**; and: *"make this work with Mistral's vibe coding system as well as
we get it to work in Claude Code … some kind of 'mistral package' … research if Vibe is really better than Cline or
another harness … if we can make Mistral Large work close to what Sonnet can do, it'd be a huge win for EU LLMs."*

**Built (`4a18723fe`, 22 files):**
- **`call_tool`** (LISTCHANGED): resident in every mode; runs any registered tool through its own schema and handler;
  `describe: true` gives description + JSON schema; a refusal is an ANSWER `{ok:false, tool, error}` so Vibe's default
  harness shows it (OPAQUEERRORS mitigation). Surface unchanged at 8,279/8,280 (five resident descriptions shortened,
  same content). The self-opening folder (option 1) was **not built**: a server binds once, so it would stop a Claude
  user with one app in the folder from making a second there, and `call_tool` already gives a fresh sitting every tool.
  To be confirmed with Richard.
- **WIREDTARGET**, **PROJECTAGENTS** fixed (bug files carry the specs and sabotage results).
- **`create-nodegx` writes `.vibe/config.toml`** (the "Mistral package"): Large 4 pinned (stops Vibe's routed
  non-Mistral default), the same pinned server, `"always"` for the seven bootstrap tools (Vibe has no permission
  globs; `call_tool` reaches the rest), and the closing words say `vibe --legacy-harness`. Folder notes name
  `call_tool` and say "one component at a time". 13/13 `create-nodegx` tests.
- MCP full suite: 13 red suites, none mine after fixing one (`projectBinding`'s one-refusal gate: `call_tool` now lets
  the tool's own `ProjectBinding` refusal answer). The rest: TWOMCPREDS ×2 (filed s15), `backendTools` (a peer's new
  `emailCode` template), cmp004 ×2 / def038 / fld013 / tpl011 / two Chrome drives (known or a peer's untracked work),
  `iw008Crew` + `hls009` (load; green alone).

**Tarballs at `4a18723fe`** (worktree `npm-020`, `npm pack`; `scratchpad/own018/tgz2/`): create-nodegx `a77aad77…`,
mcp `79e3d263…`, preview `e71a0965…`. The MCP bundle carries `call_tool`, the wired-target guard and the AGENTS.md
writer; 0 first-party sources resolved from the primary checkout.

**Harness research (two agents, source-level, no API spend):**

| harness | re-lists on list_changed | error text reaches model | headless | confine to folder | Large 4 effort | note |
|---|---|---|---|---|---|---|
| **Mistral Vibe** 2.26.1 | no (fixed by `call_tool`) | legacy yes, default no | `vibe -p`, exit codes, `--max-price` | denylist / ask (an ask ENDS a `-p` run) | yes (`thinking` low/high) | Mistral's own, Apache-2.0, EU |
| **OpenCode** | **yes** | **yes** | `opencode run` | `external_directory` | yes | passes every check; 213k★ |
| Kilo Code | yes | yes | `kilo run` | yes | no (allowlist lacks Large 4) | OpenCode fork; Mistral launch partner |
| Cline | VS Code yes, **CLI no** | yes | `cline -y` | VS Code toggle | yes | Mistral launch partner |
| Codex CLI | no | yes | `codex exec` | OS sandbox | needs a proxy | Responses API only |
| Goose | yes | yes | `goose run` | none found | unverified | |
| Continue, Roo, Aider | — | — | — | — | — | unmaintained / archived / no MCP |

**Decision:** target **Vibe** first (Mistral's own, the EU story, now working with `call_tool` + `--legacy-harness` +
the generated config) and **OpenCode** second (most correct, needs no workaround). Run the same sentence on both.

**The lab, sealed by the harness (`own-018/round-kit.mjs`).** Kit smokes 1–3 measured: in `-p`, an "ask" answered no
is *"User cancelled the operation"* and ENDS the run; a configured `"never"` / denylist hit is a skip the run survives;
`bash` ignores a configured "never" (it asks per command), so the shells and web tools are not offered
(`--disabled-tools`). File tools get a denylist built from the lab's ancestors (each ancestor exactly; every sibling
of every ancestor and all it holds). Smoke 3: canary outside the folder read 0 times (read_file, grep, a subagent all
refused), run survived, then `create_project` → `call_tool {name: get_project_info}` answered with the project folder.

## 11. What Mistral reads, and how much of it it used (P112-OWN018-READWASTE)

Richard: *"Did it really need all 550K characters …? How much wastage is in there?"* Measured on sitting 2 (the one
full read-then-write cycle): its 68 read calls replayed against the same 0.2.0 server (`scratchpad/own018/replay/
reads.mjs`, same bytes), compared with the 15 graphs it wrote (27 node types, 46 tokens). **651,000 characters
(~163k tokens) read; ~16% used.**

| | chars | share |
|---|---|---|
| **waste** | 334k | 51% |
| `list_examples` unfiltered (131k: 109 descriptions; it opened 16) | 140k | |
| the same answer read twice (`get_project_info` 49k, `get_style_vocabulary` 55k) | 114k | |
| `list_node_types` searches | 29k | |
| node types fetched, never used | 21k | |
| ports of used types never touched | 21k | |
| tokens never used | 10k | |
| **used** | 103k | 16% |
| examples opened (its own words: "the exact wiring patterns") | 78k | |
| docs, components, backend reads | 16k | |
| ports it wired or set | 5k | |
| **guidance, unscored** | 177k | 27% |
| `get_node_type` prose (runtimeBehavior, examples, antiPatterns, rules) | 86k | |
| `get_project_info` doctrines + traps (the tool says "Cheap — call this first") | 49k | |
| style compositions, elements, presets | 42k | |

Across all of it, **19% (126k) was two-space JSON indentation** (`jsonResult`'s `JSON.stringify(payload, null, 2)`).
5 of its 6 `list_examples` searches found nothing: a query was one substring, and it searched in sentences.

**Built (s1):** compact JSON in every tool answer (`jsonResult`, `errorResult`, render); `list_examples` unfiltered is
a menu (id, title, node types), a filter still gets descriptions; a query is a phrase first, then its words (≥ half
of them, best first); `call_tool` describes comma-separated names in one call; RouterNavigate's notes name its route
ports `pm-<parameter>` (the reason for Mistral's invented `p-clientId`: the notes said the ports exist, never their
names). Resident surface unchanged at 8,279. **Not changed, needs a Claude control first:** `get_project_info`'s
doctrines and `get_node_type`'s prose (each line exists because a measured model failed without it).

## 10. Round 3: the fixed kit, sealed lab, legacy harness (s1)

`own-018/round-kit.mjs` with the tarballs packed at `4a18723fe` (`scratchpad/own018/tgz2/`), `own-018/sentence.txt`
(round 1's paragraph). 85 minutes, stopped by its `--max-price 6` (Vibe list prices; **$3.08 real** at the launch
sale): 6.80M input tokens, **only 3.18M cached (47%)**, 189k output. Uncached input was $2.46 of the $3.08.

**What it did, unrepaired:** `list_projects` → `create_project` "Atelier Hub" (scoped itself as asked) → from then on
every post-bind tool through `call_tool` (*"the newly revealed tools aren't in my static tool list, so from here on
I'll call everything through `nodegx_call_tool` (as the AGENTS.md anticipates)"*) → provision_backend, schema fixed
from the server's warning (createdAt/updatedAt clash), the `.env` placeholder for MISTRAL_API_KEY → 53 `call_tool`
reads (26 of them one-tool `describe`s) and 13 examples **before its first component** (~45 min) → both cloud
functions (`askMistral`: Secret → Mistral API; `announceProjectDone`) **0 errors first time**, deployed → collection
permissions, 5 collections seeded (it fixed two rejected date rows itself), the db-change trigger → a plan of 17 shared
components staged in batches of ~4–6: 2 refused, both fixed from the diagnostics (*"The validator is precise"*), **17/17
staged, 0 errors, applied, clean render** → 6 pages staged and applied, registered in the router → `render_report`
found three real bugs of its own and it was fixing them when the cap hit: EmptyState's button shows its fallback
"Add", Ask's error/thinking flash at load, and **a form's Condition fires on load and would create empty records**
(fix it named: `runOnChange-condition: false`).

**Not done:** the App shell (nav bar + routes wiring the pages) and those three fixes. `validate_project` on a copy:
**0 errors, 2 warnings, 381 nodes**. The Home page (Team feed) at phone width: `own-018/r3-home-phone.png`. The project
is kept as `own-018/r3-atelier-hub/` (no `.env`, no `.mcp.json`); the resumable Vibe session is in this session's
scratchpad `own018/r3/home/.vibe` (may be gone).

**Large 4, as measured:** follows AGENTS.md to the letter; scopes sensibly; reasons about the app, not the format
(String ids vs pointers, double-posting from button + trigger); self-corrects in one turn when it can read a refusal;
**reads everything before writing** (most of the time and money); single steps of 3–16 minutes; writes lists as JSON
arrays (STRINGLISTARRAY); adds a `description` argument; probed backend port 8581 once while its backend was on 8578
(said by the agent, not measured — check before filing).

## 12. Next session: an environment Large 4 likes, then the new brief

**Richard (end of s1):** *"stop and check … are we really configuring our efforts specifically for Mistral Large 4?
Then we'll start a new session, set up the perfect little environment that Mistral Large 4 will love, and let it
rip"* — and the brief changes: *"a basic, very pretty modern landing page with an API sending sign up form to Brevo …
basic but impressive"*. The sentence: `own-018/sentence-landing.txt` (Brevo is EU too; key `BREVO_API_KEY` via `.env`).

**Honest answer to "specifically for Large 4?": not yet.** s1 fixed what Large 4 *exposed* in the kit and in Vibe; the
model settings are copied defaults, untested: `temperature = 1.0` and `thinking = "high"` come from Vibe's Medium 3.5
entry. Measured, cheap experiments first (each on a small fixed task, a few cents):
1. **Cache rate by harness** — the biggest cost lever. Legacy: 47% (round 3), 40% (lc smoke). Default (code-mode):
   76–91%. At 90% round 3 would have cost ~$1.29; with §11's cuts ~$1.06. Find why legacy misses (prefix changing per
   turn?) or use code-mode now that `call_tool` answers refusals as `{ok:false}` (direct bootstrap tools' errors are
   still opaque there). Also measure OpenCode's (runner ready: `round-opencode.mjs`, `--variant high` for parity).
2. **`thinking` low vs high** (Vibe `low` = `reasoning_effort: "none"`): time to first component, turns, delivered?
3. **Context cap:** `auto_compact_threshold` so a turn doesn't re-send 150k+ tokens.
4. **What Large 4 trips on, said where it reads:** stringlists are comma strings; fixed sizes need `sizeMode:
   "explicit"`; a Condition fed only by a button wants `runOnChange-condition: false`; route params are `pm-<param>`;
   describe several tools in one `call_tool`. Candidate homes: the folder AGENTS.md (create-nodegx) or a Vibe skill
   (`.vibe/skills/<name>/SKILL.md`; check it loads under `--legacy-harness`).
5. **Kit before a pretty page:** fix NOSTARTERASSETS (a landing page needs icons and imagery; npm-made projects have
   none); use the READWASTE tarballs (`scratchpad/own018/tgz3/`, packed at `5754e993e`, or re-pack at HEAD).

**Budget:** ~$4 at the launch sale (ends ~2026-10-20; list prices are double). A landing page is far smaller than the
intranet; with the cache and read fixes a round should be well under $1, so $4 covers the experiments and 2–3 rounds.

## 13. The experiment series (ruled at the end of s1; supersedes §12's landing page)

**Richard:** *"make Mistral build something small but complex, to make sure it can choose the right nodes for the
job, but not something so complex it has to think of backend ids and rules … test it a dozen times with a dozen
different configs … find the ultimate config that fits perfectly with NodeGX … then we can try a bigger project
later."* Asked and answered: **the quiz game**; **OpenCode, plus one Claude Sonnet run of the same brief as the
yardstick** (Vibe dropped: *"fuck Vibe and start using OpenCode"*, after the research put OpenCode first).

**Why OpenCode, honestly:** source-level it passes every protocol check (re-lists tools, one turn late; error text
verbatim; `opencode run`; `external_directory` deny; Large 4 known with effort none/high). **Unmeasured:** a real
build; its cache rate (the one smoke: ~14% of ~129k input from cache over 6 steps, too short to judge); no spend
cap (`--max-steps` only); MCP tool calls time out at 60 s (render can approach it); reasoning off unless a variant is
set. The first runs measure these before anything is tuned.

**The brief:** `own-018/sentence-quiz.txt` — "Capital Quiz", five fixed questions with fixed answer order, a 10 s
countdown, right/wrong colours, score, results with a best score that survives a reload, Play again. No backend. It
needs a list or repeater, a reusable answer component with inputs, variables, conditions, states, a timer, screen
switching and local storage — node choice is the test.

**The grader (build it first, no API spend):** a headless-Chrome script over the packed preview that plays a fixed
pattern and reads what a person sees (`elementFromPoint`-checked taps, text by regex): Start → "Question 1 of 5" and a
visible countdown; Lisbon (right) → green, advances; Sydney (wrong) → red + Canberra green; Ottawa (right); Q4 left to
time out (wait 11 s) → advances; Bern (right) → "You scored 3 out of 5", "Best: 3 out of 5"; Play again → "Question 1
of 5"; an all-wrong run → 0 and Best still 3; reload → Best 3. ~10 checks, each pass/fail. **Prove the grader on the
Sonnet build and on mutants of it** (score not counted, timer removed, best not persisted) — a grader that passes a
broken app grades nothing. Plus a static audit of the graph: answers drawn by a list node (not three hand-copied
buttons per question), a reusable component with Component Inputs, the countdown from a Timer/Repeat node (not
`setInterval` in JavaScript), persistence by a storage node; `validate_project` errors; JavaScript node count.

**Per run, recorded:** grader score, audit, validation errors, real $ (repriced; OpenCode reports its own), turns,
wall time, cache %, and a phone screenshot.

**The dozen (~$0.25 a run is the target; ~$4 left, sale ends ~10-20):**
| # | config |
|---|---|
| 0 | Sonnet yardstick (`claude -p`, subscription, same lab rules) — also proves the grader |
| 1–2 | OpenCode as a person would set it up (model only) ×2 — the baseline and its noise |
| 3 | `--variant high` (reasoning on) |
| 4 | + Large 4's measured trips where it reads (stringlist = comma string, `sizeMode: "explicit"`, `runOnChange` on a button-fed Condition, `pm-` params, describe several tools at once) |
| 5 | temperature 0.3 |
| 6 | a context cap / compaction |
| 7–8 | the best combination ×2 |
| 9–11 | reserve: repeat what looks like a win, or a variant the numbers suggest |

One factor at a time from the baseline; a "win" needs to hold on a repeat, because one run is one sample.


## 14. Session 2 (2026-10-12, Opus): the grader, the yardstick, and what two Mistral runs found

**Richard, during s2:** *"you've got 3 USD left, keep going"*, then *"I added another 10 euros and I'm authorising you
to do as many testing rounds as needed, but you must keep perfecting the Mistral interface and config to make it run
like a dream with the nodegx MCP, as well as Claude Code … Don't give up"*, and *"Mistral offers Claude-style
subscriptions we could use with Vibe … if after you master Mistral Large 4 in OpenCode you can have the same if not
better results in Vibe, that would be a huge win"*. So the series is now: perfect Large 4 on OpenCode, then carry the
same kit and config to Vibe (subscription, not pay-as-you-go) and run the same graded series there.

### The grader (`own-018/grade-quiz.mjs`), proven

Headless Chrome over the PACKED preview at phone size, a real CDP press checked with `elementFromPoint`, colours read
from a screenshot of the answer's box (share of green / red pixels against the same box before the press). 12 checks:
start · order (every question numbered, in order, three answers in the brief's order) · timer (a number ≤ 10 that
falls untouched) · green · advance (0.4–3 s) · red (+ the right one green) · timeout (8.5–14 s) · score 3 · best 3 ·
again (Play again → Q1, an all-wrong run scores 0) · keep (best stays 3) · reload (best survives). Plus an audit:
node census, list nodes, custom components with inputs, Timer/Repeat, JavaScript nodes and what they call, where
"Coimbra" is written, `validate_project` through the packed MCP (read-only).

| app | score | failed | as predicted |
|---|---|---|---|
| Sonnet run 0, graded twice | 12/12, 12/12 | — | |
| mutant noscore (the score wire cut) | 8/12 | score, best, keep, reload | ✓ |
| mutant notimer (Repeat removed) | 4/12 | timer, timeout (+ six not reached) | ✓ |
| mutant nopersist (best in a page variable) | 11/12 | reload | ✓ |
| mutant nocolour (styles never change) | 10/12 | green, red | ✓ |
| mutant nodelay (reveal Timer 0 ms) | 9/12 | advance, green, red (no colour is ever on screen) | ✓ |

Two grader bugs found on the way and fixed: Chrome's profile deleted while it was still writing; a quick run pressing
the instant a new question appeared (a person reads first: 400 ms settle).

### Run 0 — the yardstick: Claude Sonnet in Claude Code (`round-claude.mjs`)

`claude -p --model sonnet` (resolves to `claude-sonnet-5` in Claude Code 2.1.251), Richard's subscription,
`--strict-mcp-config`, `--setting-sources project,local`, shell/web denied, reads outside the lab denied where a rule
can name them, and audited after (`peek-claude.mjs`: 0 paths outside the folder). **12/12. 85 turns, 28 min, $6.30
API-equivalent** (not a cost), 17.7M input tokens, **98% cached**. Its build: three screen components + a page,
a States node for the screens, Repeat + Counter for the countdown, three fixed answer buttons per question with the
data in a JavaScript Function (no list node), 8 JavaScript nodes, best score via `localStorage` in a Function;
`validate_project` 0 errors, 1 warning (Inter not shipped: NOSTARTERASSETS). It reported three "NodeGX runtime
quirks"; all three were run-on-change (its fix: `runOnChange-…: false` and explicit signals). Its "States default
isn't honored" was a misdiagnosis: a Condition firing at load drove the screen to Results.

### Run 1 — Mistral Large 4 on OpenCode, the baseline (`r1-oc-base`)

As a person sets it up (model only), $1.50 cap. **35 min, capped at $1.61; then a "keep going" sitting to $2.26.**
Built a better-designed app than Sonnet's: the `playful` preset, a Quiz Engine component, Static Data → For Each
over an AnswerButton component with inputs (the list node Sonnet skipped), Repeat + Counter, 0 validation errors.
Verified its game with `drive_page` (42 steps passed) — opened on `page: "quiz"`, so it never pressed Start.

**Graded 2/12 at the cap**: pressing Start skipped question 1. Root cause, measured (below): a runtime defect, not
Mistral's. On the Counter fix alone (tgz4, dd7ff4756) the same unchanged app grades 10/12 — the best score was
overwritten by a worse game, which was the same runtime class again. **On both fixes (tgz5, be46f18bc) Mistral's
unchanged run-1 app grades 12/12.** Large 4 built a correct quiz on its first attempt; both failures were NodeGX's.

### Runs 2 and 3 — cut off by my own output limit

Run 2 (`--context 128000`, $0.21, 8 steps) and run 3 (the kit's first `opencode.json`, tgz5, $0.18, 13 steps) both
ended before building anything. **Not Mistral stopping early, as I first wrote:** both last steps finished
`length` at exactly 16,384 output tokens, the `output` I had set beside the 128k context, and OpenCode ends the run on
a cut-off answer. OpenCode 1.19.0 (read from its build) sends `max_tokens = min(limit.output, 32000)` — run 1, with
no override, had a 24,484-token step that fitted — and compacts once a step's total reaches `context − that`. Fixed
in the kit: `context 150000, output 32000` (compaction near 118k, answers up to 32k). The "keep going" note written
from run 2's misreading is removed (no evidence for it); the start-page note stays (run 1's evidence). The cache did
its job in both (every step under 128k; run 3 75% cached).

### What was found, and done

- **P112-OWN018-CACHE128K** (filed; harness, not ours): Mistral caches 70% of a prompt under ~128k tokens and 5% over
  it (run 1, 28 steps: 12 under / 16 over). A recording proxy (`record-proxy.mjs`) showed consecutive requests over
  128k extending each other exactly and still missing — so it is size, not a changing prefix. A tool-list change
  does move the prefix once (15 → 40 tools after `open_project`: diverged at char 4,340). OpenCode takes Large 4's
  context as 1,048,576 (models.dev), so it never compacts. **Mitigation built:** `create-nodegx` writes
  `opencode.json` with Large 4's limits (17b992839; corrected to `context 150000, output 32000` after runs 2–3).
- **P112-OWN018-COUNTERZERO** (fixed, dd7ff4756 + this session's Variable fix): a node's parameters are queued and
  land at its first update, but its wires are made before that and hand the target the getter's value at once. A
  Counter with Start Value 10 told its consumers 0 first, so Mistral's `count === 0 && !answered` gate fired at page
  load (browser: time's-up at 23 ms, the engine's own start at 38 ms). Then the same class on the Results page: a
  Variable read on Did Mount had no name yet, `max(score, best)` wrote 0 over the saved best. Both getters now answer
  from the model until the queued parameter lands, and don't deliver the same value twice (exp-011 s66-5 pins once).
  Regression over Mistral's own engine (`test/fixtures/own018-quiz-engine/`), sabotage-checked both. Counter v2
  conforms (P107 and my run). **The class is not censused**: any getter that reads state a queued parameter sets.
- **P112-OWN018-NOLIBRARY** (filed): the npm kit reveals `list_library` / `install_prefab`, which only read a repo
  checkout. Mistral wanted icons after its render called the app "a default template".
- **Kit guidance (17b992839):** the folder notes say try the app from the start page with `drive_page` without `page`
  (run 1). (A "keep going" line from run 2's misreading was removed again; see runs 2 and 3.) Condition's notes: a gate whose On True/On False does
  something fires whenever its input settles, page load included — `runOnChange-condition: false` and `eval` from
  the signal that should ask (Sonnet ×3, Mistral round 3).
- **Lab fixes (mine):** the seal denied OpenCode's own `$TMPDIR/opencode/*` (Mistral could not read its own
  screenshots; a person's OpenCode allows it) — fixed in `round-opencode.mjs`; `--max-usd` spend cap from OpenCode's
  database; `round-opencode-resume.mjs` for a "keep going" sitting; the runner now uses the kit's `opencode.json`.

**Money:** run 1 $2.26 (both sittings), run 2 $0.21. Richard added €10 mid-session.

### Runs 4 and 5 — the corrected limits, then reasoning off

| run | kit | reasoning | spend | steps / time | grade | what limited it |
|---|---|---|---|---|---|---|
| 1 | tgz3 (s1) | default | $2.26 (2 sittings) | 35 + 4 min | 2/12 → **12/12 on the fixed runtime, app unchanged** | COUNTERZERO ×2 (ours) |
| 2 | tgz3 + 128k/16k | default | $0.21 | 8 / 11 min | nothing built | my 16,384 output cap (`length`) |
| 3 | tgz5 | default | $0.18 | 13 / 8 min | nothing built | the same cap |
| 4 | tgz6 (150k/32k) | default | $1.59 (2 sittings) | 55 min + 9 | **7/12** | FANOUT (its scoring), then a 32k-token think after compaction (`length`) |
| 5 | tgz6 | `--variant none` | $1.51 | 11 min | 2/12 | per-row values never reached its list items ("[object Object]", "Answer") |

- **Run 4** read the new Condition note and applied it (*"Condition needs `runOnChange-condition:false` for
  event-driven eval (confirmed by its antiPattern)"*); built a For Each over an Answer Button component, four
  components with inputs, 0 validation errors; tested from the start page; then found its own scoring bug by four
  controlled drives and stated the rule exactly — the point for question n was decided against question n+1's
  correct answer, except the last. Root cause in its graph: one signal evaluates "right?" and "not the last?", and
  the second's advance changes what the first compares. **P112-OWN018-FANOUT, needs a ruling** (should a signal's
  fan-out see its siblings' effects?). Whichever way it goes, Condition's notes now say to chain them (1007f7f99).
  Resumed with "keep going", it then thought for 117,000 characters (the whole 32k) re-deriving its state after a
  compaction, without calling a tool, and the run ended on `length`.
- **Run 5** (reasoning off): fast and cheap per step (85% cached before compaction), but sloppier; it spent its
  budget searching for how a Repeater hands each row its values.
- **Reasoning stays on.** OpenCode with no variant sends no `reasoning_effort`, so Mistral reasons at its default.

### Run 6 — the chained-gates note, recorded through the proxy; and what really stops Mistral's cache

Run 6 (tgz7: the Condition note on chaining two gates off one signal; default reasoning; $2 cap) **graded 11/12** —
the best fresh Mistral build so far: score, best, keep and reload all pass. Its one failure is its own restart logic:
Play again shows question 1 for ~90 ms and jumps to question 2 (time left 0 and `answered` true from the last game race
the resets — the same load-order family, in its wiring). 87 nodes, For Each over an AnswerButton component, a
QuizEngine component, 0 validation errors. Capped at $2.06, most of it uncached.

**The cache, settled (P112-OWN018-IMAGECACHE; CACHE128K was a misreading).** Every request of run 6 recorded, then
replayed against the API (`max_tokens: 1`, a fresh nonce so nothing was cached before):
- the tool list never reorders (fingerprinted every request: 15 → 33 → 52 tools, identical between changes) and every
  request extends the one before by character, compaction included; a tool reveal costs one miss;
- a pair with **no image** in the history: the second cached 26,092 of 43,320; with **two screenshots**: 0 of
  96,465; the same with the 19 revealed tools removed: 0; with the images replaced by text: **93,676 of 96,100**;
  with a **1×1 PNG**: 0. **Any image part turns Mistral's prompt cache off for that request**, and an inline
  screenshot stays in the conversation until a compaction. Run 1's "over 128k" misses began at the step after its
  full-screenshot render; run 6 recovered after a compaction dropped its images and lost it at the next screenshot.
- **Built (e11082e5e):** `noodl-mcp --screenshots-to-files` (render_report with no `out_dir` → `<project>/.previews/render`
  and a manifest; drive_page → `.previews/drive`; the manifest says what opening an image costs), set by
  create-nodegx in `opencode.json` and `.vibe/config.toml` only (Claude caches across images; `.mcp.json` unchanged).
  It also ends the lab handicap of runs 1, 4 and 6: screenshots land inside the project, where the agent may read.

### Run 7 — screenshots to files; and a summary that lost the brief

Run 7 (tgz8: `--screenshots-to-files`) **finished by itself** — the first Mistral run to end on "Capital Quiz is built
and verified" rather than a cap — in 39 min for **$1.09**; with no image in its history its cache held (80k → 36k,
92k → 80k, 96k → 91k cached), until it chose to `read` its screenshots at the very end. One step was a degenerate tool
call (malformed JSON, tabs repeating until 32k; run 6 had the same glitch) — temperature is the next config lever.

It graded 10/12, and both failures taught something:
- **order** — its data read Porto / Lisbon / **Madrid**, Canada and Morocco reordered. OpenCode's compaction summary
  kept "three answers in exact order" and dropped the list; the agent rebuilt it from memory. The person's words were
  in `docs/decisions/000-initial-scope.md` all along. **P112-OWN018-SUMMARYLOSS, fixed (a04271143):** the project's
  AGENTS.md / CLAUDE.md (in the system prompt, which no summary rewrites) point at the verbatim quote and say to build
  spelled-out content from it and re-read it after a summary.
- **again** — the grader's, not the app's: Play again sat at y=963 on an 844 px screen (its hidden screens use
  `visible`, which keeps their space). A person scrolls; the grader did not. **Grader fixed:** a target below the fold
  is scrolled into view first (the press must still land, so an unscrollable page still fails).

**Regraded with the scrolling grader:** Sonnet run 0 **12/12** (unchanged), Mistral run 6 **12/12**, run 7 **11/12**
(order, now fixed in the kit). Mutant proof unaffected (its targets are on screen).

### Run 8 — the full kit at a04271143 (tgz9)

**Finished by itself in 24 min, $1.35; graded 9/12.** Order now held (no summary rewrote it). Its failures are one
wire: the reveal Timer's `done` → "next question". On an action node `done` fires as soon as the Restart is handled,
so each question advanced ~300 ms after a tap and no colour was ever on screen (green, red, advance fail together).
Mistral also spent steps on a wrong theory — that a second Evaluate with an unchanged `true` stays silent (measured in
the runtime harness: three evals, three On True). Its cache was healthy until it opened a drive_page screenshot with
`read` to debug (drive_page's answer did not say what that costs; render_report's manifest did).

**Kit, from run 8:** drive_page's headline now says screenshots are files, what opening one costs, and that a read step
usually answers instead (a633d239a, verified end to end with the packed server); Timer's notes say `done`/`completed`
are not "the time is up" (`timerFinished` is), Condition's that every Evaluate fires again (015370ec5).

### Run 9 — the full kit at 015370ec5 (tgz11): 12/12

**12/12, finished by itself in 43 min, $1.41, 81% of input cached** (4.29M of 5.28M tokens). Its closing words: *"Done
— Capital Quiz is verified … Full phone drive passed 25/25"*. It debugged with drive_page read steps (variables,
text), not screenshots. An AnswerOption component placed per answer (no list node this time), 79 nodes, 18 Functions,
0 validation errors. Run 10 repeats it (one run is one sample).

### Where s2 leaves it

| run | kit | grade | $ (real) | ended | what it taught |
|---|---|---|---|---|---|
| 0 Sonnet | tgz3 | 12/12 | 6.30 API-eq. | itself | the yardstick; run-on-change ×3 |
| 1 | tgz3 | 2/12 → **12/12** on the fixed runtime | 2.26 | cap | COUNTERZERO ×2 (runtime) |
| 2, 3 | tgz3/5 | — | 0.21, 0.18 | `length` | my 16k output cap |
| 4 | tgz6 | 7/12 | 1.59 | cap | FANOUT (needs ruling); think-runaway after compaction |
| 5 | tgz6, reasoning off | 2/12 | 1.51 | cap | reasoning stays on |
| 6 | tgz7 | **12/12** | 2.06 | cap | IMAGECACHE (any image kills Mistral's cache) |
| 7 | tgz8 | 11/12 | 1.09 | itself | SUMMARYLOSS (summary dropped the answers) |
| 8 | tgz9 | 9/12 | 1.35 | itself | Timer `done` ≠ time is up; drive_page image note |
| 9 | tgz11 | **12/12** | 1.41 | itself | — |

**Kit changes s2, all for every agent:** Counter and Variable getters answer from the model before queued parameters
land (dd7ff4756, be46f18bc); Condition notes (run-on-change; chain two gates; every Evaluate fires) and Timer notes
(`done` vs `timerFinished`); project notes point at the verbatim request; create-nodegx writes `opencode.json`
(150k/32k) and puts `--screenshots-to-files` on the Mistral-facing servers; the folder notes say to test from the
start page.

**The Mistral config that works (OpenCode 1.19.0):** `opencode -m mistral/mistral-large-4`, default reasoning (no
variant), the kit's `opencode.json` as written (`limit {context 150000, output 32000}`, server with
`--screenshots-to-files`). Not yet tried: temperature (two degenerate tool calls in runs 6–7), and Vibe.
