---
title: Three ways to use NodeGX
sidebar_position: 2
---

# Three ways to use NodeGX

There are three ways to see and change a NodeGX app. All three open the same project folder. This page is the short version; the step-by-step guide for someone who has never built an app is at [learn.nodegx.io](https://learn.nodegx.io/ways/three-ways).

<!-- canon: Three ways to touch your app -->
Every one of them opens the same folder. You choose how deep to go.

<!-- canon: Three ways to touch your app -->
| | what it is | what it shows | when |
|---|---|---|---|
| **The part in the chat** | one piece of the app, live, in the conversation | that piece and the settings the AI chose for you to decide; Approve or Not that | a decision while it builds |
| **NodeGX Studio** | an editor inside the chat, or in its own window on your computer | pages, elements, workflows, data, who can see what, a replay of what the app did, and the wiring underneath, read only | the day-to-day; changes you make yourself |
| **The NodeGX editor** | a free download for your computer | every node and every wire, and you can change all of it | when you want to work at that level |

<!-- canon: Three ways to touch your app -->
Under all three: the files. Developers put them in git and open them in VS Code. If none of that means anything to you, ask your AI coder to build you an editor that suits your understanding of the app, so you are never shown a thing you can't understand.

## Which is available today

| | status | where |
|---|---|---|
| The part in the chat, and Studio inside the chat | coming soon: a one-click extension for Claude Desktop | [nodegx.io/start](https://nodegx.io/start/) |
| NodeGX Studio as its own app | coming soon as a download; runs from source with Node 22 | [github.com/The-Low-Code-Foundation/nodegx-studio](https://github.com/The-Low-Code-Foundation/nodegx-studio) |
| The NodeGX editor | available, 0.4.3 | [nodegx.io/start#download](https://nodegx.io/start/#download) |
| An editor of your own | ask your AI coder; the kit is on npm | [nodegx.io/your-own-editor](https://nodegx.io/your-own-editor/) |

## The wiring underneath

<!-- canon: The wiring underneath -->
Some of what the AI builds is a part Studio does not edit: a script, a logic node with its own states, a function's insides. Studio does not hide them. It shows you the value such a part produces and names the part, and from there you can look at the wiring underneath: the page as it really is, every node and wire, read only. If you want to change what you see there, download the NodeGX editor. It is the unrestricted version, and it has a learning curve: the lessons inside it take you through the canvas step by step.

The rest of these docs describe the NodeGX editor: [Getting started](./getting-started.md) builds a two-page app in it, and the [node library](./nodes/index.md) lists every node it draws.

## Which AI coder

<!-- canon: Which AI coder -->
NodeGX works inside the AI coder you already use. Claude Desktop is the first app that shows Studio and the parts to approve inside the chat, and that is where we build first. Claude Code, Cline and Mistral Vibe build NodeGX apps too; Claude Code and Cline open Studio in a browser window beside the chat. We intend to be inside every AI coder app that can show a page in the conversation (the technical name is MCP Apps), as each one adds it.

To connect one: `npm create nodegx my-apps` sets a folder up for Claude Code, Cline or Vibe. In the NodeGX editor, **Connect Claude Code** on the start screen does the same for Claude Code. Studio has the same button in its header.
