## NodeGX 0.4.2 — alpha

**Apps can now keep photos for their members only and check Paystack's payment webhooks.**

### New

- **Upload File can keep a photo for members only.** Its new Readers input names the roles, such as `role:member`, that can open a private file. The person who uploaded it can still open it.
- **Upload File can make a photo smaller before sending it.** Its new Shrink To input sets the longest side in pixels. Photo Quality sets how much detail a JPEG or WebP keeps.
- **A webhook trigger can check Paystack's signature.** Choose *Paystack signature* for the hook in the backend's admin app, then paste the Paystack secret key.
- **A project's collections come with it.** Some projects list their collections in `backend/schema.json`. When you start that project's backend on this computer, NodeGX now adds any of those collections it lacks. Each one keeps its unique fields and links.
- **Exported apps do more of what the running app does.** Filtered and sorted lists, sign-in pages and forms that say whether they were sent now work the same in exported code.
- **Your agent sees more of what it built.** `render_report` now shows the app on a desktop, a tablet and a phone. It also names a row with a hole in it, or text pressed against the edge of its box.

### Fixed

- **Live updates reach signed-in members.** On the built-in backend, Subscribe To Changes asked for updates as a stranger, even when someone was signed in. A collection that only members can read refused every update. It now asks as the person who's signed in.
- **A refused webhook call says why.** In the admin app's Runs, a call refused before its first step said "This run recorded no steps". It now shows the reason, such as a signature that doesn't match.

### Before you file a bug

- **Exported code doesn't keep Readers or Shrink To yet.** If your app shares photos with members only, don't export it as code for now. An exported Upload File sends the photo as a full-size public file.
- **Code export is still alpha.**
- **Windows installers are unsigned** and SmartScreen will warn. macOS is signed and notarised.
- **Linux is install-only.** Download the next AppImage to update.
- **If you use NodeGX's MCP server with an assistant, restart that assistant's session after updating.**

The full list is in the [changelog](https://nodegx.io/changelog/#v0-4-2).
