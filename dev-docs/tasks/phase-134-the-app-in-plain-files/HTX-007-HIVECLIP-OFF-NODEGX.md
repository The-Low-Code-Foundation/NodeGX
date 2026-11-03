# HTX-007 — HiveClip off NodeGX

**Phase:** [134](README.md). **AC:** AC6. **Sessions:** 1. **Needs:** HTX-004, HTX-005. Richard's OK to use a copy of
HiveClip (closed source; the copy stays on this machine).

## The sentence

> "If I had to stop using Claude tomorrow, HiveClip's window would still be mine: plain files, and another AI could
> change them."

## Build and drive, on a copy (`~/vscode_projects/hiveclip-plain/`, never the real repo)

1. Preflight HiveClip's `ui/` (618 nodes: 59 JavaScriptFunction, 8 HTTP, 8 Page Stack Navigate, 15 Switch) and fix or
   file what the HTML printer refuses. A refusal that blocks the window is a task, not a footnote.
2. Export to plain files and put them where `shell/` reads `ui-dist/`. The shell serves `app://hiveclip/<path>` and
   falls back to `index.html` for a route (`shell/main.cjs:200`): check that `app://` is registered so ES modules load.
3. `npm run check` in the copy's `shell/` (start the engine, draw Sign in, reach the engine, open `/projects` by path,
   quit clean) passes on the plain-files window as it does on the deploy.
4. **The contingency test.** A stranger agent on a model that is not Claude (Mistral in Vibe, OWN-026's harness), given
   only the copy and Richard's sentence for one change (he names it), makes it in the exported files. Graded by the
   same check plus a screenshot of the change. Record the transcript and the cost.

## Done when

- The check passes on both windows; the change lands; the result is written for Richard in plain words with the
  screenshots, and whether the site may say it is his call.
