# 000 — Initial scope

_Recorded 2026-11-04T10:24:29.552Z, from the scoping conversation held before this project was created._

## What was asked for

> Fixture B of P115 HST-002: "HST-001's flow minus the records: the link id, a server-side hook carrying a secret to a stand-in Mailchimp, a scheduled job that runs once a day." Online it must: keep the secret out of the browser; the hook arrives; the job runs on day 2.

## What was decided

**The app.** A one-page newsletter sign-up: a reader types their email and presses Subscribe, and a cloud function adds them to the mailing list with a key the browser never sees.

**Who it is for.** A reader who found the newsletter's link on their phone and wants to sign up in one step. The fixture exists so that P115 measures a deploy to Cloudflare on what an agent writes.

**Pages.**

- Home — An email field, a Subscribe button, and a line that says whether it worked.

**Backend.** No records. One cloud function, subscribe, which reads the MAILCHIMP_KEY secret and calls the mailing list's API (a stand-in in the spike). The daily digest is a backend workflow in nodegx.automations.json on a schedule trigger, written by hand in session 1.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **Calling the mailing list's API from the page** — rejected: The key would be in the browser; the whole point of shape B is a secret that stays on the server.
- **A Function (code) node in the cloud function** — rejected: A Cloudflare Worker refuses new Function, so a code node inside a cloud function answers a silent default there (HST-004 §6.4). HTTP Request and Secret run without one.

## Deliberately out of scope

- Records of any kind (that is Fixture C)
- Sign-in
- Unsubscribing
- Being a good-looking newsletter page (HST-002: not making them good)

## Still open

Nothing was left open in the conversation.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **update `Pages/Home`** — An email field, a Subscribe button, and a line that says whether it worked. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "Fixture B of P115 HST-002: \"HST-001's flow minus the records: the link id, a server-side hook carrying a secret to a stand-in Mailchimp, a scheduled job that runs once a day.\" Online it must: keep the secret out of the browser; the hook arrives; the job runs on day 2.",
    "operations": [
      {
        "id": "op-1",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "An email field, a Subscribe button, and a line that says whether it worked. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
