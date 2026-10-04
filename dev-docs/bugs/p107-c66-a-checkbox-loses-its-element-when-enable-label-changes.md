---
id: P107-C66
title: A Checkbox loses its root element when Enable Label is turned off — Focus then reports Unchanged, Scroll Into View says it is not mounted, while the box is on the page
status: needs-ruling
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
