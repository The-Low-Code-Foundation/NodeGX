# STY-006 — Where it's used

> **STY-DESIGN §8:** *"**Where it's used** — a Look names what wears it and takes you there."*

**Written at s9, 2026-09-19.** There was no task file; this is it, scoped off STY-DESIGN §8 and
what STY-005 actually shipped — the same way s8 wrote STY-005's.

🔴 **Build from [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md) §8, not README §5.**

---

## 1. What is already true, and what is missing

STY-005 shipped the **count**. Every row in the Styles panel — colour style, text style, Look —
prints `3×` or `unused`, and the number is correct: `styleUsageIn` is one walk over the project
(`StylesModel.usage.ts`), and `ProjectModel.variantWearerCounts` is the same question for Looks.
The count is also what the two delete-confirm modals read, and what disables a Look's **Delete**.

**What is missing is the second half of the design's sentence: `and takes you there`.**

A number is an assertion a person cannot check. `Grey - 700` says `9×` and there is no way, from
that panel, to find out which nine — you go hunting through components, which is the *"managing it
through the nodes is a nightmare"* that opened this phase. The count tells you a style matters; it
does not tell you where it matters, and it is exactly as useless when it is wrong.

🔴 **And it can be wrong in a way only this task can catch.** The count and the list are the same
question asked twice. If they are two walks, they drift ([[a-second-copy-of-a-palette-drifts-silently]]
— the reason `TextStylePicker/utils.js` was made to delegate at s8). So this task does **not** add a
second walk beside `styleUsageIn`; it **widens the existing one to return identities and derives the
count from the list**, which is the only shape in which "9×" and the nine lines under it cannot
disagree.

## 2. What it is

Pressing a row's count opens, **inline under that row**, the list of what names that style — and
pressing an entry in the list **switches the canvas to that component and selects that node**.

🔴 **Inline, not a popup, and that is a decision with a reason.** The obvious build is a
`ContextMenu` off the count — the panel already draws one per row. But `ContextMenu` → `MenuDialog`
→ `BaseDialog` reads `document` in a `useState` initialiser and **there is no jsdom in this repo**,
so a popup list is a surface no gate in this package can read; s8 had to stub the `⋯` away and carry
R6 on a CSS assertion and a drive instead. An inline disclosure renders under `renderToStaticMarkup`,
so **what the list says is gradeable** — and the expansion is held by the *section*, not the row, so
the row is a pure function of its props and a test can render it open.

🔴 **A wearer is not always a place.** A style is named by **nodes**, which are somewhere on a
canvas, and by **Looks**, which are rules. `describeUsage` already keeps those apart in the
delete-confirm sentence for that reason. A node entry is pressable and takes you there; a Look entry
is listed and is **not** pressable, because there is nowhere on a canvas to go — it says the Look's
name and that the Look is what sets it. Drawing a Look entry as pressable and landing nowhere is the
failure this paragraph exists to prevent.

## 3. Acceptance criteria

| # | criterion | closes on |
|---|---|---|
| **AC1** | **The walk returns identities, not just counts.** `styleWearersIn(project, portType)` returns, per style name, every node that names it as `{ componentName, nodeId, label, typename }`, plus every Look that does. `lookWearersIn(project, typename)` answers the same for a Look's wearers. | `tests-unit/sty-006` |
| **AC2** | 🔴 **The count IS the list's length.** `styleUsageIn` and `ProjectModel.variantWearerCounts` are both derived from the wearer walk — there is no second traversal anywhere, and a test proves a project whose row says `N` has exactly `N` entries under it. | `tests-unit/sty-006` |
| **AC3** | **The count is a door when there is something behind it.** A row with usage > 0 draws its count as a pressable control; `unused` is **not** pressable and has no disclosure. | `tests-unit/sty-006` |
| **AC4** | **The list says where in a person's words** — the component's display name and the node's label, never an id. A node with no label of its own prints its type (`Text`, `Button`), not `net.noodl.text`. | `tests-unit/sty-006` |
| **AC5** | **A node entry takes you there** — the canvas switches to that component, that node is selected and centred. A **Look** entry is listed and is not pressable. | drive |
| **AC6** | **The Looks section does it too** — the task is named after a Look and the Looks section must not be the one that only counts. | `tests-unit/sty-006` + drive |
| **AC7** | **Driven in the real app, both themes**: open a style's list, read the real wearers off the rendered elements, press one, and read the canvas's active component and selection **after**. 🔴 The press is graded on the **consequence** (which component is active, which node is selected), never on the entry having been clicked. | `scripts/devtools/drive-sty006-wheres-it-used.js` |
| **AC8** | **Richard's look.** `shots/sty006-used-by-{dark,light}.png`. | Richard |

