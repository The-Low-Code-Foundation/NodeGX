---
id: P125-MUDDY-NATIVEDIALOG
title: Studio asks for a name with the browser's native prompt() and confirms with confirm(); Electron never implements prompt and a sandboxed panel answers both with nothing, so New option set, New attribute, New data type and New style do nothing where Studio ships, and every delete in the hosted panel silently refuses
status: fixed
commit: nodegx-studio 97574ac
severity: high
area: "nodegx-studio `editor/studio.html` (`#newoptset` 5431, New attribute 5468, `#newtype` 4649, New style 5489 and 5504 call `prompt()`; nine `confirm()` calls 4716–5534); the gates stub both (`editor/check.mjs:481,496,499,514`, `editor/data-check.mjs:170`)"
found: Richard's Muddy Paws Shelter run in Claude Desktop, 2026-10-27 (his point 2: "When I click 'add' in option sets, I can't add, nothing happens")
evidence: dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md §1.2 — READ: five prompt() and nine confirm() call sites; the fake host grants `allow-scripts allow-same-origin allow-forms` and no `allow-modals` (`dev-docs/tasks/phase-125-co-construction/tools-fake-host.mjs:13`), under which prompt() is null and confirm() false; Electron documents prompt() as unsupported, and both the desktop Studio and Claude Desktop are Electron; the gates pass because they replace window.prompt before clicking
owner: "Beta sweep s21 (2026-10-27), as P128 S4, on Richard's yes"
launch: beta
---

Fix (words): Studio's own inline name field and confirm card, the way it already draws popovers and menus; no native
dialog anywhere in `studio.html`; `check:editor` and `check:data` drive the real controls instead of stubbing
`window.prompt` and `window.confirm`, and `check:hosted` makes one option set inside the fake host.

Why it matters for Beta: a tester's first hour in the Data tab includes making a type or an option set, and both
buttons do nothing with no message, in the desktop app and inside Claude Desktop alike.

## 2026-10-27, Beta sweep s21 (as P128 S4): fixed, nodegx-studio 97574ac

Studio's own `askName` (a field under what was pressed: Enter or Create, Esc or a click outside) and `askSure` (a card
over the page; Cancel focused on a delete) replace all 5 `prompt()` and 9 `confirm()`. The gates no longer stub
`window.prompt`/`window.confirm`: `check:editor` and `check:data` type into the field and press the card. Measured:

- **Red at HEAD:** `check:hosted`'s new section in the fake host's sandboxed frame (no `allow-modals`): New option set
  `{"asked":false,"made":false}`, New data type the same (19/21; the 19 older checks green).
- **Green after:** `check:hosted` 25/25 (option set, attribute, type made in Studio's field; option set and type deleted
  through the card; Export below), `check:app` 64/64 with a new section 2c doing New type, option set, attribute and
  style and their deletes in the real Electron window, `check:editor` 204/204, `check:data` 80/80, `check:timeline` 53/53.
- Found on the way: P128-S4-STYLEDELETE (Delete style never deleted, fixed), Make a live database reading its click's
  `currentTarget` after the question (fixed in the same commit, `check:data`'s STU-065 section).
- STU-082's census (nodegx-studio `docs/SCOPE.md`): Export's `<a download>` saved nothing in the frame while the toast
  said "exported"; inside a host it now goes to the host's `ui/download-file`. Import's chooser opens in both arms.

**Not yet where Richard sees it:** Claude Desktop draws the panel from the Studio the `.mcpb` bundles, so this reaches
him with the next `.mcpb` packed from nodegx-studio 97574ac or later. Whether Desktop offers `downloadFile` is not
measured (the fake host offers it; without it Export says to open Studio with Window ↗).
