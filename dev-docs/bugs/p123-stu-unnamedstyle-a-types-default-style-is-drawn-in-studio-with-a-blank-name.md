---
id: P123-STU-UNNAMEDSTYLE
title: "A style with no name (its type's default, worn by every element that names no style) is drawn in Studio with a blank name: a blank row in Styles, an empty name field, \"from undefined\", a blank choice in Design's style menu"
status: fixed
commit: nodegx-studio b4609f8 (studio.html, swept into P132 BWF-003's commit) + the check:editor case
severity: medium
area: nodegx-studio `editor/studio.html` Styles tab (renderStyles, drawStyle) and Design's Style menu / inherited looks
found: P112 OWN-026 §7, 2026-11-03 — Richard, on Watering Can (Mistral Large 4.0 wrote unnamed variants for Button, Text Input and Dropdown)
evidence: ~/wc/watering-can/nodegx.styles.json (three variants with `typename` and no `name`); runtime `graphmodel.ts:422` getVariant matches `v.name === name`
---

**Richard:** "The styles page has a style for the button, the input and dropdown, but they don't have labels for some
reason? The style name field at the top of the props panel is empty for each of them."

**What a nameless variant is:** the runtime finds a node's style with `v.name === node.variant`. A variant with no name
therefore dresses every element of its type that names no style, new ones included: it is the type's default. The
Watering Can's look lives there, so every button, box and dropdown wears it.

**What Studio did:** printed `v.name` everywhere. That gave a blank list row, a blank heading and an empty name field;
"Delete the style ?"; an inherited hover look "from undefined"; and in Design's Style menu a second, blank choice
selected beside "(no style)".

**Fix:** such a style is called **Default Button** / **Default Text Input** / **Default Dropdown**. Its page says "Every
Button that wears no other style wears this one, and so does every new one." Its name field is read only, because naming
it would turn "every Button" into a style that only its present wearers keep. Design's menu starts with "(Default Button)"
instead of "(no style)" and has no blank entry, and *Edit style* opens the default. Wearers were already counted right
(every element of the type that names no style). check:editor writes a nameless Text Input variant from outside Studio
and reads the list, heading, note, name field, wearer count and the Email box's menu.
