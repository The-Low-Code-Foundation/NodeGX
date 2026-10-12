## NodeGX 0.4.0 — alpha

**NodeGX now opens the apps you make with `npm create nodegx`. This release also brings script files, new kinds of backend rule, and many fixes to how nodes behave.**

### Your existing project

- **It's updated to a newer format the first time you open it.** NodeGX first copies the project folder to `<project>.before-0.4`, then updates it, and shows a message saying where the copy is. Your app works as before.
- **Keep the `.before-0.4` copy** until you're happy with the updated project. It's the only copy 0.3.0 can still open.
- **A project made in 0.2** is upgraded the same way 0.3.0 upgraded it, with a `<project>.before-0.3` copy.
- **A sign-in to your backend now ends after 30 days without use.**

### New

- **Apps made with `npm create nodegx` open in the editor**, and keep their project id.
- **Functions can share code through script files**, with a Scripts section in the Components panel and a Uses list on each Function.
- **A node's properties now end with *What this node does* and *Try this node*.**
- **The backend can keep more kinds of rule.** A field can be readable by some people only. A record can be locked once it stops being a draft. Your agent writes these rules from what you tell it. The changelog lists the rest.
- Keep When Leaving on Page, Data Attributes and Scroll Into View on every visual node, *Is one of* in Array Filter, Model Request with a model on your own computer, and Parse CSV, To CSV, Parse XML and Parse Feed in code export.

The full list: **[nodegx.io/changelog](https://nodegx.io/changelog/#v0-4-0)**.

### Fixed

- **A cloud function could make someone the backend's admin.** It can't now. Update if your backend runs cloud functions.
- Restoring a backup brings back every setting.
- Many smaller fixes to how nodes behave are listed in the changelog.

### Before you file a bug

- **0.3.0 refuses a project saved by 0.4.0 with two wrong messages.** One names Noodl, and the other says `project.json` is missing. The person needs to update to 0.4.0.
- **The first time you open a page your agent wrote, NodeGX rewrites that page's files.** In a project kept in git, this leaves them changed.
- **Code export is still alpha.**
- **Windows installers are unsigned** and SmartScreen will warn. macOS is signed and notarised.
- **Linux is install-only.** Download the next AppImage to update.
- **If you use NodeGX's MCP server with an assistant, restart that assistant's session after updating.**
