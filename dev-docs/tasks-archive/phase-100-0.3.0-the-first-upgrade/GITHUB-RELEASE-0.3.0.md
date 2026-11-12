## NodeGX 0.3.0 — alpha

**Projects made in 0.2 are upgraded when you open them, there is a new Styles panel, and your backend has its own page in the browser.**

This is the first NodeGX release that people upgrade into rather than install fresh, so the minor version moves: 0.3.0 changes what a project holds.

### Your existing project

- **It is upgraded the first time you open it.** NodeGX first copies the whole project folder to `<project>.before-0.3`, then turns its text styles into typography tokens (font files included), and shows a message saying it did. If the copy cannot be made, the project opens unchanged and NodeGX tries again next time.
- **Keep the `.before-0.3` copy** until you are happy with the upgraded project. It is the only copy 0.2 can still open.
- **Nodes that used a Preset keep their look.** The Preset / Size picker is gone; save a styled node as a Look to reuse it.
- **A backend made with 0.2 keeps all its data.** One thing is fixed on its first start: a request 0.2.4 had already answered could run a second time.
- **The backend returns `true` and `false`, not `1` and `0`.** An app that compares with `=== 1` needs changing.

### New

- **Styles panel** — colours, tokens and Looks in one place, with visual editors for shadows, gradients, animation timing and fonts.
- **Properties have their own column on the right**, and **Layers** is a tab beside Components.
- **The backend manager** — collections, schema, users, roles, permissions, triggers, workflows, email, sign-in, files and backups, on one page in your browser. The first time you open it, you choose an admin email and password.
- **The backend can run on PostgreSQL**, and keep uploads and backups in an S3-compatible bucket.
- Boards, the Repeat node, Parse Feed and Parse XML, drag and drop, and a Game Kit module.

The full list: **[nodegx.io/changelog](https://nodegx.io/changelog/#v0-3-0)**.

### Before you file a bug

- **Code export is still alpha.** Parse Feed and Parse XML are not exportable yet. The report names every node it left out and why.
- **Windows installers are unsigned** and SmartScreen will warn. macOS is signed and notarised.
- **Linux is install-only** — download the next AppImage to update.
- **If you use NodeGX's MCP server with an assistant, restart that assistant's session after updating.**
