---
id: P127-BKO006-EMPTYSTARTPAGE
title: Writing pages as empty stubs first moves the app's start page to each new stub in turn
status: open
severity: low
area: "editor `pageRegistration.ts` `nextStartPage`: an empty start page counts as the template's placeholder (`isPlaceholderPageGraph`), so the next page written takes the start"
found: P127 BKO-006, 2026-10-27, the book club brief (REPORT.md item 3)
evidence: "MEASURED in the transcript: create_component Pages/Club (a stub) answered startPage /Pages/Club, then Pages/My Books (a stub) answered startPage /Pages/My Books, 'The app opens on My Books.' The agent wrote stubs first because a Navigate to a page that does not exist is refused (REPORT item 7), then reset the start page by hand."
owner: none
---

Said in the answer, so not silent, but the two rules together make an agent that links pages move home twice. A
fix: only the page `create_project` made counts as the placeholder, not any empty page.

**2 of 3 briefs.** The repair shop's agent met it (REPORT.md item 5), there because the empty starter Home was the placeholder (by the rule's design).
