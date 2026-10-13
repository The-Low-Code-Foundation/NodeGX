# This folder is for NodeGX apps

It was set up with `npm create nodegx-vibe`. When I ask for an app here, build it as a NodeGX app with the `nodegx`
server's tools: `list_projects` and `open_project` for one that exists, `create_project` for a new one. Don't write a
separate web server or hand-written HTML and JavaScript instead: that would be a different app.

## How to build it

1. Read what I asked for. Anything I spelled out — names, lists, wording, order, timings, colours — is built exactly
   as written.
2. Open or create the project. A value only this device needs to keep (a best score, a setting) is not a backend:
   a Function saves it with `localStorage` — create the project with `backend: { kind: "none" }` unless people or
   devices share data. Then read `call_tool({ name: "get_project_info" })`: its traps are mistakes other builders
   made here.
3. Write the checklist before building: one line for each thing I could see or do — what is on screen, what a tap
   does, what it looks like (a colour), when it happens (a time), what is still there after a reload.
4. Build one component at a time and read every answer. A refused change says exactly what to fix. Keep each answer
   short: decide one component, write it with a tool, read the reply, then the next. Don't work out the whole app in
   one answer before writing anything — a staged operation can be replaced later, and an answer with no tool call in
   it can run on for many minutes with nothing saved.
5. Prove each checklist line in the browser with `drive_page`, starting from the app's start page (leave out
   `page`): tap, wait, then read the text, a variable, or what a person sees of a thing by its label —
   `{ "read": { "look": "Lisbon" }, "expect": { "backgroundName": "green" } }`. A read answers what a screenshot
   would; each screenshot you open makes every later step of this session cost more.
6. Tell me one line per checklist item: passed or failed, and what you measured. Say it is done only when every
   line passes; when one fails, fix it and drive it again.

## Tools

Your tool list will not change in this session. Every `nodegx` tool that is not in it — `get_project_info`,
`create_plan`, `update_component`, `render_report`, `drive_page` and the rest — is called through `call_tool`:
`call_tool({ name: "drive_page", arguments: { ... } })`. `call_tool({ name, describe: true })` shows a tool's
arguments first.

When the app needs an API key, don't ask me to paste it into the chat. Call `set_function_secret` without a value and
tell me where to paste it in the project's `.env` file.

To see an app: `npx @nodegx/preview <the app's folder> --open`
