---
id: P128-S3-UNFINDABLE
title: "Claude's web search finds no NodeGX: a stranger who says \"I'd like to build an app with NodeGX\" in Claude Desktop is told it cannot be found and offered Node.js, NestJS, Next.js or Node-RED instead"
status: open
severity: high
area: "nodegx.io discoverability (nodegx-web: no `robots.txt`, no `sitemap.xml`, no `llms.txt`); the first-contact copy (the email, the video's description, /start) that could hand Claude the link instead"
found: P128 S3 follow-up, 2026-10-27, CCN-006 AC8 run step 0 (Richard, Claude Desktop, incognito chat, no NodeGX installed)
evidence: "Claude's reply, verbatim opening: \"I couldn't find anything called 'NodeGX' as a framework, platform, or tool. The search turned up only unrelated things, such as a research paper, a Docker image, and the P2P software Nodezilla, so I don't want to guess at setup steps\"; it offers Node.js, NestJS, Next.js, NodeX, Node-RED, and asks for 'a link, a docs page, a GitHub repo'. MEASURED the same hour: `https://nodegx.io/robots.txt`, `/llms.txt`, `/sitemap.xml` are 404; `/start/` fetched as `Claude-User` is 200, 59,948 chars, readable as text (\"Start here · NodeGX … Which sounds most like you?\")."
launch: beta
owner: none
task: CCN-006 AC8
---

The walk starts with a person who heard of NodeGX (the email, the video) and tells their AI coder to use it. Today
the AI coder says it does not exist and suggests a mainstream tool: the "forget it, just use React" moment, before
any install. The same reply names the way round: give it a link and it will read it, and nodegx.io reads cleanly
when fetched.

**Proposed.** Two halves. (1) First contact never relies on search: the email, the video's description and every
"get started" line say *"paste nodegx.io/start into Claude"* (or a shorter page written for the AI coder to read,
with the one download and what to do after). (2) Make it findable: `sitemap.xml` and `robots.txt` on nodegx.io,
the site submitted to the search engines' webmaster tools, an `llms.txt` pointing at /start, and the GitHub repo and
npm packages linking nodegx.io. Re-measure with the same incognito question after each lands; search indexing takes
days, so (1) is the Beta fix and (2) the lasting one.

**Step 0b, the same chat, given the link (Richard, 2026-10-27).** Pasted `nodegx.io/start`. Claude's fetch of the bare
text failed once and succeeded on `https://nodegx.io/start` (the site's 308s are fine; the first try had no scheme).
It then read the page correctly, and the page itself is the next wall:
- path 1, the non-coder's: *"This one-click install is coming soon, so you'd need to join the waitlist"*, though the
  `.mcpb` that is that install exists and was driven the same day (`nodegx-0.2.7.mcpb`);
- Studio: *"still coming soon. You can run it from source if you have Node.js 22 (git clone …, then npm install and
  npm start)"*: the over-my-head route, said to a stranger;
- Claude's own recommendation: *"path 2 is the fastest way to start"*, which is Node.js and a terminal, and the npm
  route has no Studio at all (P128-S3-NOSTUDIOFORTHEEDITOR).

So handing Claude the link works, and what it then reads must offer the one download. That is CCN-006 AC6 and S8's
download block (the `.mcpb` linked from /start, signed): the copy to say is "paste https://nodegx.io/start into
Claude", with the scheme.

**Two routes measured closed (2026-10-27).** (1) The directory: `claude.com/docs/directory/publish` says "the directory
no longer accepts local MCP servers packaged as desktop extensions (MCPB)", and a plugin bundle's local MCP server is
"Ignored" in Chat (`claude.com/docs/plugins/platform-support`): only a remote server works there, and NodeGX's must be
local. A directory listing cannot put NodeGX in a stranger's Desktop chat. (2) Search: a web search for `NodeGX`, and
for `"NodeGX" Low Code Foundation github app builder`, returns Victron, Nodezilla and other projects; not nodegx.io and
not the public GitHub repo. So the copy half (hand Claude the link) is the only thing that works this week; the
findable half (sitemap, robots, a webmaster submission, links in) is days to weeks. A nodegx-web session had
robots.txt and sitemap.xml in `ops/build.py`, uncommitted, at 17:19 the same day.
