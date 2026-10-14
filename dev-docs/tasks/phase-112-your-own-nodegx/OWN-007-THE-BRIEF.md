# OWN-007 — The brief

**Opened 2026-10-02.** **Depends on OWN-001 to OWN-006** (it describes them) **and R3** (where it lives).
**Status: 🟢 BUILT — s17 (2026-10-14, Fable): the brief is the kit's skill `nodegx-your-own-editor` (`packages/create-nodegx/profiles/core/skills/nodegx-your-own-editor/SKILL.md`), written into a folder's `.claude/skills/` by `npm create nodegx` and named in its CLAUDE.md / AGENTS.md; every claim in it measured against the 0.1.0 kit from the registry (§6). AC1 ✅; AC2 measured (§6.4); AC3 waits on OWN-008's strangers. Reaches people on the next `create-nodegx` publish.** **R3 ruled 2026-10-10 (s6), Richard's words: *"A skill in a public repo, recommended for Claude but can be used with any AI coder."*** So §3.2's "served where R3 rules" is a skill in a public repository, written so any coding agent can follow it (Claude named as the one it is made for), not the MCP server.
**Model:** **Opus.** The brief is written from traps already recorded in the task files; it needs care, not new reasoning. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **I type one sentence to my agent, "build me a NodeGX editor that …", and it finds the method on its own, reads one
> document, and builds against the kit instead of guessing.**

## 2. Why

This is the part Richard asked for by name: *"the method via which you can get Claude Code to make you your own NodeGX
editor."* The packages are the kit; the brief is the method. NSP-006's brief is the precedent: one document, the rules
of the room, what to deliver, how to know it is done, and nothing about how to do it that the specs do not already say.

## 3. What to build

1. **`EDITOR-BRIEF.md`**, one document, in this order:
   - what a NodeGX editor is (README §3's six parts, in the agent's terms);
   - the kit: each package, what it answers, how to install it;
   - the adapter and the suite: done means PASS;
   - the traps, each as a sentence with the reason. From the prototype: wires are drawn under cards; cards show only
     connected ports; visual nodes have no spec, so show the real preview; one world per graph, or stores do not work;
     a new wire hands the receiver the current value; a camera's first animation-frame timestamp can be earlier than
     the time you recorded. From OWN-008: whatever the strangers asked.
   - what it must not do: write into the person's project without a copy first; claim a node does something its spec
     does not say.
2. **Served where R3 rules.** If the MCP server: as something the agent reads (a resource or a prompt), not a tool,
   because the tool list has a token budget; reachable with no project open, as `list_examples` is. Measure whether the
   server can serve it that way before promising it.
3. **The wish is the agent's input, not the brief's.** The brief never says what the editor should look like. It says
   what makes it a NodeGX editor.

## 4. Acceptance criteria

1. The brief is one document an agent reads in one sitting; every trap in it cites the task or the stranger that hit it.
2. An agent with only the `nodegx` MCP server installed, asked "build me a NodeGX editor that shows my project as a
   table", finds the brief without being told where it is (measured once, on a clean machine profile).
3. OWN-008's strangers are handed the brief and the kit and nothing else, and their questions are folded back in.

## 5. Watch for

- Memory: *the MCP tool surface has a token budget gate*. Anything that grows a tool description pays there.
- Memory: *documentation inside a scanned directory reads as a reference*. If the brief sits beside the packages,
  make sure no tool that scans for references picks it up as one.

## 6. Built

### 6.1 Session 17 (2026-10-14, Fable) — the brief, as the kit's skill

