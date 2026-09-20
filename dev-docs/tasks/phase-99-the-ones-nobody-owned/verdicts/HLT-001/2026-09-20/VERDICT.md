# HLT-001 — verdict, 2026-09-20

**Built.** The 132 events are **0** on a driven session, and the drive that reads 0 has been shown
to read **1,538** against a mutated seam, so the zero is a property of the product and not of the
instrument.

## 1. The pair, and it is the whole verdict

One drive, one project copy, one action list. The **only** thing varied between the two runs is
whether `unmountReactRoot` defers.

| run | seam in the RUNNING bundle | selections | *"synchronously unmount"* | `removeChild` | double `createRoot` |
|---|---|---|---|---|---|
| control | `SYNCHRONOUS` (mutant) | 47 across 98 nodes | **1,538** | 0 | 0 |
| fixed | deferred + reclaiming | 47 across 98 nodes | **0** | **0** | **0** |

⚠️ **1,538, not 132.** Richard's 42 minutes of ordinary clicking produced 132; this drive selects 47
nodes deliberately, so it hits the teardown far harder than a person does. The figure that matters
is the pair, not either number alone.

Both runs assert the seam's shape by reading `String(unmountReactRoot)` **out of the running
webpack bundle**, not off disk — the on-disk bundle is not the one running, and the first attempt at
the control read `DEFERRED` for a full minute after the mutant was written, because HMR had not
replaced the module yet. A reload, then a re-read, then the drive.

`verdicts/HLT-001/2026-09-20/drive-fixed.json` and `drive-control-mutant.json` are the two runs.

## 2. 🔴 Two things the first version of this drive got wrong, both of which read as a pass

**(a) It selected nothing and reported zero.** The node walk was wrapped in `JSON.stringify(async
() => …)`, which stringifies a *promise*; every reading came back `undefined`, the "nodes were
actually selected" arm read `0 selections across 0 nodes`, and the event count read a confident
**0**. That zero was a drive-made absence. The arm that caught it exists only because §5's AC1 was
read as needing a known-firing signal beside it
([[assert-an-absence-with-a-known-firing-signal-beside-it]]).

**(b) It selected ten nodes inside one synchronous JS turn.** React batches those into a single
render, so the build-then-tear-down cycle the task measures never happens. One selection per turn,
driven from Node with a wait between, is what produces 47 real selections.

**(c) The log arm read the wrong population.** `.logs/dev.log` spans the whole stack's lifetime, so
after the control run it carried 1,538 of exactly the line being counted — and the *fixed* re-run
then failed its own log arm on the control's leavings
([[a-post-drive-control-reads-the-state-the-drive-leaves]]). The drive now records the log's byte
offset before it acts and reads only the window it wrote.

## 3. 🔴 The first fix cured the error and caused two others, and only a wider instrument saw it

The drive originally counted one message. It read a clean **0** — and the editor was writing two
error classes it had never written before:

| class | synchronous (HEAD) | `setTimeout(…, 0)` | `queueMicrotask` | + reclaiming |
|---|---|---|---|---|
| *"synchronously unmount"* | 1,538 | 0 | 0 | **0** |
| `Failed to execute 'removeChild'` | 0 | **8** | 0 | **0** |
| *"already been passed to createRoot()"* | 0 | **2** | **2** | **0** |

Deferring opens a window, and the editor uses it. Three findings, each of which cost a drive:

**(a) A macrotask is a whole task too long.** With `setTimeout(…, 0)` the editor gets an entire task
to empty the container first, and React then commits its deletions against nodes that have gone —
8 `NotFoundError`s per run. `queueMicrotask` escapes the render just as well (a microtask always
runs on an empty stack, so React is never mid-render) and closes that window: **0**. The seam's
docblock originally argued the opposite, from reasoning rather than measurement, and the measurement
won.

**(b) A pending unmount and a fresh `createRoot` can want the same container.** Two per run,
surviving the microtask because the collision is *in the same task*. The stack named it exactly:
`SelectionActions.settle` → `deselectNow` → `CommentLayer.clearMultiselection` → `_renderReact` →
`createRoot` on the same two divs. That is why the seam grew a create half, `createReactRoot`, used
at the 20 sites whose container is a long-lived field. A container built fresh inside the function
that mounts it cannot collide and was left alone.

