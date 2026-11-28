# Modern Web Guidance integration

Status: Research and implementation proposal

## 1. Objective

**Modern Web Guidance (MWG)** is an open-source skill pack and local CLI maintained by the Google Chrome, Microsoft Edge, Mozilla Firefox, and MDN teams (`GoogleChrome/modern-web-guidance`). It embeds curated web platform best practices, accessibility patterns, and **Baseline** browser-compatibility fallback rules directly into AI coding agents' context windows.

Coding agents frequently default to outdated JavaScript workarounds or omit progressive-enhancement fallbacks because LLM pretraining data is heavily weighted toward legacy web code. Integrating MWG into NodeGX aims to improve the quality, accessibility, and cross-browser resilience of NodeGX-authored applications—specifically where agents write browser-facing JavaScript (`Function` nodes and project scripts), choose semantic HTML elements (`as` port), configure accessible form/media ports, or apply rare CSS properties via `styleCss`.

At the same time, MWG cannot be dropped in unguarded. NodeGX is a graph-based builder whose layout, design tokens, and component decomposition are governed by `prompts/design.ts` and compiled by `nodegx-export` (`emit/style.ts`, `emit/component.ts`, `emit/html/printComponent.ts`). Integration must route MWG onto the surfaces NodeGX actually exposes rather than letting MWG override NodeGX's `Columns` and `var(--token)` architecture.

---

## 2. Research findings

### What MWG provides
- **Curated guides & use cases:** MWG v1.0 covers 100+ modern web platform features and 129+ real-world developer use cases across CSS & Layout, HTML & DOM, JavaScript & Web APIs, forms, accessibility, performance (Core Web Vitals), and security.
- **Baseline-aware fallbacks:** Each guide distinguishes *Baseline Widely available* features (safe to use directly) from newer features that require feature detection or progressive-enhancement fallbacks.
- **Agent Skill (`SKILL.md`) + CLI:** Ships both an instruction skill telling agents when and how to search, and a local CLI that retrieves exact guides into the agent's context on demand.

### How its CLI works
The `modern-web-guidance` npm package (`npx modern-web-guidance@latest`) exposes four primary commands:
- `install`: Interactive installer for supported coding agents (alternative: `npx skills add GoogleChrome/modern-web-guidance` or agent-specific marketplace plugins).
- `search "<2–5 word query>"`: Runs a local BM25 lexical + embedding search pipeline and returns ranked guide IDs and short descriptions.
- `retrieve "<id1[,id2,...]>"`: Returns the full Markdown implementation guide(s), compatibility notes, and fallback code for the requested IDs.
- `legacy-scan <path>`: Static analyzer that scans raw HTML/CSS/JS codebases for legacy patterns that can be modernized.

### How agents can retrieve guidance
1. **Skill-driven shell execution:** Agents with `SKILL.md` installed invoke `npx modern-web-guidance@latest search` and `retrieve` directly via their terminal tool.
2. **MCP tool wrapping:** An MCP server can invoke `modern-web-guidance` via `child_process` (`execFile`/`spawn`) and expose search/retrieve as first-class MCP tools for agents without shell access or inside sandboxed flows.

### Dependencies and runtime requirements
- **Node.js `>= 22` required:** The CLI exits with code `1` on older Node versions.
- **Zero runtime npm dependencies:** The published `modern-web-guidance` CLI bundles its search index and model weights with no external runtime dependencies and requires **no LLM or external API keys**.
- **Offline search after acquisition:** Once cached by `npm`/`npx`, `search`, `retrieve`, and `legacy-scan` execute locally.
- **Telemetry default:** Anonymous usage telemetry (calling agent name, search query strings, retrieved guide IDs) is enabled by default unless `DISABLE_TELEMETRY=1` is set in the process environment.

### Potential limitations
- **Assumes raw HTML/CSS/JS (or React) files:** MWG guides assume the agent edits `.html`, `.css`, and `.js`/`.tsx` files directly. In NodeGX, layout and styling live in graph parameters and design tokens; CSS rules (`@media`, `@container`, selectors, `::before`) are invalid inside a node's `styleCss` port.
- **`legacy-scan` does not understand NodeGX graphs:** `legacy-scan` cannot inspect `nodegx.project.json` graphs; it is only meaningful on `Function` node script bodies or post-export output from `@nodegx/export` (`emit/component.ts`, `emit/style.ts`, `emit/html/`).
- **Response size on `retrieve`:** Multi-ID `retrieve` calls can exceed 16 KB, which interacts with MCP client truncation limits (e.g., Cline's ~8,000-character tool-result truncation and Claude Code's 2 KB preview cut documented in `guidance.ts`).
- **Baseline ≠ WCAG conformance:** MWG improves semantic/ARIA defaults, but Baseline browser compatibility does not replace accessibility testing.

