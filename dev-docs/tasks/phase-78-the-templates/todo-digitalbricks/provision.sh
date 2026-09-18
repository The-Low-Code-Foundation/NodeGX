#!/usr/bin/env bash
#
# Provision todo.digitalbricks.io on nexus-1 — the TPL-008 todo list with its backend.
#
# SHARED HOST: nexus.digitalbricks.io, digitalbricks.io, nodegx.io and
# community.nodegx.io are live here, and Caddy loads the whole config or none of it.
# So this is strictly additive. It writes only:
#
#   /opt/todo/backend/cli.js                (rsynced before this runs)
#   /srv/todo/site                          (rsynced before this runs)
#   /var/lib/todo/data/{security,ops}.json  (only if absent — never overwrites data)
#   /etc/systemd/system/todo-backend.service
#   /etc/caddy/conf.d/todo.caddy            (deleted again if caddy validate fails)
#
# The backend binds 127.0.0.1:8690 and Caddy is the only way in. Behind a proxy every
# request arrives from loopback, so the routes that treat loopback specially
# (/metrics) and the admin surface are NOT proxied, and --no-admin is set.
#
# Run as root:  bash -s < provision-todo.sh

set -euo pipefail

APP_USER=todo
BACKEND_DIR=/opt/todo/backend
SITE_DIR=/srv/todo/site
DATA_DIR=/var/lib/todo/data
PORT=8690
DOMAIN=todo.digitalbricks.io
CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_DROPIN=/etc/caddy/conf.d/todo.caddy
STAGE=/tmp/todo-provision

grep -qE '^\s*import\s+/etc/caddy/conf\.d/' "$CADDY_MAIN" || { echo "FATAL: Caddyfile does not import conf.d" >&2; exit 1; }
[ -f "$BACKEND_DIR/cli.js" ] || { echo "FATAL: $BACKEND_DIR/cli.js missing" >&2; exit 1; }
[ -f "$SITE_DIR/index.html" ] || { echo "FATAL: $SITE_DIR/index.html missing" >&2; exit 1; }
if ss -tln | awk '{print $4}' | grep -qE ":${PORT}\$" && ! systemctl is-active --quiet todo-backend; then
  echo "FATAL: port $PORT is taken by something else" >&2; exit 1
fi

id -u "$APP_USER" >/dev/null 2>&1 \
  || useradd --system --home-dir /var/lib/todo --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$DATA_DIR"
chown -R "$APP_USER":"$APP_USER" /var/lib/todo
chmod 750 /var/lib/todo
chown -R root:root /opt/todo
chown -R caddy:caddy /srv/todo

# The project's policy, installed before first start so the first start enforces it.
[ -f "$DATA_DIR/security.json" ] || install -o "$APP_USER" -g "$APP_USER" -m 640 "$STAGE/security.json" "$DATA_DIR/security.json"
[ -f "$DATA_DIR/ops.json" ] || install -o "$APP_USER" -g "$APP_USER" -m 640 "$STAGE/ops.json" "$DATA_DIR/ops.json"

cat > /etc/systemd/system/todo-backend.service <<UNIT
[Unit]
Description=Todo list backend (todo.digitalbricks.io)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=/var/lib/todo
ExecStart=/usr/bin/node ${BACKEND_DIR}/cli.js serve --data-dir ${DATA_DIR} --port ${PORT} --host 127.0.0.1 --backend-id todo-list --backend-name "Todo list" --no-admin
Restart=always
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/todo
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=384M

[Install]
WantedBy=multi-user.target
UNIT

cat > "$CADDY_DROPIN" <<CADDY
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
CADDY

if ! caddy validate --config "$CADDY_MAIN" --adapter caddyfile >/dev/null 2>&1; then
  echo "FATAL: Caddy config invalid with the new drop-in — removing it, running config untouched." >&2
  rm -f "$CADDY_DROPIN"
  caddy validate --config "$CADDY_MAIN" --adapter caddyfile >&2 || true
  exit 1
fi

systemctl daemon-reload
systemctl enable todo-backend >/dev/null
systemctl restart todo-backend
for i in $(seq 1 20); do
  curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT}/health" || { echo "FATAL: backend not healthy" >&2; journalctl -u todo-backend -n 40 --no-pager >&2; exit 1; }
echo

systemctl reload caddy
echo "==> provisioned ${DOMAIN}"
