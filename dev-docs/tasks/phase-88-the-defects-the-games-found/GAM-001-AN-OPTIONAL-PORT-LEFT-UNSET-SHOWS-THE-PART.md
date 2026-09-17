# GAM-001 — An optional port left unset shows the part

**Status: 🟢 built, session 11 (2026-09-14, over `5df2a01a6`), committed `89e533625`.** R3's B with its checkbox: an Expression evaluates at load over unset inputs, and `Evaluate At Load` (ticked by default) turns that off. AC1 RED at HEAD (3 failed, 4 passed). AC2, AC3 and AC7 are graded, with 4 reverted arms (2/1/1/2). The AC5 census lists 14 first-frame changes by name. **Left:** AC4 and AC6 on Rocket School (the peer's files, and not walkable in a `deploy-from-disk` build), AC5's render of the corpus both ways, and the bundles. **Source:** [P78 D55](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-007 Rocket School's first drive, 2026-09-12, and again by P87 [RKT-006](../phase-87-the-first-play-test/RKT-006-RESTART-FROM-INSIDE-THE-RACE.md) and [RKT-008](../phase-87-the-first-play-test/RKT-008-THE-PLAYER-MENU.md), 2026-09-13 · **Side:** product (runtime, `Expression` → `Mounted`)

A component guards an optional input with `m !== false`, so a page that never mentions `m` should show the part. It does not. Home lost its whole header bar this way, twice, in two builds, and renaming the port changed nothing.

## 1. The person sentence

**Someone places a component without setting its optional show/hide port. The part is on the page, exactly as it would be if they had set the port to its obvious default.**

## 2. What was measured

HEAD `eb12ebe99`.

| reading | where |
|---|---|
| **As recorded 2026-09-12:** `Game/Stat`, `Game/Choice row` and `Game/Face` guarded an optional `mounted` input with `m !== false`. Placed without it, all three were hidden. The same guard on `Race/Setup`, whose page wires `mounted`, worked. The pass-through was removed from all three | [P78 D55](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) |
| **As recorded 2026-09-13, RKT-006 builds 3 and 4:** `Game/Header` fed `hdShown` (`m !== false`), then `hideBar` (`hide !== true`), into the bar's Mounted. Home never feeds either. `home-lang` read EN 0, FR 0 and Switch player 0 in 2/2 cells **on both builds**, so the port name is **excluded by measurement**. Build 5 put a States node first in `shown` in between: 9/9 × 2 | RKT-006 §5 |
| **As recorded 2026-09-13, RKT-008 "Ruled while waiting":** `Game/Header` mounted the language row from `compact !== true`, and Home never wires Compact. `homeLang`, `homeSwitch`, `toFrench`, `kept` and `frenchPad` were 0/2. With a States node first in `roomy`, all were 2/2 | RKT-008 |
| An Expression with any referenced input does not evaluate at load until one of them has delivered. `anyInputArrived` is set only on arrival. Re-read at HEAD | [`expression.ts:194-212`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L194-L212), [`:514`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L514) |
| That gate is deliberate. It stops `a.missing.deeper` throwing at load (the NDA-004 regression the NDA-017 seed change caused), and it is pinned by specs. Re-read at HEAD | [`expression.ts:54-71`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L54-L71); `test/corpus/nda-004-expression-failure.test.ts:211` and its control `:222` |
| An unset Component Input sends nothing (`sendValue` returns on `undefined`), and its getter reads the instance's stored value with no default of its own. Re-read at HEAD | [`node.ts:820-822`](../../../packages/noodl-runtime/src/node.ts#L820-L822); [`componentinputs.ts:51-57`](../../../packages/noodl-runtime/src/nodes/componentinputs.ts#L51-L57) |
| 🔴 **The register's last step does not hold at HEAD.** D55 says the `result` *"stays `undefined`, and the `Group.mounted` it feeds is unset"*. At HEAD `result` reads **`null`** until evaluated (`expression.ts:554-557`). `connectInput` seeds any source value that is not `undefined` (`node.ts:558-568`). Mounted coerces with `value ? true : false` (`react-component-node.ts:1953`). So Mounted is **set to `false`** by the seed. A truly unset Mounted would keep its declared `default: true` (`:1951`) and show the part | [`react-component-node.ts:1945-1968`](../../../packages/noodl-viewer-react/src/react-component-node.ts#L1945-L1968) |
| So "never evaluates" is only half the cause. The part is hidden because a `null` that is not an answer is delivered as one. **This is [GAM-003](GAM-003-A-METER-COMPUTED-BY-AN-EXPRESSION-LOADS-WITHOUT-AN-ERROR.md)'s seed, landing on Mounted** | as above |
| The typed outputs do not abstain: `asBoolean` reads `false`, `asNumber` `0`, `asString` `''` before any evaluation. Re-read at HEAD | [`expression.ts:631-658`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L631-L658) |
| **Workarounds at HEAD, re-read:** `hdHide → hdBarRoom.currentState → hdBarRoom.on → hdRoot.mounted`, pinned by a gate. `hdPanel` has `closed` first, with a D55 comment, and is gated | [`tpl007Components.ts:817-823`, `:851-853`](../../../packages/noodl-mcp/tests/tpl007Components.ts); [`tpl007Template.test.ts:511-513`, `:640-646`](../../../packages/noodl-mcp/tests/tpl007Template.test.ts) |
| **Live Expression → Mounted wires still in Rocket School at HEAD:** `qbSkillShown`, `qbShowTyped`, `qbShowOptions` (`:1028-1046`), `cdShown` (`enabled === true`, `:1127`), `fbHasMessage`, `fbHasBoost`, `fbMeterOn` (`:1302-1308`). Each is safe only while its input arrives. `cdShown` *relies* on the `null → false` seed to keep an unfed countdown unmounted | `tpl007Components.ts` |

