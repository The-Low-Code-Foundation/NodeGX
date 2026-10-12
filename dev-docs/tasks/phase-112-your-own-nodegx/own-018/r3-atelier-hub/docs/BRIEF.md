# Brief

## What this app is

The design agency's internal app, self-hosted in Europe: clients and projects (status + owner), a team wiki anyone can edit, a team feed that auto-posts when a project is marked Done, and an "Ask" box answered by Mistral mistral-large-4 via a server-side function.

## Who uses it

The 15 people of the design agency in Lyon — designers, project leads and admin. Everyone can read and write everything; each project has one owner drawn from the team, and the app itself posts to the feed when a project is marked Done.

## Deliberately out of scope

- A client-facing portal or any way for clients to log in and see their projects — this app is internal only.
- File and design-asset storage (no hosting of Figma exports, PDFs, etc.).
- Invoicing, quotes, time tracking and budgeting.
- Rebuilding the existing n8n automations — only the "project marked done" announcement is brought in-house; everything else stays in n8n.
- Replacing Slack for team chat — the feed is for short updates and system announcements, not a chat.
- Email/calendar integrations.

_Agreed in the initial scoping conversation; the full record, including what was considered and rejected, is in `docs/decisions/000-initial-scope.md`._
