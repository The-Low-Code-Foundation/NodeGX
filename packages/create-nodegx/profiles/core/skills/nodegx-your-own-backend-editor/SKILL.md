---
name: nodegx-your-own-backend-editor
description: "How to build your own editor or viewer for a NodeGX app's backend — who can see which tables, what one person actually gets, what runs by itself, changing a rule or a trigger — from the published kit, and how to know it is right. LOAD when the person asks for a tool of their own that shows or changes their app's backend (its tables, rules, people, functions, triggers or runs), rather than asking the nodegx server to change the backend for them."
user-invocable: false
---

# Build your own editor for a NodeGX backend

Someone has asked you for a tool that shows or changes their app's backend, and said what they want it to be. This
page doesn't say what it should look like. It says what a NodeGX backend is, which part of the kit answers which
question, how you know you're done, and what the tools before yours got wrong. Read it once before you start. It's
written for Claude Code. Any coding agent can follow it.

For an editor of the app's screens and graph, read `nodegx-your-own-editor` instead. A tag in brackets at the end of
a line, such as (BKO-007), names the record in the NodeGX project where that lesson was learned. You don't need to
read those records.

## What a NodeGX backend is

A NodeGX app that stores data has a backend: a server holding the app's tables, its people and their groups, and
running its cloud functions. A local one runs on this computer. NodeGX keeps each local backend's port and admin
credential in `~/.noodl/backends/<id>/`, and the project's `nodegx.project.json` names the one it uses.

The backend's rules and automations are also written in the project's files. The files are the truth, and a backend
is a copy loaded from them:

