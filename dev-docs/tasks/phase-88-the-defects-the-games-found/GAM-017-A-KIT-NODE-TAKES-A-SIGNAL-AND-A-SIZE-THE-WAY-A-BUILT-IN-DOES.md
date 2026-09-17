# GAM-017 — A kit React node takes a signal and a size the way a built-in node does

**Status: ⬜ not started. ✅ R17 ruled s19 (§5): buildable.** **Source:** [P78 D70](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-002](../phase-87-the-first-play-test/RKT-002-THE-LOOK.md) §6 AC4 and [RKT-003](../phase-87-the-first-play-test/RKT-003-ONE-SCREEN-PER-QUESTION.md), 2026-09-13 · **Side:** product (React bridge / node-kit types, docs and scaffold)

Rocket School's kit wanted a `Burst` signal and got a console error, so the burst became a number that rises. The kit
wanted a height and got no size port, so the Race Track is sized by a Group wrapped around it.

## 1. The person sentence

**A kit author can give a React node a signal that the component reacts to, and a width and height a person sets in
the property panel, by following the docs, with no workaround.**

## 2. What was measured

Read at HEAD `eb12ebe99`, 2026-09-14. Nothing was run for this file.

| reading | where |
|---|---|
| The burst became `Boost A` / `Boost B` numbers *"because a kit React node cannot take a signal (the viewer logs 'Signals not supported as a react prop')"*. `Game/Race track`'s root Group is 30vh, capped at 56vw. **As recorded 2026-09-13, not re-read.** | RKT-002.md:125-128; RKT-003.md:73 |
| **The message.** An `inputProps` entry whose type is `'signal'` logs *"Signals not supported as a react prop"* and gets no setter, yet it is **still registered as an input**. Re-read at HEAD. | `noodl-viewer-react/src/react-component-node.ts:1989-2011` (message at `:2004`) |
| 🔴 **It logs when the kit registers, not when a signal is wired.** The check sits in `createNodeFromReactComponent`'s loop over the definition. The runtime then gives the port a no-op `set` (`nodedefinition.ts:35-37`), so it shows in the editor, can be wired, and does nothing. D70 says "a signal wired into a kit React node logs", and the log in fact appears whether or not anything is wired. Re-read at HEAD. | as above |
| 🔴 **A React node *can* take a signal, through `inputs` with `valueChangedToTrue`.** The bridge copies `inputs` unchanged (`react-component-node.ts:1983-1986`), and the runtime makes such a port a signal (`nodedefinition.ts:108-113`). Built-ins do exactly this: Text Input's `inputs` block (`text-input.ts:124`, signals at `:146`, `:205`, `:215`, `:226`), Video (`video.ts:56-106`), Checkbox (`checkbox.ts:82-91`). **So D70's first half does not hold as written.** What fails is a signal declared as a *prop*. What is missing is a documented route from that signal into the component. Not run: AC1 arm (ii) checks it. Re-read at HEAD. | as cited |
| **The types invite the shape that fails.** `ReactInputPropDefinition` extends `Omit<InputPortDefinition, 'set'>`, so it accepts `type: 'signal'` and `valueChangedToTrue`. The docs show a signal input only on a logic node. No kit tool checks for it: a grep of `nodegx-kit-scaffold`, `nodegx-kit-catalog` and `noodl-mcp` src for a signal `inputProps` check finds 0. Re-read at HEAD. | `example-node-kit/types/node-kit.d.ts:563-567`, `:586-600`; `docs-site/docs/custom-nodes.md:357-379` |
| **Size: `frame` is live but unexercised, not absent.** `frame.dimensions`, `position`, `margins`, `padding` and `align` register the shared port groups, and a node with `frame` runs `Layout.size` / `Layout.align` at render. The bridge's own comment says *"Nothing in the repository sets this, so `useFrame` is always false"*, and the types call it *"unexercised in-repo … live but lightly travelled"*. No shipped module sets `frame:` (grep: 0). Re-read at HEAD. | `react-component-node.ts:903-917`, `:842-848`, `:418-431`; `node-kit.d.ts:645-660` |
| A kit visual node inherits Width and Height **outputs** (the measured box) and no size inputs. Re-read at HEAD. | `custom-nodes.md:206-214` |
| **Why a kit avoids `frame`:** `addDimensions` writes `width` and `height` into `inputCss`, and the React export reads only `inputProps` and `inputs`. So a `frame` size would work in the editor and vanish from an exported app. `nodegx-charts` is built around this. Re-read at HEAD. | `nodegx-export/src/parse/kitSource.ts:269-300`; P84 register **P40** (UNOWNED); FLD-015-WHAT-WAS-BUILT §2 rule 1 |
| **Not read:** whether `Layout.size` under `frame` honours `vh` / `vw`, which the wrapper uses, and whether the Race Track's box-shape rule (`kit.js:938-942`) reads a `frame` size correctly. | — |

## 3. Where it bites a person

- **Signals:** every kit node that should respond to an event (play, reset, celebrate, focus, scroll-to) either takes a
  counter number, as Rocket School did, or declares a prop signal. That prop signal registers, wires cleanly and does
  nothing.
- **Size:** every kit node gets its size from a wrapper Group. That wrapper is one more node in every component, and it
  is a second reason for GAM-014's wrap.

