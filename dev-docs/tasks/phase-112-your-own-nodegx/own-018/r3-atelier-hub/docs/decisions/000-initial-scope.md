# 000 — Initial scope

_Recorded 2026-10-12T17:01:19.552Z, from the scoping conversation held before this project was created._

## What was asked for

> We're a 15-person design agency in Lyon. Today our work is spread across Airtable (clients and projects), Notion (our internal wiki and how-tos), n8n (a few automations) and Slack (team chat). We want one internal app of our own instead, so our data stays on our own server in Europe. It should have: our clients and their projects, each project with a status and an owner; a small wiki where anyone can write and edit pages; a team feed where people post short updates, and where the app posts by itself whenever a project is marked done; and an "Ask" box that answers questions about our clients, projects and wiki using Mistral's model mistral-large-4 through the Mistral API, so the AI stays with a European provider too. I'll add my Mistral API key myself afterwards under the name MISTRAL_API_KEY; it must stay on the server, never in the browser. Please just build it without waiting for me to answer questions.

## What was decided

**The app.** The design agency's internal app, self-hosted in Europe: clients and projects (status + owner), a team wiki anyone can edit, a team feed that auto-posts when a project is marked Done, and an "Ask" box answered by Mistral mistral-large-4 via a server-side function.

**Who it is for.** The 15 people of the design agency in Lyon — designers, project leads and admin. Everyone can read and write everything; each project has one owner drawn from the team, and the app itself posts to the feed when a project is marked Done.

**Pages.**

- Home — The team feed: short updates from people plus automatic system posts, with a composer to post an update and quick links to the rest of the app.
- Clients — The list of clients with create/edit, and a client detail view showing that client's projects.
- Projects — All projects in a filterable list (by status and owner), with create/edit, and a one-click action to mark a project Done — which makes the app post to the feed by itself.
- Wiki — The internal wiki: list of pages, view a page, and create/edit pages — anyone on the team can write.
- Ask — The AI box: ask a question in plain language about our clients, projects and wiki; a server-side function calls Mistral (mistral-large-4) with the data and returns an answer. Shows the conversation for the session.
- Team — The list of team members with their roles — the people who can be project owners and post authors.

**Records.**

- Client — A client of the agency, with their contact details. — name, sector, contactName, email, phone, address, notes — has many Projects
- Project — A piece of work for a client, with a status (Backlog / In progress / In review / Done) and an owner from the team. — name, description, status, startDate, dueDate, client, owner — belongs to one Client; has one owner (TeamMember)
- TeamMember — A person on the 15-person team; the owner of projects and author of wiki pages and feed posts. — name, role, email — owns many Projects; authors WikiPages and FeedPosts
- WikiPage — An internal wiki page (how-tos, processes, references) that anyone can create and edit. — title, slug, body, author, updatedAt — has one author (TeamMember)
- FeedPost — A short update in the team feed. kind is "manual" for posts written by people and "system" for automatic posts (e.g. when a project is marked Done). — author, content, kind, createdAt, project — has one author (TeamMember, null for system posts); optionally references the Project it is about

**Backend.** NodeGX built-in backend holding the agency's data on our own server in Europe. Besides the collections, it includes: (1) a server-side function askMistral(question, history) that calls the Mistral API with model mistral-large-4, reading the key from the MISTRAL_API_KEY function secret — the key never reaches the browser; it answers questions grounded in the Client, Project and WikiPage collections; (2) an automation that creates a FeedPost of kind "system" whenever a Project's status is set to Done.

**Rules for this project.**

