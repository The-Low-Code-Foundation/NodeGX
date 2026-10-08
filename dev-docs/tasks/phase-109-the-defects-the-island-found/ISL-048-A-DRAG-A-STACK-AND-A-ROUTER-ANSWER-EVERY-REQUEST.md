# ISL-048 — A drag, a stack and a router answer every request

**Status: ⬜ scoped s30 (2026-10-08) at `a6caefdde`, nothing built.** **Source:** 18 bugs P107 NSP-016 filed in s55–s57 after
ISL-038 was scoped (the Drag C101–C106, §7.16; the Component Stack C107–C114, §7.17; the Page Router C115–C118, §7.18), handed to
P109 under R16 ("Hand all to P109"): 1 high · 7 medium · 10 low, **2 to ask** (C103, C104). **Side:** noodl-viewer-react
(`components/visual/Drag/Drag.tsx`, `nodes/navigation/navigation-stack.tsx`, `router.tsx`, `router-handler.ts`), the Drag,
Page Stack and Router specs.

## 1. The person sentence

**Everything inside a Drag can be tapped and is drawn, it moves only the way it is locked, and a Component Stack or a Page Router
answers every Navigate, Push, Pop and Reset — Done or Failure, never silence.**

## 2. Why these belong together

P107 NSP-016 rendered the three nodes that move a person around an app and drove them. On a phone nothing inside a Drag can be
tapped (C101): the Site Builder's section rows have buttons and fields inside one. A Drag locked to one axis reports the other
(C102), draws only its first child (C103), and a NaN start blanks the page (C106). A Component Stack leaves a request unanswered
when the component is missing (C107), the transition is unknown (C108), or a Reset arrives during a back's animation (C110). A
Page Router blanks on a link with `%zz` in its query (C115) and shows a page with the old parameters after Back (C117). Each one
is a request the app made and never heard back from, or something drawn that the app did not ask for. One hand-over, one task,
the same shape as [ISL-038](ISL-038-A-VISUAL-NODE-DRAWS-WHAT-IT-WAS-GIVEN.md).

## 3. The bugs

Worst first, generated from the ledger headers. **The ledger file is the source**: each holds the measurement, the
reproduction and a proposed fix. "As proposed" means the bug's own fix has one obvious reading: build it. "Ask first" means
the fix has two reasonable answers that a person would see differently: ask in plain words (§5) before building.

| bug | node | severity | status | build | what a person sees |
|---|---|---|---|---|---|
| [P107-C101](../../bugs/p107-c101-nothing-inside-a-drag-can-be-tapped-on-a-touch-screen.md) | Drag | high | scheduled | as proposed | On a touch screen nothing inside a Drag can be tapped — its buttons never click and its text fields never take the keyboard |
| [P107-C102](../../bugs/p107-c102-a-drag-locked-to-one-axis-reports-movement-on-the-other.md) | Drag | medium | scheduled | as proposed | A Drag locked to one Axis still reports movement on the other — Drag Y moves while the element stays put, then jumps back to 0 at the next drag |
| [P107-C103](../../bugs/p107-c103-a-drag-draws-only-its-first-child.md) | Drag | medium | scheduled | **ask first** | A Drag draws only its first child — every other child vanishes without a word, and the catalog's drag example teaches a readout that never appears |
| [P107-C106](../../bugs/p107-c106-a-start-drag-x-of-nan-blanks-the-page.md) | Drag | medium | scheduled | as proposed | A Start Drag X or Y of NaN blanks the page — the Drag's update compares NaN with itself and sets state until React gives up |
| [P107-C107](../../bugs/p107-c107-a-push-to-a-component-the-project-does-not-have-is-never-answered.md) | Component Stack | medium | scheduled | as proposed | A push, replace or Reset to a page whose component the project does not have is never answered — the caller's Navigate hangs with no Done and no Failure |
| [P107-C110](../../bugs/p107-c110-a-reset-during-a-backs-animation-empties-the-stack.md) | Component Stack | medium | scheduled | as proposed | A Reset during a back's animation empties the stack: the animation's end takes the new start page off it, and every push after is never answered |
| [P107-C115](../../bugs/p107-c115-a-malformed-escape-in-the-query-blanks-every-page-router.md) | Page Router | medium | scheduled | as proposed | A link whose query has a malformed escape (`?q=%zz`, `?off=50%`) blanks every Page Router — nothing is shown, and its Reset is never answered |
| [P107-C117](../../bugs/p107-c117-back-to-the-same-page-with-new-parameters-after-a-navigate-keeps-the-old-ones.md) | Page Router | medium | scheduled | as proposed | After a Navigate, Back or Forward to the same page with other parameters keeps showing the old ones — the Page Router hands the new parameters to a page it already deleted |
| [P107-C104](../../bugs/p107-c104-css-class-and-css-style-on-a-drag-do-nothing.md) | Drag | low | scheduled | **ask first** | CSS Class and CSS Style on a Drag do nothing — the Drag has no element and passes neither to the child it moves |
| [P107-C105](../../bugs/p107-c105-a-snap-that-waited-for-the-drag-to-mount-starts-from-0.md) | Drag | low | scheduled | as proposed | A Snap To Position that waited for the Drag to mount starts from 0 — the element jumps to the edge, then animates |
| [P107-C108](../../bugs/p107-c108-a-push-with-a-transition-the-stack-does-not-know-is-never-answered.md) | Component Stack | low | scheduled | as proposed | A push with a transition the stack does not know (a wired Transition such as "Fade") is never answered, and the page it built is dropped |
| [P107-C109](../../bugs/p107-c109-a-components-value-that-is-not-a-list-blanks-the-stack.md) | Component Stack | low | scheduled | as proposed | A Components value that is not a list blanks the stack and its Reset is never answered; a page looked up by its label whose component was never set throws the same way |
| [P107-C111](../../bugs/p107-c111-a-back-whose-page-below-left-components-never-pops.md) | Component Stack | low | scheduled | as proposed | A Pop whose page below is no longer in the Components list throws: the pusher hears the results and the page below comes back, but the stack never pops |
| [P107-C112](../../bugs/p107-c112-a-reset-that-finds-no-components-keeps-naming-the-old-page.md) | Component Stack | low | scheduled | as proposed | A reset that finds no components (or no start page) deletes every page but leaves Top Component Name and Stack Depth naming what was there |
| [P107-C113](../../bugs/p107-c113-writing-a-stacks-name-rebuilds-it.md) | Component Stack | low | scheduled | as proposed | Writing a Component Stack's Name — even the name it already has — rebuilds it at its start page, losing every page pushed |
| [P107-C114](../../bugs/p107-c114-children-count-lags-a-frame-after-a-remount.md) | Component Stack | low | scheduled | as proposed | A Component Stack mounted again at a frame sends no Children Count in that frame — the page it builds is counted a frame late |
| [P107-C116](../../bugs/p107-c116-a-url-path-of-null-blanks-the-page-router.md) | Page Router | low | scheduled | as proposed | A Page Router whose Url path is null shows nothing and never answers a Reset; a Navigate to it shows the page but never pushes its URL or answers |
| [P107-C118](../../bugs/p107-c118-a-navigate-with-no-router-name-made-before-the-router-is-on-the-page-is-never-answered.md) | Page Router | low | scheduled | as proposed | A Navigate with no Router name, pressed while no Page Router is on the page, waits for good — a router registering as Main never takes it |

