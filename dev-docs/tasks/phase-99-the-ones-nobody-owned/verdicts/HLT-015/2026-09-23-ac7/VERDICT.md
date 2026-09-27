# HLT-015 AC7 — verdict, 2026-09-23 (from the DBT stream, its TASK-L171)

**Met.** Driven end to end from the Digital Bricks Training template's own sign-in page
(`templates/digital-bricks-training/components/Pages/Sign in`), on a local backend on the template's
project, with Mailpit as the SMTP sandbox. The drive is in the DBT repo's L171 Status block.

| step | reading |
|---|---|
| a known and an unknown address, `POST /auth/magic-link` | **200 `{}` both, one md5** (`99914b93…`); Mailpit received **one** message, for the known address only |
| the link read out of Mailpit, then `curl` GET ×2 | **200** *"Sign in to Digital Bricks Training"* both times; **no** `Set-Cookie`, **no** `Location` |
| a real Chrome opens the link and presses the button | redirected to the app, **signed in** as the address the mail went to; Home offers that person's way on |
| the same token POSTed again | **400** *"Sign-in link expired"* |
| clicked through in ONE browser context, both people | the learner's door → mail → confirm → course → lesson → back → sign out → the trainer's door → mail → confirm → People → the learner → back: **0 page errors** |

**One thing found beside it, not this row's:** `POST /oauth/exchange` returns the user WITHOUT
`roles`, though its docblock says it is *"deliberately the SAME shape `/login` returns"* and `/login`
and `/users/me` both carry them (DEF-005 (a)). After a magic link a page cannot tell a coach from a
learner until it asks again; the template asks once. Offered to Richard as a new row.

**Also found:** the magic-link send limit is 5 per 15 minutes per IP (`MAGIC_SEND_POLICY`). A drive
that tries both doors a few times meets a **429** on the sixth request, which a sign-in page can only
report as "could not be requested just now". Working as designed; recorded because it reads exactly
like a broken form the first time.
