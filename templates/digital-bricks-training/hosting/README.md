# training.digitalbricks.io — this template, for real clients, on nexus-1

TASK-L183 (sprint 53 in the digital-bricks-training repo). The template with its own backend, one
origin, on the shared box `49.12.102.195` (Hetzner fsn1-dc14), beside `todo`, `planning` and the
rest. It holds real people's data, so it gets **its own process, data directory and policy**, never
the todo list's backend.

| What | Where |
|---|---|
| Site (static, SPA fallback) | `/srv/dbtraining/site` |
| Backend bundle | `/opt/dbtraining/backend/cli.js`, systemd `dbtraining-backend`, user `dbtraining`, `127.0.0.1:8691`, `--no-admin` |
| Data (SQLite), policy, ops, secrets | `/var/lib/dbtraining/data` — **never rsync or delete into it** |
| Caddy | `/etc/caddy/conf.d/dbtraining.caddy`, written by `add-caddy.sh` only once DNS points here |

`--no-admin` removes the `/_admin` dashboard only. The `/admin/*` API is still served on
`127.0.0.1:8691` behind the admin credential the backend minted into `secrets.json` on its first
start, and Caddy answers 404 to it from outside. **Everything admin goes through a tunnel.**

## 1. Build the backend bundle

`scripts/package-deploy.js` currently **refuses every build** (measured 2026-09-30): its secret
scan flags the backend's own error message `Expected postgres://user:password@host:5432/database`
(phase 97) as a credential. Until that is fixed in core, ship `dist/cli.js` itself, after checking
that the placeholder is the only connection-string-shaped text in it:

```bash
cd packages/nodegx-backend
python3 -c "import re;s=open('dist/cli.js').read();print(re.findall(r'[a-z+]+://[^\s:/@\"]+:[^\s@/\"]+@',s))"
#   → ['postgres://user:password@']  and nothing else
```

## 2. Build the site

```bash
S=<scratch>
# The production viewer, built into scratch (the working tree's noodl.deploy.js is whatever a
# peer last built, usually a development build with a 10 MB inline source map):
(cd packages/noodl-viewer-react && npx webpack --config webpack-configs/webpack.deploy.prod.js --output-path "$S/engine")
node templates/digital-bricks-training/tools/build-production-site.mjs \
  --origin https://training.digitalbricks.io --engine "$S/engine" --out "$S/site"
```

It refuses a development engine, published source folders (`backend/`, `tools/`, `hosting/` —
`.noodlignore` keeps them out), any `@example.test` address, and the Palette route.

## 3. Provision (once)

```bash
K="-i ~/.ssh/nexus_hetzner"; BOX=root@49.12.102.195
ssh $K $BOX 'mkdir -p /opt/dbtraining/backend /srv/dbtraining/site /tmp/dbtraining-provision'
rsync -a -e "ssh $K" packages/nodegx-backend/dist/cli.js $BOX:/opt/dbtraining/backend/cli.js
rsync -a --delete -e "ssh $K" "$S/site/" $BOX:/srv/dbtraining/site/
scp $K templates/digital-bricks-training/nodegx.security.json $BOX:/tmp/dbtraining-provision/security.json
scp $K templates/digital-bricks-training/hosting/ops.json      $BOX:/tmp/dbtraining-provision/ops.json
ssh $K $BOX 'bash -s' < templates/digital-bricks-training/hosting/provision.sh
```

Then, through a tunnel, with the credential only ever in an environment variable:

```bash
ssh $K -N -L 18691:127.0.0.1:8691 $BOX &          # the tunnel
export NODEGX_ADMIN_TOKEN=$(ssh $K $BOX "python3 -c \"import json;print(json.load(open('/var/lib/dbtraining/data/secrets.json'))['adminToken'])\"")
cd templates/digital-bricks-training
node tools/setup-production.mjs --backend http://127.0.0.1:18691 --staff <address> [--first-name … --last-name …]
printf '%s' '<Brevo SMTP key>' > ~/.dbt-brevo-key && chmod 600 ~/.dbt-brevo-key
node tools/setup-signin.mjs --backend http://127.0.0.1:18691 --app-origin https://training.digitalbricks.io \
  --smtp smtp-relay.brevo.com:587 --smtp-user <Brevo login> --smtp-key-file ~/.dbt-brevo-key \
  --from no-reply@digitalbricks.io --base-url https://training.digitalbricks.io
node tools/check-production.mjs --backend http://127.0.0.1:18691 --app-origin https://training.digitalbricks.io
```

`check-production` fails on a sandbox relay, an empty `baseUrl` (every sign-in link would point at
`127.0.0.1`), a loosened policy, a redirect allow-list with anything but the served origin, and any
trace of the demo world. Each of those was demonstrated failing by name (TASK-L183).

## 4. The name (TASK-L183 §6 — each step is a stop point)

1. Read the old host's rows on vh-training-1 and show them to Richard (2026-09-30: 1 account, his
   own; 1 project; 2 cached lessons; no progress, submissions or uploads; no purchases; 2 connector
   clients and 51 connector tokens).
2. Richard moves the A record `training` → `49.12.102.195` at Namecheap.
3. `ssh $K $BOX 'bash -s' < hosting/add-caddy.sh` — it refuses until the name resolves here.
4. Off the box: `/` 200 over a valid certificate; `/health` answers; `/admin`, `/_admin`,
   `/executions`, `/metrics` are 404; then `check-production` again.
5. Retiring the old product is its own confirmation (runbook §6 in the product repo).

## Redeploy

- **The site:** rebuild (§2), then `rsync -a --delete` into `/srv/dbtraining/site/`. It holds no
  data.
- **The backend:** rsync `cli.js`, `systemctl restart dbtraining-backend`.
- **The functions:** `deploy-functions.mjs` through the tunnel.
- `provision.sh` refuses a second run on purpose; it is not how you redeploy.

## Known, not fixed

- A text input's value reaches the graph on the runtime's next pass, so a click in the **same
  frame** as the last keystroke sends the address one keystroke short (measured: 0 ms pause →
  `…example.or`; 20 ms → correct). No person clicks within 20 ms of typing; a script does.