## 3. Where it bites a person

P85's interface doctrine, [CMP-001 §P1 "The placement contract"](../phase-85-the-component-is-the-backbone/CMP-001-THE-COMPONENT-INTERFACE-PLAYBOOK.md), asks components to expose placement ports like `mounted`. A component that obeys it and guards the port is invisible wherever a page does not set it. That is the default placement, and the one a person tries first. Only a drive that looks at the unwired instance sees it: in RKT-006, `wrap` and `look` passed on a Home with no bar.

## 4. Related work and collisions

- 🔴 **[GAM-003](GAM-003-A-METER-COMPUTED-BY-AN-EXPRESSION-LOADS-WITHOUT-AN-ERROR.md), this phase: the same mechanism.** Rule the seed question once. Whichever task builds first changes the other's AC1 reproduction, so AC1 for both is recorded at HEAD before either lands.
- **P30 [NDA-017](../phase-30-node-library-audit/NDA-017-SIGNAL-INPUT-FRESHNESS.md) §2, built,** and **NDA-004**. Constraint 4 (`null` until evaluated) and the `anyInputArrived` gate are their decisions. This task changes one of them or neither. It does not own them.
- **P79 G1** (`fac770da2`): flags the typed outputs on evaluation. It is why `As Boolean → Mounted` behaves differently (a `false` seed).
- **P85 CMP-001 P1**: the doctrine that should say how to default an optional port if the runtime does not change. [STUDIED-APPS.md:21](../phase-85-the-component-is-the-backbone/STUDIED-APPS.md) lists D55 and does not own it.
- Grep run: `grep -anl "never evaluates\|anyInputArrived\|no delivered input\|m !== false\|never evaluated" -r dev-docs/tasks`. Hits beyond the above (P67 RULINGS and UNI-010, P69 cn-012, P66 FIX-008) use the words about other code. **No owner.**

## 5. Design

