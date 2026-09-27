# NodeGX changelog

Every NodeGX release, newest first, back to the day Noodl became open source.

NodeGX is a fork of Noodl. The first NodeGX release was 0.1.3, in August 2026. Before that, this
code was released as Noodl, Code Crusher and OpenNoodl. Those are at the bottom of this page.

Each NodeGX release links to its page on GitHub, where you can download it.

<!--
  HOW TO ADD A RELEASE
  Add a new "## <version> · <YYYY-MM-DD>" section at the top, above the last release.
  First paragraph: one bold sentence saying what the release is for.
  Then "### New", "### Changed", "### Fixed", "### Good to know" as needed. Plain words, short bullets.
  No claude.ai changelog artifact: this page is the changelog (Richard, 2026-09-24).
  This file is the source of https://nodegx.io/changelog/ — deploy nodegx-web to publish it
  (dev-docs/guidelines/RELEASE-PROCESS.md, step 10).
-->

## 0.3.0 · 2026-09-24

**Projects made in 0.2 are upgraded when you open them, there is a new Styles panel, and your
backend has its own page in the browser.**

### New

- **Your project is upgraded when you first open it.** 0.3.0 stores text styles as typography
  tokens. The first time you open a project made in 0.2, NodeGX copies the whole project folder to
  `<project>.before-0.3`, converts its text styles, and shows a message saying it did. If the copy
  cannot be made, the project opens unchanged and NodeGX tries again next time.
- **Library parts are converted too.** A part you install that uses text styles is converted in the
  same way, so it arrives styled.
- **Styles panel.** Your project's colours, tokens and Looks are in one panel in the left rail,
  under Components.
- **Looks.** A Look is a saved style for one kind of node. Style a button, save it as a Look, and
  use it on your other buttons.
- **Visual editors for shadows, gradients, animation timing and fonts.** Use sliders and lists
  instead of typing CSS. "Show CSS" shows the code if you want it.
- **Tokens show where they are used.** A token in a field shows as a chip with its name. Each token
  has a "Used by" list of the nodes that use it.
- **Every property row says where its value comes from:** you, a Look, or the default. Reset says
  what it will reset to.
- **Properties have their own column on the right.**
- **Layers tab.** Components and Layers are two tabs. Layers shows what the previewed page is made
  of, and you can drag items to rearrange them.
- **The canvas and the preview highlight each other.** Hover or select a node and the same element
  is outlined in the preview, and the other way round.
- **A note in the preview** when the component you are editing is not on the page it is showing.
- **Boards.** Lay several components out side by side. The board keeps its layout.
- **Repeat node.** Does something every few seconds.
- **Parse Feed and Parse XML nodes.** Read an RSS or Atom feed, or any XML, into a list.
- **Model Request node** (cloud functions). Sends a prompt to Claude and returns the answer. The
  OpenAI-compatible option is listed but does not work yet.
- **Drag and drop** on Group, Text, Image, Circle and Video.
- **Text Input** can ask for a number keypad on phones and set the label of the Enter key.
- **Game Kit module** in the library: sound, an avatar, a race track, an on-screen keyboard and an
  answer pad.
- **The backend can run on PostgreSQL.** `nodegx-backend migrate` moves an existing backend over.
- **Collections can have indexes, unique fields, and rules every row must pass.**
- **"Only If Unchanged" writes**, so two people saving at once do not overwrite each other.
- **Schedules can skip a run** while the previous run is still going.
- **Your backend has an MCP address** (`/mcp`) that Claude or another app can connect to with an
  API key. An API key can belong to one user.
- **The backend manager.** Your backend is run from its own page in the browser, opened from the
  Backend card in the editor. You pick and tick things there instead of typing JSON, lists or
  schedule codes. It works in light and dark, and every page has its own link.
- **Collections:** filter rows, sort by a column, choose columns, save views, edit each field with
  a control for its type, see who can see a record, and import a CSV file.
- **Schema:** choose one of eleven kinds for a field, and set rules the backend enforces, such as a
  list of choices, a maximum length or whole numbers only. If you add a required field to a
  collection that already has records, you give one value to fill them with.
- **Users and roles:** people are shown by name. You can turn off someone's sign-in, and add people
  to a role by searching or pasting email addresses.
