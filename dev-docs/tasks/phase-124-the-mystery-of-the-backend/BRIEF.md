# Gate 1 — the brief, in the person's words

**Who asked:** Richard, 2026-10-20, closing the OWN-023 positioning interview (`reviews/THE-PLACE-NODEGX-BESIDE-REPLIT.md`
§10). **Route:** a prototype phase in P118's four-file shape, built the OWN-008 way (a stranger, the npm kit, a real
backend). **Who it is for:** Richard first, as *the person who vouches*: a non-coder who answers the client's questions
about the backend and catches what the client did not ask for. Then anyone who sells "a human checked this".

## What was asked for, verbatim

> Yep. And I think the only thing that's missing today, and the thing I'd like to prototype in a new session, is a way
> to make backend workflows and cloud functions and the database itself interactive in a custom way, the same as
> Noodl did by turning visual and logic elements into nodes with connectors, I want the mystery of the backend /
> cloud functions and the database schema and management, privacy etc., to become as cool as the star wars editor or
> the kids block editor we made in a recent session. The big think question, for the next session, is how do you turn
> backend functions and database managers into 'visual coding' standard? We already did a lot of work on this in the
> backend phase of the 'your own editor' pushes, but we never tried to rethink how a user sees and interacts with a
> database. We had ideas, like nodes for tables and connectors for relations, something like a graph DB, but I've not
> seen a prototype yet. Having that DB view FUSED with the backend workflows and functions that make it work would be
> a very interesting thing, and a way to complete the 'I can explain all of this and you can take control' argument.
> no BaaS today really gives the user who's non technical a visual editor to manage their full backend, DB and
> workflows. Things like n8n come close, and our node editor for backend functions and workflows is good, but it's
> not enough. This is the big think for the next session

And the feeling it serves, from the same interview (review §9.1, §9.4), in his words: what he sells is *"the
reassurance that somebody human is checking the output, any questions in the middle, quality testing the end result"*;
the questions he could always answer in Bubble and cannot about a Claude Code app are *where is the data and who can
see it* and *why does it do X when I click Y*; the editor's one job left for him is the schema, *"in case I disagree
with any of it or I see something the client didn't ask for"*.

## The wish, as handed to the stranger

The frame is OWN-008's (`stranger/wishes.json`): a NodeGX app in a folder, its backend running, the kit from npm, build
it in `./editor`, one npm command, test on copies, write the report. The wish is his words, cut to the ask:

> I'm not a coder. In ./training there's an app I built for a client (a training product) and its backend is running:
> BACKEND.md says where, what it answers and the admin credential. I want the mystery of the backend, the database, the
> cloud functions, who may see what, to become as cool as a star-wars map or a kids' block editor. Show me the
> database FUSED with the functions that make it work, on one canvas: tables and what links them, the functions and
> what each one reads and writes, who may call what and who may see which table, and what just ran, live from the
> backend while I use the app. Make it something I'd sit a client in front of to answer "where is the data, who can see
> it, why does it do that when I click this, is it secure" without asking anyone. And let me take control from the
> canvas: change who can see a table, and have the backend obey. Plain words, no jargon, no JSON on screen.

## s2 — Richard's verdict on the first screen, and the three asks (2026-10-20, late)

> It looks so cool. Now what would make it extra cool is if you take that 'I'm signed in this is what I can see'
> concept, and apply it to 'view as user X' so you can pick a user from the database and literally see the lit up
> pathways they can access, and follow a pathway to say 'if this specific user is on the 'course' page, what EXACTLY
> do they see?' So you'd be able to answer the question 'If I let Frank log in, will he see Sally's conversations?'
> But otherwise the view is very psychadelic, in a good way. Furthermore the ability to for example extrapolate this
> view to 'show me this one conversation record Frank made, who would be able to reach it and through which
> pathways?' and the map shows a view of that one record and who would in theory be able to access it and from
> where, now that's reassurance. Being able to visually explore the 'preview' of the results of your privacy rules
> and relationships, functions and workflows, amazing

Three asks, in his order: **view as a real person** from the database, their reachable pathways lit; **follow a
pathway** to a page and see exactly what that person gets there; **one record's reach**: pick a row and see who can
reach it and from where. The honest mechanism for "exactly" is to run the functions AS that person, not to read the
code: the backend's keys that act as a person (FED-005 `actsAsUserId`) make that real. These go to the same stranger
as round 2, verbatim, with the mechanism measured first (README §s2).

## What the session assumed, for Richard to overturn

- **The audience is the vouching person, not the operator.** The canvas draws what a client asks about; keys, email,
  files, backups and OAuth stay in the manager at `/_admin` (P104). If he wants one surface for everything, that is a
  different editor and a ruling.
- **A grant from the canvas writes both the live backend and the project file.** The backend re-applies
  `nodegx.security.json` at every start, so a live-only change would be undone silently. The stranger is told this.
- **The touch wires (function → table) are read from the function's graph and its JavaScript**, and labelled
  *mentions* where the collection's name is a variable. The honest source is a per-run record of touches, which the
  backend does not keep yet (README §5.1).
- **The training product's copy is the backend** (26 tables, 27 functions, 12 users, one `staff` role, no workflows,
  no triggers). It has no workflow or trigger to draw; that half of the canvas is seen only when one is added.
- **The look is the builder's.** The brief says the feeling and the five questions; the verdict is his, on the screen.
