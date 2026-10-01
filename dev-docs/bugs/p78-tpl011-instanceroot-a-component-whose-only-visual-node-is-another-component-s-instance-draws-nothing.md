---
id: P78-TPL011-INSTANCEROOT
title: A component whose only visual node is another component's instance draws nothing (cause not isolated)
status: open
severity: medium
area: runtime / component instance as a component's root (door, export or runtime — not isolated)
found: P78 TPL-011 s3 (V1-2), 2026-09-26
evidence: dev-docs/tasks/phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md §3c "V1-2 done (s3)", "Found building it" (third bullet)
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
