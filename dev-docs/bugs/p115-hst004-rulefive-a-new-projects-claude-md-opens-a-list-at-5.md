---
id: P115-HST004-RULEFIVE
title: "seeded CLAUDE.md / AGENTS.md: \"Where the person sees this app\" quotes the canon's rule 5 with its number, so a new project's agent file has a list that starts at 5 with no 1 to 4"
status: open
severity: low
area: agent config (`packages/noodl-editor/src/editor/src/models/template/agentConfig.ts` ~204–230, the canon quote; pinned verbatim by `packages/noodl-mcp/tests/p128CanonPin.test.ts`)
found: P115 HST-004 session 2, 2026-11-04, the CLAUDE.md `create_project` wrote into Fixture B
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/b-newsletter/CLAUDE.md
kit: core
---

`create_project` writes CLAUDE.md and AGENTS.md whose "Where the person sees this app" section quotes, verbatim, a
run of the canon's "For the agent (the rules, not copy)" section that begins at its item 5:

> 5. A fixed list (a language, a status) is a `Static Data` node holding a JSON array, …

Items 1–4 are not quoted, so the agent file shows a numbered list beginning at 5, which reads as if four rules were
lost. Same text in the OWN-034 runs' seeded files (`dev-docs/tasks/phase-112-your-own-nodegx/own-034/runs/*/app/*/CLAUDE.md`).

The quote is pinned word for word against `docs/CANON.md` (`p128CanonPin.test.ts`), so the fix is the canon lane's
call: quote from the rule's first word (dropping "5. "), number the rule apart in the canon, or quote the whole list.
