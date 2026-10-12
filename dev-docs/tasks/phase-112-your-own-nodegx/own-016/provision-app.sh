#!/usr/bin/env bash
#
# P112 OWN-016 — put an npm-kit NodeGX app (static site + its backend + its cloud functions + its secrets) on a VM you
# own. Modelled on P78's todo-digitalbricks/provision.sh, which put todo.digitalbricks.io on nexus-1; this one is
# parametrized and adds the two things that app never had: deployed cloud functions and a function secret.
#
# Run as root on the box, after ship-to-vm.sh has staged the files:
#
#   APP=lingo DOMAIN=lingo.nodegx.io PORT=8692 bash -s < provision-app.sh
#   APP=lingo PORT=8692 CADDY=off bash -s < provision-app.sh     # no public address yet (no DNS): backend + files only
#
# SHARED HOST: other live sites may be served here, and Caddy loads the whole config or none of it. So this is
# strictly additive. It writes only:
#
#   /opt/<app>/backend/cli.js                 (staged: the one-file backend @nodegx/mcp ships, dist/backend/cli.js)
#   /srv/<app>/site                           (staged: the folder `nodegx-deploy` wrote)
#   /var/lib/<app>/data/workflows/*.json      (staged: the cloud functions deploy_cloud_functions put on the local backend)
#   /etc/<app>/secrets.env                    (written by ship-to-vm.sh over stdin, never here, never in the site)
#   /etc/systemd/system/<app>-backend.service
#   /etc/caddy/conf.d/<app>.caddy             (unless CADDY=off; deleted again if caddy validate fails)
#
# The backend binds 127.0.0.1:<port> and Caddy is the only way in. Behind a proxy every request arrives from loopback,
# so the admin surface is NOT proxied, and --no-admin is set. Secrets reach cloud functions through the backend's
# NODEGX_SECRET_<NAME> environment fallback (SecretsStore), from an EnvironmentFile only root and the app user read.

set -euo pipefail

APP="${APP:?APP=<name>}"
PORT="${PORT:?PORT=<loopback port>}"
CADDY="${CADDY:-on}"
DOMAIN="${DOMAIN:-}"
[ "$CADDY" = off ] || [ -n "$DOMAIN" ] || { echo "FATAL: DOMAIN=<host> is needed unless CADDY=off" >&2; exit 1; }
[[ "$APP" =~ ^[a-z][a-z0-9-]{1,30}$ ]] || { echo "FATAL: APP must be a short lowercase name" >&2; exit 1; }

APP_USER="$APP"
BACKEND_DIR="/opt/$APP/backend"
SITE_DIR="/srv/$APP/site"
DATA_DIR="/var/lib/$APP/data"
SECRETS="/etc/$APP/secrets.env"
UNIT="/etc/systemd/system/$APP-backend.service"
CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_DROPIN="/etc/caddy/conf.d/$APP.caddy"
STAGE="/tmp/$APP-provision"

[ -f "$STAGE/cli.js" ] || { echo "FATAL: $STAGE/cli.js missing (run ship-to-vm.sh)" >&2; exit 1; }
[ -f "$STAGE/site/index.html" ] || { echo "FATAL: $STAGE/site/index.html missing" >&2; exit 1; }
if ss -tln | awk '{print $4}' | grep -qE ":${PORT}\$" && ! systemctl is-active --quiet "$APP-backend"; then
  echo "FATAL: port $PORT is taken by something else" >&2; exit 1
fi
if [ "$CADDY" != off ]; then
  grep -qE '^\s*import\s+/etc/caddy/conf\.d/' "$CADDY_MAIN" || { echo "FATAL: Caddyfile does not import conf.d" >&2; exit 1; }
fi
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)' \
  || { echo "FATAL: the backend needs Node 22.13 or later (node:sqlite); this box has $(node --version)" >&2; exit 1; }

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "/var/lib/$APP" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$BACKEND_DIR" "$SITE_DIR" "$DATA_DIR/workflows" "/etc/$APP"

install -o root -g root -m 644 "$STAGE/cli.js" "$BACKEND_DIR/cli.js"
rsync -a --delete "$STAGE/site/" "$SITE_DIR/"
# The functions replace the deployed set wholesale, as a deploy does.
if compgen -G "$STAGE/workflows/*.workflow.json" >/dev/null; then
  find "$DATA_DIR/workflows" -maxdepth 1 -name '*.workflow.json' -delete
  install -o "$APP_USER" -g "$APP_USER" -m 640 "$STAGE"/workflows/*.workflow.json "$DATA_DIR/workflows/"
fi
[ -f "$SECRETS" ] || install -o root -g "$APP_USER" -m 640 /dev/null "$SECRETS"
chown root:"$APP_USER" "$SECRETS"; chmod 640 "$SECRETS"
chown -R "$APP_USER":"$APP_USER" "/var/lib/$APP"; chmod 750 "/var/lib/$APP"
chown -R root:root "/opt/$APP"
id -u caddy >/dev/null 2>&1 && chown -R caddy:caddy "/srv/$APP"

cat > "$UNIT" <<UNIT
[Unit]
Description=${APP} backend (NodeGX, P112 OWN-016)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=/var/lib/${APP}
EnvironmentFile=${SECRETS}
ExecStart=/usr/bin/node ${BACKEND_DIR}/cli.js serve --data-dir ${DATA_DIR} --port ${PORT} --host 127.0.0.1 --backend-id ${APP} --backend-name "${APP}" --no-admin
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

	@backend path_regexp backend ^/(aggregate|api|apps|auth|classes|config|files|functions|health|hooks|login|logout|oauth|realtime|requestPasswordReset|users|verificationEmailRequest)(/|$)
	handle @backend {
		reverse_proxy 127.0.0.1:${PORT}
	}

	handle {
		root * ${SITE_DIR}
		try_files {path} /index.html
		header /index.html Cache-Control "no-cache"
		file_server
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

[ "$CADDY" != off ] && systemctl reload caddy
rm -rf "$STAGE"
echo "==> provisioned ${APP} on 127.0.0.1:${PORT}${DOMAIN:+, https://$DOMAIN}"
