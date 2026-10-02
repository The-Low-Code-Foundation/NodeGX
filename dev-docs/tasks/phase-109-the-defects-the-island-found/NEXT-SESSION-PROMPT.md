# Next session — P109 session 4

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Sessions 1–2:** ISL-001's fix (`3df5adb82`), ISL-014's refusal (`aab96a056`), ISL-025 W1–W3, ISL-011 (1a + 2a).
**Session 3 (2026-10-02, on `cline-dev` from `4b448e016`): rulings 2 and 3 given; ISL-002 and ISL-001 ✅ CLOSED (2 of 25);
ISL-014 (b) built; ISL-022 AC1 measured; ISL-001's AC7: 8 modes runs, no lost press; two gates of this phase's own put right.** Commits:
`06e65ab47` (ISL-002 fix, three copies), `13b57fc4e` (rulings + records), `83a31805b` (ISL-014 b), `e234bd15f`
(HLS-001 golden learns ISL-011's fixture), `45177be3a` (ISL-002 AC5), `906a1fe3c` (ISL-001 AC5), `1fd49429c` and
`5ddc39420` (ISL-022 AC1), plus this handoff's commit.

## Read first

1. README §4 (board), §8 (rulings 1–3 given, each with its question), §10 (status: 2 of 25 closed).
2. ISL-014 §8 s3 (the build-on-demand and its staleness rule), ISL-001 §8 s3 (why a minimal page cannot show D85),
   ISL-022 §8 s3 (both halves of AC1), ISL-002 §8 s3 (the census; closed).

## Rulings given in session 3 (README §8 has the questions as asked)

- **States (ISL-002): "Fix both, one commit"** — built, closed.
- **Kit helper (ISL-014): "Build it automatically"** — against the recommendation; built. The question said "a minute
  or so"; it is ~150–200 ms.

## Build, in this order

1. **`npm run build` in `packages/noodl-mcp`** when `git status packages/noodl-mcp/src` shows no peer's work (s3 found
   `src/cloud/bundleEntry.js` modified, a peer's). Then **ISL-014 AC6**: under (b) the agent should never see the
   refusal — `get_project_info` → `kits.readerBuilt` on a checkout with no reader, the kit node placed, the page
   deployed with it drawing, the screenshot looked at.
2. **ISL-011's two owed arms** (the editor canvas via `run-editor` on a copy of `nodegx-export/tests/fixtures/isl011-kit-grid`;
   the port-write-after-mount drive).
3. **ISL-018 AC2** (the editor) — a measurement that decides its ruling.
4. **Then ask, in plain words, all at once:** ISL-022 §5 (should the wrapped-row warning still fire on items with a pixel
   width — it reverses GAM-022 — and fire on a `contentSize` wrapped row like `brTabs`?) with the Track B and D
   rulings (README §9). Rewrite each with no internal word: say what the person saw (the island's page zoomed out on a
   phone; taps landing off), the choices, the cost.

## Facts measured in session 3 that are not in a task file

- 🔴 **The deploy bundle was rebuilt from HEAD at 14:01 on 10-02** (`noodl-editor/src/external/deploy/noodl.deploy.js`,
  gitignored): it carries ISL-002's States fix. A peer drive whose reading changed after that may be seeing this.
- 🔴 **The primary's kit reader was rebuilt at 13:55 by the first no-override bind** (ISL-014 b; it had no input list).
  From now on any runtime edit makes the next checkout bind rebuild it (~0.2 s). `dist/kit-extract.inputs.json` is new.
- 🔴 **`timeout` does not exist on this Mac.** Two s3 "0 errors" typechecks never ran (`timeout … | grep -c` counted
  nothing). Real readings: `noodl-viewer-react` tsc 0; `noodl-mcp` 15, all in P105–P108 specs. Memory updated.
- **The editor's `npm run validate:project` does not run the responsive-arrangement rules** the MCP door runs: 0
  warnings over the garden where the door pins three. Measure layout warnings through the door.
- **HLS-001's corpus gate in the primary is red on a peer's in-flight export work** (every README via the coverage
  ledger, `utility-desk`'s `crypto.ts`, the untracked `pattern-desk`). For the committed tree it is 4 / 4, measured in a
  fresh worktree. Not P109's to regenerate.
- **ISL-002 also fixed P107 D19's first half** (NSP-013's row is marked); the round-trip half (a text a state does not
  name keeps the previous state's text) is still P107's.
- Template follow-up for P108 (README §6): the island's `plMode.record` can go back to a boolean.
- Local `cline-dev` is far ahead of `origin`; pushing is Richard's call.
