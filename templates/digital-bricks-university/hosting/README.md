# Hosting Digital Bricks University (DBU-12)

The one page for running it. Production is **https://training.digitalbricks.io** on **nexus-1**
(Hetzner, Falkenstein; `ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195`). The box is shared: digitalbricks.io,
nodegx.io, todo, planning, learn-ai and others run beside it under one Caddy. Touch only what is named here.

| What | Where |
|---|---|
| Backend | `dbuniversity-backend.service`: `/opt/dbuniversity/backend/cli.js` on 127.0.0.1:**8695**, `TZ=Europe/Paris`, user `dbuniversity` |
| Data | `/var/lib/dbuniversity/data` (database, `files/blobs`, `secrets.json`, `auth.json`, `email.json`, `backups/`) |
| Site | `/srv/dbuniversity/site` (built by `tools/build-production-site.mjs`), privacy notice at `/privacy.html` |
| Caddy | `/etc/caddy/conf.d/dbuniversity.caddy` (written by `swap-caddy.sh`); the old template's block is in `/etc/caddy/retired/` |
| Backups | NodeGX nightly at 03:15 (Paris), seven kept, in `data/backups`; off-box at 03:45 UTC by `dbuniversity-offsite-backup.timer` to `training-digitalbricks/dbuniversity/` (Hetzner Object Storage, nbg1), gpg-encrypted |
| Mail | Brevo relay `smtp-relay.brevo.com:587`, from `no-reply@digitalbricks.io` |
| Admin | No public admin. Everything goes through a tunnel: `ssh -i ~/.ssh/nexus_hetzner -N -L 18695:127.0.0.1:8695 root@49.12.102.195`, then the tools with `--backend http://127.0.0.1:18695` and `NODEGX_ADMIN_TOKEN` from `data/secrets.json` (`adminToken`) |

Every command below runs from `app/` on the laptop unless it says "on the box". `K="-i ~/.ssh/nexus_hetzner"`,
`BOX=root@49.12.102.195`.

## Where the coach's notification address is set

