# HST-002 — Three fixtures, one per shape

**Opened 2026-10-07.** **Depends on HST-001.** **Status: 📋 not started.** Kind: fixtures.

## 1. The person sentence

> **Three small apps, one for each shape in README §3, each with a one-page list of what it must do once it is
> online, so that every route is measured on the same three things.**

## 2. What to build

| fixture | shape | what it does | what it must do online |
|---|---|---|---|
| `fixtures/a-landing` | A | three pages, a contact form that posts to a form service, no secret | serves at the domain; the form arrives; nothing else |
| `fixtures/b-newsletter` | B | HST-001's flow minus the records: the link id, a server-side hook carrying a secret to a stand-in Mailchimp, a scheduled job that runs once a day | the secret never reaches the browser; the hook arrives; the job ran on day 2 |
| `fixtures/c-campus` | C | HST-001's whole flow: records by id, a login for the owner to read them, one file upload | records persist across a redeploy; the owner can read them and nobody else can; the file is served |

Each fixture is a NodeGX project the MCP wrote (HST-001's method), not hand-built, so that the plumbing is tested on
what an agent produces. Each has `MUST.md`: the online list above, as checkboxes, which HST-008 ticks per run.

## 3. Acceptance criteria

1. Three projects exist, each opens in the editor with zero new validator diagnostics, each renders in the preview.
2. Each `MUST.md` has at most eight lines, and every line is checkable by a person with a phone.
3. Memory: a budget measured on a fixture is a budget on the fixture. The fixtures' sizes are recorded so that HST-003's
   phone measurement is read against them.

## 4. Not this task

Deploying them. Making them templates (P78). Making them good.