**(c) 🔴 Flushing the pending unmount synchronously reintroduced the original defect.** The first
`createReactRoot` did the obvious thing — unmount the old root now, then create — and the next drive
read **2** *"synchronously unmount"* events, because that flush is itself sometimes inside a render.
The answer is to **reclaim** the pending root and return it: the caller wants a root on this element
and there already is one. Every collision site documents itself as wanting exactly that ("Create
roots only once, reuse for subsequent renders").

⚠️ **The general lesson, and it is the reusable one.** A drive that counts only the error it set out
to cure cannot tell a cure from a trade. Each of these three was invisible to the instrument that
declared the previous one fixed
([[a-recommendation-carries-a-measurement-of-some-property-not-the-right-one]]). The drive now counts
all three, and the two side-effect arms are graded, so the next person to touch this seam finds out
in one run.

## 4. 🔴 The task file's §3 measurement was wrong, and the fix is bigger than it said

Re-measured at HEAD `55dd19523` before building anything
([[measure-the-artefact-before-believing-the-task-file]]):

| §3 said | the artefact says |
|---|---|
| 19 `root.unmount()` call sites | **78** in **60 files** |
| exactly one defers | **eleven** defer — `popuplayer.ts:1220`, `componentports.tsx:73`, `ListValueEditor.tsx:179`, `ExtractToComponentPopup.tsx:345`, `AiChat.tsx:302,359`, `openKitConsent.tsx:261`, `openImportFlow.ts:60,87`, `StringInputPopup.tsx:258`, `colorpicker.ts:57` |
| `shared/ReactView.ts:43` is "the base most views inherit" | it has **exactly one subclass**, `PopupMenu` — fixing it moves almost nothing |

Eleven independent copies of the same `setTimeout(…, 0)`, none of them commented, is the same
failure §2 of the phase README describes: the decision was made eleven times and written down zero
times, so the sixty-seven other sites never got it
([[a-second-copy-of-a-palette-drifts-silently]]).

**71 sites were converted.** Seven were deliberately left:
- `ProjectScanner.ts:108-111` — a migration **rule** matching the string in user code, not a call;
- `ConnectionPopups.ts:108,171,295` and `NodeContextMenu.ts:224` — `OverlayHandle.unmount()`, which
  is not a `Root`; those route through `OverlayHost`, and `OverlayHost`'s five real roots are
  converted, so the four handle calls inherit the fix;
- the two inside the seam itself.

## 5. The control against the fix that isn't one

`tests/utils/hlt-001-deferred-unmount.spec.ts`. The two cheap fakes are a suppressed console and a
dropped call, and both pass "React said nothing":

- **does not unmount synchronously** — the tree is still in the container on the line after the
  call. This is the assertion the mutant fails.
- **the control — the unmount really happens** — after one macrotask the container is empty and has
  no child nodes. A `try/catch` or a console filter passes the first and fails this
  ([[verify-the-consequence-not-just-the-mechanism]]).
- **says nothing when a root is torn down from inside another root's render** — both halves at
  once: no matching `console.error`, **and** the victim's DOM is gone.
- the same root twice, a container detached before the timer ran, and `null`/`undefined`.

## 6. What is NOT closed by this

⚠️ **`createReactRoot` is used at the 20 sites that can collide, not at all 73.** The other 53 build
their container inside the function that mounts it, so no second claim on that element is reachable
— that was read, site by site, not assumed. But nothing *enforces* the split: a new view that
mounts into a long-lived field and calls `createRoot` directly reopens the hazard silently. A lint
rule or a `createRoot` ban outside the seam is the real guard, and it belongs to HLT-010.

⚠️ **Reclaiming keeps the old tree's state.** A caller that disposed specifically to reset component
state, and then re-created on the same container within the same tick, now gets its old state back.
No site in the editor does that today — the collision sites all re-render with new props — but it is
a behaviour change and it is written into the seam's docblock rather than left for someone to find.

**The `other console errors during the drive: 9` figure is not zero and is not this task's.** It is
left recorded rather than filed as an observation — HLT-003 and HLT-004 own that population, and
§7 of the phase README is explicit that a row leaves here with an owner or not at all.
