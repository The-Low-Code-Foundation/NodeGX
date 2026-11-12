#!/usr/bin/env bash
#
# Provision the Digital Bricks University backend on nexus-1 (DBU-12). Once.
#
# Shaped on digital-bricks-training/hosting/provision.sh, which runs beside it. SHARED HOST:
# digitalbricks.io, todo, planning, playbook, betr, learn-ai, lingo, nodegx.io and community.nodegx.io
# are live here. Strictly additive, and it does NOT touch Caddy (swap-caddy.sh does). It writes only:
#
#   /opt/dbuniversity/backend/cli.js                       (rsynced before this runs)
#   /opt/dbuniversity/project/nodegx.{security,automations}.json   (from the stage; read at FIRST start)
#   /srv/dbuniversity/site                                 (rsynced before this runs)
#   /var/lib/dbuniversity/data/ops.json                    (only if absent: never overwrites data)
#   /etc/systemd/system/dbuniversity-backend.service
#
# The backend binds 127.0.0.1:8695 and nothing else (8690-8692 are taken on this box). It runs with
# TZ=Europe/Paris because the triggers' cron is local time (PLATFORM.md), and --project-dir so its very
# first start installs the policy AND the three schedules (nodegx.automations.json), which the backend
# seeds only into an empty backend. Setup (schema, the coach, mail, functions) is through an SSH tunnel.
#
# It REFUSES: a taken port, a data directory that already holds a database, a unit already installed.
#
# Run as root:  bash -s < provision.sh   (with security.json, automations.json, ops.json in /tmp/dbuniversity-provision)

set -euo pipefail

APP_USER=dbuniversity
BACKEND_DIR=/opt/dbuniversity/backend
PROJECT_DIR=/opt/dbuniversity/project
SITE_DIR=/srv/dbuniversity/site
DATA_DIR=/var/lib/dbuniversity/data
PORT=8695
UNIT=/etc/systemd/system/dbuniversity-backend.service
STAGE=/tmp/dbuniversity-provision

[ -f "$BACKEND_DIR/cli.js" ] || { echo "FATAL: $BACKEND_DIR/cli.js missing" >&2; exit 1; }
[ -f "$SITE_DIR/index.html" ] || { echo "FATAL: $SITE_DIR/index.html missing" >&2; exit 1; }
for f in security.json automations.json ops.json; do
  [ -f "$STAGE/$f" ] || { echo "FATAL: stage $f in $STAGE" >&2; exit 1; }
done
[ -e "$UNIT" ] && { echo "FATAL: $UNIT exists: already provisioned (hosting/README.md: redeploy)" >&2; exit 1; }
[ -e "$DATA_DIR/data/local.db" ] && { echo "FATAL: $DATA_DIR already holds a database: refusing" >&2; exit 1; }
if ss -tln | awk '{print $4}' | grep -qE ":${PORT}\$"; then
  echo "FATAL: port $PORT is taken" >&2; exit 1
fi

id -u "$APP_USER" >/dev/null 2>&1 \
  || useradd --system --home-dir /var/lib/dbuniversity --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$DATA_DIR" "$PROJECT_DIR"
chown -R "$APP_USER":"$APP_USER" /var/lib/dbuniversity
chmod 750 /var/lib/dbuniversity
install -o root -g "$APP_USER" -m 640 "$STAGE/security.json" "$PROJECT_DIR/nodegx.security.json"
install -o root -g "$APP_USER" -m 640 "$STAGE/automations.json" "$PROJECT_DIR/nodegx.automations.json"
chown root:"$APP_USER" "$PROJECT_DIR"; chmod 750 "$PROJECT_DIR"
chown -R root:root /opt/dbuniversity/backend
chown -R caddy:caddy /srv/dbuniversity
[ -e "$DATA_DIR/ops.json" ] || install -o "$APP_USER" -g "$APP_USER" -m 640 "$STAGE/ops.json" "$DATA_DIR/ops.json"

cat > "$UNIT" <<UNIT
[Unit]
Description=Digital Bricks University backend (training.digitalbricks.io)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=/var/lib/dbuniversity
Environment=TZ=Europe/Paris
ExecStart=/usr/bin/node ${BACKEND_DIR}/cli.js serve --data-dir ${DATA_DIR} --port ${PORT} --host 127.0.0.1 --backend-id digital-bricks-university --backend-name "Digital Bricks University" --project-dir ${PROJECT_DIR} --no-admin
Restart=always
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/dbuniversity
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=512M

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable dbuniversity-backend >/dev/null
systemctl start dbuniversity-backend
for i in $(seq 1 20); do
  curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || { echo "FATAL: backend not healthy" >&2; journalctl -u dbuniversity-backend -n 40 --no-pager >&2; exit 1; }
echo "==> dbuniversity-backend healthy on 127.0.0.1:${PORT}. Caddy untouched. Next: the tunnel and setup-production (hosting/README.md)."
