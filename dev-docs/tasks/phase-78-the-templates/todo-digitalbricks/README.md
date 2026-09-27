# todo.digitalbricks.io — the TPL-008 todo list, hosted on nexus-1

Set up 2026-09-15 (TPL-008 §7 s5). The template with its backend, one origin, on the shared box `49.12.102.195`.

| What | Where |
|---|---|
| Site (static, SPA fallback) | `/srv/todo/site` |
| Backend bundle | `/opt/todo/backend/cli.js` (systemd `todo-backend`, user `todo`, `127.0.0.1:8690`, `--no-admin`) |
| Data, policy, ops | `/var/lib/todo/data` (`security.json` = `templates/todo-list.security.json`; `ops.json` = the one here) |
| Caddy | `/etc/caddy/conf.d/todo.caddy` — backend routes proxied, `/_admin` `/admin` `/executions` `/metrics` → 404 |

## Redeploy the app

```bash
S=<scratch>; cp -R templates/todo-list "$S/project"
cp -R "$HOME/vscode_projects/NodeGX test projects/Todo list/noodl_modules" "$S/project/"
# set metadata.cloudservices = {appId: "todo-list", endpoint: "https://todo.digitalbricks.io", type: "nodegx"}
node packages/noodl-preview/dist/nodegx-deploy.cjs "$S/project" "$S/site"
rsync -a --delete --exclude nodegx.security.json -e "ssh -i ~/.ssh/nexus_hetzner" "$S/site/" root@49.12.102.195:/srv/todo/site/
```

The site holds no data, so `--delete` there is safe. **Never** rsync or delete into `/var/lib/todo` — that is the list.

## Redeploy the backend

```bash
node packages/nodegx-backend/scripts/package-deploy.js --skip-build --out "$S/artifact"
rsync -a -e "ssh -i ~/.ssh/nexus_hetzner" "$S/artifact/backend/cli.js" root@49.12.102.195:/opt/todo/backend/cli.js
ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195 systemctl restart todo-backend
```

## Provision from scratch

Copy `security.json` (the template policy) and `ops.json` to `/tmp/todo-provision/` on the box, put the bundle and site in
place as above, then `ssh … 'bash -s' < provision.sh`. It is additive and refuses on a taken port or a Caddyfile that does not
import `conf.d`.

## PWA and deadline reminders (s6)

The template draws a bell (`Todo/Reminders switch`) only when the page sets `data-reminders` on the root. This host does
that with `pwa/reminders.js`, added to every build by `apply-pwa.js` together with the manifest, icons and `sw.js`.

| What | Where |
|---|---|
| PWA files | `pwa/` here → `/srv/todo/site/{sw.js,pwa/}` |
| Push key | `/etc/todo-push/vapid.json` (made on the box, never copied off); public half at `/srv/todo/site/pwa/vapid-public-key.txt` |
| Sender | `/opt/todo/push/sender.js` + `web-push.bundle.js`, systemd `todo-push`, state `/var/lib/todo/push-state.json` |
| Devices | `PushSubscription` rows (one per device; off = `enabled: false`) |

**When:** 09:00–12:00 in each device's own time zone (12:00 is the catch-up limit after downtime), once a day, for the
person's open tasks whose deadline is that day. Nothing due, nothing sent.

Build a site: deploy as above, `rm <site>/nodegx.security.json`, `node apply-pwa.js <site>`. 🔴 Rsync it with
`--exclude pwa/vapid-public-key.txt` or the bell stops working. 🔴 If `nodegx-deploy` refuses a DEVELOPMENT engine (a peer's
webpack rebuilds `packages/noodl-editor/src/external/deploy/noodl.deploy.js`), do not ship it: build with
`--allow-development-engine` and copy in the production `noodl.deploy.js` from the live site — s6 measured every other output
file byte-identical between the two engines.

Useful on the box (as root):

```bash
runuser -u todo -- node --no-warnings /opt/todo/push/sender.js --dry-run          # who would be reminded now
runuser -u todo -- node --no-warnings /opt/todo/push/sender.js --test <email>     # a test notification to their devices
journalctl -u todo-push -n 20 --no-pager
```

On an iPhone push needs iOS 16.4+ and the app added to the Home Screen; the bell says so when pressed in Safari.

## Lock sign-up once Richard has an account

```bash
ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195 \
  "sed -i 's/\"signup\": \"public\"/\"signup\": \"nobody\"/' /var/lib/todo/data/security.json && systemctl restart todo-backend"
```
