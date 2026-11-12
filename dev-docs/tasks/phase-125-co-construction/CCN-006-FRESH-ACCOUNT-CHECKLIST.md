# CCN-006 AC8 — the double-click, on a Mac account that has never seen NodeGX

**For Richard.** About 20 minutes. It answers one question: can a stranger with Claude Desktop get from "I like NodeGX"
to Studio in the chat with one download, without your checkout helping behind the scenes?

**Why a fresh account.** On your own account the server can find Studio in `~/vscode_projects/nodegx-studio` even when
the bundle's copy is broken, and your old `claude_desktop_config.json` may already hold a `nodegx` entry. A new macOS
user has neither, so whatever works there is what a stranger gets.

**The file.** `~/vscode_projects/nodegx-studio/dist/nodegx-0.2.7.mcpb` (25.1 MB, built 2026-10-27, `@nodegx/mcp`
0.2.7, **unsigned**). Driven headless the same day from the unpacked bundle, an empty home folder and a bare PATH:
it starts in 0.3 s and `open_studio` serves the bundled Studio. What has never been seen is Claude Desktop itself
doing it. 0.2.7 does not carry P128's canon work (S1–S3) or lane 9's s6/s7 fixes; those ride 0.2.8.

## Before

1. System Settings → Users & Groups → Add User. A standard account, any name ("Tester").
2. Copy the `.mcpb` to `/Users/Shared/` so the new account can reach it.
3. Log in as Tester. Install Claude Desktop from claude.ai/download and sign in.

## The run

Write down what you see at each step, a screenshot where something surprises you.

0. **Before installing anything**, in a new conversation: *"I'd like to build an app with NodeGX. How do I start?"*
   Note what Claude says and where it sends you. That is the first thing every stranger meets, and we have never
   read it.
1. **Double-click** `/Users/Shared/nodegx-0.2.7.mcpb`. Note exactly what Claude Desktop's install sheet says, above
   all any warning about an unsigned or unverified extension, and how alarming it reads to a non-coder. Install.
2. **Settings → Extensions**: NodeGX listed and on. Note whether it says which Node it uses (it should be Claude
   Desktop's built-in one).
3. **A new conversation:** *"Make me a NodeGX app: a tap counter with a reset button."*
   **Pass:** Studio draws inside the conversation with the counter in it, and you were never asked to install
   anything else, open a terminal, or paste a path.
4. In Studio, change the button's text yourself. Then tell Claude *"make the number bigger"*. **Pass:** your text is
   still there afterwards.
5. **If step 3 fails**, open `~/Library/Logs/Claude/mcp-server-NodeGX.log` (the name may differ slightly) and copy
   the first 40 lines into the session. The two first suspects (CCN-006 s13): Desktop ran it on an old Node (the log's
   start line names the version), or Studio's own process failed to start.

## After

- Log out of Tester. Delete the account when done (Users & Groups → Tester → Delete), or keep it for 0.2.8's run.
- Paste your notes into a session with "CCN-006 AC8 run". Steps 0 and 1 decide the next work: what Claude says
  before NodeGX is installed, and how bad the unsigned warning is.

## What comes after a pass (not for this run)

- **Sign it.** `npx @anthropic-ai/mcpb@2.1.2 sign dist/nodegx-<v>.mcpb --cert cert.pem --key key.pem`, then `verify`.
  Which certificate Claude Desktop trusts (your Apple Developer ID, or another) is not measured yet.
- **One button** on nodegx.io/start for the signed file, built in CI beside the DMG (SEE-009).
- **The extensions directory:** a listing inside Claude Desktop means no download at all. Its submission
  requirements are not read yet.
