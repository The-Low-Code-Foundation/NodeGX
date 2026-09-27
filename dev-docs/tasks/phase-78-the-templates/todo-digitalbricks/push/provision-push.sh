#!/usr/bin/env bash
#
# Add the PWA headers and deadline reminders to todo.digitalbricks.io on nexus-1.
#
# Before running: the PWA site is in /srv/todo/site (with pwa/manifest.webmanifest), and
# /opt/todo/push holds sender.js + web-push.bundle.js. Run as root:
#   bash /tmp/todo-provision/provision-push.sh
#
# Additive. Writes: /etc/todo-push/vapid.json (generated here, never leaves the box),
# /srv/todo/site/pwa/vapid-public-key.txt, /etc/systemd/system/todo-push.service,
# /var/lib/todo/push-state.json (by the sender), the PushSubscription collection in the
# backend's security.json (a copy of the old file is kept beside it), and the todo Caddy
# drop-in (restored from its backup if caddy validate fails).

set -euo pipefail

SITE=/srv/todo/site
PUSH=/opt/todo/push
KEYDIR=/etc/todo-push
SEC=/var/lib/todo/data/security.json
DROPIN=/etc/caddy/conf.d/todo.caddy
CADDY_MAIN=/etc/caddy/Caddyfile

fatal() { echo "FATAL: $*" >&2; exit 1; }
[ -f "$PUSH/sender.js" ] && [ -f "$PUSH/web-push.bundle.js" ] || fatal "$PUSH is missing sender.js or web-push.bundle.js"
[ -f "$SITE/pwa/manifest.webmanifest" ] && [ -f "$SITE/sw.js" ] || fatal "deploy the PWA site first"
[ -f "$SEC" ] && [ -f "$DROPIN" ] || fatal "todo.digitalbricks.io is not provisioned"

chown -R root:root /opt/todo/push
install -d -o todo -g todo -m 700 "$KEYDIR"

PUB=$(runuser -u todo -- /usr/bin/node --no-warnings "$PUSH/sender.js" --generate-keys </dev/null | tail -1)
[[ "$PUB" =~ ^[A-Za-z0-9_-]{80,}$ ]] || fatal "no public key from --generate-keys: $PUB"
printf '%s\n' "$PUB" > "$SITE/pwa/vapid-public-key.txt"
chown caddy:caddy "$SITE/pwa/vapid-public-key.txt"
echo "==> VAPID public key published"

python3 - "$SEC" </dev/null <<'PY' || fatal "policy edit failed"
import json, shutil, sys
p = sys.argv[1]
d = json.load(open(p))
if 'PushSubscription' in d['collections']:
    print('==> policy already has PushSubscription')
else:
    shutil.copy2(p, p + '.before-push')
    d['collections']['PushSubscription'] = json.loads(json.dumps(d['collections']['Task']))
    with open(p, 'w') as f:
        json.dump(d, f, indent=2)
        f.write('\n')
    print('==> policy: PushSubscription added (old file kept as security.json.before-push)')
PY
chown todo:todo "$SEC"

cat > /etc/systemd/system/todo-push.service <<'UNIT'
[Unit]
Description=Todo list deadline reminders (web push at 9am)
After=network-online.target todo-backend.service
Wants=network-online.target

[Service]
Type=simple
User=todo
Group=todo
WorkingDirectory=/var/lib/todo
ExecStart=/usr/bin/node --no-warnings /opt/todo/push/sender.js
Restart=always
RestartSec=10

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/todo
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=128M

[Install]
WantedBy=multi-user.target
UNIT

cp "$DROPIN" "$DROPIN.before-pwa"
cat > "$DROPIN" <<'CADDY'
todo.digitalbricks.io {
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
		reverse_proxy 127.0.0.1:8690
	}

	handle {
		root * /srv/todo/site
		try_files {path} /index.html
		header /index.html Cache-Control "no-cache"
		header /sw.js Cache-Control "no-cache"
		header /pwa/* Cache-Control "no-cache"
		header /pwa/manifest.webmanifest Content-Type "application/manifest+json"
		file_server
	}
}
CADDY
if ! caddy validate --config "$CADDY_MAIN" --adapter caddyfile >/dev/null 2>&1; then
  cp "$DROPIN.before-pwa" "$DROPIN"
  caddy validate --config "$CADDY_MAIN" --adapter caddyfile >&2 || true
  fatal "Caddy config invalid with the PWA headers — restored the previous drop-in"
fi

systemctl daemon-reload
systemctl restart todo-backend
for i in $(seq 1 20); do curl -fsS http://127.0.0.1:8690/health >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:8690/health >/dev/null || { journalctl -u todo-backend -n 30 --no-pager >&2; fatal "backend not healthy after the policy change"; }
systemctl enable todo-push >/dev/null
systemctl restart todo-push
sleep 3
systemctl is-active --quiet todo-push || { journalctl -u todo-push -n 30 --no-pager >&2; fatal "todo-push did not stay up"; }
systemctl reload caddy
journalctl -u todo-push -n 3 --no-pager -o cat
echo "==> reminders provisioned"