- **Permissions:** a grid of who can do what in each collection, with ready-made templates, and
  *Try it as* to check a rule as a particular person.
- **Triggers:** build a schedule by picking options and see its next five runs. A webhook shows its
  address, and shows its secret once.
- **Workflows and runs:** run a workflow from a form, watch runs live, and cancel one that is
  running.
- **Email and sign-in:** choose an email provider from a list, edit each email with a preview, and
  set up a sign-in provider step by step.
- **Files and backups:** browse uploaded files and see which records use them, and restore a
  backup. Uploads and backups can be kept in an S3-compatible bucket instead of on the server's
  disk, with a *Test connection* button.
- **The first admin is a person.** The first time you open the backend manager, it asks you to
  choose an admin email and password. That account signs in to the manager, and to your own app
  with the `admin` role. From the Users page you can give other people full or look-only access.
- **Code export:** Looks and text styles now export. Before, they were left out.
- **Code export:** popups export as dialogs.

### Changed

- **Text styles are now typography tokens.** A Text node picks tokens and no longer creates text
  styles.
- **The Preset / Size picker is gone.** Nodes that used a preset keep their look. Save it as a Look
  to reuse it.
- **Sheets are gone.** Folders whose names began with `#` show as ordinary folders.
- **Show Popup opens a real dialog.** Escape closes it, keyboard focus stays inside it, and the page
  behind cannot be clicked.
- **Buttons and form controls show a focus ring** when you reach them with the keyboard.
- **Emailed sign-in links open a page with a button.** Pressing the button signs you in. Before, the
  link signed you in straight away, so a mail scanner could use it up.
- **The backend panels have left the editor.** Data, schema, sign-in, email, permissions, search,
  secrets and triggers are all in the backend manager. *Add a field* and the canvas's *Add / Edit
  this trigger…* open the right page there, already signed in.
- **The backend returns `true` and `false`,** not `1` and `0`.
- **A query with no limit returns at most 1,000 rows,** and the reply says it was cut short.
- **A redesigned editor:** one type scale, consistent corners and shadows, a new properties panel,
  and a Templates tab with pictures. The editor loads one font file instead of six.
- **Twelve nodes are marked as not exportable** on the picker card and in the properties panel.
  Parse Feed and Parse XML say "Not exportable yet".

### Fixed

- **A limited API key could read sessions, users, other keys and the audit log.** It can't now. If
  you gave anyone a limited key, update.
- A backend request retried after 0.2.4 had already answered it could run twice. This is fixed the
  first time the new backend starts.
- The launcher could open the wrong project when two projects had the same id.
- All 78 "Read docs" links on library cards were broken.
- Font size and spacing fields now offer your tokens.
- The colour picker now lists all your colour tokens.
- Saving an empty object to the backend failed.
- Some records came back from the backend changed.
- States colour transitions now work with tokens.
- Presets now load their fonts.
- Pictures in exported apps load on pages two levels deep.
- The editor no longer sends a broken request to GitHub when you have never signed in.
- The editor logs far fewer background errors.

### Good to know

- **Keep the `.before-0.3` copy** until you are happy with the upgraded project. It is the only
  copy that 0.2 can still open.
- Code export is still in alpha. A few projects still stop the export with an error. If yours does,
  please report it and attach the project.
- The `nodegx` command-line export tool is not on npm yet. `npm i -g @nodegx/export` does not work.
  Export from the editor instead.
- Windows installers are not signed, so SmartScreen will warn you. Choose More info, then Run anyway.
- If you use the MCP server with an assistant, restart the assistant's session after updating.

## 0.2.4 · 2026-09-12

**The things we built for 0.2.3 now reach your computer.**

### Fixed

- **Documentation links in the editor work again.** The docs site moved on 7 August, and one of
  the editor's two addresses for it was never updated. So 0.2.3 shipped with all 176 node pages,
  the property panel's "read more", the node picker's help and the MCP settings help pointing at a
  page that no longer existed. A check now opens real docs pages on every change.
- **The MCP server is complete.** Two of its four files were missing from the installed app.
  Without them, an assistant could not read the node types of any module in your project, and
  could not bundle cloud functions.
- **The MCP server reports its real version.** It said `0.1.0` in every release until now.
- **Background images load on a site deployed to a sub-path** (`--base-url /something/`). Before,
  the picture looked for itself at the root of the domain.