## 4. Out of scope

- **Any change to what the count means.** STY-005 ruled it: a node counts once however many of its
  ports name the style. This task shows that node once, for the same reason.
- **Searching or filtering the wearer list.** If a style has ninety wearers the list is long; that is
  a real question and it is not this one. (🔴 But it is a *looking* question, so the drive must put a
  high-count style in the shot rather than only `1×` rows — see [[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]].)
- **Taking you to a Look.** A Look entry names the Look; scrolling the panel to it is a different
  affordance and is not ruled.
- **The two s7 defects** (STY-003 §2f — a node holding a `VariantModel` that is not the project's,
  and `nodegx.styles.json` going unwritten). Neither blocks an AC here. ⚠️ But the first one **bounds
  what AC6 can claim**: `variantWearerCounts` matches a wearer **by name and typename**, not by
  object identity, so a node holding a ghost `VariantModel` with the right name is listed and the
  list is right about the name. The wearer walk matches the same way **on purpose**, so the list and
  the count cannot part company over a defect neither of them caused.

---

## 5. What s9 built, and the decisions inside it

### The walk was WIDENED, not duplicated
`StylesModel.usage.ts` now holds `styleWearersIn` and `lookWearersIn`, which return identities;
**`styleUsageIn` is a `.length` over the first and `ProjectModel.variantWearerCounts` is a `.length`
over the second.** Both counting functions kept their signatures and every caller — the two
delete-confirm modals, `PickVariantPopup`, `variantseditor`, `TextStylePicker/utils.js` — is
untouched. `tests-unit/sty-005`'s nine counting assertions stayed green across the rewrite, which
is the reading that says the derivation is the same answer.

🔴 **`forEachNode` stops on a truthy return, and `Array.prototype.push` returns the new length.**
The new bodies push into arrays, so the naive `return list.push(...)` is not a hypothetical — it is
the shortest way to write this function and it reports exactly one wearer for every style in the
project. Armed and measured: making both walks return their `push` turned **5 named arms red**
(`keeps every wearer`, `the number a row prints equals the number of entries`, and three Look arms),
and reverting returned 18/18. [[foreachnode-stops-on-a-truthy-return]].

### The list is INLINE and the open row is the section's state
Not a `ContextMenu`: `MenuDialog` → `BaseDialog` reads `document` in a `useState` initialiser and
there is no jsdom here, so a popup list is ungradeable in this package — s8 had to stub the `⋯`
away for exactly this reason. Inline renders under `renderToStaticMarkup`. And the open/closed state
lives in the **section** (`useOpenUsageRow`), not the row, which is what lets a spec render a row
*open* and assert what it says; a row holding its own state could only ever be read by a drive.
One list open at a time, because the rail is narrow.

### A wearer is not always a place
Node entries are `<button>`s and navigate. **Look entries are not buttons** — a Look is a rule with
nowhere on a canvas to go, and an entry that draws as pressable and lands nowhere teaches a person
the whole feature is broken on the first one they hit. Asserted both ways in `styleRowWearers.test.tsx`.

### 🔴 The drive CONSTRUCTS the case AC6 needs, and says so
Measured across every project on this machine: exactly **one** (`members area Richard test`) has a
Look that anything wears, and it has **zero** colour styles and zero text styles. The STY-005 drive
fixture is the mirror image — nine colour styles, two text styles, and a Look (`S27Variant`, type
`nodegx.grow.Gamma`) that **nothing wears, because the project contains no node of that type at
all**. So no project exercises both halves, and an AC6 arm run against either grades an empty
population. The drive therefore creates a Look through the product's own door
(`createNewVariant` + `setVariant` — what STY-003's *"save this node's styles as a new Look…"*
calls), puts it on Text nodes in **two different components**, and **reports that it did**. The same
move s7 made taking over `fontSize` to make an *overridden* field exist.
[[assert-an-absence-with-a-known-firing-signal-beside-it]].

