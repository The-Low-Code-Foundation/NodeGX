# Fixture C online: what it must do (HST-002; ticked per run by HST-006 and HST-008)

Ada's link is `<address>/home?id=6f468bbd-4091-48c8-90a1-9232f4753a90`; on the Cloudflare run (HST-006 §8) the address is
`https://hst-backend-spike.richard-digitalbricks.workers.dev`. The owner and the second account are in
`.accounts.json` beside this file (not committed).

- [x] Ada's link opens on a phone from its public address and says "Hello, Ada". *(Richard, 2026-11-05, his phone)*
- [x] Pressing "Count me in" says the answer is saved. *(Richard, 2026-11-05, his phone)*
- [x] A link with a made-up id says it is not recognised, and shows no name. *(Richard, 2026-11-05, his phone)*
- [x] On `/owner`, the owner signs in and reads Ada's answer. *(Richard, 2026-11-05, his phone)*
- [x] Signed in as the second account, the page says it cannot read the answers, and shows no name. *(Richard, 2026-11-05, re-read after the fix: "I can't see Ada's answer or any answers anymore, just the 'this account can't read' message". First read ❌ it showed Ada's answer beside the refusal, after the owner had signed out on the same phone — P115-HST006-STALEROWS, fixed and live `34f862a8`; his re-read owed)*
- [x] Signed out, `/owner` shows only the sign-in form, and the answers' address refuses a signed-out caller (HST-006 records the request). *(Richard, 2026-11-05, his phone)*
- [x] After a redeploy, Ada's answer is still on the owner's list. *(his tap's answer, read after the redeploys `a0c7bb47` → `34f862a8`, HST-006 §8.6; his own look on the next visit)*
- [x] A file the owner uploads opens at its link. *(Richard, 2026-11-05, his phone on `d068aad3`: "Uploaded a file on my phone as owner, opened it, it works!"; files on R2 through a binding, HST-006 §8.7)*

**Run 2 — the deploy COMMAND (HST-014, 2026-11-06), `https://hst-campus.richard-digitalbricks.workers.dev`:** Richard ran
`packages/nodegx-backend/cloudflare/deploy.mjs` from his terminal; data added through the admin API and the app's own
sign-up (`fixtures/check-campus-deploy.mjs --seed`, no boot). Lines 1–6 and 8 ✅ on his phone (*"Done! All worked as
expected"*); line 7 ✅ after a third run of the command, his answer on the owner's list (read over HTTP, HST-014 §5.5).