| option | what it does | trade |
|---|---|---|
| **A. Do not seed an unevaluated answer** (GAM-003 option A) | the wire delivers nothing until the Expression has evaluated, so Mounted keeps `default: true` | fixes the reported cases and GAM-003. 🔴 An `m === true`-style guard (`cdShown`) now shows by default too. The consumer's default wins, not the author's expression |
| **B. Evaluate once over unset inputs** | lift the `anyInputArrived` gate for the first evaluation. A throw over unarrived inputs is swallowed, not reported | honours the author's expression (`undefined !== false` is `true`, `enabled === true` is `false`). 🔴 Every Expression in every project evaluates at load. `a + b` publishes `NaN`, which raises `node/nan-input` on its consumers. It reopens NDA-004's regression unless the swallow is exact |
| **C. A declared default on a component input** | the port delivers its default when a page sets nothing, so the Expression's input arrives | fixes it at the interface. The runtime `Component Inputs` getter has no default today (§2). Whether a component port definition can carry one is **not read**. Every component must then declare its defaults |
| **D. Teach the States pattern** | doctrine plus a diagnostic: an Expression fed only by Component Inputs and wired into Mounted | no runtime change. It is what Rocket School did three times, and it leaves the trap in place |

🔒 **Richard, asked once with GAM-003: when a page sets nothing on a component's input, should a guard computed from that input (a) not reach its target, so the target keeps its own default (A); (b) run over "unset" (B); or (c) run over a default the component declares (C)? D alone is the fallback if none of them.**

> 🔒 **Ruled, 2026-09-14 (session 1):** *"Can't we do B but with a checkbox or something that lets the user turn off auto
> evaluation, a bit like we have with the function node?"* — Richard

**So the build is B plus an opt-out:** an Expression evaluates once over unset inputs, and a per-node switch turns that
load-time evaluation off. The Function node's analogue is `Run On Value Change` (NDA-017's `runOnChange-<input>` ports).
Still owed before code, and none of it is settled by the ruling:
- whether the switch is one of NDA-017's existing `runOnChange-` controls or a separate checkbox (read `expression.ts` first);
- what a **saved** Expression defaults to. On changes the first frame of every existing project, and off changes none of them;
- B's two named risks stay acceptance conditions: NDA-004's `a.missing.deeper` swallow must be exact (AC3), and `a + b` over
  unset inputs must not start raising `node/nan-input` on its consumers (AC5's blast radius counts it).
- ⚠️ It does **not** close [GAM-003](GAM-003-A-METER-COMPUTED-BY-AN-EXPRESSION-LOADS-WITHOUT-AN-ERROR.md) on its own: `round(s * 48)`
  over an unset `s` evaluates to `NaN`, and a `NaN` is still not a size. See GAM-003 §5.

> 🔒 **The owed follow-ups, ruled 2026-09-14 (session 2).** Richard chose the recommended option each time:
> - **Saved default: on for all.** Saved and new Expressions both evaluate at load. There is no migration that writes the
>   switch off. The first-frame changes this makes are listed by name under AC5 before anything lands.
> - **The opt-out is a new node-level checkbox**, for example `Evaluate At Load`, ticked by default and placed beside the
>   `Run On Value Change` group. It is **not** one of NDA-017's per-input `runOnChange-` controls. Those govern an
>   *arrival*, and at load nothing has arrived. Wiring `Run` still stops load-time evaluation too (`expression.ts:514`,
>   the same guard the Function node has at `simplejavascript.ts:248`). The checkbox adds a way to opt out and changes
>   nothing else.
> - **GAM-003's `NaN`:** a `NaN` magnitude reaching a size port is **empty, silently**. See GAM-003 §5.
>
> Read from source when the options were framed, not measured: `cdShown` (`enabled === true`) evaluates to `false` over
> an unset input, the same `false` today's `null` seed gives, so it is predicted not to change. AC5 measures it.

**Do not** fix this by renaming ports. RKT-006 build 4 excluded that. **Do not** remove the `anyInputArrived` gate without a replacement for NDA-004's `a.missing.deeper` guard.

## 6. Acceptance criteria

| AC | clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec with the real runtime and viewer Group: a component whose Component Inputs `m` feeds `m !== false` → Group `mounted`, placed with `m` unset. The Group is not mounted, the Expression has not evaluated, and Mounted received `null`. Known-firing arms in the same file: `m = true` mounts, `m = false` unmounts |
| AC2 | After the ruled change, the unset arm mounts, `m = false` still unmounts and `m = true` still mounts. **Sabotage arm:** revert the change, and the unset arm is unmounted again |
| AC3 | NDA-004's guard holds: `a.missing.deeper` over an unarrived input raises no `expression/threw` at load (`nda-004-expression-failure.test.ts:211`), and its no-inputs control (`:222`) still evaluates |
| AC4 | **Person, in a browser.** A copy of Rocket School with `Game/Header` back to build 4's shape (`hide !== true` straight into the bar's Mounted). Served and driven with `drive-rkt008-home-lang.js`: Home's bar, EN/FR and Switch player present (9/9 × 2), checked with `elementFromPoint`, not only DOM presence. The shipped build still passes |
| AC5 | **Blast radius before landing.** For every Expression (and Condition) whose value output feeds a Mounted, a Visible or any boolean port, across `library/`, `templates/`, `project-examples/` and both corpora: whether its inputs can be unset at build, and its first-frame value before and after. Render the corpus both ways. List every visibility change by name, `Game/Countdown bar#cdShown` among them |
| AC6 | **Workarounds.** Say for each whether it can go: `hdBarRoom` (`tpl007Components.ts:817-853`), the header's language-row States node from RKT-008, `hdPanel`'s `closed`-first (`:823`), and D55's three removed `mounted` pass-throughs. Any removed is regenerated, gated and driven (`home-lang`, `stage`, `wrap`, `look`). Any kept gets a gate comment that no longer cites D55 as the reason |
| AC7 | The Expression's port or catalog description says what an unset input does, as ruled, and a spec asserts the sentence |

