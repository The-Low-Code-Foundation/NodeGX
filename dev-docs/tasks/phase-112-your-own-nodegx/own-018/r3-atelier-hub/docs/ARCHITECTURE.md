# Architecture

## Page map

- **Home** (`Pages/Home`) — The team feed: short updates from people plus automatic system posts, with a composer to post an update and quick links to the rest of the app.
- **Clients** (`Pages/Clients`) — The list of clients with create/edit, and a client detail view showing that client's projects.
- **Projects** (`Pages/Projects`) — All projects in a filterable list (by status and owner), with create/edit, and a one-click action to mark a project Done — which makes the app post to the feed by itself.
- **Wiki** (`Pages/Wiki`) — The internal wiki: list of pages, view a page, and create/edit pages — anyone on the team can write.
- **Ask** (`Pages/Ask`) — The AI box: ask a question in plain language about our clients, projects and wiki; a server-side function calls Mistral (mistral-large-4) with the data and returns an answer. Shows the conversation for the session.
- **Team** (`Pages/Team`) — The list of team members with their roles — the people who can be project owners and post authors.

## Data model

### Client

A client of the agency, with their contact details.

Fields:
- name
- sector
- contactName
- email
- phone
- address
- notes

Relationships:
- has many Projects

### Project

A piece of work for a client, with a status (Backlog / In progress / In review / Done) and an owner from the team.

Fields:
- name
- description
- status
- startDate
- dueDate
- client
- owner

Relationships:
- belongs to one Client
- has one owner (TeamMember)

### TeamMember

A person on the 15-person team; the owner of projects and author of wiki pages and feed posts.

Fields:
- name
- role
- email

Relationships:
- owns many Projects
- authors WikiPages and FeedPosts

### WikiPage

An internal wiki page (how-tos, processes, references) that anyone can create and edit.

Fields:
- title
- slug
- body
- author
- updatedAt

Relationships:
- has one author (TeamMember)

### FeedPost

A short update in the team feed. kind is "manual" for posts written by people and "system" for automatic posts (e.g. when a project is marked Done).

Fields:
- author
- content
- kind
- createdAt
- project

Relationships:
- has one author (TeamMember, null for system posts)
- optionally references the Project it is about

## Backend contracts

NodeGX built-in backend holding the agency's data on our own server in Europe. Besides the collections, it includes: (1) a server-side function askMistral(question, history) that calls the Mistral API with model mistral-large-4, reading the key from the MISTRAL_API_KEY function secret — the key never reaches the browser; it answers questions grounded in the Client, Project and WikiPage collections; (2) an automation that creates a FeedPost of kind "system" whenever a Project's status is set to Done.

## Decisions

Considered during scoping and deliberately not done:

- **A client-facing portal where clients see their own projects** — The request is for an internal app; exposing anything to clients adds auth and permission complexity that was not asked for.
- **File/asset storage inside the app** — Not requested; design files are large and better left in their existing tools.
- **Rebuilding all the n8n automations in the app** — Only the project-done announcement is worth bringing in-house; the rest stay in n8n.
- **A US-based AI provider for the Ask box** — Rejected deliberately: Mistral is a European provider, so prompts and answers stay in Europe, matching the data-residency goal.
- **Storing the Mistral API key in frontend config or a repo file** — The key must stay on the server only; it is set as a function secret (MISTRAL_API_KEY) and read exclusively by the server-side function.
- **Auth/login system in v1** — The app is meant to live on the agency's own internal server; adding auth is a follow-up decision (see open questions), not something to guess at now.

_Scoping record: `docs/decisions/000-initial-scope.md`._
