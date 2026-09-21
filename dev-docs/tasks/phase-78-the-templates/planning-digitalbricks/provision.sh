#!/usr/bin/env bash
#
# Provision planning.digitalbricks.io on nexus-1 — the TPL-010 planner, served by the todo list's backend (TPL-010-H, H1).
#
# SHARED HOST: nexus.digitalbricks.io, digitalbricks.io, nodegx.io, community.nodegx.io and todo.digitalbricks.io are live
# here, and Caddy loads the whole config or none of it. So this is strictly additive. It writes only:
#
#   /srv/planning/site                     (rsynced before this runs)
#   /var/lib/todo/data/security.json       (replaced by the merged policy ONLY if the planner collections are absent)
#   /etc/caddy/conf.d/planning.caddy       (deleted again if caddy validate fails)
#
# No new systemd unit and no new data directory: the backend routes are proxied to the todo backend on 127.0.0.1:8690.
#
# Before running: scp the merged policy to /tmp/planning-provision/security.json on the box.
# Run as root:  ssh … 'bash -s' < provision.sh

set -euo pipefail

SITE_DIR=/srv/planning/site
DATA_DIR=/var/lib/todo/data
BACKEND_PORT=8690
BACKEND_UNIT=todo-backend
APP_USER=todo
DOMAIN=planning.digitalbricks.io
CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_DROPIN=/etc/caddy/conf.d/planning.caddy
STAGE=/tmp/planning-provision

grep -qE '^\s*import\s+/etc/caddy/conf\.d/' "$CADDY_MAIN" || { echo "FATAL: Caddyfile does not import conf.d" >&2; exit 1; }
[ -f "$SITE_DIR/index.html" ] || { echo "FATAL: $SITE_DIR/index.html missing" >&2; exit 1; }
systemctl is-active --quiet "$BACKEND_UNIT" || { echo "FATAL: $BACKEND_UNIT is not running; provision the todo list first" >&2; exit 1; }
[ -f "$DATA_DIR/security.json" ] || { echo "FATAL: $DATA_DIR/security.json missing" >&2; exit 1; }

chown -R caddy:caddy /srv/planning

# The merged policy: installed only when the planner's collections are not there yet. Never overwrites otherwise.
if grep -q '"MonthPlan"' "$DATA_DIR/security.json"; then
  echo "==> policy already carries the planner collections; leaving $DATA_DIR/security.json alone"
else
  [ -f "$STAGE/security.json" ] || { echo "FATAL: $STAGE/security.json missing (run merge-policy.js locally and scp it)" >&2; exit 1; }
  grep -q '"Task"' "$STAGE/security.json" || { echo "FATAL: merged policy has lost the todo collections; refusing" >&2; exit 1; }
  cp -a "$DATA_DIR/security.json" "$DATA_DIR/security.json.bak-$(date +%Y%m%d%H%M%S)"
  install -o "$APP_USER" -g "$APP_USER" -m 640 "$STAGE/security.json" "$DATA_DIR/security.json"
  systemctl restart "$BACKEND_UNIT"
  for i in $(seq 1 20); do
    curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" || { echo "FATAL: backend not healthy after policy change" >&2; journalctl -u "$BACKEND_UNIT" -n 40 --no-pager >&2; exit 1; }
  echo
fi

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
		reverse_proxy 127.0.0.1:${BACKEND_PORT}
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

systemctl reload caddy
echo "==> provisioned ${DOMAIN} (site ${SITE_DIR}, backend shared with todo on ${BACKEND_PORT})"