### New

- **Two templates.** Pixel Dungeon, a grid game with keyboard movement, rooms and a score bar.
  Story Engine, a branching story written as one JSON list you can edit.

### Good to know

- The parts library (46 prefabs, 32 modules) is downloaded while the editor runs, so it works in
  0.2.3 as well. You don't need this update to use it.
- If you use the MCP server with an assistant, restart the assistant's session after updating. A
  running session keeps the old copy.

## 0.2.3 · 2026-09-11

**Fixes for the issues you reported, and a command-line tool for exporting and deploying.** The
app is also 25 MB smaller and uses far less CPU when idle.

### Fixed

The numbers are GitHub issue numbers.

- **#26: a wire into a size port now works.** A one-word mistake had switched the conversion off
  since the first commit of the code. A port that receives something that isn't a size now says so.
- **#31: the preview server only listens on your own computer**, and no longer gives out its
  access token. If you used 0.2.2 on a shared network, update.
- **#29: Linux installs on current distributions.** FUSE 3 works, Chromium's sandbox is back on,
  and there is an `.rpm` for Fedora, RHEL and openSUSE.
- **#21, #22: Columns measures its own width.** It has `Breakpoint`, `At Medium` and `At Small`
  outputs, and there is an Advanced Columns part with four widths.
- **#40: page checks are 5.2× faster** (11 pages went from 53.8 s to 10.3 s). They can save
  screenshots, and they no longer drop console errors logged while a page loads.
- **#42: smaller and quieter.** The download went from 185 MB to 160 MB. Idle CPU went from 2.42%
  to 0.14% of one core. It had been shipping 85 MB of unused files and running a hidden spinner
  forever.
- Also fixed: #5, #14, #32, #33, #35, #37, #41.

### New

- **The `nodegx` command.** `nodegx export`, `deploy`, `serve`, `render` and `live`: export to
  React, build a site you can upload, and check it, all without opening the editor. It is built but
  not yet on npm, so `npm i -g @nodegx/export` does not work yet.
- **More for assistants.** An assistant can open a project without the launcher, check whether
  someone already has it open, export to React, and see which ports won't survive export. The
  editor no longer overwrites what an assistant wrote.
- **A parts library you can search**, and so can an assistant.
- **For people coming from Bubble:** 94 Bubble operators, each with the NodeGX way to do it. Eight
  are graphs you can open and run.
- **104 worked examples**, up from 67. Twelve are real apps from the original Noodl community.
  Every node type now has at least one example.
- **New parts:** Advanced Columns, a date formatter, a full-name formatter, an email cleaner, a
  charts kit (Bar Chart and Sparkline) and a media recorder.
- **Search and social tags on the Page node**, so a shared link shows a preview.

### Good to know

- Because of #26, some wires that used to be ignored now work. If a layout looks different after
  updating, that is probably why.

## 0.2.2 · 2026-09-07

**We built three real apps with NodeGX and fixed what broke.** There is no 0.2.1. It was held back
and its work is in this release.

### New

- **Three templates.** A members' area: sign-in, requests to join, a moderator queue,
  announcements, a diary and a directory, with access enforced by the backend. A site builder:
  pages stored as records, an admin panel, a theme editor, and a public site that shows only what
  is published. And three landing pages with no backend.
- **A Templates tab** in the launcher.
- **Export as React code** (Settings → Project). It shows what will and won't export before it
  writes anything, then writes a Vite + React project that talks to your deployed backend. 117 of
  127 nodes export. The other 10 are marked *Not exportable*. Export is an alpha feature: don't
  ship a production app straight from it yet.
- **Eight lessons** come inside the app.

### Fixed

- Dropdown no longer crashes when it has a selected value, and it comes with default items.
- The Video node plays YouTube and Vimeo links, with start and end times.
- Circle became Shape: polygons, stars, rounded corners and your own SVG.
- A Text Input's placeholder is empty by default (it was "Type here…"). Icons are black by
  default. A `var()` value is kept when you edit it.
- Contrast, border and focus fixes across the editor.
- The MCP server refuses five kinds of wiring that it used to accept and that then failed when the
  app ran. An agent has to render a page before it can call the page finished.