**Model:** the task file says Opus. This ran on Fable because Richard opened the session on lane 1, whose *now*
(OWN-013) a peer session already held (PR #50 in CI); OWN-007 was the lane's open item. Richard may want the next
revision (folding OWN-008's questions in) on Opus, as the task file says.

**Where it lives (R3):** `packages/create-nodegx/profiles/core/skills/nodegx-your-own-editor/SKILL.md`, one document,
in the public NodeGX repository. `npm create nodegx` (the core path, not the Vibe profile — R29) copies
`profiles/core/skills/` into the folder's `.claude/skills/`, where Claude Code lists it as a project skill and loads it
on its description; `CLAUDE.md` / `AGENTS.md` (the `AGENT_NOTE`) name the file so any other coder reads it. Written
only when absent, like every file the command writes. `test/create.test.js` grades it (25 / 25: the file lands, its
frontmatter `name` matches the folder, the four headings are present, `coreSkillFiles()` is exactly that one file, the
notes point at it, a person's own copy is never replaced). `packages/create-nodegx/README.md`'s stale "writes one
file" sentence now lists what the command writes.

**What is in it, in the task's order (§3):** what a NodeGX app is (the files); the six questions an editor answers
(README §3's table, in the agent's terms) and which package answers each; the kit — `@nodegx/project-contract`
(`format.js` / `format-node.js`: `V2ProjectStore`, `diskFiles`, `readComponent` → `revision`, `writeComponent` with
`ifRevision`, the validator), `@nodegx/node-spec` (`specFor`, ports, derived ports, *visual nodes have no spec*),
`@nodegx/preview` (`npx` in a frame; in a page `NodegxPreview.mountPreview` → `update`, `onTrace`, `elementsOf`,
`nodeLibrary`; `noodl-graph-target.js` → `NodegxGraphTarget.graphTarget()`), `@nodegx/canvas-look` (optional); **done
means PASS** — the adapter's three methods and the two graph doors, the eight edits, the command and its exit codes,
what the comparison ignores, *prove the suite can fail*; twenty traps in three groups, each one sentence with its
reason and a source tag; what it must not do; the report at the end (an issue on the public repo). The wish is never
described (§3.3).

### 6.2 Measured, not asserted — the kit from the registry

Scratch folder, `HOME` empty, `npm install @nodegx/project-contract @nodegx/node-spec @nodegx/canvas-look
@nodegx/preview` → all **0.1.0**. The checkout's `reading-list` fixture and its 15-edit script copied beside it.

| arm | result |
|---|---|
| the published command on an adapter wrapping the published `referenceAdapter` | **`PASS — scratch editor on reading-list (52 ms)`**, exit 0 |
| the same adapter writing `fontSize` as a string on the way out | **`FAIL … 1 difference(s)`** — *node "7de3c0e2-…" in components/Pages/Home/nodes.json: "parameters.fontSize" is "28"; the official editor saves 28.*, exit 1 (the sentence the brief quotes) |
| `import … from '@nodegx/project-contract/editor-suite'` from an `.mjs` | **`ERR_UNSUPPORTED_DIR_IMPORT`** (also `/format`); `require()` of the same path resolves → **P112-OWN007-ESMSUBPATH** filed (`kit: project-contract`, low); the brief says `.js` |
| the published package's fixtures | none: `tests/` is on `build-publish.mjs`'s SKIP list → **P112-OWN007-NOFIXTURES** filed (`kit: project-contract`, low); the brief says write `edits.json` yourself, every kind once |
| `@nodegx/preview@0.1.0` for a page | `dist/browser/noodl-preview-in-page.js` (1.7 MB), `noodl-graph-target.js` (3.0 MB) and `dist/external/deploy/` (the runtime) all ship; 20 MB installed |
| `@nodegx/node-spec@0.1.0` | `scenarios/graph/` ships (36 files), so the command's graph grader works from npm |

The traps' sources: NEEDS.md rows 6, 9, 10 and 13; OWN-000 §6; OWN-003 §6.1; OWN-004 §6 and §6.2 (FLD-004);
OWN-005; OWN-006 §6.1–6.2; OWN-011 §9; OWN-017 s16; and the ledger rows IDREPLACE, OPENWRITES, PAGEPORTS, SUITEIDS,
SESSIONLEAK, SHAREDTARGET, FORMATSKEW, TWOLOADERS, UNDEPLOYED, CONTRACTREADME. The camera-timestamp trap has no
record outside this task's §3; it is tagged *the Orbit prototype*. OWN-008 has not run, so no stranger's question is
in it yet (AC3).

### 6.3 The copy

Through the content-authoring skill's offline set on the prose with code, tables and source tags stripped
(`written`, `closer`, `contract`, `opener`, `figures`, `rollercoaster`; Groq-backed checks not run). Two passes:
the first flagged 25 joined or fragment sentences and 25 uncontracted forms; the brief was rewritten one idea a
sentence, contracted where the kit's other skills contract. Left standing: the two bold group labels (*On the files*…),
a list sentence, and one `written` reading on a sentence that is whole. Every figure `figures` flagged is in the task
files (eight edits, 85 scenarios, ten of them, 0.1.0, 0.4.0, two open-writes).

### 6.4 AC2 — does an agent find it unprompted?

The folder made by the local `create-nodegx.js` (so the skill is in it), `claude -p "build me a NodeGX editor that
shows my project as a table"`, `--strict-mcp-config` (no server: the question is whether the skill is found), tools
limited to `Skill`, `Read`, `Glob`, `Grep` so it cannot build, Sonnet, a 270 s alarm.

**Reading: the agent's FIRST tool call was `Skill nodegx-your-own-editor`**, before any read, search or plan — the
description alone carried it there. It then went looking for a project to build against (`Glob **/nodegx.project.json`,
found the `reading-list` copy one folder up), tried `Bash` eight times (denied, as set) and was stopped by the alarm at
270 s with no result record (exit 142), so no finish time. **AC2 ✅ as worded** (finds the brief without being told
where it is); measured once, on this machine's profile, not a clean machine — the skill is a file in the folder, so the
profile is not what finds it. Note: the folder's skill was the first draft of the text (the frontmatter, which is what
triggers, did not change in the rewrite). Scratchpad `own007/ac2/run.jsonl`.

### 6.5 Traps this session

- macOS has no `timeout`; the first acceptance run exited 127 before `claude` started. `perl -e 'alarm N; exec @ARGV'`
  is the guard.
- This build's `claude -p` has no `--max-turns`; a run is bounded by its allowed tools instead.
- Lane 1's *now* was a peer's at the moment the session opened (the hook file's mtime was one minute old, the fix
  already committed): checked by `ListAgents`, the session jsonl's mentions and `git log -- <file>` before touching
  anything, then split by message (memory: *a peer may be doing your exact task*).

**Not done:** publishing `create-nodegx` 0.2.0 (Richard's `npm login`, R11) — until then the skill is in the repo
only; AC3 (OWN-008's strangers, who now get this and the kit and nothing else); the `exports` map and the shipped
fixtures (the two rows above, owed to `@nodegx/project-contract`'s next publish).