## 7. Traps

- 🔴 **Control what you varied.** Build 4 varied the port name and read the same failure. Every arm varies what the wire carries.
- `As Boolean → Mounted` seeds `false`, not `null`. An arm built on the typed output grades a different defect.
- `update()` is synchronous and `settle()` yields. A `settle()`-based arm can read this class absent (P30 PROGRESS, NDA-017 §0).
- 🔴 **Only the unwired instance shows it.** `Race/Setup` worked because its page wires `mounted`. A fixture page that sets the port grades nothing.
- A drive that counts DOM nodes reads a mounted-but-covered bar as present. Use `elementFromPoint`.

## 8. Record

### Session 11 (2026-09-14, HEAD `5df2a01a6`, over GAM-002's uncommitted `expression.ts`)

**What was built** (`noodl-runtime/src/nodes/std-library/expression.ts`):
- A new input, `evaluateAtLoad` (**Evaluate At Load**): boolean, `default: true`, in the `Run On Value Change` group. It is
  a node-level checkbox, as ruled, and not a `runOnChange-` control. Saved projects are not migrated.
- The `expression` setter's load call is `_scheduleLoadEvaluation`, not `_scheduleAutomaticEvaluation`. If a referenced
  input has not arrived, it marks `pendingLoadEvaluation` and schedules anyway. The scheduled callback decides once the
  inputs have had their chance to land. If an input arrived, or a `Run` is in the batch, it is an ordinary evaluation.
  Otherwise, with the box ticked, `_evaluateOverUnsetInputs` runs the compiled function over the unset (`undefined`) inputs.
