# Digital Bricks University: demo

The **Digital Bricks University** template with its backend played by your own browser, so it runs on a web
page with no server and no account. Look as Camille (a learner) or as Richard (her coach), hand in, review,
message, plan: everything works, and nothing leaves the browser.

**Generated, do not edit.** `node tools/build-demo.mjs` in the template writes it, and
`node tools/check-demo.mjs` fails on any difference the generator did not make.

## What is different from the template

- **A service worker is the backend** (`demo-sw.js`). It answers every request under `demo-api/` by running
  the template's own cloud functions against an example world kept in this browser (IndexedDB), built from the
  template's fixtures on the first visit, with its dates around today.
- **No sign-in.** The first page offers two people to look as; the strip at the top switches between them,
  and **Reset demo** puts the example world back.
- **No email.** What the app would have mailed is kept, unsent, inside the demo's store.
- **Hash URLs** (`#/coach/inbox`), so a reload works on a static host.

To run it for real, with a backend, magic-link sign-in and email, start from the template and read its
`docs/START-HERE.md`.