## 0.2.0 · 2026-08-21

**Community and courses inside the editor, nodes you can write yourself, and fixes from the first
user test.**

### New

- **An account that locks nothing.** Sign in from the launcher. NodeGX works fully when you are
  signed out, and always will. Anonymous usage data is off unless you turn it on.
- **Community in the editor.** Right-click a node and choose *Ask about this node*: the question
  already says which node you mean. Replies, accepted answers, a people directory, guides and call
  replays, without a browser.
- **Courses in the editor.** A short conversation picks your learning path. A tutor sits over your
  work. A Learning folder keeps lessons apart from your projects. *Check my work* grades a lesson
  on your computer. You don't need an account to install a lesson.
- **Claude can write a lesson for you**, through the MCP server. It only saves a lesson that passes
  every automatic check, and it makes the starting project by taking the answer out of the
  solution.
- **Lessons can check data:** a collection, its columns, or how many rows it has.
- **Custom nodes (kits).** Make a kit and install it in one of four ways. A custom node can do
  everything a built-in node can. A broken kit only breaks that kit, and the error says which kit
  and why.

### Fixed

- 23 of the 24 problems from the first user test. The AI can read live values from the running
  app. The chat box has several lines and a Send button (Enter sends, Shift+Enter starts a new
  line). You can select and copy AI text. Five popups no longer cut off their own buttons. The AI
  now draws the wires it asks for.
- Data lessons get their own database, so the *Log a thing* lesson can be finished.
- Easier to read. The default text colour failed WCAG AA contrast in both themes and has been
  replaced. Cards stand out from the canvas. About 30 colour pairs are checked automatically in
  both themes.
- Safer. A zip file that tries to write outside its folder is refused. Lesson text can't contain
  `javascript:` links.

## 0.1.7 · 2026-08-13

**The AI became a conversation, and the Logic Builder became usable.**

### New

- **The Build panel is a conversation.** One thread you can steer and interrupt. Accept and
  Discard sit on the change they apply to. You can see the model thinking, so a long answer
  doesn't look frozen. `@` mentions for components, docs, pages and collections. Attach images and
  PDFs. The agent can look at the running app.
- **Logic Builder** opens over your work and stays open while you move around. A bench runs your
  blocks with the app stopped. Saved blocks can be opened, renamed, edited and deleted. *View
  Code* shows the code you built.
- **Component Bench.** Run any component on its own, with inputs made from its interface and a live
  view of its outputs. This works for logic-only components with nothing visual in them. Save
  named test states like Empty, Loaded and Error.
- **Clearer wires.** A refused connection says why and suggests the wire you probably meant. Ports
  are grouped, and signal ports say what they do. Wires show direction by shape. You can bend a
  wire with anchor points.
- **Readable diffs.** `git log -p`, `git blame` and GitHub pull requests show plain English instead
  of raw JSON. Nodes can carry a comment saying why they are there.
- **Cheaper AI.** 89 tools became 20. An AI-built shop went from $5.83 to $3.55, and finished
  instead of running out of turns. The agent can render what it built and check the result.
- **The MCP server starts without a project**, and creating a project connects it straight away.
  You don't need Node installed.

### Fixed

- The Library panel, lessons and templates had been empty for six days after the repository was
  renamed.
- Design mode now shows on the canvas.
- The updater could offer an older version as an update.
- One broken node no longer blanks the whole canvas.
- Nine dark icons on dark backgrounds.

## 0.1.6 · 2026-08-08

**No changes.** This release exists so people on 0.1.5 could see the new update flow work. An
update is always carried out by the version you already have, not the one you are installing.

## 0.1.5 · 2026-08-08

**Updates ask first.**

- Nothing downloads or installs until you click.
- The update dialog shows the release notes first.
- You can choose which version to install.
- Download progress is shown, and stays visible if you close the dialog.
- The launcher can offer updates, not only the editor.
- Text has danger, notice and success styles.

## 0.1.4 · 2026-08-08

**Styles you set now show on the page.** Five separate bugs were accepting styling and then
throwing it away.

- **Font Weight and Font Style (italic) are ports.** There was no way to set either before.
- **Align Items has Stretch**, so cards in a row can be the same height.
- **Box Sizing is a port, and defaults to border-box.** A 100%-wide node with padding no longer
  spills out of its parent.
