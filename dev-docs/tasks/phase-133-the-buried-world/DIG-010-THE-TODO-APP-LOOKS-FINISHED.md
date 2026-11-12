# DIG-010 — The todo app looks finished, and gets a Dig button

**Phase:** [133](README.md). **Depends on:** nothing (runs beside any round). **Ruling:** R3.

> "todo.digitalbricks.io is fine with a new 'Dig' button, but let's take a pass at improving the look of the todo app
> because it's rough. I wanted to keep it simple and still do, but not make it look like a noob built it"
> — Richard, 2026-11-03

## What

- A look pass on the TPL-008 template (`packages/noodl-mcp/tests/tpl008*.ts` → `npm run template:todo`): type scale,
  spacing, the row, the detail pane, the tabs, the empty states, light and dark. Keep every TPL-008 ruling (one ranked
  list, no delete, close by writing what happened, the Projects tab opt-in).
- **The way to choose** (memory: rulings are asked with real screens): today's app beside two finished directions of
  the same screens, as working pages, on the phone width and the desktop, his real kinds of tasks in them. He picks; one
  pass builds it.
- **The Dig button**: in the top bar, opens the game's address (DIG-009; until then the lab copy).

## Acceptance

- **AC1.** Richard picks a direction from the working pages.
- **AC2.** The template gates and the todo drives are green on the production engine (TPL-008 recipe); light and dark
  both driven; 390 px wide with no sideways scroll.
- **AC3.** Deployed to todo.digitalbricks.io (and the nodegx.io demo, which is a transform of the template), with
  `/var/lib/todo` untouched.
- **AC4.** Richard on his phone: his words into TPL-008's log.
