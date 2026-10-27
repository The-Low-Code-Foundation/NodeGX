# NodeGX, in one page

**The canon.** Approved by Richard 2026-10-27 ("It's good") from
`dev-docs/reviews/the-three-surfaces-audit-2026-10-27-assets/CANON-draft.md` (the audit's §9–§11 hold the reasons and
his rulings). Every surface that explains NodeGX quotes this page: the `@nodegx/mcp` briefing, the `surfaces` guidance
section the agent reads, the seeded project docs, the npm and repo READMEs, Studio's Help tab, nodegx.io and the
emails. Change the words here first; `scripts/canon-check.mjs` (lane 7) fails a quoting place whose sentence has drifted.
"Your AI coder" is the word for the agent; Claude is named as the first one, not the only one.

## What NodeGX is for

Your AI coder can already build you a whole app. NodeGX is about what happens around that.

**While it builds,** you are not left out and you are not buried in questions. The AI makes the small decisions and
carries on. The decisions that are yours, it shows you: the part itself, in the chat, with its settings and an
Approve button. If you don't like where the build is going, you press Hold. The AI stops at its next change and asks
what you saw. The questions it asks are about your world, the dogs and the visits and the staff, never about padding
or databases.

**When it's finished,** the app is yours in a way code from an agency never is. The project is a folder of files on
your computer. NodeGX Studio is installed beside it: an open-source editor for pages, elements, workflows and data.
Change a heading, a font, a button colour or a translation yourself. It works without the AI. Nobody charges you for
it or can take it away. If Studio itself is more than you want, ask your AI coder for an editor that matches how you
think about your app, with only the things you change in it.

**When you want more,** come back. Ask for a contact form, or a members' area with payments. The files are a blueprint
the AI reads, and the build was written down as it went, so it picks up where it left off.

## Which AI coder

NodeGX works inside the AI coder you already use. Claude Desktop is the first app that shows Studio and the parts to
approve inside the chat, and that is where we build first. Claude Code, Cline and Mistral Vibe build NodeGX apps too;
Claude Code and Cline open Studio in a browser window beside the chat. We intend to be inside every AI coder app that
can show a page in the conversation (the technical name is MCP Apps), as each one adds it.

## Three ways to touch your app

Every one of them opens the same folder. You choose how deep to go.

| | what it is | what it shows | when |
|---|---|---|---|
| **The part in the chat** | one piece of the app, live, in the conversation | that piece and the settings the AI chose for you to decide; Approve or Not that | a decision while it builds |
| **NodeGX Studio** | an editor inside the chat, or in its own window on your computer | pages, elements, workflows, data, who can see what, a replay of what the app did, and the wiring underneath, read only | the day-to-day; changes you make yourself |
| **The NodeGX editor** | a free download for your computer | every node and every wire, and you can change all of it | when you want to work at that level |

Under all three: the files. Developers put them in git and open them in VS Code. If none of that means anything to
you, ask your AI coder to build you an editor that suits your understanding of the app, so you are never shown a
thing you can't understand.

## The wiring underneath

Some of what the AI builds is a part Studio does not edit: a script, a logic node with its own states, a function's
insides. Studio does not hide them. It shows you the value such a part produces and names the part, and from there
you can look at the wiring underneath: the page as it really is, every node and wire, read only. If you want to
change what you see there, download the NodeGX editor. It is the unrestricted version, and it has a learning curve:
the lessons inside it take you through the canvas step by step. Or ask your AI coder, which will say:
*"I could make you an editor to tweak that now if you want, or you download the NodeGX editor to get full access and
connect me as an MCP so I can guide you. It's easy and I'll walk you through every step."*

## Get the tools

- **NodeGX Studio for your computer** (macOS, Windows, Linux): nodegx.io/start
- **The NodeGX editor**: nodegx.io/start#download
- **Your own editor**: how to ask your AI coder for an editor built for you or your team: nodegx.io/your-own-editor

## Putting it online

From the chat, the AI ships the app and its database to a Linux server you rent, over SSH, and gives you the address.

## What we can say today, and what we are still measuring

- Building in the chat with Hold, the part to approve, Studio inside the conversation: **in use** (Claude Desktop).
- Studio on your computer without the AI: **in use** (the desktop app; the one-file install is being finished).
- Shipping to your own server from the chat: **in use**.
- Leaving with source: React and Swift, the same set of cases on each, on the apps we have tried.
- Cheaper models: DeepSeek and Mistral produced the same apps as on plain code in our tests, a little slower and at a
  higher usage cost. That cost is the investment in making the app editable and visible from the foundation. The
  measurements continue.

## For the agent (the rules, not copy)

1. Make the small calls alone and carry on. Never ask a style question in text.
2. Show what is theirs: a part in the chat for a look, the backend map for a data question, and ask only in the
   person's own words.
3. When the plan is done, hand over: say what they own, what they can change in Studio themselves, that an editor can
   be built for them if Studio is too much, and how to come back.
4. A part Studio does not edit is said so, with the sentence above, and the person is told they can look at the
   wiring underneath from Studio. Never refuse to build it.
5. A fixed list (a language, a status) is a `Static Data` node holding a JSON array, in its own logic component under
   `Option sets/<Name>` with `Component Outputs` items and count, so Studio lists it as an option set and the NodeGX
   editor shows it as the node it is. Never typed strings in several places.

## Waits on

Lines above are said as true today. These wait on something before they are quoted outside this repo:

- "NodeGX Studio for your computer" and the one-file install: the download page and the release cut (audit §8, B9 and B13).
- "a Linux server you rent, over SSH": stays SSH until lane 5 lands a provider from a key (DEP-003).
- the cheaper-model sentence: the OWN-026 measurements continue (Mistral resumes 1 November); the figures are in the audit §10.
