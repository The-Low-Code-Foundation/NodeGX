---
id: P112-OWN008-EDITGAPS
title: "The editor suite's eight edits can't detach a child, unset a label or a position, make a visual root, or add a port to a component's interface, so an editor that offers these is graded on none of them"
status: open
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/project-contract` `editor-suite` (`EDIT_KINDS`, `applyEdit`)"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/table/REPORT.md (questions 3, 4), own-008/map/REPORT.md (questions 8, 11)
kit: project-contract
---

Found by two OWN-008 strangers:

- `add_node` with no parent leaves a visual node out of `visualRoots`, and `add_child` doesn't take a former root out
  of `visualRoots`. An editor that follows the reference can make a node that's never drawn, and can't make a new
  root. The map stranger's own drive did, and `validate_project` warned.
- There's no edit for detaching a child, or for unsetting a label or a position. The table stranger refused these in
  its editor.
- There's no edit for adding or removing a port on a Component Inputs or Component Outputs node, so rewiring across
  components can't be graded. The map stranger refused it in its editor.

**Fix shape:** decide which of these are edits a person makes. Add each with its reference semantics and a fixture
script line. `add_node` of a parentless visual node should either join `visualRoots` or be refused.
