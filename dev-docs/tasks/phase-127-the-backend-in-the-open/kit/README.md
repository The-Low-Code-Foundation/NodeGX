# @nodegx/backend-kit

What you need to build your own editor or viewer for a NodeGX app's backend. It has no screen in it. The NodeGX
backend map (`@nodegx/backend-map`) is built on it, and on nothing private.

```
npm install @nodegx/backend-kit
```

An ES module for Node 20 or later. Every name below is a named export.

| the question | answered by |
|---|---|
| What's in the backend: tables, rows, people, groups, functions, rules? | `readFacts`, `tableRows` |
| Who may touch a table, in words? | `words` (`ruleWords`, `tableRule`, `whoWords`), `dryRuns` |
| What do the functions and screens touch? | `analyseProject` (what they name, which isn't what they hand over) |
| What runs by itself? | `triggerFlows`, `readAutomationsFile` |
| What does one person actually get? | `asPerson`, `makeLens`, `makeViews` |
| How do I change a rule or a trigger so it holds? | `makeHands`: the backend and the project's file together, or neither |
| What ran just now? | `makeRuns` |
| Is my editor right? | `runSuite`, and the `backend-suite` command |

`@nodegx/backend-kit/words.js` touches neither Node nor the page, so a browser can import it too.

## Is my editor right?

Write an adapter: a module whose default export returns `{ name, open, handed?, apply?, close? }`. Then run the suite
on a copy of the app with a backend of its own:

```
npx -p @nodegx/backend-kit backend-suite my-adapter.mjs /path/to/the/copy edits.json --backend <url> --token-file <file>
```

`handed(person)` returns what your editor shows that person got, step by step. The suite does each step again as
them and compares the rows. `apply(edit)` makes one change (`grant`, `revoke`, `add_trigger`, `schedule`,
`turn_off`, `remove_trigger`). The suite compares the backend and the files with what the kit's own writers leave.
It prints PASS and exits 0, or FAIL with a sentence per difference and exits 1, and puts both places back.

## The guide

`npm create nodegx` writes the guide into your folder as `.claude/skills/nodegx-your-own-backend-editor/SKILL.md`.
It says what a NodeGX backend is, shows each export at work, and lists what the tools before yours got wrong.

GPL-3.0-only. Source: `The-Low-Code-Foundation/NodeGX`, `dev-docs/tasks/phase-127-the-backend-in-the-open/kit`.
