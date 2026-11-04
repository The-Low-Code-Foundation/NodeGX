# Architecture

## Page map

- **Home** (`Pages/Home`) — An email field, a Subscribe button, and a line that says whether it worked.

## Data model

> TODO: No records were agreed during scoping.

## Backend contracts

No records. One cloud function, subscribe, which reads the MAILCHIMP_KEY secret and calls the mailing list's API (a stand-in in the spike). The daily digest is a backend workflow in nodegx.automations.json on a schedule trigger, written by hand in session 1.

## Decisions

Considered during scoping and deliberately not done:

- **Calling the mailing list's API from the page** — The key would be in the browser; the whole point of shape B is a secret that stays on the server.
- **A Function (code) node in the cloud function** — A Cloudflare Worker refuses new Function, so a code node inside a cloud function answers a silent default there (HST-004 §6.4). HTTP Request and Secret run without one.

_Scoping record: `docs/decisions/000-initial-scope.md`._
