# Phase 92 — next session

**Written 2026-09-15 at the end of s8 (CHR-012 pass 3 + CHR-008 slice 1).** Branch `cline-dev`. Phase commits:
`git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half is `~/vscode_projects/nodegx-community`
(separate repo, no remote), deployed at `f39d20f` — s8 changed nothing there.

⚠️ `~/.claude/next-session-state/…json` holds a **P88 peer's** handoff; this file is the phase's.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard: "Looks good" |
| CHR-003 one radius, one shadow, one box model | ✅ Richard: "fine" |
| CHR-005 one launcher page | ✅ Richard: "fine" |
| CHR-006 the Templates tab gets its pictures | ✅ WORTHY |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| CHR-012 the Community tab | ✅ **closed as passable** (Richard, after s8: "worthy or passable … another stab another time") |
| **CHR-008 the panel is one tree** | 🟡 **slice 1 built s8: R8** — one line per group with ≥2 switched-off rows; Richard's condition (no repeated sentence on successive rows) gated over the catalog and driven; §3.1/3.2/3.4–3.8 not built (§6) |
| CHR-004, 009, 010, 011 | ⬜ not built |

**The look page:** https://claude.ai/artifact/MdKjHQTFEhkoLAR4i3MPZt (screenshots + rendered readings).

## First job

1. **Commit state:** s8 is committed — `8867c406f` (CHR-012 pass 3), `d37db75a5` (CHR-008 R8), `20f5bdeff` (docs),
   `806263cce` (the one-line rule + catalog gate, after Richard's condition), then the post-ruling docs commit.
   Verdict PNGs stay local by ruling (gitignored).
2. Nothing of Richard's is pending on this phase's built work. Go straight to Track B below.

## Then, in order (Track B)

1. **CHR-008 §3.4 identity (AC2, AC5)** — `sidebarmodel.tsx:76-86` `createPanel` returns a new arrow fn per selection;
   `SidePanel.tsx:84-101` force-recreates on `nodeSelected`; `index.tsx:35` `rememberedTab` and
   `propertyPanelViewState` are module state because of it. Smallest person-visible next step: the panel stops
   remounting, AC2 drivable, AC5's reverted arm is one line.
2. **CHR-008 §3.1/§3.2** — rows as siblings in one tree; the four decorators (`portDescription`, `portDecoration`,
   `portGate`, `portHint`) become `PropertyRow` props. R8's `groupGatesFor` already reads descriptors, so it moves
   with them. Convert `ColorType`, `CurveType`, `CodeEditorType` last, each its own commit and drive.
3. CHR-004 — smaller than scoped; `drive.js` `CONTRAST` prototypes R3's gate.
4. CHR-006 remainders (no ruling): plural chip labels; pictures for `site-builder` / `members-area`.

## Still Richard's

1. ~~CHR-012's look~~ ✅ **closed as passable** (after s8); another pass later. R8's wording ✅ *"fine as long as we don't
   have another 'same error repeated on 5 lines successively' problem"* — see the census in CHR-008 §6.
2. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — do not quietly revisit.
3. R6 final only on his look at CHR-009's screenshots; R7's marker-on-the-tab detail is proposed, not ruled.
4. The Projects tab's two full-width cards (BST-003 / UNI-001) — ask before moving them.
5. `members-area`'s live summary is lowercase and fragmentary (P86/P78 data).
6. ~~Where D21's health readout is read instead~~ ✅ **ruled "Nowhere"** (after s8). `mirrorview.healthFrom` still
   computes it and nothing reads it — the ruling's state, not a gap; do not build a reader.

## What s8 settled, including where the handoff was wrong

- 🔴 **The handoff's "prepared" signed-in drive found a defect, not a formality.** Signed in, Chat's `Say something`
  and People's `Take me off /people` were bespoke outlined buttons — AC2 was false for every signed-in person while
  two signed-out passes read clean. Now every write verb in `components/community` is `PrimaryButton` (12 sites).
- 🔴 `PrimaryButton` imports `Icon` ⇒ **15 specs** needed FLD-017's stub; two (`fb-007/capture-upload`,
  `nat-009/rfpboardview`) reach it through `models/community/threadview` and surfaced only in the **full**
  `tests-unit` run, not the "specs importing the changed module" run.
- `PrimaryButton`'s label is in a child `<span>`: a spec reading `ownText` on the `<button>` gets `''`. Use `text(node)`;
  find controls with `byTestId` (new in `support/renderElements.ts`).
- The rail's buttons are unlabelled `DIV`s with `data-test="<panel id>-panel"` (`community-panel`), not aria-labels.
- R8's rule, measured on a real Group: `Box Shadow` 6 → 1; `Scroll To Index` also gets a line; `Scroll` keeps five
  per-row sentences (same switch, different conditions — the specified fallback). ⚠️ FB-021 names the condition's
  FIRST clause, so `Scroll` says `Show Layout` where `Enable Scroll` is the switch that matters — recorded.
- `.font-size-baseline.json` lowered core-ui 124 → 123 (only `Community.module.scss` moved).

## Readings taken (2026-09-15, s8, tree `2c5c31fa2` + s8's uncommitted work)

- Full `tests-unit` **442 / 442 suites, 7,310 tests**; chr-008 specs **23 / 23**; mutants A/B/C **3 / 1 / 1 red**, restored `cmp`-identical.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**; `type` / `colors` / `tokens:css` / `icons:css` **EXIT=0**.
- Drives, all EXIT=0: CHR-012 `local-signed-in/` 20, `local-signed-in-v3/` 8, `local-signed-out/` 20, `rail/` 2; CHR-008 `gate.js` (press + undo, both themes).
- `test:ci` (seed 39393, `.webpack-cache` cleared, no stack, pageout delta 26/5s): **`Jasmine: 2984 specs, 8 failures`**, fresh `test-results.json` 22:30:58 — **the floor's eight by full name**
(SUB-006 ×3, SUB-011 ×3, NDA-017 `⚠️ records that Text Input has no checkbox port…` + `pins Expression's static inputs…`), 0 new. Graded tree included the P88 peer's uncommitted `nodegx-backend`, `noodl-mcp`, `noodl-runtime` and `validation/{authoredCandidate,responsiveArrangement}.ts`.

## Traps

- 🔴 One heavy job at a time; tear the stack down (listener pids, then `lsof -sTCP:LISTEN` reads 0). 🔴 s8's first
  teardown killed `lerna exec`/`npm run start` **by name** — all were its own, but walk the PPID chain from your
  launcher instead.
- 🔴 zsh: `npx jest $DIRS` with a space-separated variable passes ONE pattern ("No tests found", exit 1). Use `${=DIRS}`.
- 🔴 Anything `CommunityTab` / `TemplatesTabBody` renders must be hook-free; anything reaching `PrimaryButton` needs the `Icon` stub.
- 🔴 A peer's untracked `tests-unit/validation/gam-022-*.test.ts` and `scripts/devtools/drive-gam014-kit-root.js`, and
  `templates/todo-list.security.json`, are not this phase's — never commit them.
- Local platform recipe (worked s8): `DATABASE_URL=postgres://richardosborne@127.0.0.1:5432/chr012_community npx tsx scripts/seed.mjs`
  (drops `public` — scratch DB only), `next dev -p 3399`, swap `COMMUNITY_URL`, profile with
  `nodegx.community.session.json` = `{"token":"dev-session-ada","handle":"ada-builds"}`; park that file + reload for
  signed out. Revert the URL and prove `git diff` = 0.
