---
id: P78-TPL011-MOUNTED
title: A wired Mounted input that has no value yet leaves the node mounted, so a gated screen flashes
status: needs-ruling
severity: medium
area: runtime / visual nodes' Mounted input
found: P78 TPL-011 s3 (V1-2), 2026-09-26
evidence: dev-docs/tasks/phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md §3c "V1-2 done (s3)", "Found building it" (second bullet)
---

A visual node whose `Mounted` is wired from a gate stays mounted (the default, `true`) until the first value arrives.
In Nightbook, the Tonight page, a child's private journal, was drawn behind a locked book for a moment, and the Unlock
card flashed before Setup. Measured in the running app.

**Where:** the `mounted` input's default on visual nodes (`packages/noodl-viewer-react`, the base visual node). An
unconnected default and a connected input still waiting for its value behave the same. Not re-measured since
2026-09-26.

**Workaround:** every Mounted is a strict `=== true` expression, and the gated groups start with `mounted: false`.

**Ruling wanted:** should a node whose `Mounted` is connected start unmounted until its first value arrives? That is
safer for any gate, and it changes the first frame of every app that wires Mounted. Alternatively the door could warn
on a wired Mounted whose parameter is not set to `false`. Small either way. The first option is a behaviour change.
