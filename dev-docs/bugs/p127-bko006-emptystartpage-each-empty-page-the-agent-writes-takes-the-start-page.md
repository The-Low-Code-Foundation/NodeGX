---
id: P127-BKO006-EMPTYSTARTPAGE
title: Writing pages as empty stubs first moves the app's start page to each new stub in turn
status: fixed
severity: low
area: "editor `pageRegistration.ts` `nextStartPage`: an empty start page counts as the template's placeholder (`isPlaceholderPageGraph`), so the next page written takes the start"
found: P127 BKO-006, 2026-10-27, the book club brief (REPORT.md item 3)
evidence: "MEASURED in the transcript: create_component Pages/Club (a stub) answered startPage /Pages/Club, then Pages/My Books (a stub) answered startPage /Pages/My Books, 'The app opens on My Books.' The agent wrote stubs first because a Navigate to a page that does not exist is refused (REPORT item 7), then reset the start page by hand."
owner: Beta sweep s17 (2026-10-27)
kit: mcp
regression: packages/noodl-mcp/tests/p127EmptyStartPage.test.ts "the second stub leaves home on the first"
commit: 809c2c231
launch: beta
---

Said in the answer, so not silent, but the two rules together make an agent that links pages move home twice. A
fix: only the page `create_project` made counts as the placeholder, not any empty page.

**2 of 3 briefs.** The repair shop's agent met it (REPORT.md item 5), there because the empty starter Home was the placeholder (by the rule's design).

## Fixed 2026-10-27 (Beta sweep s17, 809c2c231)

Not the row's suggested fix ("only the page `create_project` made counts as the placeholder"): nothing records which
page that was, and an empty template Home must still give way. Instead an empty page being **written** never takes
home: `resolvePageRegistration` names the written pages that are placeholder-shaped (`emptyPages`), and moving off a
placeholder takes the first written page that is not; with none, home stays. So stubs written first leave home where
it was, and the first page filled takes it, once. A router with no start page (or a dangling one) still opens on the
first page, empty or not, as a router must mount something. The editor resolves before its apply, when a new page is
not in the project yet: such a page may take home as before.

Graded: editor `aaq-001/pageRegistration.test.ts` 39/39 (the two stub arms red with HEAD's file); the door,
`create_component` Club then My Books, both stubs: home stays on Club (HEAD: My Books). Reaches an agent with the next
`@nodegx/mcp` dist.
