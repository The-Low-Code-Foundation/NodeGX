# CCN-004 — Look first

**State:** open. **After:** CCN-003.

Richard's 45 minutes are mostly colours, fonts, sizes and buttons that were wrong from the first page. So the look is
settled before any page exists: the model calls `get_style_vocabulary` / `set_project_tokens`, writes ONE sample
component (a card, a button, a heading), and Studio shows it with the Styles tab open. The person accepts there. Until
`.nodegx-look-accepted` (or the equivalent flag in `nodegx.project.json`) says so, a `page` component write is refused:
"the look is not settled; show a sample and ask". A project opened with pages already in it is past this gate.

**Vehicle (2026-10-25):** the sample is shown in a mini editor ([CCN-008](CCN-008-A-MINI-EDITOR-IN-THE-MESSAGE.md)), not the whole Studio: the sample button or card with its colour, font and size settings, Approve = the look is accepted.
