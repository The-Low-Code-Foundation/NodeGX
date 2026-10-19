# How to build in this folder

The person who asks for an app here does not read code. They will judge the result by using it on their phone and by
reading the files described below. Build so they can check your work without trusting you.

## Don't stop to ask

If you're told to build without waiting, don't ask questions. When something is unclear, pick the simplest choice a
reasonable person would expect, write it down in `DECISIONS.md` (one line each: what was unclear, what you chose, how
to change it), and keep going.

## Stack

Next.js (App Router) with TypeScript, SQLite through Prisma, Tailwind for styling, Vitest for logic tests, Playwright
for browser tests. One `package.json`, one app. Don't add other frameworks unless the request can't be met without
them, and if you do, record why in `DECISIONS.md`.

Scripts that must exist and work:

- `npm run setup`: installs, creates `.env.local` from `.env.example` if it's missing, sets up the database, loads sample data
- `npm run dev`: starts the app at http://localhost:3000
- `npm test`: all Vitest tests
- `npm run e2e`: all Playwright tests (starts the app itself)
- `npm run check`: typecheck, lint, `npm test`, `npm run e2e`, and the secret-leak check, in that order. It fails if any of them fails.

## 1. Write down behaviour before building it

Before you write any app code, create `SPEC.md`:

1. Paste the person's request **word for word** at the top, under "What you asked for".
2. Break it into numbered requirements `R1`, `R2`, … Each requirement quotes the words it comes from, then says in
   plain language what someone will see and be able to do. Write it so a non-programmer could tick it off by hand.
   Include the things the request implies but doesn't say: empty states, error messages, what happens on a phone.
3. Add requirements for the settings screen (section 4) and for keeping secrets safe (section 3).

Then, for each requirement, in order:

1. Write the test first. Name it after the requirement: `test("R3: a saved note appears at the top of the list", …)`.
   Things the user does in the browser go in a Playwright test (`e2e/`). Pure logic (calculations, validation) goes
   in a Vitest test next to the code.
2. Run it and see it fail.
3. Build until it passes. Don't weaken a test to make it pass. If the requirement was wrong, fix `SPEC.md` first and
   say so in `DECISIONS.md`.

Every `R` number in `SPEC.md` must have at least one test with that number in its name. Before you finish, search the
tests for every `R` number and fix any that are missing.

## 2. Check it in a real browser, at phone width, before saying it's done

Passing tests isn't the same as being done. Run the app and use it the way the person would:

- Use Playwright with a phone viewport (390 × 844, touch on). Go through every requirement in `SPEC.md` in order, the
  way a person would: tap, type, submit, reload, go back.
- For each requirement, save a screenshot to `verification/R<n>.png` that shows it working (or not working).
- Also check: nothing scrolls sideways, tap targets are big enough to hit with a thumb, text is readable without
  zooming, and the browser console shows no errors.
- Then go back to the person's original words in `SPEC.md` and read them one sentence at a time. Ask yourself whether
  someone who said that sentence would be satisfied with what's on the screen. Fix anything that isn't, and test it again.

Then write `REPORT.md` for someone who doesn't read code. Don't use code, file paths (except screenshots), or jargon.
It contains:

- A table with one row per sentence of the original request: their words, what the app now does, ✅ / ⚠️ / ❌, and the screenshot.
- "What I decided for you": the choices from `DECISIONS.md`, in plain words, and how to change each one.
- "What doesn't work yet": be honest. If something fails, say so here, and don't claim the app is done.
- "Try it yourself": three to five short things to tap on their phone to see it working.

Only tell the person you're finished when `npm run check` passes and `REPORT.md` is written. Your final message
should be a short summary that points them to `REPORT.md`.

## 3. Secrets stay on the server

- Secrets (API keys, passwords, tokens) go only in `.env.local`, which is listed in `.gitignore`. Use them only in
  server code: route handlers, server actions, or files that start with `import "server-only"`. Never prefix a secret
  with `NEXT_PUBLIC_`. Never send one to the browser in props, JSON, or error messages.
- `.env.example` lists every variable with a placeholder value and a plain-English comment above it: what it's for,
  where to get it, and whether the app works without it.
- Never ask the person to paste a secret into the chat. If they need to add one, tell them: open `.env.local`, put it
  after the `=` on the line named X, save, restart. If they paste one anyway, don't repeat it back. Tell them to put it
  in the file and to replace the key with a new one, because it's now been seen.
- The app must start and be usable without any secrets. Features that need a missing key show a friendly message
  saying which line of `.env.local` to fill in, and they don't crash.
- Leak check (part of `npm run check`): build the app, put recognisable fake values in every secret, and search the
  built browser files (`.next/static`) and the HTML of every page for those values. Any match fails the check.

## 4. A settings screen for the person

Add a `/settings` page, linked from the main navigation, that's comfortable to use on a phone. On it, put the things
this person would want to change without a programmer: the app's name and wording shown to users, colours or logo,
on/off switches for optional features, limits and defaults (how many items, prices, time windows, email addresses
that get notified), and anything you guessed in `DECISIONS.md` that could reasonably go either way.

- Store settings in the database, not in code. Changes take effect right away, without a restart.
- Check what's typed in and show clear error messages. Include a "reset to defaults" button.
- Secrets are never shown or edited here. For each secret, just show "set" or "not set" and the line in `.env.local`
  to fill in.
- If the app has users, only an admin can open settings. The first admin is set in `.env.local`.
- Settings get their own requirements in `SPEC.md` and their own tests, like everything else.

## 5. What the person finds in the folder afterwards

- `README.md`, written in plain language:
  - **Run it on your computer**: install Node (with a link), then `npm run setup` and `npm run dev`, then what to open.
  - **Put it on the internet**: step-by-step for one host that supports Next.js and a database file or a managed
    database (for example Vercel with a hosted database, or Render or Fly with a disk). Say which settings to copy
    from `.env.local` into the host's settings screen. Say what it roughly costs.
  - **What each part is**: a short table with each top-level folder and important file, explained in one sentence a
    non-programmer would understand.
  - **Where things are**: `SPEC.md` (what it should do), `REPORT.md` (proof it does it), `DECISIONS.md` (choices made
    for you), `.env.example` (secrets it needs), `verification/` (screenshots).
- `SPEC.md`, `REPORT.md`, `DECISIONS.md`, `.env.example`, `verification/`, as described above.
- `CLAUDE.md`: this file. Leave it as it is.

## 6. Changing the app later (for any agent working here after the first build)

You won't remember the build, so the files are your memory. Before you change anything:

1. Read `SPEC.md`, `DECISIONS.md`, `README.md`, and the latest `REPORT.md`. Run `npm run check` to confirm it passes
   before you start. If it doesn't, tell the person what was already broken before you touched anything.
2. Write the change into `SPEC.md` first. Add new `R` numbers after the last one. Never renumber existing ones. When
   a requirement is removed, mark it "Removed (date): reason" instead of deleting it. Quote the person's new request
   word for word under a dated "Changes" heading.
3. Update or add tests for the affected `R` numbers, see them fail, then make the change.
4. Don't delete or loosen an existing test unless its requirement changed in `SPEC.md`.
5. Database changes go through Prisma migrations, never by editing the database directly. Existing data must survive.
   Keep the sample data in `npm run setup` working.
6. Run `npm run check`. Repeat the phone-width browser walkthrough for every requirement you touched, and also a quick
   pass over the main screens. Update the screenshots and `REPORT.md`, and add a dated "What changed" section at the top.
7. If you added a secret or setting, update `.env.example`, the settings page, and `README.md`.
