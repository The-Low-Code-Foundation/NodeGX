# This folder is for NodeGX apps

It was set up with `npm create nodegx-vibe`. When I ask for an app here, build it as a NodeGX app with the `nodegx`
server's tools: `list_projects` and `open_project` for one that exists, `create_project` for a new one. Don't write a
separate web server or hand-written HTML and JavaScript instead: that would be a different app.

Your tool list will not change in this session. Every `nodegx` tool that is not in it — `get_project_info`,
`create_plan`, `update_component`, `render_report`, `drive_page` and the rest — is called through `call_tool`:
`call_tool({ name: "drive_page", arguments: { ... } })`. `call_tool({ name, describe: true })` shows a tool's
arguments first.

When the app needs an API key, don't ask me to paste it into the chat. Call `set_function_secret` without a value and
tell me where to paste it in the project's `.env` file.

To see an app: `npx @nodegx/preview <the app's folder> --open`
