#!/usr/bin/env bash
#
# P112 OWN-016 — ship an npm-kit NodeGX app to a VM you own, from the folder the agent built it in.
#
#   ship-to-vm.sh <project-dir> <local-backend-dir> <user@host> <app> <port> [domain]
#
#   <local-backend-dir>  the backend provision_backend made for this project (~/.noodl/backends/<id>): its
#                        workflows/ are the cloud functions deploy_cloud_functions put there, and its secrets.json
#                        holds the function secrets set_function_secret stored. Both travel; nothing is retyped.
#   [domain]             omit it to set up everything but the public address (no DNS yet): CADDY=off on the box.
#
# Environment (for testing a release before it is published):
#   NODEGX_PREVIEW_PKG   what npx runs nodegx-deploy from (default @nodegx/preview@latest; may be a .tgz)
#   NODEGX_MCP_TGZ       the @nodegx/mcp tarball to take dist/backend/cli.js from (default: npm pack @nodegx/mcp@latest)
#   SSH_KEY              identity file for ssh/rsync (default: ssh's own)
#
# The secrets go to the box over ssh's stdin into /etc/<app>/secrets.env (mode 640, root:<app>) and are never written
# to a local file, an argument list or the site.

set -euo pipefail
PROJECT="${1:?project dir}"; BACKEND="${2:?local backend dir}"; HOST="${3:?user@host}"; APP="${4:?app}"; PORT="${5:?port}"; DOMAIN="${6:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SSH_OPTS=(-o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)
[ -n "${SSH_KEY:-}" ] && SSH_OPTS+=(-i "$SSH_KEY")
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ship-$APP-XXXX")"
STAGE="$WORK/stage"; mkdir -p "$STAGE/workflows"

echo "==> 1/5 the site (nodegx-deploy)"
npx -y --package "${NODEGX_PREVIEW_PKG:-@nodegx/preview@latest}" nodegx-deploy "$PROJECT" "$STAGE/site" > "$WORK/deploy.json"
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(!r.ok){console.error("deploy refused:",r.stage,r.message);process.exit(1)} console.log("    "+r.files.length+" files, excluded: "+r.excluded.map(e=>e.path).join(" "))' "$WORK/deploy.json"

echo "==> 2/5 the backend (dist/backend/cli.js from @nodegx/mcp)"
TGZ="${NODEGX_MCP_TGZ:-}"
if [ -z "$TGZ" ]; then (cd "$WORK" && npm pack -q @nodegx/mcp@latest >/dev/null); TGZ="$(ls "$WORK"/nodegx-mcp-*.tgz)"; fi
tar -xzOf "$TGZ" package/dist/backend/cli.js > "$STAGE/cli.js"
echo "    $(wc -c < "$STAGE/cli.js" | tr -d ' ') bytes"

echo "==> 3/5 the cloud functions"
cp "$BACKEND"/workflows/*.workflow.json "$STAGE/workflows/" 2>/dev/null || echo "    none deployed locally"
ls "$STAGE/workflows" | sed 's/^/    /'

echo "==> 4/5 stage and provision on $HOST"
ssh "${SSH_OPTS[@]}" "$HOST" "rm -rf /tmp/$APP-provision && mkdir -p /tmp/$APP-provision"
rsync -az -e "ssh ${SSH_OPTS[*]}" "$STAGE/" "$HOST:/tmp/$APP-provision/"
CADDY=on; [ -n "$DOMAIN" ] || CADDY=off
ssh "${SSH_OPTS[@]}" "$HOST" "APP=$APP PORT=$PORT DOMAIN=$DOMAIN CADDY=$CADDY bash -s" < "$HERE/provision-app.sh"

echo "==> 5/5 the function secrets (from the local backend's store, over stdin)"
node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).functions || {};
  for (const [name, value] of Object.entries(s))
    process.stdout.write("NODEGX_SECRET_" + name.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase() + "=" + value + "\n");
' "$BACKEND/secrets.json" | ssh "${SSH_OPTS[@]}" "$HOST" "cat > /etc/$APP/secrets.env && chown root:$APP /etc/$APP/secrets.env && chmod 640 /etc/$APP/secrets.env && sed 's/=.*//' /etc/$APP/secrets.env | sed 's/^/    /' && systemctl restart $APP-backend"
ssh "${SSH_OPTS[@]}" "$HOST" "for i in \$(seq 1 20); do curl -fsS http://127.0.0.1:$PORT/health >/dev/null 2>&1 && break; sleep 1; done; curl -fsS -o /dev/null -w '    health %{http_code}\n' http://127.0.0.1:$PORT/health"
rm -rf "$WORK"
echo "==> shipped $APP${DOMAIN:+ to https://$DOMAIN}"
