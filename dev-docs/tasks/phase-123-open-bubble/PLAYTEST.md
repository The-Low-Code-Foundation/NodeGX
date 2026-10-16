# Gate 5 — the person it is for uses it

**Who:** Richard, six years of Bubble. **What:** open a copy of a real project in Open Bubble and do three things he
would do in Bubble on a Tuesday: move an element and resize it, add an action to a button's workflow and set its
values from an input, and add a field to a data type and a row. **What is written down:** his words, the time to
each, and every "in Bubble I would…" that the editor cannot do.

## How to run it for him

```sh
# from the repo root, once: the runtime, the preview bundle and Orbit's two kit modules
npm run build:editor:_viewer && npm --prefix packages/noodl-preview run build && dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/build.sh
# a copy of a project (never the real one), bound to a backend of its own; then the editor on it
node dev-docs/tasks/phase-123-open-bubble/editor/serve.mjs /path/to/a/copy --port 47900
open http://127.0.0.1:47900/
```

`editor/check.mjs` does the same on a copy of `templates/todo-list` with an ephemeral backend, headless.

## The sitting

*(not yet — Richard has not sat with it)*

| he tried | what happened | his words |
|---|---|---|
| | | |

## "In Bubble I would…"

*(each line becomes a row in the README's §5 or a task when the phase takes a lane)*