In the app: **Settings → "Learner messages are emailed to"** (the `Setting` row `coachEmail`). Learner messages
and the morning digest go there. `tools/setup-production.mjs --coach-mail` set the first value
(`richard+dbuniversity@digitalbricks.io`). The name learners see is beside it (**"Your name, as learners see
it"**, row `coachName`). The coach's own sign-in address is their account's email, not this setting.

## Deploy a change

1. Run the gates first: `check-security`, `check-mail`, `check-inbox`, `check-checkins`, `drive-demo`, and
   `validate_project` with 0 errors.
2. **The site** (pages, words, styles):
   ```bash
   node tools/build-production-site.mjs --origin https://training.digitalbricks.io --engine <engine dir> --out /tmp/dbu-site
   rsync -a --delete -e "ssh $K" /tmp/dbu-site/ $BOX:/srv/dbuniversity/site.new/
   ssh $K $BOX 'cd /srv/dbuniversity && rm -rf site.old && mv site site.old && mv site.new site'
   ```
   The engine is a production build of the viewer:
   `cd ~/vscode_projects/OpenNoodl/packages/noodl-viewer-react && npx webpack --config webpack-configs/webpack.deploy.prod.js --output-path <engine dir>`.
   The builder refuses a development engine, the example world's people, a local address, or a missing origin.
3. **Cloud functions** (anything under `components/__cloud__/`): open the tunnel, then
   `node tools/deploy-functions.mjs --backend http://127.0.0.1:18695`. A new function needs its rule in
   `nodegx.security.json` first, or deploy refuses it.
4. **The policy or the schema**: through the tunnel, `PUT /admin/permissions` with `nodegx.security.json` and
   `POST /admin/schema/apply` with `backend/schema.json` (`setup-production.mjs` steps 2 and 3 show both, read
   back). Do this BEFORE deploying functions that need it: a backend keeps the policy it has.
5. **The backend** (a new NodeGX build): rsync `OpenNoodl/packages/nodegx-backend/dist/cli.js` to
   `/opt/dbuniversity/backend/cli.js.new`, then on the box `mv cli.js cli.js.old && mv cli.js.new cli.js &&
   systemctl restart dbuniversity-backend`.
6. Then `node tools/check-production.mjs --backend http://127.0.0.1:18695 --origin https://training.digitalbricks.io`.
   It must pass end to end; it makes and removes one throwaway learner.

`provision.sh` and `setup-production.mjs` refuse to run twice. They are for the first install, not for
redeploying.

## Roll back

- **The site:** on the box, `cd /srv/dbuniversity && mv site site.bad && mv site.old site`.
- **The backend:** on the box, `mv cli.js.old cli.js && systemctl restart dbuniversity-backend`.
- **A function:** check out the previous commit and run `deploy-functions` again.
- **The whole name, back to the old template** (`digital-bricks-training`, still running on 8691 with its
  data): `ssh $K $BOX 'bash -s -- --rollback' < hosting/swap-caddy.sh`. It validates before reloading and lists
  the neighbours' status after.

## Restore

**From the box's own copies** (somebody broke a row): through the tunnel,
`POST /admin/backups/restore {"archive": "<file in data/backups>"}`. The backend takes a safety archive first.

**From off the box** (the box is gone): the copy is
`training-digitalbricks/dbuniversity/dbuniversity-backup-<time>.tar.gpg`.
1. Download it (rclone or the Hetzner console) and `gpg --decrypt` it on Richard's laptop: the private half of
   "Anchor DB backups" (`DBEFAE899AD5B2E1076A303EB49028CA034380CC`) is only in his password manager and keyring.
2. `tar -xf` it: a NodeGX archive (`backup-*.ngxbackup.tar.gz`), `secrets.json` and `auth.json`.
3. On a fresh backend (provision.sh on a new box, or a scratch one locally), put the archive in
   `data/backups/`, restore it as above, then stop the backend, put `secrets.json` and `auth.json` back in the
   data directory and start it again. Without them every unsubscribe link already sent stops working and the
   sign-in setup is lost.
4. Run `check-production` against it, and sign in.

The archive holds the database AND every uploaded file (`files/blobs`). `offsite-backup.sh` refuses a night
whose archive is missing any file on disk, so a copy that went up has them all.

## Rotate keys

| Key | Where it lives | How |
|---|---|---|
| Admin token | `data/secrets.json` `adminToken` | Stop the backend, replace the value with 48 random hex characters, start it. Nothing else holds it. |
| Brevo SMTP key | `data/secrets.json` `email.smtpPassword` | Make a new SMTP key in Brevo, write it to a 0600 file, run `tools/setup-signin.mjs` through the tunnel with `--smtp smtp-relay.brevo.com:587 --smtp-user <Brevo login> --smtp-key-file <file> --from no-reply@digitalbricks.io --app-url https://training.digitalbricks.io --base-url https://training.digitalbricks.io`, delete the file, then revoke the old key in Brevo. |
| Unsubscribe key | function secret `unsubscribeKey` | Only on purpose: a new one breaks every "stop these emails" link already sent. Through the tunnel, `PUT /admin/secrets/unsubscribeKey`. |
| Bucket key | `/etc/dbuniversity/backup.env` (root, 0600) | Make a new key in the Hetzner console, edit the `RCLONE_CONFIG_OFFSITE_*` values, `systemctl start dbuniversity-offsite-backup` and read `/var/backups/dbuniversity/last-offsite.json`, then delete the old key. The old template's `/etc/dbtraining/backup.env` uses the same bucket. |
| Backup gpg key | `backup-public-key.asc` here, `/etc/dbuniversity/backup-public-key.asc` on the box | Replace the file and `GPG_RECIPIENT`, run `install-offsite-backup.sh` again. Old copies still need the old private key until they age out (seven days). |
| Learners' sessions | the database | Through the tunnel, delete the `_Session` rows of that user; they sign in again by email. |

## First install (done 2026-11-12, kept for a second box)

1. Laptop: build the site; rsync `cli.js` to `/opt/dbuniversity/backend/` and the site to `/srv/dbuniversity/site/`;
   copy `nodegx.security.json`, `nodegx.automations.json` and `hosting/ops.json` to `/tmp/dbuniversity-provision/`
   as `security.json`, `automations.json`, `ops.json`.
2. On the box: `bash -s < hosting/provision.sh`.
3. Tunnel, token, then `deploy-functions`, `setup-production --coach-email <sign-in address> --coach-name "<First
   Last>" --coach-mail <where learner messages go>`, and `setup-signin` with the Brevo flags above.
4. `bash -s < hosting/swap-caddy.sh` on the box, then `check-production`.
5. The off-box backup: write `/etc/dbuniversity/backup.env` (the old template's, with `dbuniversity` for
   `dbtraining` in the paths and prefix), then `install-offsite-backup.sh` (its header has the commands), and
   `systemctl start dbuniversity-offsite-backup` once to prove it.

## The privacy notice

`hosting/privacy.html`, published as `/privacy.html` and linked from Sign in. It names who runs this
deployment, Hetzner and Brevo, and promises: copies gone within seven days (`OFFSITE_PRUNE_AGE` 156h in
`offsite-backup.sh`, seven local copies), and nothing sent to an AI model. Change the notice before changing
any of those, and bump its version line.
