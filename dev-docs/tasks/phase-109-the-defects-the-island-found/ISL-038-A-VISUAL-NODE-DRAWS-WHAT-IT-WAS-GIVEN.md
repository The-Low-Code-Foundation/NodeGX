# ISL-038 — A visual node draws what it was given, every time

**Status: ✅ CLOSED s29 (2026-10-08): 15 of 15 fixed.** s29 landed the Group's six — C87 + C89 (`31c78fe6e`), C88 + C90 (`9e4c79935`), C86 + C95 with the Group spec v3 (`3364b47f6`) — then C83 (`c335f5d90`) and C81 as ruled "the zone tracks itself" (`52fdaf088`), each graded on the runtime at two seeds with a control (§10). s28: C82 + C84 + C85 (`f2d9d349b`), C94 (`2dc8fd90d`), C91 (`dd71d0d83`), C92 (`4a48f6eb7`). s27: C93 (`fe5ebfab5`). Scoped 2026-10-07 from P107 R16 ("Hand all to P109, C93 first"). P107's later rows on the Drag (C101–C106) and the Component Stack (C107–C114) were handed over after this task was scoped: a new task, not this one. **Source:** 14 bugs from the ledger: 1 high · 8 medium · 5 low. **Side:** noodl-viewer-react (Image,
Shape (`Circle`), Group, drag and drop, file drop)

## 1. The person sentence

**A picture, a shape and a box draw what the app gave them however often they redraw, a wrong-kind value never stops a drag
or a drop, and a drop lands where the person can see it would.**

## 2. Why these belong together

P107 NSP-016 rendered the Text, the Group, the Shape and the Image as a person meets them and drove them, file drops and drag
and drop included. Each node it reached left rows. An Image under a sub-path breaks at its second render (C93). A wired
number in Accept Kind, Zone Name or Accepted file types kills the drag or loses the drop (C82, C84, C85). A Group with an empty
Tag crashes the page (C87). Drop Index counts an element the person never sees as a slot (C88, C91). Ruled to P109 as one hand-over
(R16, [P107 README](../phase-107-the-node-says-what-it-does/README.md)), so they share a task. The Text's own drag rows C77–C79
stay in [ISL-031](ISL-031-A-CONTROL-SHOWS-AND-REPORTS-WHAT-THE-PERSON-DID.md).

## 3. The bugs

Worst first, generated from the ledger headers. **The ledger file is the source**: each holds the measurement, the
reproduction and a proposed fix. "As proposed" means the bug's own fix is a repair with one obvious reading (a throw, a crash, a
value read one way in two places): build it. "Ask first" means the fix changes what a person sees in a way that has more than
one reasonable answer: ask it in plain words (§5) before building.