🔴 **CORRECTION, measured: this DOES reach disk.** The first version of this section, and of the
drive's own comment, said the fixture was untouched. The editor autosaves — `Project saved` fired
mid-run and the sidecar now holds `Drive Look` with three wearers in `Pages/Home`,
`Components/TrustItem` and `Components/ProductCard`. Caught by `stat`-ing the file and reading it,
not by re-reading the plan. It is left standing on purpose: it is the worn Look no project on this
machine had, and the setup is **idempotent** — every later run finds it and reports *"the project
already carries a worn Look"*. ⚠️ Anyone reading `shots/sty006-used-by-*.png` should know the Look
called **`Drive Look` was made by the drive**, not shipped with the fixture.

### 🔴 The press is graded on the canvas, after navigating AWAY first
The failure this task can have is an entry that is pressable, fires its handler, and lands nowhere.
So the drive reads the **active component and the selected node id** before and after every press —
and before pressing, it switches the canvas to a *different* component and **asserts it got there**.
Without that control the arm passes against a completely dead handler, because the answer was
already on screen. [[a-rule-reading-zero-in-both-arms-grades-nothing]],
[[verify-the-consequence-not-just-the-mechanism]].

### Gate readings at s9
| gate | reading |
|---|---|
| `npm run test:main` | **514 suites / 8,223 tests, exit 0, zero FAIL** (final, end of s9). s8 was 510/8,161. ⚠️ The delta is NOT all mine — this task adds 3 suites and 44 tests; the rest arrived from peers during the session, so do not read 514 as a number this task owns |
| `tsc -p tsconfig.json --noEmit` (noodl-editor) | **exit 0, zero output** |
| `tests-unit/sty-006` | **3 suites / 44 tests** — wearers, format, styleRowWearers |
| `tests-unit/sty-005` | **38/38, unchanged** across the walk rewrite |
| mutant arm | `push` returned from both walks ⇒ **5 named failures**; reverted ⇒ 18/18 |
| `drive-sty006-wheres-it-used.js` | 🟢 **28/28 graded arms, exit 0**, dark + light, 1 ungraded and named |

---

## 6. 🔴 The defect the drive found, which no gate in this package could

**Pressing a wearer entry navigated to the node correctly and then destroyed the list it was
pressed in.** The sidebar came back reading **Components**, so a person working through nine
wearers lost the list on the first one and had to reopen the panel and the row eight more times.

Every `tests-unit/sty-006` assertion was green throughout: they grade a walk over a fake project
and a component rendered by `renderToStaticMarkup`. **Nothing in this package can see a sidebar.**
The arm that caught it reads `SidebarModel.instance.ActiveId` *after* the press —
[[verify-the-consequence-not-just-the-mechanism]], applied to a consequence one surface away from
the one under test.

### It took THREE fixes across one chain, and the first two measured identical to no fix at all

🔴 **CORRECTION to an earlier version of this section, which said two fixes closed it.** They did
not. After both, the drive still read `sidebar is "components" after the press` — a reading
unchanged from before either fix. What finally settled it was not another guess about which call
was responsible but **wrapping `SidebarModel`'s own methods in the running editor and reading the
stack**:

```
hidePanels(undefined) from: SelectionActions.deselectNow < eval < SelectionActions.settle
switch(components)    from: SidebarModel.hidePanels < ... < SelectionActions.deselectNow
```

That is `selectNode`'s *own* `this.clearSelection()` — a **third** site, inside `settle`, a few
lines above the `switchToNode` the flag was guarding. Three call sites clear a selection on the way
to a navigated node; the flag reached one of them. → [[a-predicted-sentence-belongs-to-one-code-path]]
— a predicted sentence belongs to one code path, and I predicted it of two wrong ones in a row.

**All three guards are load-bearing.** The instrumented run logged exactly *one* `hidePanels`
because fixes 1–2 had already silenced their own; removing either puts it back.


1. **`useGoToWearer` now passes `keepSidePanel: true`.** The flag already existed for exactly this
   case — `SelectionActions.selectNode`'s own comment says *"unless the selection came from a
   panel, which would then be replacing itself"* — and this selection came from a panel.
   ⚠️ The context's `NodeGraphControlSwitchOptions` **did not declare it**, though every option is
   forwarded verbatim to `NodeGraphEditor.switchToComponent`, which has accepted it all along. A
   caller reaching the canvas through the context could not name the flag without a `tsc` error.
   Widened, with the reason written down.

