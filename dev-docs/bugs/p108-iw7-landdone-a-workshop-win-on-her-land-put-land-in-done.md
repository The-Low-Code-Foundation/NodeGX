---
id: P108-IW7-LANDDONE
title: A Workshop win on her land put "land" in her list of won requests
status: fixed
commit: 343a0b8e3
severity: low
area: template bot-garden / Complete request
found: P108 IW-007 s6, 2026-10-01 (measured with the page's scripts before building)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 6"
---

Her land is never "won" (its buildings rise on the island), but `Logic/Complete request` pushed `land` into
`island.done` like any request, and said Newly Done. Nothing visible read it yet; the crew's send rule and the
shop's shelf rule read `done`, so it would have leaked.

Fixed: Complete request never puts her land in `done` (`iw7tLand`). Row + arm: `iw007Touch.test.ts`.