- Every Mistral API call happens only inside a server-side function; the API key lives in the MISTRAL_API_KEY function secret and is never present in client-side code, pages, or components.
- Project status is one of: Backlog, In progress, In review, Done. Setting a project to Done triggers an automatic system post in the team feed.
- Feed posts are append-only: nobody edits or deletes a post; automatic posts have kind "system" and no human author.
- Wiki pages are addressed by a unique slug (e.g. /wiki/onboarding) and record their last author and update time on every edit.
- All dates are stored as ISO strings; the UI formats them for display.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **A client-facing portal where clients see their own projects** — rejected: The request is for an internal app; exposing anything to clients adds auth and permission complexity that was not asked for.
- **File/asset storage inside the app** — rejected: Not requested; design files are large and better left in their existing tools.
- **Rebuilding all the n8n automations in the app** — rejected: Only the project-done announcement is worth bringing in-house; the rest stay in n8n.
- **A US-based AI provider for the Ask box** — rejected: Rejected deliberately: Mistral is a European provider, so prompts and answers stay in Europe, matching the data-residency goal.
- **Storing the Mistral API key in frontend config or a repo file** — rejected: The key must stay on the server only; it is set as a function secret (MISTRAL_API_KEY) and read exclusively by the server-side function.
- **Auth/login system in v1** — rejected: The app is meant to live on the agency's own internal server; adding auth is a follow-up decision (see open questions), not something to guess at now.

## Deliberately out of scope

- A client-facing portal or any way for clients to log in and see their projects — this app is internal only.
- File and design-asset storage (no hosting of Figma exports, PDFs, etc.).
- Invoicing, quotes, time tracking and budgeting.
- Rebuilding the existing n8n automations — only the "project marked done" announcement is brought in-house; everything else stays in n8n.
- Replacing Slack for team chat — the feed is for short updates and system announcements, not a chat.
- Email/calendar integrations.

## Still open

