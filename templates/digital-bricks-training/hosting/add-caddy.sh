#!/usr/bin/env bash
#
# Put training.digitalbricks.io on nexus-1's Caddy (TASK-L183 §6 step 4).
#
# Separate from provision.sh on purpose, and it REFUSES until the name resolves
# to this box: a site block for a name that points elsewhere sends Caddy after a
# certificate it cannot get, and Let's Encrypt's failed-validation limit is per
# hostname (TPL-010-H's reason). Caddy loads the whole config or none of it, and
# it serves every site on this box, so the drop-in is removed again if
# `caddy validate` fails and the running config is left as it was.
#
# Run as root:  bash -s < add-caddy.sh

set -euo pipefail

DOMAIN=training.digitalbricks.io
PORT=8691
SITE_DIR=/srv/dbtraining/site
CADDY_MAIN=/etc/caddy/Caddyfile
CADDY_DROPIN=/etc/caddy/conf.d/dbtraining.caddy
THIS_BOX=49.12.102.195

grep -qE '^\s*import\s+/etc/caddy/conf\.d/' "$CADDY_MAIN" || { echo "FATAL: Caddyfile does not import conf.d" >&2; exit 1; }
RESOLVED=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')
[ "$RESOLVED" = "$THIS_BOX" ] || { echo "FATAL: $DOMAIN resolves to '${RESOLVED:-nothing}', not $THIS_BOX — move the A record first" >&2; exit 1; }
curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || { echo "FATAL: the backend on :${PORT} is not healthy" >&2; exit 1; }

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
systemctl reload caddy
echo "==> ${DOMAIN} added to Caddy. The certificate arrives on the first request."
