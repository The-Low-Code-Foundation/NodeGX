# Nightbook desktop — a NodeGX app with its own backend, as a Windows app (TPL-011 DESK-1)

An Electron shell that runs a NodeGX app and its own `nodegx-backend` on one computer, with no network.

| File | What it does |
|---|---|
| `shell/main.js` | One window, one instance. Starts the backend (this binary in Node mode, `--port 0`, data in `%APPDATA%\Nightbook\book`), seeds the backup policy on first start (one a day for a month, into `Documents\Nightbook backups`), and logs timings to `%APPDATA%\Nightbook\logs\timings.log`. |
| `shell/relay.js` | The page's one origin, `http://127.0.0.1:47621`. It serves a file of the app, gives a page navigation `index.html`, and forwards everything else to the backend. The export bakes this origin into the app; an empty endpoint means "no backend" to the runtime (`resolveBackend.pure.ts`). |
| `shell/nightbook.json` | The name, the port and the backup policy, shared by the shell and the build. |
| `build-app.js` | Exports the app (DESK-1 uses `templates/todo-list`) with the endpoint baked in, and collects the backend bundle and the policy into `shell/build-output/`. It fails if the hashed bundle does not carry the origin. |
| `drive-spike.js` | Three launches: write (sign up, add a task) → restart → read back, then a fresh-home control that must NOT show the task. It also checks the database, the installed policy, the backup policy, and that no backend outlives the app. `NIGHTBOOK_HOME` keeps every write in a throwaway folder. |
| `.github/workflows/nightbook-desktop.yml` | On `windows-latest`: builds the installer, installs it silently, drives the installed app, and uploads the installer with `drive-report.json`. |

## Run it on a Mac

```bash
# from the repo root; needs packages/nodegx-backend/dist/cli.js and packages/noodl-preview/dist/nodegx-deploy.cjs
node dev-docs/tasks/phase-78-the-templates/nightbook-desktop/build-app.js --allow-development-engine   # local only
(cd dev-docs/tasks/phase-78-the-templates/nightbook-desktop/shell && npm ci && npm test)
node dev-docs/tasks/phase-78-the-templates/nightbook-desktop/drive-spike.js
```

`shell/` is deliberately **not** a workspace package, so installing it never rewrites the root `package-lock.json`.