2. 🔴 **`switchToComponent` only honoured the flag on ONE half of the chain.** It does
   `clearSelection()` and *then* `selectNode(node, { keepSidePanel })` — and `clearSelection` →
   `deselect` → **`SidebarModel.instance.hidePanels()`**, which switches the sidebar to
   `previousActiveId` or falls back to `components`. So the panel was swapped out by the deselect,
   one line *before* the call the flag was guarding, and then simply never swapped back.
   **With fix 1 alone the reading was byte-identical to the flag not existing** — the drive said
   `sidebar is "components" after the press` both times. `clearSelection` takes
   `{ disableHidePanels: true }`; it is now passed when `keepSidePanel` is set.
   → [[two-gates-covering-the-ends-of-a-chain-read-as-coverage]].

3. 🔴 **`SelectionActions.selectNode` clears the selection again, inside `settle`, with no
   arguments** — and *this* is the call the instrumented run caught raising `hidePanels`. It now
   passes `{ disableHidePanels: true }` when `options.keepSidePanel` is set.

⚠️ **And the run that appeared to disprove fix 1 was reading a STALE BUNDLE.** Fix 1 had a `tsc`
error at the time (the context type above), webpack `compiled with 1 error`, and the drive ran
against the previous bundle. The log line that said `compiled successfully` was an *older* one — a
`tail | grep` for it matches history, not the compile you are waiting for. Wait from a recorded
line number. → [[a-commit-is-not-what-the-compiler-read]], [[a-run-list-is-not-a-log]].

## 7. Two instrument faults that read exactly like product defects

Both cost a run and both produced a plausible-looking finding about the product.

1. **`scrollIntoView` scrolled the DOCUMENT, not the panel's scroller.** The whole editor moved up,
   the panel's `getBoundingClientRect` went off-screen, `elementFromPoint` returned nothing for all
   nine entries — reported as `0 reachable`, which reads precisely like a list drawn behind
   something — and the captured clip was a **40px blank square** saved and named like a real shot.
   The drive now moves the panel's own scroller and puts the document back, **and grades the clip**
   so a shot of nothing can never pass silently again. → [[a-rect-is-not-visibility]].

2. **The second run read the state the first one left.** The door is a toggle, the theme loop left
   the Colours list open, and the next run's "press the count" click **closed** it —
   `AC5 — pressing the count opens the list: FAIL`, a drive reporting its own previous run as a
   defect. Every open is now `ENSURE_OPEN`, which reads `aria-expanded` first, and the reopen
   before AC6 checks `ActiveId` rather than clicking the rail button unconditionally.
   → [[a-post-drive-control-reads-the-state-the-drive-leaves]].

### 🔴 This completes P93 TVW-004's fix — relay it, it is their mechanism

`keepSidePanel` is **TVW-004's**, built for the *identical* symptom: *"the screenshot showed the
Properties panel where Layers had been … the tree removes itself on the first click in it."* Their
fix threaded it *"through `switchToComponent` → `selectNode`"* — and that is exactly the half that
was covered. It held for them because a Layers click usually selects **within the component already
on the canvas**, and `switchToComponent` only reaches its `clearSelection()` on the path that takes
an `args.node`. **Cross-component navigation defeats it**, and STY-006 is cross-component by nature:
its whole job is taking you somewhere else.

