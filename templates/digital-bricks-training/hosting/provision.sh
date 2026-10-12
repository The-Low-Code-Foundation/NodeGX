#!/usr/bin/env bash
#
# Provision the Digital Bricks Training backend on nexus-1 (TASK-L183 §4).
#
# SHARED HOST: digitalbricks.io, todo, planning, playbook, betr, learn-ai, nodegx.io
# and community.nodegx.io are live here. This script is strictly additive and it
# does NOT touch Caddy at all: the public name is added by add-caddy.sh, and only
# once DNS resolves to this box (a site block for a name that does not resolve
# here sends Caddy after a certificate it cannot get). It writes only:
#
#   /opt/dbtraining/backend/cli.js                 (rsynced before this runs)
#   /srv/dbtraining/site                           (rsynced before this runs)
#   /var/lib/dbtraining/data/{security,ops}.json   (only if absent — never overwrites data)
#   /etc/systemd/system/dbtraining-backend.service
#
# The backend binds 127.0.0.1:8691 and nothing else. Setup (schema, functions,
# the staff account, mail) happens through an SSH tunnel to that port with the
# admin credential the backend mints into its own secrets.json on first start;
# the admin API is never served on a public name (Caddy answers 404 to it).
#
# It REFUSES: a taken port, an existing data directory holding a database (this
# is not how you redeploy; see README), and a unit that is already installed.
#
# Run as root:  bash -s < provision.sh      (with the policy and ops staged in /tmp/dbtraining-provision)

set -euo pipefail

APP_USER=dbtraining
BACKEND_DIR=/opt/dbtraining/backend
SITE_DIR=/srv/dbtraining/site
DATA_DIR=/var/lib/dbtraining/data
PORT=8691
UNIT=/etc/systemd/system/dbtraining-backend.service
STAGE=/tmp/dbtraining-provision

[ -f "$BACKEND_DIR/cli.js" ] || { echo "FATAL: $BACKEND_DIR/cli.js missing" >&2; exit 1; }
[ -f "$SITE_DIR/index.html" ] || { echo "FATAL: $SITE_DIR/index.html missing" >&2; exit 1; }
[ -f "$STAGE/security.json" ] && [ -f "$STAGE/ops.json" ] || { echo "FATAL: stage security.json and ops.json in $STAGE" >&2; exit 1; }
[ -e "$UNIT" ] && { echo "FATAL: $UNIT exists — this backend is already provisioned (see README: redeploy)" >&2; exit 1; }
[ -e "$DATA_DIR/data/local.db" ] && { echo "FATAL: $DATA_DIR already holds a database — refusing" >&2; exit 1; }
if ss -tln | awk '{print $4}' | grep -qE ":${PORT}\$"; then
  echo "FATAL: port $PORT is taken" >&2; exit 1
fi

id -u "$APP_USER" >/dev/null 2>&1 \
  || useradd --system --home-dir /var/lib/dbtraining --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$DATA_DIR"
chown -R "$APP_USER":"$APP_USER" /var/lib/dbtraining
chmod 750 /var/lib/dbtraining
chown -R root:root /opt/dbtraining
chown -R caddy:caddy /srv/dbtraining

# The policy, installed before first start so the very first start enforces it.
install -o "$APP_USER" -g "$APP_USER" -m 640 "$STAGE/security.json" "$DATA_DIR/security.json"
install -o "$APP_USER" -g "$APP_USER" -m 640 "$STAGE/ops.json" "$DATA_DIR/ops.json"

cat > "$UNIT" <<UNIT
[Unit]
Description=Digital Bricks Training backend (training.digitalbricks.io)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=/var/lib/dbtraining
ExecStart=/usr/bin/node ${BACKEND_DIR}/cli.js serve --data-dir ${DATA_DIR} --port ${PORT} --host 127.0.0.1 --backend-id digital-bricks-training --backend-name "Digital Bricks Training" --no-admin
Restart=always
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/dbtraining
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=384M

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable dbtraining-backend >/dev/null
systemctl start dbtraining-backend
for i in $(seq 1 20); do
  curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || { echo "FATAL: backend not healthy" >&2; journalctl -u dbtraining-backend -n 40 --no-pager >&2; exit 1; }
echo "==> dbtraining-backend healthy on 127.0.0.1:${PORT}. Caddy untouched. Next: the tunnel and setup-production (README §3)."
