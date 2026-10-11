---
id: P78-TPL011-INSTANCEROOT
title: A component whose only visual node is another component's instance draws nothing (cause not isolated)
status: fixed
commit: dad3a9c33
phase: P109
task: ISL-045
severity: medium
area: export / `NodeGraphModel.isVisualRoot` under `nodegx deploy` (isolated P109 s44)
found: P78 TPL-011 s3 (V1-2), 2026-09-26
evidence: dev-docs/tasks/phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md §3c "V1-2 done (s3)", "Found building it" (third bullet)
regression: packages/noodl-preview/tests/gam-014-a-kit-node-draws-when-it-is-the-whole-component.test.ts (the INSTANCEROOT arms, on the export); packages/nodegx-backend/tests/isl045-instanceroot-drive.test.ts (rendered and deployed, in Chrome)
---

In Nightbook, two components whose only visual node was an instance of another component drew nothing when placed:
the language button vanished from the bar, and the 32 feeling chips were empty. Wrapping the instance in a Group made
both draw. The session recorded it as *"Observed, cause not isolated (door, export or runtime): a candidate DEFECTS
row once isolated"*. It never reached the register.

**Where:** not isolated. It is not D53/GAM-014 (a kit React node as the root, fixed 2026-09-17), which was already
fixed when this was seen. Not re-measured since 2026-09-26.

**Reproduce:** a component `B` whose node tree is a single instance of component `A` (no Group around it), placed on
a page. Compare with the same with a Group root. Nightbook's generator (`packages/noodl-mcp/tests/tpl011*.ts`) carries
the wraps.

**Proposed:** isolate first. Render the two-component case with the production viewer and with the exported app, and
find which of the door, the export or the runtime drops it. Size unknown until then.

**Isolated and fixed (P109 s44, 2026-10-11).** The smallest project with the shape was built by
`isl045-instanceroot-drive`: a Chip (a Group with a Text), components whose only node is a Chip instance, a Group
around one as the control, and a For Each of them. It was driven two ways:

- **Rendered from disk:** every shape drew. So the runtime draws an instance as a component's root.
- **Deployed with `nodegx-deploy.cjs`:** only one shape drew nothing. That is a component whose `nodes.json` has
  **no `visualRoots` key**. The door writes exactly that when the component being instanced is not on disk yet
  (AWP-001: absent means each reader derives).

**Cause:** `deployProject` exports a project it never registers in the node library (R20 keeps that export
byte-identical). There, an instance of another component in the same project is an unresolved type. A probe in a
patched copy of the engine read `UnknownNodeType` for the instance in the exports that ship. `isVisualRoot` answered
an unresolved root only from the file's recorded list (GAM-014's fallback for kit nodes). With no list, the component
shipped `roots: []`. Wrapping the instance in a Group made the root a built-in type, which always resolves. That is
why the workaround worked.

**Fix:** when the file recorded no `visualRoots`, an unresolved root that names a component of the same project draws
exactly when that component does (with a cycle guard). A recorded list still wins verbatim. A kit type names no
component, so it stays rootless as before.

**Graded:**
- GAM-014's deploy spec gained two arms: an instance of a component that draws keeps its root, and an instance of a
  logic-only component stays rootless. On the pre-fix engine, exactly the first was red. After the fix, 5/5.
- The drive is red on the pre-fix engine in exactly the absent-key arm, and 12/12 after.
- All 13 templates deploy byte-identically with both engines (`noodl_bundles` and `index.html`). This includes the 51
  components with this shape and no key, which all instance logic-only components.
- noodl-preview 63/63; editor `tsc` 0.

Nightbook's two Group wraps can stay; they are no longer needed.
