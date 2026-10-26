# BKO-005 — Backend workflows and triggers, drawn

**Phase:** [127](README.md). **Depends on:** BKO-001 (reads `nodegx.automations.json`), BKO-004 (the "On the backend"
list and the function view a step opens).

## What it becomes

- **A trigger is the head of a flow**, in the words a person uses: "Every day at 9:00", "When a Task is created",
  "When a webhook arrives at /hooks/…". Its wire runs to the function or workflow it starts. On the map, a trigger is
  a node wired to its table (row change) and to its function (`fire`, the P124 README §3 word).
- **A backend workflow (WF-001) is drawn as a DAG.** Its steps run left to right, error routes in red, and each step
  opens its cloud function (BKO-004). The step kinds are already words (`/admin/workflow-step-kinds`).
- **The last run lit up** from `/executions`: which step it reached, how long each took, where it failed.
- **Two edits a person can make in Studio:** a trigger on / off, and a schedule's time. Each writes the file and the
  backend together (BKO-001's rule). The agent sees the change in `what_changed_since`.
- Both appear in Workflow → On the backend, and on the map.

## Acceptance

1. The BKO-001 project (a daily trigger, a two-step workflow, a row-change trigger) draws all three, in plain words,
   in Studio on its own and inside the conversation.
2. Turning the daily trigger off in Studio: the file and the backend both say off, `what_changed_since` lists it, and
   the agent's next `list_backend_triggers` agrees.
3. Moving the time to 10:00: the same three checks.
4. A workflow run that fails at step 2 is drawn failing at step 2.
5. Specs added to `check:editor` / `check:data`.
