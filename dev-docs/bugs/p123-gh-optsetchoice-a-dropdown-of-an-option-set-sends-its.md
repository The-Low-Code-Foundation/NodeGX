---
id: P123-GH-OPTSETCHOICE
title: A Dropdown of an option set sends its Value, a Choice from that set checks Labels, so every record made from it is refused
status: fixed
severity: high
area: nodegx-studio / option sets × Choice field × Dropdown
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
commit: nodegx-studio b3c6a94 (editor/studio.html, editor/shapes-check.mjs)
regression: ../nodegx-studio/editor/shapes-check.mjs "the backend takes fr, what a Dropdown of Languages sends, and refuses the label Français"
---

Studio makes an option set with Label and Value (Richard's ruling, OPTSETSHAPE). A Choice field "taking its choices
from" that set copies the LABELS into the type's rule (`room is one of Living room, Bedroom, …`). A Dropdown whose
Items are the set hands back the option's VALUE. So once a person fills in the Value column (`living`, `kitchen`…),
a form that saves the Dropdown's value into the Choice is refused by the backend every time:
"This write breaks a rule of "Plant": room is one of Living room, Bedroom, Kitchen, Bathroom, Balcony. It was refused".
The person sees nothing: the form stays where it is.

Measured on Greenhouse's New plant page (Room Values `living…`, Kitchen picked → refused; Values set equal to the
Labels → saved). Related, already noted in SCOPE STU-090 Open: "an option set and a Choice field are still two
things: the choices are copied, not linked".

Ruling wanted: does a Choice store the option's Label or its Value? Then link the Choice to the set (one source of
truth) and make the Dropdown and the rule agree.

**Ruling (Richard, 2026-10-30):** asked "when someone picks Kitchen, what should the plant record store?", he chose
**the Value** (records keep `kitchen`; a renamed label breaks nothing; Studio shows the label where it shows the value).

Fix (nodegx-studio b3c6a94, `editor/studio.html`):
- The field drawer's *Take the choices from an option set* fills the Choice with each option's Value (its Label when
  it has none: what a Dropdown of the set sends), shows which set the choices are from, and says so. A Choice copied
  before (the set's labels) is named in the drawer: "a Dropdown of Rooms sends each option's Value … pick Rooms above".
- The set stays the one source: a Choice whose choices are a set's values (or its labels, copied before) follows the
  set's edits. The rule moves BEFORE the set is written: rows holding a changed Value are counted and asked about
  ("1 record of Task with language fr. Change it …?"), moved under a rule holding both lists, then the final rule; a
  removed option some rows hold is refused in words. Cancel or a refusal leaves the set, rule and rows as they were.
- App data shows a set's Choice by its labels (cell and its picker); Data types says "from Languages: English, Français".

Graded: `check:shapes` 28/28 (new § 4: Task.language from Languages is `en, fr` in the file and on the backend; the
backend takes `fr` and refuses `Français`; App data shows Français; a Value change asks, Cancel changes nothing,
Change them moves row + rule + set; removing a held option is refused). Mutant (the drawer copying labels again):
23/28, five rows red, including the backend taking the label and refusing what the Dropdown sends. `check:editor`
236/236, `check:data` 82/82.

Left: a page in the running app shows a set's Choice by its Value (P123-GH-CHOICELABEL). Greenhouse itself is
unaffected: its Rooms Values were set equal to the Labels during the build.
