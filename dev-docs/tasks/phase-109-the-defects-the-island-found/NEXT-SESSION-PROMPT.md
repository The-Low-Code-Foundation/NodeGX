# Next session — P109 session 5

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 4 (2026-10-02, on `cline-dev` from `835a965f9`):** ISL-022 built on "Yes, both" (`db086d75f`); ISL-025 W13 on
"Remove the force" → **ISL-011 ✅ closed** (`ce3e36d54`); `noodl-mcp` dist rebuilt → **ISL-014 ✅ closed** by Claude Code
over the real door (`ddc2248f5`); round 1 of the Track B/D questions asked (3 ruled, ISL-005 turned into research);
this handoff's commit. **4 of 25 closed** (ISL-001, 002, 011, 014).

## Read first

1. README §8 (the rulings with their questions as asked, s4's round 1 at the end), §10 (status).
2. ISL-005 §8 s4 — **Richard's direction, and the research it orders.** Read his words in README §8 before anything.
3. ISL-022 §8 s4 (the rule, the census, the pins, AC6's run), ISL-014 §8 s4 (AC6 end to end).

## Do, in this order

1. **ISL-005's research (no product code).** Richard: *"using components and native NodeGX nodes where possible is
   validating the concept rather than just defaulting to scripts all the time."* Census the island's 83 Functions
   (2.45 MB): per Function, one line of what it does and (a) native nodes today / (b) a component around a one-job
   Function / (c) genuinely script — naming the native node, or the missing one. For the 17 `ENGINE` users, propose
   component boundaries and count the helper calls that cross each. File every missing node or port as a finding.
   Then re-ask ISL-005 with the numbers. ISL-006 and ISL-020 wait on it. Memory: `use-the-existing-mechanism` (both
   episodes).
2. **Build the round-1 rulings:** ISL-019 "Keep the same id" (first: ISL-016/017 and P111 SEE-002 depend on it);
   ISL-009 "Signal on every node" (Scroll into view, page included); ISL-007 "Adopt the add-on" (fix the
   i18next add-on's gaps, teach it to agents; String Format's `{name}` was the other syntax on the table).
3. **Ask round 2, in plain words, with each mechanism checked:** ISL-016 (settings overwrite; the editor already has
   "Make home", `projectmodel.ts:324-330`, whose first-root rule differs from the task's refuse rule), ISL-017 (a font
   as a library entry; `font-awesome-*` modules are precedent), ISL-021 (one step-list call; take the verbs from
   `scripts/devtools/drive-page.js`), ISL-008 (defaults weakest — 🔴 variants also write inline, and a bridge-wide change
   reverses ISL-011's 1a), ISL-010 (backend; `openai-compatible` is already reserved in `modelrequest.ts:67`). The s4
   research agent's drafts are summarised in this session's transcript only; re-derive, don't trust.
4. **ISL-022 follow-ups:** the cross-component blind spot (a wrapping row that is a component's ROOT, placed in a row
   elsewhere — needs the placement, the way arm B reads item components through `views`); AC6 again with a request that
   produces the shape. ISL-025 W21's real fix: `maxWidth: pct(100)` on `brTabs` in `cg003Components.ts`, the
   `.bg-tabs` CSS rule deleted from `cg007Look.ts`, `npm run template:garden`, the garden pin → `[]`, drive at 390.
5. **The two filed bugs** (`node scripts/bugs.js`): `P109-S4-UNROUTEDPAGE` (medium — a page written into a router-less
   project is silent; a warning on the page write) and `P109-S4-ROWWRAP` (nightbook's three tool rows; planning's
   `abRight` is CSS-rescued and pinned in `tpl010Template.test.ts` with its exit beside it).

## Decisions for Richard (not yours)

- **ISL-018's open case:** the door writing into a format-4 project no current editor has opened. Options: leave it
  recorded (narrow: the editor's Connect path opens — and upgrades — a project first); the door does the editor's
  one-time 4→5 step on its first write (stamps 5: the 0.3.0 app then refuses the project); or the door marks the nodes
  it writes (the "settle at write time" option he called nuts in s3). Not asked yet.
- **ISL-005**, after the research. **Rounds 2–3** above.
- Not asked, recorded: `garden-3d-kit/src/kit3d.js:3170` forces `display: block` as the grid kit did; arm B fires on
  a wrapped row of 100 %-wide items (nightbook `hsRoot`), which the ruling's "a percentage" sentence covers.

## Readings taken in session 4 (2026-10-02)

- `noodl-mcp` whole suite with ISL-022 in (over `835a965f9`): 164 suites, 3,534 passed, **23 failed in 15 suites**;
  every failure re-run under HEAD's rule — 15 stay red without the change (`cn004`, `nodeIdAllocation`,
  `d54ThemePresetIdentity`, `cmp004Parts` ×2, `cmp004RoundTrip` ×2, `cmp001` corpus 39-for-33, `fld013`,
  `provision` ×2, tpl007's byte gate, `def038` ×6), `iw008Crew` p95 timing under load; the rest were this task's
  pins and are green. Moved gates after: 698 passed, 8 failed = exactly those HEAD-reds.
- Editor `test:main`: **567 suites, 8,827 passed, 1 failed** (`exp-013/exportBadge`: a peer's in-flight
  `coverage-ledger.json`).
- Garden gates over the regenerated template (`ce3e36d54`): `cg001`, `cg003` (byte gate), `isl025`, `isl022`, `ig007`
  **291 / 291**. CG-001 page drive **50 / 50**, THE LOOK passing.
- 🔴 `def038SettledTemplates` is red on six **format-4** templates holding unsettled `runOnChange-*` (nightbook,
  planning, planning-demo are untracked peer templates; rocket-school peer-dirty; digital-bricks-training(-demo)
  committed by another workstream). s3's format step did not cause it (the planner is unchanged; it only stopped
  re-running at 5). Not P109's to regenerate.

## Facts measured in session 4 that are not in a task file

- 🔴 **`packages/noodl-mcp/dist` was rebuilt at 22:19 from `ce3e36d54`** and includes P78 D84's uncommitted
  `src/cloud/bundleEntry.js` (that register calls it fixed). Peer sessions run `dist/noodl-mcp.cjs` through Electron and
  get this build at their next launch. P78's register row D83 can now read ✅ (ISL-014 closed) — that file has a peer's
  open edits, so it was not touched.
- **Driving Claude Code over the door works from here:** `claude -p "…" --mcp-config <file> --strict-mcp-config
  --allowedTools "mcp__nodegx" --max-turns N --model sonnet --output-format stream-json --verbose`, the server as
  `node packages/noodl-mcp/dist/noodl-mcp.cjs <project> --allow-writes`. ≈ $0.7 for a small page, ≈ $2.2 at a 40-turn cap.
- **A worktree's `noodl-mcp` server resolves to the primary**: its `dist/` holds symlinks, and Node resolves a symlinked
  main module to its real path. Replace the links with real copies (`cp -L`) to make a server that lives in the worktree.
- **`render_report` cannot screenshot in a worktree** (no built viewer); an agent there says so and stops.
- **The template-rows probe:** a scratch copy whose router's start page is a page placing one component, with a
  `cssClassName` stamped on the nodes to read (`scripts/devtools/drive-isl022-template-rows.js`), reads a component's
  rows at 390 without driving the app to the screen that shows them.
- Local `cline-dev` is far ahead of `origin`; pushing is Richard's call.
