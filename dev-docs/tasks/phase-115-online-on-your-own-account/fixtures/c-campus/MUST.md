# Fixture C online: what it must do (HST-002; ticked per run by HST-006 and HST-008)

Ada's link is `<address>/home?id=6f468bbd-4091-48c8-90a1-9232f4753a90`; on the Cloudflare run (HST-006 §8) the address is
`https://hst-backend-spike.richard-digitalbricks.workers.dev`. The owner and the second account are in
`.accounts.json` beside this file (not committed).

- [ ] Ada's link opens on a phone from its public address and says "Hello, Ada".
- [ ] Pressing "Count me in" says the answer is saved.
- [ ] A link with a made-up id says it is not recognised, and shows no name.
- [ ] On `/owner`, the owner signs in and reads Ada's answer.
- [ ] Signed in as the second account, the page says it cannot read the answers, and shows no name.
- [ ] Signed out, `/owner` shows only the sign-in form, and the answers' address refuses a signed-out caller (HST-006 records the request).
- [ ] After a redeploy, Ada's answer is still on the owner's list.
- [ ] A file the owner uploads opens at its link. *(Waits on R2, Richard's go: built after it.)*
