# TWO-006 — The daily devotional

**Opened 2026-10-14; rewritten the same day from the builder's answer** (the blog is down because its free hosting limit
ran out; they have every devotional as HTML files). **Depends on TWO-005 slice 2 and the HTML files.** **Status: 📋
not started.** Kind: build.
**Model:** Opus.

## 1. The person sentence

> **Every devotional the ministry's leader ever wrote is in the community app. Each morning the day's one is pinned at the top of the
> feed, members can read it with no connection, and he writes new ones in the community app without needing the blog.**

## 2. What exists

- The builder's answer (BRIEF.md): the static blog is down; they have every devotional as HTML files; making the devotional
  offline is in progress on their side.
- P96: `HTTP Request` → `Parse Feed` and scheduled functions (FED-001…006), for the day the blog is back.
- Cron triggers; file storage.
- TWO-010's offline storage on the phone (shared with the Bible).

## 3. What to do

1. **Get the files** from the builder (a zip). Read how the static blog tool laid them out: one page per devotional, its title, date,
   body, scripture reference, any images.
2. **Import:** a one-time script (or an admin upload of the zip) that turns each page into a `devotional` record with
   title, date, body (cleaned HTML), scripture reference. Re-running it adds nothing twice.
3. **The daily release:** a scheduled function each morning (West Africa time, configurable) pins the devotional for
   the day: a dated one if there is one, otherwise the next from the archive in an order the admin sets.
4. **Writing new ones:** an admin page to write and schedule a devotional (title, scripture, body, date).
5. **Offline:** the last 30 devotionals and any opened since are kept on the phone (TWO-010's storage).
6. **Public page:** each devotional has a public link that works without an account, for sharing outside.
7. **If the blog returns:** the feed route (P96) as an option; same records, no duplicates.

## 4. Acceptance criteria

1. The real archive imported: the count of files equals the count of records; five picked at random match their
   pages; a second import adds 0.
2. On a test clock, three mornings pin three devotionals in order; a scheduled new one wins its date.
3. In airplane mode, the pinned devotional and the last 30 open.
4. A public link opens a devotional in a private window with no sign-in.

## 5. Not this task

Rehosting the static blog. Push notifications for the devotional (later, with SRK-005).
