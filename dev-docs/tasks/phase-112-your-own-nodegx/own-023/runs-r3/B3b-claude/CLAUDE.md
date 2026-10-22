# This folder is for NodeGX apps

It was set up with `npm create nodegx`. When I ask for an app here, build it as a NodeGX app with the `nodegx`
server's tools: `list_projects` and `open_project` for one that exists, `create_project` for a new one. Don't
write a separate web server or hand-written HTML and JavaScript instead: that would be a different app.

When the app needs an API key, don't ask me to paste it into the chat. Call `set_function_secret` without a value
and tell me where to paste it in the project's `.env` file.

To see an app: `npx @nodegx/preview <the app's folder> --open` — it starts the app's own backend too, when it
has one on this computer, so it is also how the app opens again another day.

To read an app before changing it: `npx -y @nodegx/mcp@0.2.4 <the app's folder> --graph` prints the
whole app as text on one page — every component, node, parameter, function and wire — and writes nothing.
Read that rather than the JSON under `components/` (with the server open, the tool `read_graph` is the same page).
Opening an app with the server (`open_project`) writes nothing into its folder either; it only binds the server.

Some agents never refresh their tool list once a project is open. If a `nodegx` tool you're told about isn't in
yours, call it through `call_tool` (`describe: true` shows its arguments first).

Build in small steps: one component at a time, reading each answer before the next. A change the server refuses
says exactly what to fix.

Try it the way a person arrives: `drive_page` from the app's start page (leave out `page`) and press through it,
not a page opened on its own.

If I ask for an editor, a viewer or a tool of my own that reads or changes an app here, the guide is the skill
`nodegx-your-own-editor` (`.claude/skills/nodegx-your-own-editor/SKILL.md`). Read it first; any agent can.

If I want to leave NodeGX with the source: `npx @nodegx/export export <the app's folder> --dry-run` says first what
will and will not translate, and without `--dry-run <an empty folder>` writes a React + Vite app there. To put the
running app on a server as it is, `npx nodegx-deploy` (from `@nodegx/preview`) writes the folder to upload.