| bug | severity | status | build | what a person sees |
|---|---|---|---|---|
| [P107-C93](../../bugs/p107-c93-an-image-adds-the-base-url-again-at-every-render.md) | high | fixed `fe5ebfab5` | as proposed | An Image in an app served from a sub-path adds the Base URL to its source again at every render — /x/a.png becomes /x/x/x/a.png in the first frame, and the picture breaks |
| [P107-C81](../../bugs/p107-c81-a-file-drop-zone-stays-lit-after-the-drag-leaves.md) | medium | fixed `52fdaf088` | ruled: the zone tracks itself | A file drop zone stays lit (Is Dragging Over true) after the drag has left, when its element was replaced under the drag or Accept File Drops was switched off during it |
| [P107-C82](../../bugs/p107-c82-a-file-drop-is-lost-when-accepted-file-types-is-not-text.md) | medium | fixed `f2d9d349b` | as proposed | A file drop is lost with nothing said when Accepted file types holds a value that is not text (a wired number, an object) — the drop handler throws before File, Files Dropped or Files Rejected |
| [P107-C84](../../bugs/p107-c84-a-drag-dies-at-a-zone-whose-accept-kind-is-not-text.md) | medium | fixed `f2d9d349b` | as proposed | A drag dies at a drop zone whose Accept Kind holds a value that is not text (a wired number, a list) — a pointer drag never ends and blocks every later drag; a keyboard pick-up starts in no zone |
| [P107-C85](../../bugs/p107-c85-a-drop-never-ends-on-a-zone-whose-zone-name-is-not-text.md) | medium | fixed `f2d9d349b` | as proposed | A drop on a zone whose Zone Name holds a value that is not text fires Dropped and then never ends — the zone stays lit, the card stays lifted, and no other drag can start |
| [P107-C87](../../bugs/p107-c87-a-group-whose-tag-is-empty-crashes-its-render.md) | medium | fixed `31c78fe6e` | as proposed | A Group whose Tag arrives empty (or null, 0, false) throws while React draws it, and the page stops drawing |
| [P107-C88](../../bugs/p107-c88-a-scrolling-group-counts-its-scroller-as-its-only-child-for-drop-index.md) | medium | fixed `9e4c79935` | ruled: count the cards | A Group with Enable Scroll on and Native platform scroll off reports Drop Index as if it had one child — a card dropped from the keyboard lands at 0 or 1, whatever the Group holds |
| [P107-C90](../../bugs/p107-c90-a-scrolling-group-with-block-pointer-events-fires-no-click.md) | medium | fixed `9e4c79935` | ruled: let the list's taps through | A Group with the JavaScript scroller (Enable Scroll on, Native platform scroll off) and Block Pointer Events on never fires Click — on itself or from a child |
| [P107-C92](../../bugs/p107-c92-a-polygon-or-star-with-a-huge-points-value-runs-the-page-out-of-memory.md) | medium | fixed `4a48f6eb7` | ruled: cap at 500 | A Shape set to Polygon or Star with a huge or infinite Points builds that many vertices, and the page runs out of memory |
| [P107-C83](../../bugs/p107-c83-a-card-carried-from-the-keyboard-drops-into-a-zone-that-has-left-the-page.md) | low | fixed `c335f5d90` | as proposed | A card carried from the keyboard is dropped into a drop zone that has left the page (Mounted off), and the zone stays lit while it is gone |
| [P107-C86](../../bugs/p107-c86-a-click-on-a-group-after-a-tag-change-counts-as-a-click-elsewhere.md) | low | fixed `3364b47f6` | as proposed | After a Group's Tag changes, a click on it counts as a click somewhere else — it fires Focus Lost instead of Focused, until the Group leaves the page and comes back |
| [P107-C89](../../bugs/p107-c89-native-platform-scroll-wired-a-value-that-is-not-true-starts-the-scroller-on-unwrapped-children.md) | low | fixed `31c78fe6e` | as proposed | Native platform scroll wired a truthy value that is not true (1, "false") starts the JavaScript scroller on children it never wrapped — Scroll To Index fails for every child, and clicks can be lost |
| [P107-C91](../../bugs/p107-c91-a-custom-svg-shape-counts-its-own-drawing-as-a-child-for-drop-index.md) | low | fixed `dd71d0d83` | ruled: don't count the drawing | A Shape set to Custom SVG counts its own drawing as a child for Drop Index — a card dropped on it from the keyboard lands at 1, where every other shape says 0 |
| [P107-C94](../../bugs/p107-c94-an-image-placed-with-source-set-true-fetches-a-picture-called-true.md) | low | fixed `2dc8fd90d` | as proposed | An Image placed with Source Set true fetches a picture called "true" — React 19 writes srcset="true" on the element it creates, and none when Source Set changes to true later |
| [P107-C95](../../bugs/p107-c95-a-focus-on-a-group-off-the-page-reports-done-and-fires-focused.md) | low | fixed `3364b47f6` | as ruled (R16: Unchanged) | A Focus on a Group that is not on the page reports Done and fires Focused — a field reports Unchanged there, and R16 rules the Group should too |

## 4. Order of work

C93 first (ruled). Then the one-line throws (C82, C84, C85, C87, C89), which share one shape: a value read as text where a wire
can carry anything. Then C81, C83, C86, C94. Then ask C88, C90, C91 and C92 in one batch and build what is ruled.

## 5. Rules for every row

ISL-031 §5 holds, word for word: re-measure first (each row but C93 is a known row on the runtime target, and
`packages/noodl-runtime/test/node-spec/conformance.test.ts` asserts it still fires); a fix ships alone and closes its row in
the same commit (drop the known row, bump the spec's `version` with a `changes` entry naming the bug, `status: fixed` with
`commit:` and `regression:`); a control on every fix (HEAD's file red on exactly the fix's scenarios); the export is P18's.

## 6. Related work and collisions

- 🔴 **P107 is still writing specs on these nodes** (s53: the Group v2, R16's second ruling, row C95 on the focus tracker;
  touching `group.ts`, `Group.json`, `conformance.test.ts`, `equivalent-mutants.ts`). Check `git status` and mtimes on those
  files before a row that drops a known row, and land through a temporary index.
