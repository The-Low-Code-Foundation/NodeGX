# HLT-015 — verdict, 2026-09-21 (P99 s12)

**Opening a magic link spends nothing now. Only the button on the page it opens does.** Graded on a
real `BackendService` listening on a real socket, with real `curl` and a real headless Chrome load.
Every token reading comes from the `_EmailToken` row, never from a page.

| one fresh link | HEAD (control) | fixed |
|---|---|---|
| 1st `curl` GET | **302** → `/auth/signed-in?nodegx_auth=…` (signed in) | **200** *"Sign in to Drive App"*, no `Set-Cookie`, no `Location`, no `nodegx_auth` |
| 2nd and 3rd `curl` GET | **400** *"Sign-in link expired"* | **200**, same page |
| Chrome loads the link (the person, after the scanner) | *"Sign-in link expired"* | *"Sign in to Drive App"* |
| token row after 3 GETs + 1 browser load | `consumedAt` set | **byte-identical to before**, `consumedAt: null` |
| sessions minted by those 4 loads | **1** | **0** |
| `POST` `token=` | 404 (no such route) | **302** to the row's own `redirectUrl` + `nodegx_auth`; row consumed; **1** session |
| 2nd `POST` | 404 | **400** *"Sign-in link expired"* |

Readings: [`drive-head.json`](./drive-head.json), [`drive-fixed.json`](./drive-fixed.json). The drive
is [`hlt015.drive.test.ts`](./hlt015.drive.test.ts). To re-run it, point `roots` in
[`jest.drive.config.js`](./jest.drive.config.js) at this folder and set `HLT015_OUT`. It goes through
the package's jest config because ts-node cannot resolve the backend's `@cloud-runtime` aliases.
The HEAD arm parks the three `src` files, then writes `git show HEAD:<path>` over them and copies
them back. It never uses `git checkout --`.

## 1. §2 measured TRUE

`magicLinkCallback` → `consumeRow` on the GET, exactly as written. The fifth task file in this
phase whose §2 held.

## 2. What was built (§3's shape, all six points)

- `EmailTokenStore.peekRow`: every check `consumeRow` makes, and no write. `consumeRow` is now
  `peekRow` plus the save, so the two cannot drift.
- `GET /auth/magic-link/callback` → `openMagicLink`: it peeks and renders *"Sign in to
  &lt;backendName&gt;"* with one plain form button. There is no script, the form's `action` is relative
  (`callback`, so it survives a proxy prefix), and the page sends `Cache-Control: no-store` and
  `Referrer-Policy: no-referrer`, because the token is in its URL. A missing, unknown, expired or
  spent token renders the one expired page, byte for byte.
- `POST /auth/magic-link/callback` → `magicLinkCallback` (form or JSON `token`): the old GET's body,
  unchanged. The same linking rule, the same handoff, the same redirect.
- Rate limits: `auth:magic-consume` (20/15 per min, burst 20) moved to the POST. The GET gets
  `auth:magic-open` (60/15 per min, burst 60).
- `BACKEND-AUTH.md` no longer says that opening the link signs you in. **The email said it too.**
  The shipped `magicLink` template read *"Anyone who opens it is signed in"* in both its text and
  HTML bodies, so every mail sent carried the defect's sentence to the person. It now reads
  *"Anyone who has it can sign in with it"*.

## 3. Criteria

| AC | | reading |
|---|---|---|
| 1 | ✅ | HEAD arm above: the GET mints a session, the next GET is expired |
| 2 | ✅ | 3 `curl` GETs + 1 Chrome load: no cookie, no redirect, row unchanged |
| 3 | ✅ | the POST lands on the row's `redirectUrl`; the 2nd POST is expired. ⚠️ The press was a `curl` form POST, not a click in Chrome: `--dump-dom` cannot press. The button is a plain `<form method="POST">`, so the encoding is the same, but a *click* is still owed, and AC7 does it |
| 4 | ✅ | `tests/hlt-015-magic-link-scanner.test.ts`: unknown, expired, spent and empty → identical bodies |
| 5 | ✅ | backend **166/168 suites, 2004 passed**. The 2 reds are `tpl008-theme-drive`/`tpl008-todo-drive` (*"no theme switch is drawn"*), **red with HEAD's auth files too** (8/9, measured). New spec 5/5. With `consumeRow` put back in the GET, it fails **by name**: *"the GET handler cannot reach consumeRow…"* (2/5 red) |
| 6 | ✅ | `docs/runtime/BACKEND-AUTH.md` §Magic links, plus the email template |
| 7 | 📋 | **the DBT stream's**, as the task says (its L171). Left open at the owner's request |

## 4. Things a later reader should know

- **The route tally moved by one** (`ops-rate-limit.test.ts`: `auth` 15 → 16), with the reason
  written beside the number, as every earlier move was.
- **BAK-004's `clickMagicLink` helper now opens, then presses.** Any other harness that redeems a
  link with one GET will now get a page instead of a redirect. A repo-wide search found no other
  caller.
- ⚠️ **The first drive hung, and it was my instrument.** A synchronous `execFileSync('curl')` in the
  process that also hosts the server blocks the event loop the server needs to answer. It is async now.
- ⚠️ The shell's `grep` skipped `HttpServer.ts` as binary and reported *"nothing mounts OAuthRoutes"*.
  `/usr/bin/grep -a` finds it at line 61. That false alarm cost ten minutes.