| file | what it holds |
|---|---|
| `nodegx.security.json` | who may do what: each table's rule (`collections`), the rule for a table with none (`defaults`), who may call each function (`functions`), files and sign-up |
| `nodegx.automations.json` | what runs by itself: triggers (a schedule, a change to a table's rows, a webhook) and workflows |
| `components/__cloud__/<name>/` | each cloud function, a graph like any component, whose `Request` node makes it callable |

The rows live only in the backend. So do the people, each with the groups (roles) they're in.

A rule names who may do something, as one of these values or a list of them: `"public"` (anyone at all),
`"authenticated"` (anyone signed in), `"role:<group>"`, `"nobody"`. A table's rule has one for each of `find`,
`get`, `create`, `update` and `delete`. `creatorOwns: true` lets whoever made a row always see and change it.
There's no rule for one named person.

## The questions every backend editor answers

| the question | answered by |
|---|---|
| What's in the backend: tables, rows, people, groups, functions, rules? | `readFacts`, `tableRows` |
| Who may touch a table, in words? | `words` (`ruleWords`, `tableRule`, `whoWords`), `dryRuns` |
| What do the functions and screens touch? | `analyseProject`: what their graphs and scripts *name*, which isn't what they hand over |
| What runs by itself? | `triggerFlows`, `readAutomationsFile` |
| What does one person actually get? | `asPerson`, `makeLens` (`reachOf`), `makeViews` (`screen`, `recordReach`) |
| How do I change a rule or a trigger so it holds? | `makeHands` (`rule`, `addTrigger`, `removeTrigger`, `setEnabled`, `undo`) |
| What ran just now? | `makeRuns` |
| Is my editor right? | the backend suite: `backend-suite`, or `runSuite` |

## The kit

```
npm install @nodegx/backend-kit
```

It's on npm under the GPL-3.0 licence, an ES module for Node 20 or later. Everything below is a named export of
`@nodegx/backend-kit`. `@nodegx/backend-kit/words.js` touches neither Node nor the page, so a browser can import it
too.

### Reaching the backend

```js
import { backend, projectBackend, openProject, readFacts } from '@nodegx/backend-kit';

const { url, token } = projectBackend('/path/to/the/app');   // a local backend NodeGX made for this app
const be = backend(url, token);                              // or the address and admin credential you were given
const project = openProject('/path/to/the/app');
const facts = await readFacts({ be, project });
```

`projectBackend` reads `nodegx.project.json` and `~/.noodl/backends/`. It throws with a sentence that says what to
do when the app has no backend on this computer.

**The admin credential stays in your server.** It opens every row and every rule. A page never holds it. Your page
asks your server, and your server asks the backend. The NodeGX backend map works this way.

`readFacts` gives you everything at once:

- `tables`, each with its `columns`, `rows` (a count), `keys`, and `people` (the columns that name a person). A table
  only the project knows about yet is listed with `notOnBackend: true`.
- `functions`, each with `touches` (the tables its graph and scripts name, and how), `call` (who may call it) and
  `deployed`.
- `screens`, `calls` (which screen calls which function, and on what: "pressing “Save”") and `uses` (a screen that
  reads or writes a table itself, with no function in between).
- `config` (the backend's rules), `fileCollections` (the rules file's), `roles` (each group with its member count),
  `people` (how many), `triggers`, and the stamps `etag`, `fileStamp` and `automationsStamp`, which you send back
  when you change something.
- `problems`: each part the backend wouldn't give, in words. The rest is still there.

`tableRows(be, table)` gives one table's rows with a short label each.

### Saying it in words

```js
import { words } from '@nodegx/backend-kit';

words.ruleWords(['role:member', 'role:admin']);    // "The member group or The admin group"
const rule = words.tableRule(facts.config, 'Meeting');   // the table's own rule, or the defaults
words.ruleWords(rule.permissions.find);
```

Use these words, not your own. NodeGX Studio and the map say the same sentences, so a person reading two tools reads
one meaning. `dryRuns(be, table)` asks the backend's own rule check what a few kinds of person may do to a table.

### What one person actually gets

A function's code naming a table says nothing about whose rows it hands back. To know what someone gets, run their
functions as them and look for each row's id in the answers.

```js
import { asPerson, makeLens, makeViews } from '@nodegx/backend-kit';

const lens = makeLens({ be, project, ap: asPerson(be) });
const reach = await lens.reachOf(userId, (event) => draw(event));   // runs, as them, every function that only reads
reach.tables;   // table → { reached, total, directly, via: { function → rows } }
reach.rows;     // table → [{ id, hits: [{ fn, args }] }]

const views = makeViews({ be, project });
await views.screen(userId, 'Pages/Members');     // that screen's functions run as them, with the answers
await views.recordReach('Meeting', rowId);       // everyone who can reach one row, and how
```

`asPerson` makes a short-lived key bound to the person, calls the backend's MCP door with it, and deletes the key
when the work is done. The functions that key may call are the ones the person may call. Its `sweep()` deletes a key
left behind by a crash. `reachOf` asks each function at most 16 ways (`MAX_ASKS`). Say "at least" when it's capped.

`asPerson` never runs a function that changes data. `runnable(fn, tool)` says why not: the graph or a script
writes, or the function's own description says it changes something. A function that writes can only be shown from
what it names. Say that's what you're showing.

### Changing a rule or a trigger

```js
import { makeHands } from '@nodegx/backend-kit';

const hands = makeHands({ be, files: project.files, functions: () => facts.functions.map((f) => f.name) });
await hands.rule({ table: 'Meeting', who: 'authenticated', what: 'see', etag: facts.etag, fileStamp: facts.fileStamp });
await hands.rule({ table: 'Meeting', who: 'authenticated', cut: true, etag, fileStamp });
await hands.addTrigger({ fn: 'notifyMembers', table: 'Announcement', actions: ['create'], automationsStamp });
await hands.addTrigger({ fn: 'weeklyDigest', cron: '0 8 * * 1', automationsStamp });
await hands.setEnabled({ id, enabled: false, automationsStamp });
await hands.removeTrigger({ id, automationsStamp });
await hands.undo(answer.undo);
```

Each one changes the backend and the project's file together. If it can't change both, it changes neither:

- It changes nothing when either place has changed since the stamps you send, and says so. Send the stamps from what
  the person was looking at.
- The backend is put back when the file can't be written.
- Its answer carries `words` (the sentence to show) and `undo` (an id).

`who` is `"public"`, `"authenticated"`, `"role:<group>"` or `"maker"` (whoever made the row). `what` is `"see"`,
`"change"` or `"both"`. Granting `"public"` needs `confirmPublic: true`. Ask the person first, because it means
anyone on the internet. A schedule's cron is read by the backend's own parser before anything is made. A trigger's
id is made from words ("announcement-create-runs-notifymembers").

### What ran just now

```js
import { makeRuns } from '@nodegx/backend-kit';
const runs = makeRuns({ be });
const { total, runs: list } = await runs(since);   // each { name, kind, status, startedAt, durationMs, errorMessage }
```

A request a rule turned away never ran, so it isn't in that list. Read refusals from the audit:
`be.get('/admin/audit?action=access.denied')`. Each entry names the caller, the table or function and the rule that
refused.

## Done means PASS

Your editor is right when the backend suite says PASS. You write one small module, the adapter. The suite opens the
app in your editor through it. It grades what your editor *shows* one person got. It also grades what your editor
*writes* when the person changes something. It reads the backend and the files itself every time. It never takes your
editor's word for anything.

### The adapter

```js
export default function () {
  return {
    name: 'my editor',
    open({ project, backend, token }) { /* the app's folder, the backend's address, its admin credential */ },
    async handed(person) { /* what your editor shows this person got, step by step */ },
    async apply(edit) { /* make one change the way a person's click does; return { id } for a new trigger */ },
    close() {}
  };
}
```

Offer `handed`, `apply` or both. Have both call the code your page calls, not a shortcut.

**`handed(person)`** gets `{ id, name, email, roles }` and returns the steps your editor shows, in order. A step is a
function your editor ran as them, or a table they read themselves (a screen with a Query Records on it), with the rows
that step handed them, by `objectId`:

```js
[
  { fn: 'myStanding', args: {}, rows: {} },
  { table: 'Announcement', rows: { Announcement: ['3ad48f3b-…', '771df659-…'] } }
]
```

The suite runs each function step again as that person and finds the rows in the answer. It asks the backend's own
rule check about each row of a table step. A row you show that they didn't get is a difference. So is a row they got
that you don't show. The suite never runs a function that changes data. It counts that step as not graded and says
so in the PASS line. It grades one person from each different set of groups, or the people you name.

**`apply(edit)`** gets one edit, of one of six kinds:

| kind | fields |
|---|---|
| `grant` | `table`, `who`, `what` (`see`, `change` or `both`) |
| `revoke` | `table`, `who` |
| `add_trigger` | `fn`, `table`, `actions` (any of `create`, `update`, `delete`) |
| `schedule` | `fn`, `cron` |
| `turn_off` | `trigger` |
| `remove_trigger` | `trigger` |

For `add_trigger` and `schedule`, return `{ id }` with the trigger's id. A later edit names it as `"@3"`, the
trigger edit 3 made. After each edit the suite compares both places with what the kit's own writer leaves:
each table's rule and each trigger, then each file byte for byte. A file your editor writes in its own layout is a
difference. Write it through `makeHands`. If you write it yourself, use `serializeV2File` from
`@nodegx/project-contract/format.js`.

### The command

Run the suite on a copy of the app with a backend of its own, never the person's live one. Every edit changes the backend,
and the suite puts both places back at the end.

```
npx -p @nodegx/backend-kit backend-suite my-adapter.mjs /path/to/the/copy edits.json --backend <url> --token-file <file>
```

`edits.json` is a list of edits. To name the people, write `{ "edits": [...], "people": ["ben@example.org"] }`.
`[]` grades `handed` alone. With no `--backend`, the suite uses the backend the copy is linked to.

It prints PASS and exits 0, or FAIL with a sentence per difference and exits 1:

```
PASS — my editor on Members' Area, 0 edits; 16 steps shown to 3 people (137 ms); both places put back
FAIL — my editor on Members' Area, 1 difference (6480 ms); both places put back
  Dev, step 3 (Announcement): the editor shows 3 rows of Announcement the backend didn’t hand them (3ad48f3b-…, …).
```

The kit ships no edit script. Write your own over the copy, with every kind your editor offers at least once.

### Prove the suite can fail

Before you trust a PASS, break one thing on purpose and run again. Show a person a table their groups can't read. Or
skip writing the file. If it still says PASS, your adapter isn't going through your editor.

## What the tools before yours got wrong

Each line cost someone a wrong picture or a false claim.

**On what a person gets**

- Naming isn't handing over. The first backend map lit every table a person's functions named in their code. Every
  learner seemed to reach 23 of 27 tables. Run as them, a new learner reached 2 rows of 289. Count the rows that come
  back. (P124-S3-LENSBYNAMING)
- Reading isn't handing over either. A function that reads your own row and answers "yes" or "no" hands you the
  answer, not the row. Its answer is all the person gets. (BKO-009)
- Never run a function that changes data to find out what it does. Its run is real. It makes a row or sends a
  message. Show it from what it names, and say so. (P124 s3)
- Someone not signed in can't be acted as with a key. What they get is the backend's rule check and the functions
  anyone may call. (P124 s3)

**On reading the backend**

- A read can write. The backend makes a table the first time a query names it. A map that asked for a table the app
  didn't have made it, empty, in every app it opened. Ask only for tables `/admin/schema` lists. `readFacts` does
  that. (P127-BKO003-PROFILEWRITE)
- The backend limits admin requests: 300 a minute, in bursts of 100. The kit's client waits and asks again when
  it's told to. Read the world once and keep it for a few seconds, as `makeLens` does (15 s). (P124 s3)
- A refusal at the door leaves no run. Look for it in the audit (`access.denied`). (P124-S1-DOORREFUSALUNSEEN)
- A function made after the backend started doesn't run there until it's deployed. Your editor has no deploy. Say
  so, and let the person ask their agent to run `deploy_cloud_functions`. (BKO-004)

**On changing it**

- Write both places. An agent's rules and triggers once went to the backend only. They never reached git and never
  left the machine. (P127-BKO001-BACKENDONLY)
- Send the stamps you showed. Without them, a change the person made from an old screen overwrites what their agent
  changed since. (BKO-007)
- Undo compares what's there, not when the file changed. The first undo compared the file's time. Undoing a cut and
  then the grant before it was refused, because the cut's undo moved the time. (BKO-007)
- There's no rule for one person. A person dragged onto a table can mean their group, anyone signed in or the rows
  they made. Ask which. (BKO-007)
- A webhook trigger isn't removed by the kit. Its secret can't come back on an undo. (BKO-007)
- A schedule runs as the app, not as a visitor. A function only members may call can still run on a schedule. Don't
  make it public for that. (P127-BKO006-SCHEDULEAUTH)
- Compare rules table by table. The backend lists a table last once its rule has been put back. Two configs with
  equal rules can then differ as JSON. (BKO-008)

## What your editor must not do

- Change the person's live backend while you build it. Work on a copy with a backend of its own.
- Put the admin credential in a page.
- Claim a person reaches a table because a function names it.
- Run a function that changes data to see what it does.
- Write a rule or a trigger to the backend and not the file, or to the file and not the backend.

## When you're done

Write a short report for the people who made the kit. Say how long it took. List every question this page and the kit
didn't answer, where you had to guess. Paste the suite's output. Open an issue on `The-Low-Code-Foundation/NodeGX`
with it. Every guess becomes a sentence on this page or a fix in the kit.
