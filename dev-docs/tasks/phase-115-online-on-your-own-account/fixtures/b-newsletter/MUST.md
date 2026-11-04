# Fixture B online: what it must do (HST-002; ticked per run by HST-004 and HST-008)

- [x] The page opens on a phone from its public address, and the form is usable there. *(Richard, 2026-11-04: "same as my laptop")*
- [x] Subscribing with an email says "You are on the list". *(Richard, 2026-11-04, on the deploy)*
- [x] The list's service received that email with the key (the stand-in's log shows the email and the key's fingerprint). *(12:57:49 UTC, fingerprint matched, HST-004 §8.5)*
- [ ] Subscribing with the field empty says why, and the service receives nothing. *(❌ 2026-11-04: said "You are on the list" and the call went out, P115-HST004-BLANKREQUIRED; fixed `21bb85fc3`, the service now receives nothing; the page's sentence waits on Richard's retry)*
- [x] The key is nowhere in the page: not in its files, not in any answer the browser gets. *(0 in uploaded files, `/`, `env.js`, `app.js`, both answers, HST-004 §8.5)*
- [ ] The daily job ran on day 2 at 08:00 UTC without anyone touching anything (the stand-in's log shows the digest call).
