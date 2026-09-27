# Todo list demo

The **Todo list** template with its backend taken out, so it can run on a web page with no server
and no account. It starts with an example list, and everything a visitor does stays in their own browser.

🔴 **Generated — do not edit it by hand.** `npm run template:todo` writes it from the template's own
components beside `templates/todo-list/`. Change the template and regenerate, and the demo follows.

## What is different from the template

- **`Logic/Todo data`** reads the list from this browser's local storage (`nodegx-todo-list-demo-v1`), and puts
  the example list there the first time it finds none.
- **Every record write** in `Commands/` and `Logic/Write history` is a `Function` at the same place in the
  graph, writing to that same storage. The commands, rows, dialog and history rules are the template's.
- **There is no sign in.** The page reads the list when it opens. **Reset demo** in the header puts the
  example list back.

To keep a list on your phone and your computer, start from the **Todo list** template, which keeps
it in the NodeGX backend.