- C95 (a Focus on a Group off the page reports Done) was filed after R16's hand-over line. P107's s53 handoff says "C81–C95
  are theirs" and "C95 came after and follows the same ruling", so it joined this task in s28. P107's Group v2 already rules
  the answer (Unchanged, like a field's), so it needs no question: fix the runtime and drop the known row.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD before it is built.
- **AC2** — C88, C90, C91 and C92 are asked in plain words and ruled. ✅ 2026-10-07 (s28): all four as recommended, in one batch; each ruling is in its ledger file.
- **AC3** — every row ruled or marked "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's rows as `open` or `needs-ruling`.

## 8. Session 27 (2026-10-07) — C93

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C93 | `fe5ebfab5` | Image.tsx computes the based source into a local (as Video.tsx does) with the background image port's already-based guard, and never writes back into `props.dom`, the node's stored value | `noodl-viewer-react/tests/c93-image-base-url.test.tsx` 7 arms, two renders each; HEAD's Image.tsx red on exactly 3 (sub-path, write-back, already based); viewer 1784 / 1784; the Image spec conforms on the runtime |

**What C93 taught:** a single render passes against the broken build. The defect is a write into the node's own props, so only
the second render with the SAME props object shows it. The node-spec face has no project Base URL, so no spec reaches it; a world
setting for one would let the Image spec grade it (P107's to weigh).

## 9. Session 28 (2026-10-07) — the one-line reads, C94, C91, C92

Built in a worktree (`p109-isl038`) while P107 had the Group open, rebased onto its Group v2 (`99d0d2353`), graded, landed by
fast-forward.

| Row | Commit | What changed |
|---|---|---|
| C82, C84, C85 | `f2d9d349b` | Accepted file types (`fileMatchesAcceptedTypes`), Accept Kind (`kindsOf`), the source's Drag Kind (`accepts`) and Zone Name (`zoneName`) read as `String(value \|\| '')`, as the spec does. Three known rows and their predicates leave KNOWN_ROWS on the Text, Shape, Image and Group; their row scenarios lose `row` and the "(the runtime: …)" tails |
| C94 | `2dc8fd90d` | Source Set's `onChange` drops a boolean from the element's props (an update already did). Narrower than the ledger's "text or number only": the spec stringifies a number or object, and React does too |
| C91 | `dd71d0d83` | Circle.tsx marks Custom SVG's span `data-ndl-drawing`; drag-drop.ts `slots` skips a marked element. Ruled "Don't count the drawing" |
| C92 | `4a48f6eb7` | Circle.tsx `pointCountOf`: 3 to 500, a value that is not a finite number draws 5; Points' description says so (catalog, enriched catalog, docs page regenerated); `WITHHELD` empty; a Circle scenario at 1e9, Infinity and 2^53; `tests/c92-shape-points-cap.test.ts` 18 arms. Ruled "Cap at 500" |

**Grade.** Runtime target, `NSP_ONLY=Text,Circle,Image,Group`: all four conform at seeds 13 and 20732 (200 sequences, 0
divergences, every unkilled mutant a declared equivalent), and "the known rows are still open" passes. Interpreter: the visual
batch 13 / 13. Spec catalog-parity + schema 329 / 329. Viewer 1802 / 1802, viewer tsc 0; the four catalog and docs checks clean.
**Control A** (the base commit's drag-drop.ts, node-shared-port-definitions.ts and image.ts; Circle.tsx with only C91's marker
removed): red on exactly the row scenarios — C82, C84 twice and C85 on each node, C91's three on the Shape, C94's one on the
Image. **Control B** (the base Circle.tsx alone, heap 1.5 GB): the run aborts out of memory (exit 134).

**What s28 learned.** A `row` scenario that starts passing turns the runtime run red (`conformance.test.ts` asserts no passing
scenario carries `row`), so fixing a shared row in the runtime while a peer grades the same node breaks the peer's run mid-way.
Build it in a worktree and land after the peer commits. Base Circle.tsx cannot be the C92 control in the same run as the others:
with `WITHHELD` empty it takes the whole process down, so it needs its own run.

## 10. Session 29 (2026-10-07) — the Group's six

Built in a worktree (`p109-group`) while P107 had the Video open (an uncommitted edit to `conformance.test.ts` and the runtime
target). Re-measured first (AC1): at `c9106c613`, seed 13, every Group row fired through its own row scenario.

| Row | Commit | What changed |
|---|---|---|
| C87, C89 | `31c78fe6e` | Group.tsx reads the Tag `as || 'div'`, and the mount reads Native platform scroll as `render` does (`!nativeScroll`) |
| C88, C90 | `9e4c79935` | The scroller's wrapper is marked `data-ndl-slots`; drag-drop.ts `slotParent` feeds `slots` and `homeIndex` ("count the cards"). The Group's own move and release handlers hand the event to better-scroll after Noodl's callback and before the blocker's stop, `letScrollerSee` ("let the list's taps through") |
| C86, C95 | `3364b47f6` | The root ref stamps `noodlNode` on every element; group.ts `_canFocus`, Focus reports Unchanged (`focus/not-mounted`), and the Group gains the Unchanged port. The Group spec v3 says both. Catalog, enriched catalog and the docs page regenerated |

**Grade.** Runtime target: the Group v3 conforms at seeds 13 and 20732 (1390 of 1395 scenarios, the five failing ones the open
C79 row; 200 sequences, 0 divergences, every unkilled mutant a declared equivalent); the Text, Shape and Image conform at both
seeds with the new drag-drop.ts; "the known rows are still open" passes. Interpreter: the Group conforms (every mutant killed or
declared). Catalog parity + schema green; viewer 1807 / 1807; viewer and spec tsc 0; catalog, merge, docs:nodes, cloud-library
and port-groups checks clean. **Control:** HEAD's Group.tsx, drag-drop.ts and group.ts under the Group's 24 row scenarios and
twins are red on exactly the fifteen row scenarios (C86's five, C95's six, C87, C88, C89, C90); the nine twins pass on both.

**What s29 learned.**
- **The first C90 fix was wrong and the runtime caught it.** `bindToWrapper` (better-scroll hears the release on its own element)
  brought Click back but fired it before Pointer Up: the scroller's handler runs before React's root listener, so its constructed
  click lands first. The fix hands the event over from inside the blocker instead. The blocker also stopped the scroller's
  moves, so a scroll Group with Block Pointer Events on never followed a drag either; it does now.
- **Fixing a modelled row can strand a mutant.** C86's scenarios were the only path to "a click ending a pending press on a
  listed Group that cannot take the keyboard". Once the walk found the new element, those clicks wrote `listed` and two
  `person.click` mutants survived on the interpreter. One added scenario kills them; they are not equivalents.
- **A peer's open edit can read a helper you delete.** P107's Video rows call `heldAt`, so it stays. The test file landed by
  compare-and-swap, with the peer's working copy rebuilt as the new HEAD plus exactly their delta.
- Jest's 30-minute `beforeAll` cut the first seed-13 run of all four nodes under a peer's load (the Group alone took 44 minutes);
  grade the Group on its own.

### §10 continued — C83, then C81 (2026-10-07/08)

Built in a worktree (`p109-c83`, then branch `p109-c81`) after P107 committed the Video (`3236d5f03`); P107 cleared the shared
files. C81 was asked first: its proposed fix could not be graded (below).

| Row | Commit | What changed |
|---|---|---|
| C83 | `c335f5d90` | drag-drop.ts `onKeyDown` leaves a zone with no live element at any key of a keyboard carry, so Space cancels. Text v6, Shape v2, Image v2, Group v4, Video v2 (`keyDuringGesture`) |
| C81 | `52fdaf088` | Ruled "the zone tracks itself": the count belongs to one element (`dragElement`), Accept File Drops off and leaving the page clear it (`fileDropDark`, `_fileDropLeftPage`). Text v7, Shape v3, Image v3, Group v5, Video v3; write-always in `dragTo`; the page model's `FILE_DROP_LEAVES` |

**Grade.** C83: the five conform on the runtime at seeds 13 and 20732; spec package (page model, catalog parity, schema, visual
batch) 361 / 361; viewer 1807 / 1807; control (HEAD's drag-drop.ts) red on all five C83 scenarios. C81: the five conform on the
runtime at both seeds and on the interpreter, re-checked after rebasing onto P107's `b28354feb` (the five at seed 13, spec package 371 / 371) and again onto `afb4bffe6` (page model, catalog parity, schema 359 / 359); viewer 1807 / 1807; control
(HEAD's two runtime files) red on 11 / 48 / 48 / 13 file-drop scenarios (Text, Shape, Image, Group). The Video conforms either
way: on the runtime a `<video>` takes no file drop at all (P107-C100, open).

**What C81 taught.**
- **The ledger's proposed fix could not be graded.** "Reset every zone when the drag ends anywhere" needs the browser to say a
  drag left the window (unreliable), and the runtime target fires the leave of a replaced element at the detached element,
  where no listener hears it. So it was asked as a question, and the ruled fix is deterministic and graded.
- **A clear splits every branch by "0 over 0".** The first C81 build left ~20 interpreter survivors per node. Write-always
  (every file act writes the target, the count, its element and Is Dragging Over, sending only on a change) took the Text from
  21 to 4. Two were genuine equivalents (an unmount clears the count, so its element is never read), one pair is equivalent
  only on nodes with no Tag (the Shape, the Image), and one needed a scenario.
- **A swapped value with no send is invisible until the original sends the opposite.** The surviving mutant wrote Is Dragging
  Over false without a send, and the next enter's `true` matched the last recorded value. The killing step is Accept File
  Drops off, where the original sends false and the mutant has nothing to send. The twin's example was read by logging it once
  from `runner/mutants.ts`.
- **Still true:** in the runtime target a zone whose element is replaced under the drag, and left before the drag moves again,
  stays lit until the next drag. The target moves the drag's target only at an act; a browser's next `dragover` would enter the
  new element first.
