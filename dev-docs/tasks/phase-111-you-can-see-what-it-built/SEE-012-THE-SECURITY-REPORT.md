# SEE-012 — The security report: one page that says who can do what to your app's data

**Opened 2026-10-06** from [DIRECTION.md](../../DIRECTION.md) D1 (ruled by Richard: the per-app security report lives
in this phase; P53 stays the phase for regulated domains). **Depends on nothing built elsewhere for step 1.**
**Status: 📋 not started.**

## 1. The person sentence

> **I ask for my app's security report and read, in plain words, who can see, add, change and delete each kind of
> record, where a key or password sits in the project, and what my app sends to other servers. Anything risky comes
> first.**

## 2. Why

Security is one of the four reasons in DIRECTION.md §3, and nothing reports on one app's security today. A vibe coder
can't read a permission file. They can read "anyone on the internet can delete your bookings".

## 3. What exists, measured 2026-10-05

| # | fact | where |
|---|---|---|
| 1 | Each project's rules are a file in the project, `nodegx.security.json`: a default per operation (`find`, `get`, `create`, `update`, `delete`), per-collection rules, function rules, file rules, signup, `creatorOwns` and a `devOpen` flag. A rule is `public`, `authenticated`, `nobody` or `role:<name>`, or a list of them. | `packages/nodegx-backend/src/security/model.ts` |
| 2 | The default when no file exists is `devOpen: true`, with every operation `authenticated`, file read `public` and signup `public`. | `defaultSecurityConfig()`, same file |
| 3 | 5 of the 13 template folders carry a `nodegx.security.json`. | `templates/*/nodegx.security.json` |
| 4 | HTTP Request's Bearer, Basic and API-key presets have never sent a credential (P107 row C7). | P107 README, NSP-007's rows |
| 5 | The backend manager shows rules and key scopes to a person (P104). | P104 README |

## 4. What to build

1. **The rules in sentences.** For each collection, function and file rule, one sentence per operation in the person's
   words, generated from `nodegx.security.json` or from the default when the file is missing.
2. **The risky ones first.** `devOpen` on, `public` write or delete, a collection read by `public` that holds user
   fields, and signup `public` on an app that looks private. Each with the line to change.
3. **Secrets in the project.** Parameters and script files that hold a key, token or password, by node and port.
4. **What leaves the app.** Every HTTP Request and REST node's host, with whether it sends a credential.
5. **Where it shows.** One MCP tool, the same report in `render_report`, and a line in the MCP result of any write
   that makes the report worse.

## 5. Acceptance criteria

1. The report on each template with a security file names every collection and operation, and a test compares it with
   the file.
2. A project with no security file is reported as running on the default, with `devOpen` first.
3. A key planted in a Function node's script is found and named by node.
4. Richard reads one template's report cold and says whether he understood who can do what.

## 6. Watch for

- Memory: *absence derived from a partial request is a lie*. "No secrets found" is only said for the places the scan
  read, and the report lists those places.
- Memory: *a project scan must read both project formats*. The scan reads the v2 files and the legacy single file.
