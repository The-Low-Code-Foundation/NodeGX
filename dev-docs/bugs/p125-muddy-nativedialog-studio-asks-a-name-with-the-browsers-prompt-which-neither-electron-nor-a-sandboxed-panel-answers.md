---
id: P125-MUDDY-NATIVEDIALOG
title: Studio asks for a name with the browser's native prompt() and confirms with confirm(); Electron never implements prompt and a sandboxed panel answers both with nothing, so New option set, New attribute, New data type and New style do nothing where Studio ships, and every delete in the hosted panel silently refuses
status: open
severity: high
area: "nodegx-studio `editor/studio.html` (`#newoptset` 5431, New attribute 5468, `#newtype` 4649, New style 5489 and 5504 call `prompt()`; nine `confirm()` calls 4716–5534); the gates stub both (`editor/check.mjs:481,496,499,514`, `editor/data-check.mjs:170`)"
found: Richard's Muddy Paws Shelter run in Claude Desktop, 2026-10-27 (his point 2: "When I click 'add' in option sets, I can't add, nothing happens")
evidence: dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md §1.2 — READ: five prompt() and nine confirm() call sites; the fake host grants `allow-scripts allow-same-origin allow-forms` and no `allow-modals` (`dev-docs/tasks/phase-125-co-construction/tools-fake-host.mjs:13`), under which prompt() is null and confirm() false; Electron documents prompt() as unsupported, and both the desktop Studio and Claude Desktop are Electron; the gates pass because they replace window.prompt before clicking
owner: none
launch: beta
---

Fix (words): Studio's own inline name field and confirm card, the way it already draws popovers and menus; no native
dialog anywhere in `studio.html`; `check:editor` and `check:data` drive the real controls instead of stubbing
`window.prompt` and `window.confirm`, and `check:hosted` makes one option set inside the fake host.

Why it matters for Beta: a tester's first hour in the Data tab includes making a type or an option set, and both
buttons do nothing with no message, in the desktop app and inside Claude Desktop alike.
