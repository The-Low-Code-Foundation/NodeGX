#!/usr/bin/env bash
#
# Point training.digitalbricks.io at Digital Bricks University (DBU-12), or back.
#
#   bash -s < swap-caddy.sh               DBU takes the name: dbuniversity.caddy in, dbtraining.caddy retired
#   bash -s -- --rollback < swap-caddy.sh the old template takes it back, exactly as it was
#
# SCOPE ruling (2026-11-12): DBU REPLACES the live digital-bricks-training template on this name; it had no
# learners. Nothing of the old one is deleted: its block is moved to /etc/caddy/retired/ (Caddy imports only
# conf.d/*.caddy), its backend keeps running on 8691 until Richard retires it, its data stays where it is.
#
# Shared Caddy: it serves every site on this box. Caddy loads the whole config or none, so a swap that does
# not validate is undone before any reload, and the running config is left as it was. Then the neighbours
# are asked for their front pages (nodegx-learn/deploy's habit).
#
# The block adds, on /files/* only, the two headers PLATFORM.md D2 requires: a stored HTML or SVG file is
# served as a sandboxed document and never sniffed into something else. `defer` sets them after the
# backend's own headers, so the backend cannot take them away.

set -euo pipefail

DOMAIN=training.digitalbricks.io
PORT=8695
SITE_DIR=/srv/dbuniversity/site
CADDY_MAIN=/etc/caddy/Caddyfile
NEW=/etc/caddy/conf.d/dbuniversity.caddy
OLD=/etc/caddy/conf.d/dbtraining.caddy
RETIRED_DIR=/etc/caddy/retired
RETIRED="$RETIRED_DIR/dbtraining.caddy"
THIS_BOX=49.12.102.195
NEIGHBOURS="https://digitalbricks.io https://nodegx.io https://todo.digitalbricks.io https://planning.digitalbricks.io https://learn-ai.digitalbricks.io"

grep -qE '^\s*import\s+/etc/caddy/conf\.d/\*\.caddy' "$CADDY_MAIN" || { echo "FATAL: Caddyfile does not import conf.d/*.caddy" >&2; exit 1; }
mkdir -p "$RETIRED_DIR"

reload_or_undo() {  # reload_or_undo <undo command>
  if ! caddy validate --config "$CADDY_MAIN" --adapter caddyfile >/dev/null 2>&1; then
    echo "FATAL: the Caddy config does not validate: undoing, running config untouched." >&2
    eval "$1"
    caddy validate --config "$CADDY_MAIN" --adapter caddyfile >&2 || true
    exit 1
  fi
  systemctl reload caddy
  systemctl is-active --quiet caddy || { echo "FATAL: caddy is not active after the reload" >&2; exit 1; }
}

neighbours() {
  for u in $NEIGHBOURS; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$u" || echo 000)
    echo "    $code  $u"
  done
}

if [ "${1:-}" = "--rollback" ]; then
  [ -f "$RETIRED" ] || { echo "FATAL: no retired block at $RETIRED to put back" >&2; exit 1; }
  mv "$NEW" "$RETIRED_DIR/dbuniversity.caddy.rolled-back" 2>/dev/null || true
  mv "$RETIRED" "$OLD"
  reload_or_undo "mv '$OLD' '$RETIRED'; mv '$RETIRED_DIR/dbuniversity.caddy.rolled-back' '$NEW'"
  echo "==> rolled back: ${DOMAIN} is the old template again (127.0.0.1:8691)."
  neighbours
  exit 0
fi

RESOLVED=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')
[ "$RESOLVED" = "$THIS_BOX" ] || { echo "FATAL: $DOMAIN resolves to '${RESOLVED:-nothing}', not $THIS_BOX" >&2; exit 1; }
curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || { echo "FATAL: the backend on :${PORT} is not healthy" >&2; exit 1; }
[ -f "$SITE_DIR/index.html" ] || { echo "FATAL: no site in $SITE_DIR" >&2; exit 1; }

cat > "$NEW.tmp" <<CADDY
${DOMAIN} {
	encode zstd gzip

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		-Server
	}

	# PLATFORM.md D2: a learner's file is a sandboxed document, never this site's page.
	header /files/* {
		defer
		Content-Security-Policy "sandbox allow-scripts"
		X-Content-Type-Options nosniff
	}

	@closed path_regexp closed ^/(_admin|admin|executions|metrics)(/|$)
	handle @closed {
		respond 404
	}

	@backend path_regexp backend ^/(aggregate|api|apps|auth|classes|config|files|functions|health|hooks|login|logout|oauth|realtime|requestPasswordReset|users|verificationEmailRequest)(/|$)
	handle @backend {
		request_body {
			max_size 60MB
		}
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

[ -f "$OLD" ] && mv "$OLD" "$RETIRED"
mv "$NEW.tmp" "$NEW"
reload_or_undo "rm -f '$NEW'; [ -f '$RETIRED' ] && mv '$RETIRED' '$OLD'"
echo "==> ${DOMAIN} now serves Digital Bricks University (127.0.0.1:${PORT}). The old block is in ${RETIRED}."
echo "    Roll back: bash -s -- --rollback < swap-caddy.sh"
neighbours
