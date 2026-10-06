---
id: P107-C66
title: A Checkbox loses its root element when Enable Label is turned off — Focus then reports Unchanged, Scroll Into View says it is not mounted, while the box is on the page
status: fixed
commit: 94b83d7ea
phase: P109
task: ISL-031
severity: medium
area: runtime / Checkbox (components/controls/Checkbox/Checkbox.tsx) and react-component-node.ts `setDOMElement`
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C66); scenario "Enable Label turned off, then the Focus action" in packages/nodegx-node-spec/scenarios/net.noodl.controls.checkbox.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.checkbox.json "Enable Label turned off, then the Focus action: the box is on the page and takes the keyboard (Focused, Done)"
---

With Enable Label on, the Checkbox renders a wrapper `div` around the box `div` around the `<input>`, and BOTH divs
carry the node's root ref (`ref={noodlRootRef(props.noodlNode)}`, Checkbox.tsx :167 and :199 — one cached callback
per node). Turning Enable Label off re-renders the tree without the wrapper: React keeps the root `div` (same type,
same ref — not re-invoked) and removes the old inner box `div`, calling the shared ref with `null`. That null reaches
`setDOMElement(null)` (react-component-node.ts :1934-1945) and the node's element is gone: `getDOMElement()` is
null while the box is on the page.

What a person then sees: a **Focus** action reports **Unchanged** ("not on the page") and takes nothing; **Scroll
Into View** raises `visual/scroll-into-view-failed: this element has no rendered DOM element`; the bounding-box
observer has no target; data attributes stop syncing. A click on the box itself still works (the handlers are on the
input).

**Reproduce:** the scenario named above on the runtime target: Enable Label on at mount, off, then Focus → Unchanged
(the spec says Done with Focused).

**Proposed fix:** one root ref — on the outermost element only (the wrapper when there is a label, the box when
there is not); or `setDOMElement` ignoring a `null` for an element that is not the one it holds. One line either way.

**Second instance (P107 NSP-016 s38, 2026-10-04): Text Input.** TextInput.tsx :250 and :272 put `noodlRootRef(noodlNode)` on
the wrapper `div` AND the outer `div` when Enable Label is on; turning the label off removes the inner one, which nulls the
root. Not on this node's wire: its Focus / Blur go through `innerReactComponentRef` (text-input.ts :422-437), not the
root — so Focus still works, Scroll Into View and the bounding box do not. Read from the source; the spec's `useLabel`
scenarios show the keyboard leaving with the rebuilt input (D30's shape), not a lost root.

**Third instance (P107 NSP-016 s39, 2026-10-04): Dropdown — on the wire.** Select.tsx :188 and :235 put `noodlRootRef(noodlNode)`
on the input wrapper AND the outer `div` when Enable Label is on; turning the label off keeps the outer `div`'s fiber as
the new root (same type, same ref, not re-invoked) and removes the old wrapper, whose ref call with `null` empties the
node's element. The Dropdown's Focus / Blur go through the root (`_focusTarget`, utils.ts :419-423), so **Focus reports
Unchanged and takes nothing** with the dropdown on the page, until the next Enable Label on or a remount restores the
ref. Measured: scenario "Enable Label turned off, then the Focus action" in
`packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json` (marked row) and known row `lostRootAfterLabelOff`
for the Dropdown in `conformance.test.ts`. The spec's matrix scenario starts every segment from a remount with the
label off so that a rebuild in it is always off → on, which keeps the root.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix it with the label work".** Focus and Scroll Into View keep working whatever the label does. About one line in each of the three controls, built alongside the label fix already scheduled. Nothing that works today depends on the lost element. The question as asked: *"Should the control keep hold of its element when its label is hidden?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 94b83d7ea (P109 ISL-031, 2026-10-06), as ruled, with the label work (C80).** Each control renders one tree whether the label shows or not, and one element carries the root ref at a time (the outer div with a label, the box or wrapper without one), so turning the label off no longer nulls the node's element. Known rows gone from the Checkbox, Dropdown and Radio Button lists. Control: HEAD's components red on exactly the C66 / C80 scenarios.