- **Design tokens work on corner radius, border width and shadows.** Before, a token there made
  the browser drop the whole style.
- The validator now checks Text, Group, Image, Button and Text Input nodes, which it used to skip.
  A page whose content isn't connected to its Page node is an error instead of a blank screen.
- Collections the AI creates get the columns you agreed on. They used to get none.
- The first release that can update itself on macOS.

### Good to know

- Existing projects may look different, because settings that used to be ignored now work.

## 0.1.3 · 2026-08-07 · first alpha

**The first NodeGX release that installs and starts on macOS, Windows and Linux.** macOS builds
are signed and notarised. Windows and Linux builds are unsigned.

0.1.0, 0.1.1 and 0.1.2 were built but never worked once installed: each one crashed at startup
because a file was missing. 0.1.3 fixed the cause.

**Help → Report a problem…** builds a GitHub issue with the details filled in and your secrets
removed.

## Before the first release · December 2025 – August 2026

The work between OpenNoodl 1.1.0 and NodeGX 0.1.3. The app was renamed NodeGX. All of this is in
0.1.3.

### Getting it working again

- The code builds again, with no type errors.
- A test suite that runs, grown from about 540 tests to more than 700, and automatic checks on
  every change.
- Electron 31 → 43, Node 20 → 24, and TypeScript 5.9 everywhere. The editor runs on React 19.
- Installers for macOS, Windows and Linux, built automatically. macOS builds are signed and notarised.

### The editor

- The node canvas, the biggest file in the editor at 3,481 lines, was split into 20 tested parts.
- jQuery removed: from 547 uses to none.
- A new look: one colour palette everywhere, and light and dark themes (or follow your system).
  Every text colour passes WCAG AA contrast.
- The Logic Builder: build logic from blocks.
- A new code editor, a JSON editor, and templates for new projects.

### Projects

- **A new project format:** one file per component instead of one big file. Easier to compare,
  merge, and edit with AI.
- Saving and reopening a project loses nothing. Eight gaps were closed.
- Old projects are converted with a backup made first, checked, and rolled back if anything fails.
- Diffs and merges that understand the graph.

### AI

- A catalog of all 135 node types, with every port, type and default, so an AI knows what exists.
- A validator that finds unknown nodes, missing ports and broken connections. In the editor it is
  the Problems panel.
- **The NodeGX MCP server**, so Claude Code and other agents can open, read, check and build
  NodeGX projects.
- A live preview that runs in a normal browser, without the editor.
- AI settings for Anthropic, OpenAI, OpenAI-compatible services, and local models through Ollama.
- The Build panel: describe a component, watch the agent build it, then accept or reject it. It
  became six times cheaper (20¢ → 3.5¢ per component) and faster (90 s → 16 s).
- Explain mode: select nodes and the AI explains what they do.

### Data and backends

- **A built-in backend:** cloud functions and workflows with a local database, with no outside
  service to set up. Parse was removed.
- **Connect your own backend:** Directus, Supabase, Pocketbase or any REST API. Your database's
  tables and fields fill the node dropdowns. Nodes to query, create, update and delete records,
  and to get changes live.
- An HTTP Request node.
- 15 nodes for apps that talk to an AI: streaming (SSE and WebSocket), putting streamed text
  together, a global store with undo, and an example chat app.
- Apps can run on React 19 (Project Settings → Runtime). Existing projects stay on React 18.3.
- Design tokens work in deployed apps.

## OpenNoodl 1.1.0 · 2024-09-25

**The editor renamed back to OpenNoodl.** Most of these changes came from Eric Tuvesson of the
Fluxscape team.

- Date to String has a `yearShort` format.
- Image has an On Error signal.
- String Format has a Default label.
- Switch has a Switched signal.
- File Picker has a capture setting, to choose the front or back camera.
- Push Component to Stack has a Target Page input.
- Query has an Is Empty output.
- Array has a First Item Id output.
- The AI assistant moved from GPT-4 to GPT-4o-mini.

## Code Crusher · 2024-05-02

**The editor released under the name Code Crusher**, with one-click installers.

## Noodl becomes open source · 2024-01-26

**Noodl's makers published its source code under the GPL-3.0 licence.** Everything on this page
starts from that code.
