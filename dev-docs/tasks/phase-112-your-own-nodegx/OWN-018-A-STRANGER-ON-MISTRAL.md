# OWN-018 — A stranger on Mistral

**Opened 2026-10-12** (Richard: *"a challenge to test Mistral Large 4 as the LLM building with the nodegx npm 0.2.0
package … an internal data management system as a case study … all the data stays in Europe with an EU LLM. Do the
same 'stranger's Claude Code' method we used for the Lingo app."*).
**Depends on** OWN-015's 0.2.0 tarballs (packed at `9505d342d`; nothing shipped has changed since).
**Status: 🟡 s1 (2026-10-12): rounds 1–2 couldn't build (§7); rulings asked and answered (§9); the fixes built, committed (`4a18723fe`) and re-packed; round 3 on the fixed kit (§10).**
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