**The two to ask.** C103: draw every child (wrap them in one element the library moves), or keep one child and say so (a
validation warning, the catalog example fixed to put the Circle and the Text in one Group). C104: pass CSS Class and CSS Style
through to the child the Drag moves, or stop offering the two ports on a node with no element of its own. The catalog example
`vis-drag-snap-back.json` is fixed either way.

## 4. Order of work

C101 first (high; one prop and a jsdom regression; check that a drag started on a row's background still works on touch).
Then the requests that are never answered, which share one shape — a throw inside an async build that nobody catches: C107, C108,
C109, C110, C111, C112 on the stack, C115, C116, C118 on the router. Then C117, C113, C114. Then the Drag's C102, C105, C106.
Ask C103 and C104 in one batch when the Drag is next, and build what is ruled.

## 5. Rules for every row

ISL-031 §5 and ISL-038 §5 hold, word for word: re-measure first; a fix ships alone (or one per shared mechanism) and closes its
row in the same commit; a control on every fix (the file before the fix, red on exactly the fix's scenarios); the export is P18's.

- **Where each row lives.** The Drag's C102, C105 and C106 are KNOWN ROWS on the runtime target
  (`packages/noodl-runtime/test/node-spec/conformance.test.ts` `KNOWN_ROWS.Drag`; C106 also two `WITHHELD` entries): the fix drops
  them and the scenario's `row` mark. The Component Stack's and the Page Router's rows are MODELLED — "the spec copies it (R3)":
  the fix is a new spec version that says the intent, and every scenario whose name describes the old behaviour is renamed for what
  happens now (s30 did this for C77 and C78: diff the interpreter's trace of every scenario before and after the spec change, and
  rename only the ones that changed and whose names claim the old outcome).
- **Grade on the runtime at two seeds** (13 and 20732), one node per run so no run reaches jest's 30-minute `beforeAll`, then the
  spec package's gates (`page-model`, `page-model-plants`, `catalog-parity`, `schema`, `batch-visual`, `world`).

## 6. Related work and collisions

- 🔴 **P107 still writes specs** in the same tree (`conformance.test.ts`, `equivalent-mutants.ts`, the scenario files). Build in a
  worktree (`scripts/devtools/make-worktree.sh`) and land by fast-forward, or by compare-and-swap when P107 has an open edit on a
  landing path (the s29 recipe in the folder's NEXT-SESSION-PROMPT).
- C101 is met by the Site Builder (P76): its section rows put buttons and fields inside a Drag. Say so on P76's board when it lands.
- The Component Stack and Page Router were last touched by ISL-028 (going to a page twice with new parameters). Read its §9 before
  touching `router.tsx`.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD before it is built.
- **AC2** — C103 and C104 are asked in plain words and ruled.
- **AC3** — every row ruled or marked "as proposed" is fixed, one commit each (or one per shared mechanism), with its regression
  green, its known row (or modelled behaviour) gone and a control red on exactly its scenarios.
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's rows as `open` or `needs-ruling`.
