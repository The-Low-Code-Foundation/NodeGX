---
id: P121-TWO004-DETAILFILTER
title: Opening a run's Detail drops the Runs page's filter — "Runs of this trigger" becomes every run
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: backend / admin app, Runs (`packages/nodegx-backend/src/admin/app/views/runs.tsx`: `navigate('runs', x.id)`, and `navigate('runs')` on close)
found: P121 TWO-004 s11, 2026-10-15
regression: packages/nodegx-backend/tests/admin-app/runs-view.test.tsx "Detail opens with the query kept, the list behind it still filtered, and Close comes back to it"
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-004-PAYSTACK.md §10
---

From a trigger, "Runs of this trigger" opens `#/runs?trigger=<id>`: "Showing 1–5 of 5 where trigger is Paystack
Ghana". Pressing Detail on one row goes to `#/runs/<id>` with no query, so the list behind the dialog reloads with
every run ("Showing 1–10 of 10", screenshot `shots/two004-hook-laptop-7-refused-detail.png`), and closing the dialog
goes to `#/runs`, also without the filter. A person checking one hook's refused calls has to set the filter again
after each Detail.

Fix, proposed: keep the query on the Detail's route and on the way back.

**Fixed (the Beta sweep s6, 2026-10-25).** `router.ts` `navigateWith(view, params, query)` beside `hrefWith`; Detail goes
to `#/runs/<id>?<the route's query>`, and Close (and a Detail that fails to load) back to `#/runs?<query>`. The query is
unchanged across the trip, so the page's filter rows (edits made on the page included) are not reset.

**Graded.** `runs-view.test.tsx` mounts the page as the App does (`useRoute` → params and query): red at HEAD with
`#/runs/exec_9` for `#/runs/exec_9?trigger=trg_9`; green after, the list never re-read unfiltered, "where trigger is
Paystack Ghana" before, during and after. Two mutants red (Detail without the query; Close without it). Admin app
17 suites 204/204, its tsc clean. Not rendered in a browser.
