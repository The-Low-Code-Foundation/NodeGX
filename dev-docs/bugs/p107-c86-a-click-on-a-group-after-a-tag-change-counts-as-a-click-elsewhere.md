---
id: P107-C86
title: After a Group's Tag changes, a click on it counts as a click somewhere else — it fires Focus Lost instead of Focused, until the Group leaves the page and comes back
status: open
phase: P109
task: ISL-038
severity: low
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `componentDidMount`; focus-tracker.ts `onClickCapture` :118-136)
found: P107 NSP-016 s52, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; measured on the runtime target side by side with the Group spec
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "C86 — a new Tag, then a click on it: the walk does not find it, so Focus Lost and Click"
---

**What a person sees.** A Group's Focused and Focus Lost tell the graph when a person clicks into it and out of it. If the
Group's Tag (Advanced HTML) changes while the app runs — `div` to `section`, say — a click on the Group afterwards is
treated as a click outside it: Focus Lost fires if it was focused, and Focused never fires. Click itself still fires. It
stays that way until the Group is unmounted and mounted again.

**Where.** A Group is not focusable, so the viewer keeps a list of focused nodes. A click walks up from the element it
landed on and collects every element that carries a `noodlNode` property (`onClickCapture`). The Group component puts that
property on its element once, in `componentDidMount` (`this.scrollRef.current.noodlNode = this.props.noodlNode`). A new
Tag makes React replace the element without mounting the component again, so the new element has no `noodlNode`.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec models what the runtime does (as for
C77, the tabindex the drag module puts on the old element), so both targets agree.

**Proposed fix.** Set the property in the root ref callback (`rootRef`), which runs for every new element:
`if (el) el.noodlNode = this.props.noodlNode`. When it is fixed, change the Group spec's `stampOn` (set at every element)
and the regression scenario's name together, as a new spec version.