So `keepSidePanel` now means what TVW-004's own sentence says it means, in the case they did not
have. ⚠️ **The only other caller passing the flag is `SelectionStoreBinding.ts:73` (TVW-004's own),
and the change is inert for everyone else** — `clearSelection(undefined)` is byte-identical to the
old `clearSelection()`. Worth a line to P93 all the same: a guarantee that held for one path now
holds for both, and their drive never exercised the second.

⚠️ **The same door is used unguarded by `ComponentsPanelNew/showUsedInPopover.ts:37`
(`navigateToInstance`, TVW-001's *Used in* list) — it passes no `keepSidePanel`.** Not fixed here
and not a blocker for any AC in this phase: its symptom is invisible because `hidePanels()`'s
fallback is `components`, which is the panel that popover was opened from. Filed, not farmed.
→ [[build-the-tasks-do-not-farm-the-defects]], [[a-finding-may-already-be-another-tasks-acceptance-criterion]].


### 🔴 A third instrument fault, and it was not this machine's fault at all

**A PEER SESSION was driving this editor.** Their own `dev:debug` died with **exit 144 — the
single-instance lock** — so `cdp.js` attached to whatever held port 9222, which was *my* Electron;
between ~21:50 and ~22:20 they opened a different project in it and reloaded the renderer three
times. From my side that looked like: a bundle reporting `false` for a fix that `tsc` and webpack
both said was in, a panel that "moved" between runs, and an arm that passed and then failed with no
code change. **Three runs of this drive were chasing that.**

Only a message from the peer settled it. The drive now **refuses to run against an editor this
session cannot prove it owns** — it walks the PPID chain of whatever is `LISTEN`ing on 9222 and
requires a shared ancestor with the script.

⚠️ **And it fails CLOSED.** The peer wrote the same check first and it failed open: their CLI was
eleven hops up and their loop stopped at twelve, so *unattributable* was allowed through exactly
like *mine*. **An owner the check cannot name is not an absent one** — `lsof` missing, `ps`
refused, nothing listening, all refuse. The cost of refusing wrongly is one relaunch; the cost of
proceeding wrongly is a session of defects that are not defects.
⚠️ Also `require.main === module` on the drive, because the peer's `node -e "require('./drive…')"`
— meant as a syntax check — *ran* it. `node --check` is the syntax check.
→ [[a-stray-chrome-steals-the-cdp-port]] (updated with this, the mirror case).


## 8. The drive's reading — AC5, AC6 and AC7 closed

**28/28 graded arms, exit 0**, both themes, against a COPY (`STY-005 Panel Drive`).
`scripts/devtools/drive-sty006-wheres-it-used.js`; arms JSON in the s9 scratch.

The arms that carry the task, with what they measured:

- **AC2 in the real app** — `Grey - 700` says `9×` and drew **exactly 9** entries; the number and
  the list were both checked against `styleWearersIn` read out of the model, not against each other.
- **AC1** — every one of the nine entries named a node the model found, *in the component the model
  found it in* (`/Date Picker` ×2, `/Filters/{Checkbox,Date Filter,Multi Choice,Range,Single
  Choice,Slider,Text Search}`).
- **AC4** — no entry printed an id or a `net.noodl.*` typename. What they printed: `Icon`,
  `Date Picker`, `LABEL`, `Type at least 3 characters` — node labels, with the component beside each.
- **AC3, with its control** — 12 of 101 rows carried a pressable count (the control: an "unused is
  not pressable" claim is vacuous in a panel where nothing is pressable), 1 `unused` row not
  pressable, and **0 of 88 token rows** grew a door.
- 🔴 **AC5, graded on the canvas after moving away first** — canvas moved to `/App` and *asserted*
  there (`component=/App, selected=[]`), then the press: `before=/App → after=/Date Picker`, and
  `selected=[69ba2fa5…]`, the entry's own node. The switch alone would have passed on a dead
  selection; both halves are separate arms.
- 🔴 **AC5's panel-survival arm** — `sidebar is "styles" after the press`. This is the arm that was
  red for four runs and found the three-guard defect in §6.
- 🔴 **AC6** — the Look row read `Drive Look: 3×, button=true` against the model's 3, drew all three
  wearers, and pressing one moved `/App → /Pages/Home` with `probe-text` selected.
- **AC7** — 9/9 entries reachable by hit test in **both** themes, and the shot's clip graded sane
  (`346×758`, not the 40px blank square an earlier run saved and named like a real shot).

⬜ **One arm is UNGRADED and says so**: "a Look in the list is NOT pressable" — the style under test
is worn by no Look, so that population is empty and a green there would be a lie. The claim is
carried by `styleRowWearers.test.tsx` instead, which renders the case directly.

🔴 **AC8 is Richard's**: `shots/sty006-used-by-{dark,light}.png`.


## 9. Richard's rulings, 2026-09-19 (s9)

Both asked off the shot, both answered before anything was built on a guess.

1. **The wearer entries need no visible "pressable" cue — hover is enough.** Asked because the
   count above them carries a dotted underline and the nine entries below carry nothing, and
   [[correct-and-usable-were-never-the-same-criterion]] has already been the lesson of this phase
   four times. An always-visible arrow and an accent-coloured label were both offered and both
   declined. 🔴 **So the absence of a glyph on those rows is RULED, not an oversight** — a later
   session must not "fix" it.

2. **`Drive Look` stays in the `STY-005 Panel Drive` fixture.** It is the only project on this
   machine that now exercises a worn Look *and* colour styles at once, and the drive's setup is
   idempotent — later runs find it and make nothing. ⚠️ It is still the case that the drive made
   it, not the fixture's author; §5 says so and the shot should be read with that in mind.
