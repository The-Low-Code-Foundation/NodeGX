# Phase 88 — The defects the games found

**Scoped:** 2026-09-14, at HEAD `eb12ebe99`, from every open row in
[P78's register](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) whose owner was `NONE`, plus four findings
from [phase 87](../phase-87-the-first-play-test/README.md) that had never been registered.
**Status: ⬜ OPEN — 12 of 25 built** (GAM-019 ✅ `4bb438165`; GAM-006 🟢 `062dfd9c0`; GAM-005 `44b3a9add`, GAM-007 `d57a11668`, GAM-008 `5da1c9fd6`, GAM-009 `bdf1d3b19`; GAM-001/002/003 `89e533625`; GAM-014 `bcfb1c2aa`, GAM-021 `6a6c309a5`, GAM-022 `593de4f57`). **GAM-025 ✅ closed by R22, nothing built (s16).** 7 rulings landed in session 1 (§4). GAM-012's
faults 1–2 are committed (`bb27086de`). **Session 3 (`82a7d3775`, `42cd090fe`):** GAM-004 AC1 does not reproduce in the runtime, GAM-018
AC1 is confirmed (10 guarded kits fail alone), and GAM-006 (b) is built with AC8. **Sessions 4–5 (`062dfd9c0`):** GAM-006's
colour reader is built and driven in a real browser on three templates, beside the old runtime and a reader-bypassed
one. TPL-006's workaround is removed (`1cf0a81d2`), and Rocket School's stays with P87, undriven. `test:main` found
GAM-019 had turned CN-002 red, fixed in `8af0c943d`. **Session 6:** GAM-018 AC2 is measured. Confetti registers alone in a deployed page, where it also draws, and in the SSR kit loader, so 🔒 R2 is askable. GAM-004's browser arm, run with real keys beside a known-late arm, does not reproduce D47 either. TPL-003's `test:main` red is fixed by counting the content. **Prefix: `GAM`.**

> "Let's make a new phase to write task files for all the defects please" — Richard, 2026-09-14

> "We're making templates to surface bugs and issues with the whole NodeGX concept as well." — Richard, 2026-08-28

Three templates found these, and all three are games: [TPL-005](../phase-78-the-templates/TPL-005-THE-PIXEL-GAME.md) the
pixel game, [TPL-006](../phase-78-the-templates/TPL-006-THE-STORY-ENGINE.md) the story engine, and
[TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md) Rocket School with its play test, phase 87.
Every template worked around its defect and went green. **This phase fixes the product, so the next person does not
need the workaround.**

## 1. The person sentences

**Track A — the screen is wrong and nothing says so.** Most of these draw a wrong page with zero console errors while
the validator stays silent.

> **When a graph looks right in the editor, it behaves that way in the browser. When it can't, a door says so before
> a person has to find it.**

**Track B — the graph is missing a basic.** Each gap pushed a template out of the graph and into DOM access or kit
JavaScript.

> **Focusing a button, asking a tablet for a keypad, or making something happen every second is a node or a port, not
> a script.**

**Track C — building a kit is a minefield.** Rocket School's game kit found most of these.

> **A kit author's React node draws, sizes, and receives what the graph sends it, the same way a built-in node does.**

**Track D — the doors spoke at the wrong times.** The validator, plan tools and deploy stayed quiet about a real fault,
or warned about a correct graph.

> **A warning means something is wrong, and something wrong gets a warning.**

🔴 **Track A outranks the others in every ordering decision.** A silent wrong screen is worse than a missing
convenience. Within a track, tasks are ranked by **who each defect bites**, not by how cheap it is.

## 2. What is in, and what is not

**In:** every register row that was open with owner `NONE` on 2026-09-14. They were found by reading the sections as
well as the table, because the table was missing D48 and D60–D66. **Also in:** D67–D70, registered on the day this
phase was scoped, from P87's task records. Every one of those rows now names its GAM task, and the register has no
`NONE` owner left:

```sh
awk -F'|' '/^\| *\*?\*?D[0-9]+\*?\*? *\|/ {r=$2;o=$4; gsub(/[ *]/,"",r); gsub(/^[ *]+/,"",o);
  if (o ~ /^NONE/) {printf "%s ", r; n++}} END{print "\nNONE count: " n+0}' \
  dev-docs/tasks/phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md
```

⚠️ A `0` from that command is only a reading beside a known-firing one: 25 table rows name a `**GAM-0` owner.

**Out:**
- **D63** (player two graded into player one's learner model): a template defect, owned by P87.
- Fixed, disproved and answered rows.
- P77's and P84's own registers.

## 3. What scoping corrected in the register

Every task re-read its row at HEAD. **Twelve rows were wrong, or partly wrong, about their own mechanism**, and each
section now carries a dated re-read note. The corrections that change the work:

| row | recorded | at HEAD |
|---|---|---|
| D55 + D62 | two defects | **one cause:** an Expression that has never run reads `null`, and the wire hands it down. On Mounted it hides the part; on Width it trips FLD-004's refusal. GAM-001 and GAM-003 share a ruling |
| D49 | colours and numbers never publish | token colours are parsed as hex into NaN (`states.ts:89-101`). Numbers and hex colours are not shown broken by source |
| D54 | `Math` becomes a port | `Math` is already ignored. `String`, `Number`, `JSON`, `Date` and `parseInt` are not |
| D50 | copy Arm A's exclusion | it would silence neither template: the items are content-sized, not the containers |
| D53 | the door doesn't count a kit type as visual | it does once the overlay loads. The cause is an empty overlay, or the viewer |
| D65 | the kit gets `{value, unit}` | it gets the string `"40px"`, and the kit gate feeds a shape that never arrives |
| D67 | Animate To Value saw one target | the queue keeps every value. Three readings fit the drive, and GAM-008 AC1 separates them |
| D70 | a kit node cannot take a signal | only an `inputProps` signal is refused; one under `inputs` works |
| D41 | co-tenancy, cause unknown | predicted from source: the extractor's catch-all `Noodl` Proxy fakes `defineNode` |
| D66 | cause not read | `nonexistentPort` skips every type with a `dynamicPorts` entry: 88 of 176, Text Input among them |
| D57 | the doctrine is silent | the node reference says "app-wide"; the doctrine an agent receives is silent and recommends Variables |
| D61 | the Text output still holds the name | a remount overwrites the output from source; AC1 measures it |

**Held at HEAD:** D48, D58, D60, D64, D66's symptom and D40.

## 4. 🔒 Rulings

Each task file states its ruling in full, with the trade-offs.

**Ruled 2026-09-14 (session 1).** Each ruling is recorded in its task file's §5 with what it leaves open:

| # | ruling | task |
|---|---|---|
| R3 | 🔒 *"Can't we do B but with a checkbox or something that lets the user turn off auto evaluation, a bit like we have with the function node?"* An Expression evaluates over unset inputs, with a per-node opt-out. **Follow-ups ruled in session 2:** saved Expressions evaluate at load too (on for all, no migration); the opt-out is a **new node-level checkbox**, not one of NDA-017's per-input controls; a `NaN` magnitude reaching a size port is **empty, silently**, and `"tall"` is still refused | GAM-001, GAM-003 |
| R13 | (session 2, after GAM-012 AC1) A Focus to a **mounted** control focuses it every time; to an **unmounted** one it **fails and is not held**, and the builder is told in the editor, not the browser. The tracker stays for Groups; the Blur inversion is fixed | GAM-012 §5 |
| R11 | Follows R13: a Button's Focus obeys the same rule | GAM-010 §5 |
| R3b | The GAM-019 refusal's "did you mean" matches the wire's kind: no signal is suggested for a value wire, and no value input for a signal wire. The threshold is unchanged | GAM-019 §8 (✅ built in session 2, `15f7bf720`) |
| R4 | Yes: stop minting ports for JS globals and keywords, and migrate any saved wire | GAM-002 |
| R6 | A warning, with a "shared on purpose" escape | GAM-005 |
| R7 | Warn only if CSS itself rejects the colour; a valid colour the tween cannot read jumps silently | GAM-006 |
| R8 | C: reserve the names loudly now, data wins later | GAM-007 |
| R9 | A + C: a `Jump To` action, plus the one-pass collapse in the description. AC1 still isolates the cause first | GAM-008 |
| R10 | (a) typing writes the start value, and a remount fires `Value Changed` only on a real change | GAM-009 |
| R2 | (s17, 2026-09-16, asked in plain words) **"Fake it like a page"**: the extractor's `Noodl` holds exactly what the viewer's bootstrap defines. ✅ Built s17, see GAM-018 §8 | GAM-018 |
| R20 | (s17) **"Publish all, warn"** (§5 option c): `nodegx deploy` keeps every wire and lists the ones health calls broken. Asked with the catch that a headless deploy sees kit wires as broken (TPL-005's 4 keyboard wires) | GAM-023 |
| GAM-004 | (s17) **"Close it"**: D47 closed as measured and not reproduced, runtime and browser. Reopen only with a real game as evidence | GAM-004 |

**Still askable now:**

| # | question | task |
|---|---|---|
| R1 | Is a repeat a new node or a Repeat port on Delay, and what does it do when its page is navigated away from, or on the server? | [GAM-013](GAM-013-SOMETHING-CAN-HAPPEN-EVERY-SECOND-WITHOUT-A-SCRIPT.md) |
| R11 | Does a control's Focus go through the viewer's focus tracker, or straight to the element? | [GAM-010](GAM-010-A-BUTTON-CAN-BE-GIVEN-THE-KEYBOARD.md) |
| R12 | Does Insert Text respect Max length? Is `inputmode=none` enough, or does the product owe a display-only box? | [GAM-011](GAM-011-A-FIELD-CAN-ASK-FOR-A-KEYPAD-AND-TAKE-A-TAPPED-KEY.md) |
| R15 | For a wired size, fix only a kit's types and docs, have the bridge hand single-unit ports as numbers (built-ins too), or add a per-port opt-in? | [GAM-015](GAM-015-A-WIRED-SIZE-REACHES-A-KIT-NODE-AS-A-SIZE.md) |
| R16 | Should presets ship their fonts as modules, name only fonts that ship, or be caught by a validator? And what does switching preset do to an installed font? | [GAM-016](GAM-016-THE-FONT-A-PRESET-NAMES-IS-THE-FONT-THE-PAGE-DRAWS.md) |
| R17 | Should kit signal props be fixed in the bridge or refused in the types with a check? Should kit size come from `frame`, from default Width/Height ports, or be documented as a wrapper Group? | [GAM-017](GAM-017-A-KIT-NODE-TAKES-A-SIGNAL-AND-A-SIZE-THE-WAY-A-BUILT-IN-DOES.md) |
| R18 | Is a short multi-word heading in a content-sized Text a finding: warn on any sentence, warn above a length threshold, or info only? | [GAM-020](GAM-020-A-SENTENCE-THAT-WILL-NEVER-WRAP-IS-FLAGGED-BEFORE-A-PERSON-SEES-IT-CLIPPED.md) |
| R20 | ✅ **Ruled s17: publish all, warn** (see the ruled table) | [GAM-023](GAM-023-A-DEPLOY-REFUSES-A-BROKEN-WIRE-AND-KEEPS-EVERY-GOOD-ONE.md) |
| R22 | ✅ **Ruled s16: just rename it.** D was ruled first, then withdrawn once `row.get('on')` measured throwing in exported code. GAM-025 closed, nothing built. ~~(s13, from the sweep) R8's A means moving 265 sites, 151 of them untested, and changes what `record.data` means on a `data` column, while `row.get('on')` already reads the field. Choose A as ruled, A′ (keep `data` and the engine's names reserved), or D (keep the trap and name `row.get(…)` in GAM-007's warning and error). Recommended: D~~ | [GAM-025](GAM-025-A-ROW-FIELD-NAMED-ON-READS-AS-THE-DATA.md) §7 |

**These wait on a measurement first. Asking them early is asking on a guess:**

| # | asked only if | task |
|---|---|---|
| R2 | ✅ **Ruled s17: fake it like a page (option 1), built.** ~~measured, now askable (session 6):~~ AC1 and AC2 both point at the extractor, not the kit. How honest must the extractor's environment be? §5 option 1 is a plain `Noodl` shaped like the page; option 2 keeps the Proxy but answers `undefined` for the SDK names | [GAM-018](GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md) |
| R5 | **Moot (s17):** GAM-004 closed as not reproduced, so there is no mechanism to rule on | [GAM-004](GAM-004-A-GATE-READS-THE-VALUE-FROM-THE-SAME-TURN-AS-ITS-SIGNAL.md) |
| R13 | ✅ **measured, now askable (session 2):** the tracker is the cause, as three faults (a no-op Focus is recorded, a recorded node is never refocused, Blur is inverted). Should it exist at all? | [GAM-012](GAM-012-A-FIELD-FOCUSED-AS-ITS-ROW-APPEARS-HAS-THE-CURSOR.md) §8 |
| R14 | ~~AC1 finds the door wrote no visual root: refuse, warn, or treat an unknown root type as visual?~~ **Moot (s15):** AC1 excluded (A); the door writes the root | [GAM-014](GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md) |
| R19 | a true positive of the rule turns out to have an item root the check cannot resolve | [GAM-022](GAM-022-A-WRAPPED-ROW-OF-PILLS-IS-NOT-TOLD-TO-BECOME-COLUMNS.md) |
| R21 | the MCP kit extractor cannot be reused for module node types | [GAM-024](GAM-024-THE-DEPLOY-CENSUS-REPORTS-ONLY-REAL-DROPS.md) |

**No ruling:** [GAM-019](GAM-019-A-WIRE-TO-AN-INPUT-A-BUILT-IN-NODE-DOES-NOT-HAVE-IS-REFUSED-AT-THE-DOOR.md) and
[GAM-021](GAM-021-A-PLAN-IS-NOT-WARNED-ABOUT-THE-SCROLL-SETTING-IT-IS-ABOUT-TO-APPLY.md).

## 5. Tasks

### Track A — the screen is wrong and nothing says so

| id | task | row | depends on |
|---|---|---|---|
| [GAM-001](GAM-001-AN-OPTIONAL-PORT-LEFT-UNSET-SHOWS-THE-PART.md) 🟢 | An optional port left unset shows the part | D55 | R3 (s11: an Expression evaluates at load over unset inputs, and `Evaluate At Load` is a ticked node-level checkbox. A throw, a compile failure or a `NaN` over unset inputs leaves it abstaining. AC1 RED at HEAD through Group's real Mounted setter. 4 reverted arms (2/1/1/2; G4's second red explained). AC5 census: 14 first-frame visibility changes by name, `cdShown` not among them. **Left:** AC4/AC6 on Rocket School (the peer's), rendering the corpus both ways, bundles) |
| [GAM-003](GAM-003-A-METER-COMPUTED-BY-AN-EXPRESSION-LOADS-WITHOUT-AN-ERROR.md) 🟢 | A meter computed by an Expression loads without an error | D62 | R3 (s11: a `null` or `NaN` size, bare or merged, clears silently, and `"tall"` is still refused. AC1 RED at HEAD with the register's message, and a computed `NaN` arrives bare. AC2 explained by the first-update consolidation (G4). Reverted arm 4 red. FLD-004's `NaN` row changed as ruled. AC6: 0 sites. **Left:** AC5 browser, AC7 on Rocket School) |
| [GAM-006](GAM-006-A-COLOUR-SWITCHED-BY-STATES-REACHES-THE-SCREEN.md) 🟢 | A colour switched by a States node reaches the screen, with transitions on | D49 | R7 (s3 `82a7d3775`; s4+s5 `062dfd9c0`: (a) one colour reader, (b), AC7, AC4, and in a real browser AC3 + AC5 on FilterPill and Story/Passage beside the old and a reader-bypassed runtime, AC6's TPL-005 half. TPL-006's pin removed `1cf0a81d2`. **Left:** Rocket School's `chStates` not driven, pins stay with P87; D49's register line) |
| [GAM-005](GAM-005-TWO-COPIES-OF-A-COMPONENT-KEEP-THEIR-OWN-STATE.md) 🟢 | Two copies of a component keep their own state, or the author is told they will not | D57 | R6 (s7: doctrine + `variable-in-repeated-component`, AC1–AC4 graded with reverted arms, 19 findings all intended, TPL-003/005/006 marked. **Left:** AC5 browser, AC7 repeater `id`, site-builder marks, MCP bundle) |
| [GAM-007](GAM-007-A-DATA-FIELD-CALLED-ON-READS-AS-DATA.md) 🟢 | A data field called `on`, `get` or `data` reads as the data | D64 | R8 (s8: B built. The door warns `reserved-row-field`, `Collection.set` raises `collection/reserved-field-name`, and the 24-name list is read off the runtime and pinned to it. AC1–AC4 graded with 5 reverted arms, AC3 census 0 hits. **Left:** the browser halves of AC1 and AC5, and AC7 (Rocket School's gate, the peer's)) |
| [GAM-025](GAM-025-A-ROW-FIELD-NAMED-ON-READS-AS-THE-DATA.md) ✅ | A row field named `on` reads as the data | D64 | **Closed by R22 (s16): rename it, nothing built.** `row.get('on')` reads the field in the runtime and throws on an exported plain row. (s13: AC2's sweep is measured and nothing is moved. **265 internal sites in 44 files, 151 reached by no test**, found by a static checker pass and a trace of the trap, with three suites green under it. Two more tiers cannot move: engine reads (`toJSON`, `toString`, `valueOf`) and shipped scripts (`m.data`, `getId()`, `set`, `Component.Object.on`). `record.data` is published, and **`row.get('on')` already reads the field**, measured. **🔒 R22**) |
| [GAM-009](GAM-009-WHAT-SOMEONE-TYPED-IS-STILL-THERE-WHEN-THE-FIELD-COMES-BACK.md) 🟢 | What someone typed is still there when the field comes back | D61 | R10 (s9: typing writes the start value, and a remount announces only what it has not announced. AC1 RED at HEAD, and the remount also overwrote the Value output. AC3's 3 reverted arms, AC4, AC5's census of 90 fields with 36 wired both ways. AC2 driven in a browser: old and sab `""`, new `Tom`. **Left:** AC2's Rocket School clause and AC6 (P87's drive reached no cell; `rsNameKeep` is the peer's). 🔒 Should an absorbed `Set` decide what a remount shows?) |
| [GAM-008](GAM-008-A-BAR-THAT-JUMPS-THEN-GLIDES-REFILLS.md) 🟢 | An animated value asked to jump and then glide does both | D67 | R9 (s10: AC1 isolated the cause. The setter gets both targets in one pass and they collapse to a glide; "one target" and "duration 0 is not a jump" are both excluded, and a jump needs two frames. Built: `Jump To` + `Jump Value`, which carry on towards Target Value in either order, and a jump is not an arrival. C in the ports, the enrichment and a spliced catalog. 4 reverted arms (2/5/1/1), 7 export A4 rows + CONTROL, census 6 instances, 0 collisions. AC5 driven in a browser on a minimal page: new is full in ≤32 ms on every press, and old and sab never refill. HLS-001's golden moved 2 lines, counted first. **Left:** AC2, AC5 and AC6 on Rocket School (the peer's), the export hook's jump, and an MCP bundle) |
| [GAM-002](GAM-002-STRING-AND-NUMBER-WORK-INSIDE-AN-EXPRESSION.md) 🟢 | `String(n)` and `Number(s)` work inside an Expression | D54 | R4 (s11: A, with a lexer in place of the regex, since no parser ships. AC1 RED at HEAD, 17 rows. 4 reverted arms (8/2/6/1). AC3 census: 386 Expressions, 517 wires, **0 lose a port**, so no migration; the runtime ignores a saved wire into a reserved name. The export carries a byte-identical copy. The catalog was spliced (Expression only). Found: two catalog examples using `Number(…)` threw at HEAD. **Left:** AC4 editor drive, the cloud runtime, the bundles, and AC6's Rocket School sites (the peer's)) |
| [GAM-004](GAM-004-A-GATE-READS-THE-VALUE-FROM-THE-SAME-TURN-AS-ITS-SIGNAL.md) ✅ closed, not reproduced (s17 ruling) | A gate reads the value from the same turn as its signal | D47 | s3: AC1 measured, **does not reproduce in the runtime** (13 arms incl. TPL-005's real `Game/Move` and the pre-FB-025 drain, beside a late arm that reads late). s6: **does not reproduce in a browser either** (TPL-005 with attempt 1 restored, real keys, beside an 80 ms arm that reads a move late). 🔒 Close as disproved? Richard |

### Track B — the graph is missing a basic

| id | task | row | depends on |
|---|---|---|---|
| [GAM-012](GAM-012-A-FIELD-FOCUSED-AS-ITS-ROW-APPEARS-HAS-THE-CURSOR.md) | A field focused as its row appears has the cursor, every time | D68 | isolation first |
| [GAM-010](GAM-010-A-BUTTON-CAN-BE-GIVEN-THE-KEYBOARD.md) | A Button can be given the keyboard | D59 | GAM-012 (same focus tracker), R11 |
| [GAM-011](GAM-011-A-FIELD-CAN-ASK-FOR-A-KEYPAD-AND-TAKE-A-TAPPED-KEY.md) | A field can ask for a keypad, and take a tapped key at the caret | D60 | GAM-009 (same node), R12 |
| [GAM-013](GAM-013-SOMETHING-CAN-HAPPEN-EVERY-SECOND-WITHOUT-A-SCRIPT.md) | Something can happen every second without a script | D40 | R1 |

### Track C — building a kit is a minefield

| id | task | row | depends on |
|---|---|---|---|
| [GAM-018](GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md) 🟡 | A kit registers the same whatever is installed beside it, and a kit that cannot register says so | D41 | s3: AC1 measured, **scan order** proven by a renamed-kit arm; **all 10 guarded kits fail alone** in the extractor. s6: AC2 measured. Confetti alone registers in a deployed page (where it draws) and in the SSR kit loader; the editor picker is read from source, not driven. **The extractor is the bug.** s17: R2 ruled, **built** (uncommitted): `entry.js`'s `Noodl` is the page's; 11 kits now register alone (10 guarded + `noodl-validation-module`, a silent zero), 0 lost, browser names identical; `get_project_info` names a kit that ran and registered nothing (AC6 MCP half). Left: AC6 editor half, AC7 |
| [GAM-014](GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md) 🟢 | A kit React node draws when it is the whole of a component | D53 | `bcfb1c2aa`. **s16: AC3 editor half read true** (preview draws Ada 96×96 beside Bea; save writes `["face"]` beside `["wrap"]`; the pre-registration save branch not driven). s15: **(C), the headless deploy.** The door writes `["face"]`, and `nodegx deploy`, whose node library never loads `noodl_modules`, shipped `roots: []`. Fixed in `NodeGraphModel.isVisualRoot`: an unresolved type answers from the file's recorded `visualRoots`. 3 reverted arms; Chromium draws Ada 96×96, 0 errors; AC5: 16 kit roots, all logic, 0 changed. **Left:** AC6 (TPL-007's wrap) |
| [GAM-015](GAM-015-A-WIRED-SIZE-REACHES-A-KIT-NODE-AS-A-SIZE.md) | A kit node reads a wired size as the size it was sent | D65 | R15; a separate commit from GAM-003 (same setter) |
| [GAM-017](GAM-017-A-KIT-NODE-TAKES-A-SIGNAL-AND-A-SIZE-THE-WAY-A-BUILT-IN-DOES.md) | A kit React node takes a signal and a size the way a built-in node does | D70 | R17 |
| [GAM-016](GAM-016-THE-FONT-A-PRESET-NAMES-IS-THE-FONT-THE-PAGE-DRAWS.md) | The font a preset names is the font the page draws | D69 | R16 |

### Track D — the doors spoke at the wrong times

| id | task | row | depends on |
|---|---|---|---|
| [GAM-019](GAM-019-A-WIRE-TO-AN-INPUT-A-BUILT-IN-NODE-DOES-NOT-HAVE-IS-REFUSED-AT-THE-DOOR.md) ✅ | A wire to an input a built-in node does not have is refused at the door | D66 | — (built 2026-09-14, `4bb438165`; §8 lists owed) |
| [GAM-023](GAM-023-A-DEPLOY-REFUSES-A-BROKEN-WIRE-AND-KEEPS-EVERY-GOOD-ONE.md) | A deploy refuses a broken wire and keeps every good one | D48 | ✅ R20 ruled s17: publish all, warn. Ports first, filter second. ⚠️ The title's "refuses" no longer matches the ruling |
| [GAM-024](GAM-024-THE-DEPLOY-CENSUS-REPORTS-ONLY-REAL-DROPS.md) | The deploy census reports only real drops | D44 + D52 | GAM-023 decides where the port pass lives |
| [GAM-020](GAM-020-A-SENTENCE-THAT-WILL-NEVER-WRAP-IS-FLAGGED-BEFORE-A-PERSON-SEES-IT-CLIPPED.md) | A sentence that will never wrap is flagged before a person sees it clipped | D58 | R18 |
| [GAM-021](GAM-021-A-PLAN-IS-NOT-WARNED-ABOUT-THE-SCROLL-SETTING-IT-IS-ABOUT-TO-APPLY.md) 🟢 | A plan is not warned about the scroll setting it is about to apply | D56 | — (s12: the plan door judges `page-cannot-scroll` against the `bodyScroll` the apply will leave, through the store's own never-overwrite merge. AC1 RED at HEAD at staging and apply for `page` and `app`; the true positive still fires. Reverted arm 2 red; TPL-007's pin changed and graded. AC7: the editor computes the same false warning at apply and surfaces it to nobody (read from source). AC8: `validate_project` unchanged over 11 V2 projects. The 8 whole-suite reds are attributed to HEAD) |
| [GAM-022](GAM-022-A-WRAPPED-ROW-OF-PILLS-IS-NOT-TOLD-TO-BECOME-COLUMNS.md) 🟢 | A wrapped row of pills is not told to become columns | D50 | — (s12: Arm B reads the `For Each` template's visual root, with the catalog default for an unset `sizeMode`; unknowable abstains, and no views means the row is judged alone as before. The three calibration grids all resolve with a width, so R19 is not needed. AC1 RED 9; reverted arm 9, wrong fix 10. Census 16 → 13: `Choice row`, `Question box` and `Story/Sidebar` silent, Rocket School's `Shelf` (132px) and `Profiles` (150px) still fire. TPL-006 pin `[]`, TPL-007 pinned by component. SBR-004's dropped nav gap was this defect. **Left:** AC7's render) |

## 6. Collisions

Each task's §4 has its own list, with links. These change what gets built:

- **P84 FLD-004 ✅** built the `not-a-dimension` refusal that D62 trips. GAM-003 must leave both FLD-004 specs green.
  FLD-004 did **not** change what a kit receives (GAM-015).
- **P30's node-library audit made three earlier decisions these tasks may overturn:**
  - NDA-017 and NDA-004: an Expression waits for its first input on purpose (GAM-001, GAM-003).
  - NDA-012: the global-name ports were filed and deliberately left (GAM-002).
  - The animation audit ruled the equal-target no-op correct (GAM-008).

  Each overturn is a ruling, not a side effect.
- **P18 EXP-011 export parity rows** already pin the broken States colour (`animation-pair.test.ts:600`) and the Animate
  To Value no-op. Any runtime change owes its export row in the same change (GAM-006, GAM-008, GAM-013, GAM-017 via P84's
  P40).
- **P80 DEF-028 ✅** named D48's hole in its own §3 (the health pass does nothing on an unregistered module). P77's D13
  row still reads `NONE`, which is stale and is owed an edit pointing at DEF-028.
- **P80 DEF-002 ✅** never touched `nonexistentPort`, which is why D66 escapes (GAM-019).
- **P85 CMP-001** owns the interface doctrine text and its gate (GAM-005, GAM-001). **P41 ACC-001/ACC-004** own the
  focus ring and focus on route change (GAM-010, GAM-012).

## 7. Rules every task inherits

- 🔴 **Reproduce RED at HEAD first.** Scoping already found twelve rows wrong about their own mechanism.
- 🔴 **A fix without a reverted arm is not graded.** Restore the defect, and exactly the test that owns it goes red.
- 🔴 **An absence is only a finding beside a known-firing signal.** A census that drops nothing and a census that
  never ran are byte-identical (D52).
- **Grade the person sentence where a person meets it:** a deployed page, the editor, or the door's output to an agent.
- **A changed default or a new diagnostic measures its blast radius first**, over `library/prefabs`, the library
  modules and every template in `templates/`.
- **Remove the workaround, or say why it stays.** Rocket School, TPL-005 and TPL-006 each carry workarounds and gates
  that pin them. ⚠️ Some workarounds lean on the defect: Rocket School's `cdShown` stays hidden *because* of D55's
  `null`, so fixing GAM-001 shows the countdown by default.
- **Evidence two rows depended on is gone:** D53's kit-rooted `nodes.json` and D47's two failing attempts were never
  committed. Those tasks rebuild a fixture in AC1.
- **One heavy job at a time.** Drives, jest suites and generators run one at a time on this machine, and each is
  chained with its own `<NAME>_EXIT=` line in a log.
- 🔴 **Do not scope by time.** Dependency order only, and no estimates.

## 8. The end condition

This phase closes when every row is either **fixed, graded by a reverted arm, and its template workaround removed or
kept with a reason**, or **measured and disproved, marked in the register**. The register's owner cell for each row
names its GAM task, and its status cell says which of the two happened.
