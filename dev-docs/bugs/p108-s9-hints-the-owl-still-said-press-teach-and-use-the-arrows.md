---
id: P108-S9-HINTS
title: The owl's hints still taught the pre-Blockly way — "press Teach and use the arrows", "the same little dance"
status: fixed
commit: c25fb8ee5
severity: low
area: template / Olive's Island — the shell's voiced hints (garden-desktop/shell/olive-templates.json hints), cg002Content HINTS/words, cg003Content REQUEST_SUBS
found: P108 (the island works) s9, 2026-10-03 — Richard, after the children played on the Windows tablets
evidence: scripts/devtools/drive-p108s9.js --mode 2d HINTS (the owl's line leads with a block; the tulips' line starts "Build Pip's steps from the blocks"); on the template before s9 the owl said "Drive Pip yourself first: press Teach and use the arrows."
---

IW-004 put real Blockly in the Workshop, but hintStart / hintEmpty / hintPattern (voiced, the shell's table), the
Drive-mode hint, the empty-steps line and two request lines still told a child to drive with the arrows first. They
now lead with the blocks (tap or drag a block; a repeat block); Teach stays as the second way. The exam's voice-hint
probes (P22/P35) read hintWet, unchanged. The Mac and Windows apps carry the shell table: rebuild them.

**Plain words:** *"The owl now tells them to tap or drag blocks, not to drive with the arrows."*