Nothing was left open in the conversation.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **provision `App backend`** — Give this project a built-in backend that runs on this computer. Collections: Client, Project, TeamMember, WikiPage, FeedPost. The conversation said: NodeGX built-in backend holding the agency's data on our own server in Europe. Besides the collections, it includes: (1) a server-side function askMistral(question, history) that calls the Mistral API with model mistral-large-4, reading the key from the MISTRAL_API_KEY function secret — the key never reaches the browser; it answers questions grounded in the Client, Project and WikiPage collections; (2) an automation that creates a FeedPost of kind "system" whenever a Project's status is set to Done.
2. **create `Pages/Clients`** — The list of clients with create/edit, and a client detail view showing that client's projects. Works with the Client and Project records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Projects, Wiki, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
3. **create `Pages/Projects`** — All projects in a filterable list (by status and owner), with create/edit, and a one-click action to mark a project Done — which makes the app post to the feed by itself. Works with the Project record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Clients, Wiki, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
4. **create `Pages/Wiki`** — The internal wiki: list of pages, view a page, and create/edit pages — anyone on the team can write. Sibling pages in this app: Home, Clients, Projects, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
5. **create `Pages/Ask`** — The AI box: ask a question in plain language about our clients, projects and wiki; a server-side function calls Mistral (mistral-large-4) with the data and returns an answer. Shows the conversation for the session. Works with the Client and Project records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Clients, Projects, Wiki, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
6. **create `Pages/Team`** — The list of team members with their roles — the people who can be project owners and post authors. Works with the Project record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Clients, Projects, Wiki, Ask. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
7. **update `Pages/Home`** — The team feed: short updates from people plus automatic system posts, with a composer to post an update and quick links to the rest of the app. Sibling pages in this app: Clients, Projects, Wiki, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "We're a 15-person design agency in Lyon. Today our work is spread across Airtable (clients and projects), Notion (our internal wiki and how-tos), n8n (a few automations) and Slack (team chat). We want one internal app of our own instead, so our data stays on our own server in Europe. It should have: our clients and their projects, each project with a status and an owner; a small wiki where anyone can write and edit pages; a team feed where people post short updates, and where the app posts by itself whenever a project is marked done; and an \"Ask\" box that answers questions about our clients, projects and wiki using Mistral's model mistral-large-4 through the Mistral API, so the AI stays with a European provider too. I'll add my Mistral API key myself afterwards under the name MISTRAL_API_KEY; it must stay on the server, never in the browser. Please just build it without waiting for me to answer questions.",
    "operations": [
      {
        "id": "op-1",
        "kind": "provision",
        "target": "App backend",
        "intent": "Give this project a built-in backend that runs on this computer. Collections: Client, Project, TeamMember, WikiPage, FeedPost. The conversation said: NodeGX built-in backend holding the agency's data on our own server in Europe. Besides the collections, it includes: (1) a server-side function askMistral(question, history) that calls the Mistral API with model mistral-large-4, reading the key from the MISTRAL_API_KEY function secret — the key never reaches the browser; it answers questions grounded in the Client, Project and WikiPage collections; (2) an automation that creates a FeedPost of kind \"system\" whenever a Project's status is set to Done.",
        "provision": {
          "name": "App backend",
          "collections": [
            {
              "name": "Client",
              "columns": [
                {
                  "name": "name",
                  "type": "String"
                },
                {
                  "name": "sector",
                  "type": "String"
                },
                {
                  "name": "contactName",
                  "type": "String"
                },
                {
                  "name": "email",
                  "type": "String"
                },
                {
                  "name": "phone",
                  "type": "String"
                },
                {
                  "name": "address",
                  "type": "String"
                },
                {
                  "name": "notes",
                  "type": "String"
                }
              ]
            },
            {
              "name": "Project",
              "columns": [
                {
                  "name": "name",
                  "type": "String"
                },
                {
                  "name": "description",
                  "type": "String"
                },
                {
                  "name": "status",
                  "type": "String"
                },
                {
                  "name": "startDate",
                  "type": "String"
                },
                {
                  "name": "dueDate",
                  "type": "String"
                },
                {
                  "name": "client",
                  "type": "String"
                },
                {
                  "name": "owner",
                  "type": "String"
                }
              ]
            },
            {
              "name": "TeamMember",
              "columns": [
                {
                  "name": "name",
                  "type": "String"
                },
                {
                  "name": "role",
                  "type": "String"
                },
                {
                  "name": "email",
                  "type": "String"
                }
              ]
            },
            {
              "name": "WikiPage",
              "columns": [
                {
                  "name": "title",
                  "type": "String"
                },
                {
                  "name": "slug",
                  "type": "String"
                },
                {
                  "name": "body",
                  "type": "String"
                },
                {
                  "name": "author",
                  "type": "String"
                }
              ]
            },
            {
              "name": "FeedPost",
              "columns": [
                {
                  "name": "author",
                  "type": "String"
                },
                {
                  "name": "content",
                  "type": "String"
                },
                {
                  "name": "kind",
                  "type": "String"
                },
                {
                  "name": "project",
                  "type": "String"
                }
              ]
            }
          ],
          "needsAuth": false
        }
      },
      {
        "id": "op-3",
        "kind": "create",
        "target": "Pages/Clients",
        "intent": "The list of clients with create/edit, and a client detail view showing that client's projects. Works with the Client and Project records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Projects, Wiki, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-4",
        "kind": "create",
        "target": "Pages/Projects",
        "intent": "All projects in a filterable list (by status and owner), with create/edit, and a one-click action to mark a project Done — which makes the app post to the feed by itself. Works with the Project record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Clients, Wiki, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-5",
        "kind": "create",
        "target": "Pages/Wiki",
        "intent": "The internal wiki: list of pages, view a page, and create/edit pages — anyone on the team can write. Sibling pages in this app: Home, Clients, Projects, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-6",
        "kind": "create",
        "target": "Pages/Ask",
        "intent": "The AI box: ask a question in plain language about our clients, projects and wiki; a server-side function calls Mistral (mistral-large-4) with the data and returns an answer. Shows the conversation for the session. Works with the Client and Project records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Clients, Projects, Wiki, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-7",
        "kind": "create",
        "target": "Pages/Team",
        "intent": "The list of team members with their roles — the people who can be project owners and post authors. Works with the Project record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Clients, Projects, Wiki, Ask. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-2",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "The team feed: short updates from people plus automatic system posts, with a composer to post an update and quick links to the rest of the app. Sibling pages in this app: Clients, Projects, Wiki, Ask, Team. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
