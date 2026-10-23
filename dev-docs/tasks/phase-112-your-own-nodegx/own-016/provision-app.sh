#!/usr/bin/env bash
#
# P112 OWN-016 / P26 DEP-002 — put a NodeGX app on a VM you own: the folder `nodegx-deploy --full-stack` writes (the
# app, its backend, its cloud functions, its access rules and `start.js`), run as a service, plus its function secrets.
# Modelled on P78's todo-digitalbricks/provision.sh, which put todo.digitalbricks.io on nexus-1.
#
# Run as root on the box, after ship-to-vm.sh has staged the folder:
#
#   APP=lingo DOMAIN=lingo.nodegx.io PORT=8692 bash -s < provision-app.sh
#   APP=lingo PORT=8692 CADDY=off bash -s < provision-app.sh     # no public address yet (no DNS): the backend serves
#                                                                 # the app on 127.0.0.1:<port> only (ssh -L to see it)
#
# SHARED HOST: other live sites may be served here, and Caddy loads the whole config or none of it. So this is
# strictly additive. It writes only:
#
#   /opt/<app>/                               the folder, replaced wholesale by every ship; read-only to the service
#   /var/lib/<app>/data/                      the app's data: records, uploads, the admin credential, and the cloud
#                                             functions and rules start.js installs from the folder. A ship never
#                                             writes here.
#   /etc/<app>/secrets.env                    (written by ship-to-vm.sh over stdin, never here, never in the folder)
#   /etc/systemd/system/<app>-backend.service
#   /etc/caddy/conf.d/<app>.caddy             (unless CADDY=off; deleted again if caddy validate fails)
#
# and, once Caddy no longer points at it, removes /srv/<app>/ — the site the earlier layout (a site plus a loose
# cli.js) served from.
#
# The backend binds 127.0.0.1:<port> and serves the app AND its API on that one origin (`--serve-app`, set by
# start.js); Caddy is the only way in from outside. Behind a proxy every request arrives from loopback, so the admin
# surface is NOT proxied, and --no-admin is set. Secrets reach cloud functions through the backend's
# NODEGX_SECRET_<NAME> environment fallback (SecretsStore), from an EnvironmentFile only root and the app user read.

set -euo pipefail

APP="${APP:?APP=<name>}"
PORT="${PORT:?PORT=<loopback port>}"
CADDY="${CADDY:-on}"
DOMAIN="${DOMAIN:-}"
[ "$CADDY" = off ] || [ -n "$DOMAIN" ] || { echo "FATAL: DOMAIN=<host> is needed unless CADDY=off" >&2; exit 1; }
[[ "$APP" =~ ^[a-z][a-z0-9-]{1,30}$ ]] || { echo "FATAL: APP must be a short lowercase name" >&2; exit 1; }
[[ "$PORT" =~ ^[0-9]{2,5}$ ]] || { echo "FATAL: PORT must be a port number" >&2; exit 1; }

APP_USER="$APP"
FOLDER="/opt/$APP"
DATA_DIR="/var/lib/$APP/data"
OLD_SITE="/srv/$APP"
SECRETS="/etc/$APP/secrets.env"
UNIT="/etc/systemd/system/$APP-backend.service"
CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_DROPIN="/etc/caddy/conf.d/$APP.caddy"
STAGE="/tmp/$APP-provision"

for f in start.js app/index.html backend/cli.js MANIFEST.json; do
  [ -f "$STAGE/$f" ] || { echo "FATAL: $STAGE/$f missing — stage a full-stack folder (run ship-to-vm.sh)" >&2; exit 1; }
done
NODE="$(command -v node || true)"
[ -n "$NODE" ] || { echo "FATAL: this box has no node; the backend needs Node 22.13 or later" >&2; exit 1; }
"$NODE" -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit(m.layout==="full-stack"?0:1)' \
  "$STAGE/MANIFEST.json" || { echo "FATAL: $STAGE is not a full-stack deploy (MANIFEST.json layout)" >&2; exit 1; }
# start.js checks this too, but by then the service is installed; say it before anything is written.
"$NODE" -e 'require("node:sqlite")' 2>/dev/null \
  || { echo "FATAL: the backend needs Node 22.13 or later (node:sqlite); this box has $("$NODE" --version)" >&2; exit 1; }
if ss -tln | awk '{print $4}' | grep -qE ":${PORT}\$" && ! systemctl is-active --quiet "$APP-backend"; then
  echo "FATAL: port $PORT is taken by something else" >&2; exit 1
fi
if [ "$CADDY" != off ]; then
  grep -qE '^\s*import\s+/etc/caddy/conf\.d/' "$CADDY_MAIN" || { echo "FATAL: Caddyfile does not import conf.d" >&2; exit 1; }
