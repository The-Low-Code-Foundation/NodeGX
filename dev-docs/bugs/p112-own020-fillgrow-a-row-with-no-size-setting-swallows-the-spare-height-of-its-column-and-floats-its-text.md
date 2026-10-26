---
id: P112-OWN020-FILLGROW
title: "A Group with no size setting fills its parent (flex 100), so a small header row inside a full-height column swallows the spare height and floats its text far above the content below; nothing warns the agent"
status: needs-ruling
phase: P112
task: OWN-020
severity: medium
area: runtime / Group default sizing (fill) inside a content stack; render_report / validate (no warning)
found: P112 OWN-020 s1, 2026-10-16 (Richard on CGQ1, GLM-5.3 in Cline: "the question 3 of 5 / time bar is quite far above the question block")
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12 (CGQ1); CGQ1 in the OWN-020 gallery, Pages/Quiz, Group `q_meta`
kit: core
---

What a person sees: on CGQ1's quiz screen, "Question 3 of 5" and the timer float well above the question, with a large
empty band between them.

What the agent wrote: a full-height page band (minHeight 100%) → a column shell (rowGap 20 px) holding a header row
(`q_meta`: flexDirection row, justify space-between, alignItems center, **no sizeMode**), the question Text and the
answers Group (sizeMode contentHeight).

Measured at 390×844 (CDP): the shell grows to 780 px; the header row, having no size setting, takes the Group default
(`flex: 100 1 auto`, fill) and absorbs the spare height: **251 px tall for 17 px of text**, its text centred at y=141.
The question sits exactly 20 px (the rowGap) below the row's edge, so the design was right and the default moved it.

Same root as P112-OWN020-PILLWRAP: a visual node with no size setting fills its parent: full width in a row
(PILLWRAP), spare height in a column (this). The default suits page sections and is a trap inside small content
stacks. GLM-5.3 hit both in one app, rendered it and reported it verified.

Fix options (Richard rules, together with PILLWRAP): a render_report finding "a container far taller than its content"
(slack ratio) and "a short text wrapped with room to spare"; a validate hint on a no-sizeMode Group inside a
content stack; the kit's style guidance (headers, pills and labels take contentHeight / contentSize); or a default change.

**Ruled by Richard, 2026-10-26:** warn and teach, no default change; it must demonstrably work for a person in Studio.
The ruling and its done-condition are written in full on P112-OWN020-PILLWRAP.