## 4. Related work and collisions

- **P84 register P40** (UNOWNED): the export ignores `inputCss`. Any size fix through `frame` or `inputCss` repeats that
  divergence unless P40 is fixed or this task reports it. 🔴 **Nothing owns P40, so this task either takes it or says so
  in its docs.**
- **P84 [FLD-015](../phase-84-the-defects-the-field-report-found/FLD-015-WHAT-WAS-BUILT.md) ✅:** `nodegx-charts` chose
  `inputProps` for size, on purpose. It does not address signals or `frame`.
- **P84 FLD-004 ✅** (`a34d215e2`): the main-axis report now lives in `layout.ts` `size()`. A `frame` node would start
  receiving `wired-dimension-becomes-grow`, which is correct, and is part of AC3.
- **Phase 69 CN-012 ✅:** kit **logic** nodes send and receive signals. That measurement did not cover React nodes.
- **DEBT-006** (cited at `react-component-node.ts:421-431`): kept `frame` because modules may use it.
- **[GAM-014](GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md)** (the same wrapper Group) and
  **[GAM-015](GAM-015-A-WIRED-SIZE-REACHES-A-KIT-NODE-AS-A-SIZE.md)** (size through `inputProps` px).
- Grep run: `grep -rnai --include='*.md' "Signals not supported\|no size port\|size ports\|frame:.\{0,30\}kit\|kit.\{0,40\}frame" dev-docs/tasks`
  → RKT-002, D70, P40 and FLD-015.

## 5. Design

**Signals**
- **(s1) The bridge.** An `inputProps` signal gets an edge-triggered setter that bumps a counter prop and re-renders,
  which is the `Boost A` pattern moved into the product. Any shipped kit that already declares one starts receiving
  props (AC5).
- **(s2) Types, docs and a check.** Remove `valueChangedToTrue` and `'signal'` from `ReactInputPropDefinition`. Document
  `inputs` + `valueChangedToTrue` + a re-render as the route, add it to the scaffold, and have `verifyKitSource` refuse a
  signal prop by name.

**Size**
- **(z1)** Exercise and document `frame: { dimensions: true }` with a spec and a drive, and fix P40 so the export keeps
  it.
- **(z2)** Give every React node Width and Height inputs by default, like a Group. This adds ports to every existing
  kit's panel and changes the node-kit surface.
- **(z3)** Document the wrapper Group as the way, and close the "size ports" half as disproved.

**Rulings and guards**
- 🔒 **Ruling for Richard:** s1 or s2 (or both). And for size, z1, z2 or z3, given that z1 and z2 split the editor from
  the export until P40 has an owner.
- **Do not** remove the console error without putting a working route or a refusal in its place.
- **Do not** touch `layout.ts`'s percentage-to-`flexGrow` conversion (FLD-004's trap).

> 🔒 **R17** **Ruled (2026-09-17, s19, asked in plain words): signals (s1), the bridge makes a declared signal prop work** (an edge-triggered re-render). **Size (z3): document the wrapper Group** and close the "size ports" half as disproved; no ports added, P40 not needed.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced RED at HEAD**, in a small project with one minimal kit (not beside the library), deployed and driven. (i) A React node with `inputProps: { play: { type: 'signal' } }`: record the registration log, and that a Button's Click wired into it changes nothing. The same Click reaching a Text Input's Focus is the known-firing control. (ii) The same node using `inputs` with `valueChangedToTrue` that bumps a prop and calls `forceUpdate`: record whether the component reacts. This settles D70's first half. (iii) A node with `frame: { dimensions: true }`: record the ports the editor lists, and the rendered box for Width typed as 200px, typed as 30vh, and wired from a Number. The same node without `frame` is the control. |
| AC2 | The ruled signal fix. **Reverted arm:** undo it, and AC1 (i) reads RED again by name. |
| AC3 | The ruled size fix. **Reverted arm** included. A wired size either takes effect or raises FLD-004's report; it is never silently dropped. |
| AC4 | **Person sentence, in the editor and on a deployed page:** a kit written as the updated docs show reacts when a Button's Click is wired into its signal, and takes the Width a person types. The screenshots are looked at. |
| AC5 | **Blast radius:** for every `reactNodes` definition under `library/modules`, count its signal `inputProps`, `inputs` with `valueChangedToTrue`, and `frame` use. Record the registration log lines per module before and after, each module in its own small project (D41). |
| AC6 | **Export:** a kit size port that goes through the ruled route is present in the React export, or reported there by name. If P40 stays unowned, the docs say so in a sentence and this AC records that. |
| AC7 | **Workarounds:** decide whether the Race Track's `Boost A` / `Boost B` become a signal (keep the numbers if a child's count still matters), and whether the `Game/Race track` wrapper's 30vh / 56vw budget can move onto the node. Re-drive `drive-rkt003-stage.js`, and update the kit and template gates. |

## 7. Traps

- 🔴 **The log fires at registration.** A drive that asserts "no log after wiring" passes even when the port is still dead.
  Assert the component's reaction.
- ⚠️ `valueChangedToTrue` runs on a false-to-true edge. Two identical pulses in one frame can read as one, so drive two
  separated pulses.
- ⚠️ A fix proved only in the editor, with `frame`, has not shown it survives the export (P40).

## 8. Record

Not started.