---

## 3. Existing NodeGX architecture

### `packages/noodl-mcp/src/guidance.ts`
- Defines `SECTION_FIELDS` (`traps`, `authoring`, `interface`, `design`, `backend`, `surfaces`), served through `get_project_info({ section })`.
- Splits sections via `splitSection()` at `SECTION_PART_CHARS = 6000` (headings and blank lines) so clients that truncate long payloads (such as Cline's 8,000-char cut) can request parts like `"design/2"` intact.
- Leads with `readFirst()` containing `MUST_KNOW` rules kept concise inside the first ~2–4 KB (critical because Claude Code truncates large tool outputs to disk and previews only the first ~2 KB).

### `packages/noodl-mcp/src/toolGroups.ts` & `instructions.ts`
- `TOOL_GROUPS` partitions tools into `core` (resident) and deferred groups revealed on demand via `find_tools` (`disclosure.ts`).
- **Strict resident token budget:** The resident surface was measured at **8,275 of 8,280 tokens (5 tokens remaining)**. Adding a new deferred group costs ~26 resident tokens because its `purpose` string is embedded in `find_tools` on every turn. Appending tools to an existing deferred group (such as `project`) with server-side `keywords` costs **0 resident tokens**.
- `tests/toolDisclosure.test.ts` enforces that every registered tool is classified in `TOOL_GROUPS`.

### `packages/noodl-mcp/src/tools/exportReact.ts`
- Demonstrates the server's pattern for wrapping a CLI-shaped operation (`runCli` from `@nodegx/export` with captured `CliIO`), `guarded(...)`, `jsonResult(...)`, and `ToolError`.
- Establishes an explicit safety invariant: build `argv` as an array rather than concatenating shell command strings so paths or queries with spaces/flags cannot inject arguments.

### `packages/create-nodegx/profiles/core/skills/`
- Holds core agent skills as `<skill-name>/SKILL.md` directories with YAML frontmatter (`name`, `description` with a `LOAD when...` trigger, `user-invocable: false`), e.g. `nodegx-first-project/SKILL.md`.

### `packages/create-nodegx/bin/create-nodegx.js`
- `coreSkillFiles()` recursively reads `packages/create-nodegx/profiles/core/skills/` and copies every skill into `.claude/skills/<name>/SKILL.md` on project creation (when absent)—requiring **zero code changes** to distribute a new skill.
- Writes `AGENT_NOTE` into `CLAUDE.md` / `AGENTS.md`, pairing one-line intent triggers with paths to `.claude/skills/<name>/SKILL.md`.

### Relevant Vibe profile files
- `create-nodegx.js` scaffolds multi-agent configs (`.mcp.json`, `opencode.json`, Cline MCP config, `.vibe/config.toml`) and mirrors skills into `.vibe/skills/` when initializing the Vibe profile. *(Exact file layout inside `profiles/vibe/` should be verified during implementation if Vibe overrides `core/skills/`.)*

### Authoring & export surfaces (where web features actually pass through)
- **`AiAssistant/authoring/prompts/design.ts`** (re-exported to MCP via `noodl-mcp/src/editor-deps.ts` under `AAQ-005`): Enforces `Columns` for responsive layouts, `var(--token)` for colours/spacing, and `set_element_style` for controls.
- **`emit/style.ts` (`readStyleCss`)**: Parses `styleCss` strictly as flat `prop: value;` declarations and rejects `{`, `}`, `<`, or missing semicolons. Selectors, `@media`, `@container`, and pseudo-elements are ignored by both runtime and exporters.
- **`emit/component.ts` (`authoredTag`) & `emit/html/printComponent.ts`**: Validate the `as` ("Tag") port against `catalog.enumValues(node.type, 'as')`:
  - `Text`: `div`, `h1`–`h6`, `p`, `span`
  - `Group`: `div`, `section`, `article`, `aside`, `nav`, `header`, `footer`, `main`, `span`
  - `<dialog>` is not currently in either enum and is refused by `authoredTag`.
- **`nodegx-node-spec` + `CONTENT_PARAMS` (`style.ts`) + `printComponent.ts`**: `inputMode`, `enterKeyHint`, `maxLength`, `alt`, and `srcSet` are first-class ports emitted by both the React and HTML exporters. `dataAttributes` supports `data-*` only; there is currently **no `aria-*` or `role` port**.

---

## 4. Integration options

### Option A: Ship a NodeGX-adapted MWG `SKILL.md` via `create-nodegx`
Add `packages/create-nodegx/profiles/core/skills/nodegx-modern-web/SKILL.md` (and a one-line trigger in `AGENT_NOTE`) rather than installing raw `GoogleChrome/modern-web-guidance` `SKILL.md`.

- **Benefits:**
  - **Zero MCP token cost:** Does not touch the 8,280-token MCP resident budget.
  - **Guardrails against doctrine conflicts:** Explicitly tells agents *not* to use MWG for layout/CSS tokens (`Columns` and `var(--token)` remain authoritative) and restricts MWG usage to `Function` node JS/Web APIs, the `as` semantic tag port, accessibility/input ports, and flat single-declaration `styleCss`.
  - **Zero scaffolding code changes:** Picked up automatically by `coreSkillFiles()` in `create-nodegx.js`.
- **Drawbacks:**
  - Only works for coding agents that read `.claude/skills/` / `AGENTS.md` / `.vibe/skills/` and have shell access to execute `npx modern-web-guidance@latest`.
  - Existing projects created before the update will not receive the skill unless re-scaffolded or updated manually.

### Option B: Add `web_guidance_search` & `web_guidance_retrieve` MCP tools
Create `packages/noodl-mcp/src/tools/webGuidanceTools.ts` spawning `npx modern-web-guidance@latest` (with `execFile`, `argv` array, `DISABLE_TELEMETRY=1`, timeout, and output cap), appended to the deferred `project` group in `toolGroups.ts`.

- **Benefits:**
  - **Works for every MCP client:** Accessible even when an agent lacks shell tools or works inside a restricted MCP environment.
  - **0 resident token cost:** Appending to `project` with server-side `keywords` (`web`, `a11y`, `baseline`, `browser`, `dom`, `html`, `css`, `fallback`) adds zero tokens to `find_tools` while keeping `core` untouched.
  - **Centralized guardrails:** Tool descriptions, output size caps (≤6,000 chars or explicit pagination/single-ID guidance), and `DISABLE_TELEMETRY=1` are enforced uniformly by the MCP server.
- **Drawbacks:**
  - Introduces Node `>= 22` and `npx` cold-start/cache dependencies inside the MCP server process.
  - Agents must discover the deferred tools via `find_tools` (unless auto-revealed when authoring `Function` nodes or `styleCss`).

### Option C: Integrate guidance into `get_project_info` (`guidance.ts`)
Add a `web` entry to `SECTION_FIELDS` in `packages/noodl-mcp/src/guidance.ts` (and optionally a short pointer in `MUST_KNOW` if warranted) summarizing the NodeGX-to-web-platform boundary and pointing agents to `web_guidance_search` / `nodegx-modern-web`.

- **Benefits:**
  - **Immediate, offline baseline:** Zero `npx` latency or Node 22 failure risk for the core boundary rules (which ports carry `as`, `inputMode`, `enterKeyHint`, `alt`, `styleCss` rules, and `Function` node Web API expectations).
  - **Fits existing truncation design:** Automatically benefits from `splitSection()` (`SECTION_PART_CHARS = 6000`).
- **Drawbacks:**
  - Static text cannot replace MWG's 100+ dynamic guides or Baseline compatibility tables—it should summarize *when/where* to use MWG, not duplicate MWG's guide corpus.

### Comparison summary
These three options are complementary: **Option A** gives external CLI agents immediate skill-level triggers, **Option C** embeds the NodeGX/MWG boundary in the server's own doctrine, and **Option B** gives every MCP client safe, telemetry-clean, size-bounded access to MWG guides without fighting `create-nodegx` boundaries.

---

## 5. Recommended development scope

Break the implementation into four small, independently shippable steps (keeping the in-editor Electron AI out of scope for now, as `prompts/design.ts` is already shared via `editor-deps.ts`).

### Step 1: Ship the `nodegx-modern-web` wrapper skill
- **Files to modify:**
  - Create `packages/create-nodegx/profiles/core/skills/nodegx-modern-web/SKILL.md`
  - Edit `packages/create-nodegx/bin/create-nodegx.js` (`AGENT_NOTE`)
  - Verify Vibe profile skill mirroring (`profiles/vibe/` if separate from `coreSkillFiles()`)
- **Expected behaviour:** Newly created NodeGX projects include `.claude/skills/nodegx-modern-web/SKILL.md` (and `.vibe/skills/`). The skill instructs agents to run `DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest search|retrieve` *only* when authoring `Function` node/script browser APIs, picking `as` semantic tags, setting input/image accessibility ports, or writing flat `styleCss` declarations—explicitly deferring layout/styling to `Columns`, `var(--token)`, and `set_element_style`.
- **Tests required:**
  - Extend `create-nodegx` unit/integration tests to assert `coreSkillFiles()` includes `skills/nodegx-modern-web/SKILL.md` and writes it to `.claude/skills/nodegx-modern-web/SKILL.md` without overwriting an existing user copy.

### Step 2: Add the `web` doctrine section to `guidance.ts`
- **Files to modify:**
  - Edit `packages/noodl-mcp/src/guidance.ts` (`SECTION_FIELDS`, `SECTION_ABOUT`, and optionally `readFirst` / `sections` description; avoid bloating `MUST_KNOW` past the 2 KB preview budget)
  - Optional: add a concise 2-line boundary note to `AiAssistant/authoring/prompts/design.ts` if shared phrasing is desired
- **Expected behaviour:** Calling `get_project_info({ section: "web" })` returns the concise NodeGX-to-MWG boundary (which node ports exist, what `styleCss` accepts, and when to search MWG), split cleanly under `SECTION_PART_CHARS = 6000`.
- **Tests required:**
  - Unit tests in `packages/noodl-mcp/tests/` verifying `parseSection("web")` resolves, `get_project_info({ section: "web" })` returns non-empty parts `<= 6000` chars, and `readFirst` lists `web` within the first 2 KB preview window.

### Step 3: Add deferred `web_guidance_search` and `web_guidance_retrieve` MCP tools
- **Files to modify:**
  - Create `packages/noodl-mcp/src/tools/webGuidanceTools.ts`
  - Edit `packages/noodl-mcp/src/toolGroups.ts` (append to `project.tools` and `project.keywords`; do **not** add to `WRITE_ONLY_TOOLS`)
  - Edit `packages/noodl-mcp/src/server.ts` (or tool registration entrypoint) to register `registerWebGuidanceTools`
- **Expected behaviour:**
  - `find_tools` matches keywords (`web`, `accessibility`, `a11y`, `baseline`, `browser`, `compat`, `html`, `dom`) and reveals `web_guidance_search` and `web_guidance_retrieve` at **0 resident token cost**.
  - Both tools execute `npx` via `child_process.execFile` using an explicit `argv` array (never shell string interpolation), passing `DISABLE_TELEMETRY=1`, enforcing a timeout (e.g., 15–30s) and Node version/spawn error handling via `ToolError`, and recommending single-ID retrieval so outputs fit cleanly in client context windows.
- **Tests required:**
  - Run `tests/toolDisclosure.test.ts` to verify 0-token resident budget compliance (`<= 8,280`) and full manifest classification in both bootstrap and project modes.
  - Unit tests for `webGuidanceTools.ts` (mocking `execFile`) covering `argv` construction, `DISABLE_TELEMETRY=1`, timeout/non-zero exit mapping to `ToolError`, and missing-Node-22 diagnostic messages.

### Step 4 (Separate follow-up): Close high-value `nodegx-node-spec` semantic & ARIA gaps
- **Files to modify (separate PR/epic):**
  - `packages/nodegx-node-spec` (`group.ts`, shared accessibility ports)
  - `packages/noodl-viewer-react` (DOM rendering of new attributes/tags)
  - `packages/nodegx-export/src/emit/component.ts` & `emit/html/printComponent.ts`
- **Expected behaviour:** Enable `<dialog>` in `Group`'s `as` enum (or a dedicated modal pattern) and expose `aria-*` / `role` attribute support alongside `dataAttributes`, unlocking MWG's dialog and ARIA landmark/live-region guidance end-to-end.
- **Tests required:** Spec validation tests plus React and HTML exporter golden tests confirming `authoredTag()` and attribute emitters pass the new attributes through cleanly.

---

## 6. Risks and open questions

- **`npx` download latency:** The first `npx modern-web-guidance@latest` invocation downloads the package from npm and warms the cache, adding several seconds on cold runs. *Mitigation:* Set a generous first-run timeout (or check for a preinstalled/cached binary first) and avoid blocking `core` authoring calls on MWG.
- **Network availability & sandboxing:** Air-gapped or sandboxed agent environments cannot reach the npm registry on a cold cache, or may have a read-only `~/.npm` directory. *Mitigation:* Return a clear `ToolError` explaining that `modern-web-guidance` requires either an initial npm cache warm-up or `NPM_CONFIG_CACHE` pointing to a writable directory, while keeping Step 2 (`get_project_info({ section: "web" })`) 100% offline.
- **Node.js `>= 22` requirement:** MWG exits with code `1` on Node `< 22`. *Open question:* What minimum Node.js version does `@nodegx/mcp` currently require and bundle with Electron/CLI installs? If users run `@nodegx/mcp` on Node 20, `webGuidanceTools.ts` should detect `process.versions.node` (or the CLI exit message) and surface an actionable `ToolError`.
- **Version management (`@latest` vs pinned):** Using `@latest` guarantees fresh Baseline data as browsers evolve, but exposes builds to upstream CLI output/flag changes. *Mitigation:* Pin a major range (e.g., `modern-web-guidance@1`) in `webGuidanceTools.ts` or make the package spec configurable via an env var (`NODEGX_MWG_PACKAGE`) while keeping `@latest` or `@1` in the `SKILL.md` fallback instructions.
- **Telemetry & privacy:** MWG sends search query strings and guide IDs as anonymous telemetry by default. *Mitigation:* Always inject `DISABLE_TELEMETRY=1` in `webGuidanceTools.ts` and include it in `SKILL.md` example commands so proprietary project concepts never leave the machine.
- **Caching and failure handling:** Spawning `npx` per search adds process-startup overhead. *Open question:* Should `webGuidanceTools.ts` cache resolved `retrieve` payloads in memory per MCP server session (keyed by guide ID) to eliminate repeated `npx` spawns when an agent re-reads a guide?
- **Compatibility across agent kits:** Claude Code reads `.claude/skills/`, Vibe reads `.vibe/skills/`, while Cline, Cursor, Codex, and OpenCode vary in how they discover `SKILL.md` vs `AGENTS.md` vs MCP tools. *Mitigation:* Pairing `SKILL.md` + `AGENT_NOTE` (`AGENTS.md`/`CLAUDE.md`) + deferred MCP tools (`web_guidance_*`) ensures every agent kit has at least one native discovery path.

---

## 7. References

### External documentation & MWG repository
- Google Chrome for Developers — Modern Web Guidance docs: `https://developer.chrome.com/docs/modern-web-guidance/`
- Chrome Blog — *Modern Web Guidance 1.0: The web platform expertise your coding agent is missing*: `https://developer.chrome.com/blog/modern-web-guidance-v1`
- Modern Web Guidance distribution repository (`SKILL.md` & CLI): `https://github.com/GoogleChrome/modern-web-guidance`
- Modern Web Guidance canonical source & evals: `https://github.com/GoogleChrome/modern-web-guidance-src`
- npm package: `https://www.npmjs.com/package/modern-web-guidance`

### NodeGX source files
- `packages/noodl-mcp/src/guidance.ts` (`SECTION_FIELDS`, `SECTION_PART_CHARS`, `splitSection`, `readFirst`, `MUST_KNOW`)
- `packages/noodl-mcp/src/toolGroups.ts` (`TOOL_GROUPS`, resident budget notes, `project` group & `keywords`)
- `packages/noodl-mcp/src/tools/disclosure.ts` (`revealGroup`, `revealNames`, `revealForNodes`)
- `packages/noodl-mcp/src/tools/exportReact.ts` (`performExport`, `argv` builder pattern, `ToolError`)
- `packages/noodl-mcp/src/instructions.ts` & `packages/noodl-mcp/src/editor-deps.ts`
- `packages/noodl-mcp/tests/toolDisclosure.test.ts`
- `packages/create-nodegx/bin/create-nodegx.js` (`AGENT_NOTE`, `CORE_PROFILE_DIR`, `coreSkillFiles`)
- `packages/create-nodegx/profiles/core/skills/nodegx-first-project/SKILL.md`
- `packages/noodl-editor/src/editor/src/models/AiAssistant/authoring/prompts/design.ts`
- `packages/nodegx-export/src/emit/style.ts` (`CONTENT_PARAMS`, `readStyleCss`, `computeNodeStyle`, `computeRoleCss`)
- `packages/nodegx-export/src/emit/component.ts` (`authoredTag`, `VOID_ELEMENTS`, `isTextArea`)
- `packages/nodegx-export/src/emit/html/printComponent.ts` (`tagOf`, `drawMedia`, `inputMode`/`enterKeyHint` emission)
- `packages/nodegx-node-spec/src/nodes/text-input.ts`, `image.ts`, `group.ts`