- **No answer, no publish.** A throw (NDA-004's `a.missing.deeper`), a compile failure, or a **`NaN`** returns
  `NOT_EVALUATED`. The node then keeps abstaining on `null`, exactly as before, and reports nothing. The `NaN` rule is session
  1's condition that `a + b` over unset inputs must not start raising OBS-003's `node/nan-input` on its consumers. A compile
  failure is still reported when an input arrives, as it was.
- `_argumentsForEvaluation` is the argument list, shared by both evaluation paths. Wiring `Run` still stops the load's
  evaluation. The Noodl-globals path (`_scheduleAutomaticEvaluation`) is unchanged.

**AC1: RED at HEAD.** `packages/noodl-viewer-react/tests/gam-001-an-optional-port-left-unset-shows-the-part.test.ts`. A
real `/Part` component, with Component Inputs `m`, then `m !== false`, then a node carrying Group's **real compiled
`mounted` setter** (the real Group needs a DOM), placed on a page. At HEAD: **3 failed, 4 passed.**
- Unset `m`: Mounted's setter was handed `[null]`, `wantsToBeMounted` is `false`, and the Expression has not evaluated. §2's
  correction of the register is confirmed: `null`, not `undefined`, and set, not unset.
- `m === true` over unset: not evaluated.
- The `evaluateAtLoad: false` row also read `evaluated: true` at HEAD. HEAD has no such input, so the Expression took the
  unknown parameter as a **dynamic input port**, and its arrival ran the evaluation. That is the harness behaving, not the
  defect, and the static input removes the path.
- Green at HEAD, as intended: `m = true` mounts and `m = false` unmounts (the known-firing arms). A throwing guard stays
  silent. `evaluateAtLoad: false` with `m = true` still runs.

**AC2 / AC3 / AC7: after.** The viewer's three files, GAM-001, GAM-003 and FLD-004, are **28/28**. GAM-001's 10 rows:
- the unset part mounts, and Mounted is never handed `null`;
- `m === true` over unset evaluates to `false`, so Rocket School's `cdShown` shape is unchanged, as §5 predicted;
- `m.visible` over unset raises nothing, sends no `failure` and does not evaluate (AC3);
- `m = NaN` from the page raises `node/nan-input` on the consumer (known-firing), and `m + 1` over unset does not evaluate
  and raises nothing;
- unticked, the unset guard does not run, while `m = true` still does;
- AC7: the checkbox's description says unset inputs *"read as undefined, so `m !== false` is true"*.

NDA-004's own file plus GAM-002's are **32/32** in `noodl-runtime`.

**Reverted arms** (`scratchpad/gam001/sabotage.sh`: one asserted-unique string each, restored `cmp`-identical):

| arm | reverted | predicted | red | rows |
|---|---|---|---|---|
| G1 | the load waits for an arrival again | 2 | **2** | unset mounts; `m === true` evaluates |
| G2 | the checkbox ignored | 1 | **1** | unticked, the unset guard does not run |
| G3 | a throw over unset becomes the answer `undefined` | 1 | **1** | the throwing guard does not evaluate |
| G4 | a `NaN` over unset is published | 1 | 🔴 **2** | `m + 1` does not evaluate, **and GAM-003 AC1's shape row** |

G4's second red was not predicted, and it is explained. Without the guard, GAM-003's unset `round(s * 48)` evaluates to
`NaN` during the first update. `queueInput`'s first-update consolidation then replaces the queued `{value: null}` with
`{value: NaN}` before Width drains, so the setter never sees `null`. That is the mechanism GAM-003 §2 hypothesised for the
countdown, measured here in the `NaN` shape.

**AC5: blast radius** (`scratchpad/gam001/census.js`). Every wire leaving an Expression into a boolean port or a units
port, in `library/`, `templates/`, `project-examples/`, the catalog examples, `NodeGX test projects` and `~/Documents/NodeGX`.
The census gives each the value delivered on the first frame before (the unevaluated seed) and after (evaluated over unset
inputs), and each input's source.

| reading | value |
|---|---|
| Expressions / wires out of them | 386 / 460 |
| into a boolean port / into a units port | 161 / 4 |
| first-frame value differs, any source | 52 boolean, 4 units. ⚠️ The "before" assumes no input arrives at build, so rows fed by a Variable or a Function are artefacts |
| **differs, and an input can really be unset** (a Component Inputs port, or nothing wired) | **14, all boolean**, 0 units |
| sabotage arm `SAME=1` | 0 |

The 14, by name (all `false → true` unless marked):
- **Rocket School (the peer's template):**
  - `Game/Question box#qbSkillShown` (`enabled !== false` → Text Mounted)
  - `Game/Teach card#tcNoWorked` (`… length === 0` → Group Mounted)
  - `Monster/Setup#zsShown` (`m !== false`, the peer's new, untracked component)
  - `Race/Setup#rsShown` (`m !== false`)
  - `Race/Play#rpBMoves` (→ Condition). A census artefact: its `isB` comes from another Expression.
- **`NodeGX test projects/def036-dash-drive`:**
  - 6 guards of the form `x != ""` on Component Inputs (`attachment`, `prereq || endDate`, `subtitle`, `icon`,
    `descriptor`, `label`), each into a Text, Group or Icon Mounted
  - 2 `isFalse` wires (`type === "video"`, `count === 1`)
- **`NodeGX test projects/Landing page test`:** `Logo group`'s `!logoUrl` (`isTrue` → Icon Mounted).

`Game/Countdown bar#cdShown` is not among them (`false → false`). ⚠️ "Can be unset" is not "is unset": whether each
placement sets the port was not measured. The `x != ""` guards in def036 now **show** an empty part where a page does not
set the text. That is what the ruling asks for (the guard the author wrote decides), and it is the change most likely to be
seen. **The corpus was not rendered both ways.** That half of AC5 is owed.

**AC4 and AC6: owed.** Both need Rocket School (`Game/Header` build 4, `hdBarRoom`, `hdPanel`). Its generator and gate are
the TPL-007 peer's files, changed during this session. A Rocket School drive also needs P87's own build, because
`deploy-from-disk` cannot walk it (GAM-006 s5, GAM-009 s9).

**Catalog.** `evaluateAtLoad` and the new `runtimeBehavior` sentence were regenerated into both catalogs and
`expression.md`. Each catalog differs from HEAD only in the Expression entry.

**Not read:** whether the export's emitted Expression hook already evaluates over `undefined` inputs on first render (P18
parity).

**Gates, after GAM-001, GAM-002 and GAM-003 together, one job at a time:**
- `catalog:check`, `catalog:merge:check` and `docs:nodes:check` all exit 0.
- Whole `noodl-runtime`: **162 suites, 2,759 passed**, 13 skipped, exit 0.
- Whole `noodl-viewer-react`: **114 suites, 1,496 passed**, 1 todo, exit 0.
- Whole `nodegx-export`: **102 suites, 3,510 passed**, 1 skipped, exit 0.
- Editor `test:main`: **458 suites, 7,522 / 7,522**, exit 0.
- Not run: the noodl-mcp suites, the Electron `test:ci`, the bundles and the cloud runtime.
### Session 23, later — R28 ruled (2026-09-17, asked in plain words: the nine workarounds)

**Richard: *"Keep them with a comment I guess."*** AC6's four sites stay in Rocket School — `hdBarRoom`, RKT-008's language-row
States node, `hdPanel`'s `closed`-first, and D55's three removed `mounted` pass-throughs. What is owed is the comment: each gate that
pins one of them stops citing D55 as the reason (the product no longer needs the dodge) and says it is a deliberate template choice.

**AC6 done (comments only, as ruled).** `tpl007Components.ts`: `hdPanel`'s `closed`-FIRST comment and `hdBarRoom`'s States-pattern
comment now say they are kept deliberately and that GAM-001 fixed the cause, so **neither cites D55 as the reason** any more.
- ⚠️ **Two of AC6's four sites are not in today's generator, checked:** the *"header's language-row States node from RKT-008"* — `hdLang`
  is a `Game/Choice row` placement, and no States node drives the language row (grepped `hdLang`, `langRoom`, `withStates` in the
  header) — and *"D55's three removed `mounted` pass-throughs"*, which are **already absent**: `Game/Stat`, `Game/Choice row` and
  `Game/Face` carry no `m !== false` guard (the two that remain, `rsShown` and `zsShown`, are on components whose pages do wire
  `mounted`, which is the shape D55 said works). AC6's line citations (`:817-853`, `:823`) are stale — the file has moved since s11.
- Gate: `noodl-mcp` `tpl007Template.test.ts` **94/94** after (a comment changes no output, so no regeneration was needed).
**Still owed on this task: AC4 (the browser drive) and AC5 (the corpus census).**