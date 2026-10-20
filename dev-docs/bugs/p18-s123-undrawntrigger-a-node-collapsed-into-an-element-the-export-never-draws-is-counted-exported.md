---
id: P18-S123-UNDRAWNTRIGGER
title: A node collapsed into an element the export never draws is counted exported, and never runs
status: open
severity: medium
area: export / dispositions and the report
found: P18 session 123, 2026-10-17, reading the emitted diff of every node the Failure chain gained
evidence: dev-docs/tasks/phase-18-code-export-v2/s123-failchain/README.md; EXP-011 §90.5 (10 of 26 template gains); s122's nightbook "A fresh form"
---

A handler chain is compiled for an element whether or not the export draws it. When the element is removed from the tree
(its Mounted authored false, or bound to a value the export refuses), the chain's nodes are "collapsed" into it, the
report counts them exported, and the emitted page declares their Function and node and never runs them.

Measured in the shipped templates: **members-area's Announcement and Meeting Remove** (4 nodes each): the section is
mounted by `/Members/Chrome`'s isModerator, which a logic-only component (`/Members/Standing`) feeds and the export does
not lift, so a moderator can never remove an announcement or a meeting in the exported app. **nightbook's Tonight "No
question tonight"** (2): its button sits in a box authored Mounted false. s122's nightbook "A fresh form" is the same.

Fix, its size: after the render pass, a node collapsed into an element that is not drawn is refused with that element's
reason ("its trigger, <element>, is not drawn: <why>"). Small to medium; it lowers counts honestly. The members-area
case also needs the logic-only component lifted (a separate, larger slice).