fi
# 🔴 P26-VMOPEN: the earlier layout ran `cli.js serve` without --enforce-rules, so its first start minted
# security.json with "devOpen": true, and on a 127.0.0.1 bind the backend's interlock never refused it — the app was
# public behind Caddy with every access rule off. The staged start.js decides what a start will do with the rules
# (the project's replace the server's when this ship brings different ones — Richard, 2026-10-23) and refuses
# rules that are switched off. Ask it HERE, before anything is written, so a refusal leaves the running app as it is.
if ! CHECK="$("$NODE" "$STAGE/start.js" --check --data-dir "$DATA_DIR" 2>&1)"; then
  echo "$CHECK" | sed 's/^/    /' >&2
  cat >&2 <<REFUSAL
FATAL: refused before anything was changed: the app that is running now keeps running as it is.
If the file named is $DATA_DIR/security.json, either give the project its own rules (nodegx.security.json, which
a ship installs) or switch the server's on — ON THE SERVER (ssh in first; on a Mac this sed refuses the command):

  sed -i 's/"devOpen": *true/"devOpen": false/' $DATA_DIR/security.json && systemctl restart $APP-backend

then ship again.
REFUSAL
  exit 1
fi
echo "$CHECK" | sed 's/^/    /'

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "/var/lib/$APP" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$FOLDER" "$DATA_DIR" "/etc/$APP"

# The folder replaces what is there, wholesale (`app/` and `backend/` included). `data/` is excluded in case a folder
# was ever started by hand: the service's data is $DATA_DIR, never inside the folder.
rsync -a --delete --exclude=/data/ "$STAGE/" "$FOLDER/"
chown -R root:root "$FOLDER"; chmod -R u+rwX,go+rX,go-w "$FOLDER"
[ -f "$SECRETS" ] || install -o root -g "$APP_USER" -m 640 /dev/null "$SECRETS"
chown root:"$APP_USER" "$SECRETS"; chmod 640 "$SECRETS"
chown -R "$APP_USER":"$APP_USER" "/var/lib/$APP"; chmod 750 "/var/lib/$APP"

cat > "$UNIT" <<UNIT
[Unit]
Description=${APP} (NodeGX full-stack folder, P26 DEP-002)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=/var/lib/${APP}
EnvironmentFile=${SECRETS}
ExecStart=${NODE} ${FOLDER}/start.js --port ${PORT} --host 127.0.0.1 --data-dir ${DATA_DIR} --backend-id ${APP} --no-admin
Restart=always
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/${APP}
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=384M

[Install]
WantedBy=multi-user.target
UNIT

if [ "$CADDY" != off ]; then
  # Everything but the closed admin surface goes to the backend, which serves the app beside its API and answers
  # /nodegx-config.json with this origin (Host + X-Forwarded-Proto, both of which reverse_proxy passes).
  cat > "$CADDY_DROPIN" <<CADDYFILE
${DOMAIN} {
	encode zstd gzip

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		-Server
	}

	@closed path_regexp closed ^/(_admin|admin|executions|metrics)(/|$)
	handle @closed {
		respond 404
	}

	handle {
		reverse_proxy 127.0.0.1:${PORT}
	}
}
CADDYFILE
  if ! caddy validate --config "$CADDY_MAIN" --adapter caddyfile >/dev/null 2>&1; then
    echo "FATAL: Caddy config invalid with the new drop-in — removing it, running config untouched." >&2
    rm -f "$CADDY_DROPIN"
    caddy validate --config "$CADDY_MAIN" --adapter caddyfile >&2 || true
    exit 1
  fi
fi

systemctl daemon-reload
systemctl enable "$APP-backend" >/dev/null
systemctl restart "$APP-backend"
for i in $(seq 1 20); do
  curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || { echo "FATAL: backend not healthy" >&2; journalctl -u "$APP-backend" -n 40 --no-pager >&2; exit 1; }
curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/" || { echo "FATAL: the backend is up but does not serve the app at /" >&2; exit 1; }
# What start.js installed and which access rules are in force, in the backend's own words.
journalctl -u "$APP-backend" -n 60 --no-pager -o cat | grep -E '^\[start\]|polic|rules' | sed 's/^/    /' || true

[ "$CADDY" != off ] && systemctl reload caddy
# Only once no drop-in can still point at it: CADDY=off over an earlier domain ship leaves that drop-in in place.
if [ -d "$OLD_SITE" ] && { [ "$CADDY" != off ] || [ ! -f "$CADDY_DROPIN" ]; }; then
  rm -rf "$OLD_SITE"
  echo "    removed $OLD_SITE (the earlier layout's site; the backend serves the app now)"
fi
rm -rf "$STAGE"
echo "==> provisioned ${APP} on 127.0.0.1:${PORT}${DOMAIN:+, https://$DOMAIN}"
