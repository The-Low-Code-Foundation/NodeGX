#!/usr/bin/env bash
#
# P112 OWN-016 / P26 DEP-002 — ship a NodeGX app to a VM you own, from the folder the agent built it in.
#
#   ship-to-vm.sh [--ssh-key f] [--ssh-port n] [--preview pkg|tgz] <project-dir> <local-backend-dir|-> <user@host> <app> <port> [domain]
#
#   What travels is the folder `nodegx-deploy --full-stack` writes: the app, the backend that serves it, the project's
#   cloud functions (built from the project, so what ships is what the project says), its access rules and start.js.
#   <local-backend-dir>  the backend provision_backend made for this project (~/.noodl/backends/<id>): only its
#                        secrets.json travels, the function secrets set_function_secret stored, so nothing is retyped.
#                        `-` when the app has none.
#   [domain]             omit it to set up everything but the public address (no DNS yet): CADDY=off on the box, and
#                        the backend serves the app on the box's 127.0.0.1:<port> (the last line says how to see it).
#
# Environment (for testing a release before it is published):
#   NODEGX_PREVIEW_PKG   what npx runs nodegx-deploy from (default @nodegx/preview@latest; may be a .tgz). It carries
#                        the backend and the launcher (dist/backend/), so no second package is fetched.
#   NODEGX_DEPLOY_CMD    instead of npx: a command that runs nodegx-deploy (e.g. "node /path/to/nodegx-deploy.cjs")
#   SSH_KEY, SSH_PORT    identity file and port for ssh/rsync (default: ssh's own)
#
# The secrets go to the box over ssh's stdin into /etc/<app>/secrets.env (mode 640, root:<app>) and are never written
# to a local file, an argument list or the folder.

set -euo pipefail
# The environment settings may also be given as flags, before the positional arguments.
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --ssh-key) SSH_KEY="$2"; shift 2 ;;
    --ssh-port) SSH_PORT="$2"; shift 2 ;;
    --preview) NODEGX_PREVIEW_PKG="$2"; shift 2 ;;
    --mcp-tgz) echo "--mcp-tgz is gone: the backend now comes with @nodegx/preview (--preview)" >&2; exit 2 ;;
    *) echo "unknown flag $1" >&2; exit 2 ;;
  esac
done
PROJECT="${1:?project dir}"; BACKEND="${2:?local backend dir, or -}"; HOST="${3:?user@host}"; APP="${4:?app}"; PORT="${5:?port}"; DOMAIN="${6:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
# The script that runs on the box ships inside @nodegx/mcp (dist/backend/vm/), where deploy_to_vm reads it too.
PROVISION="$HERE/../../../../packages/nodegx-backend/deploy/vm/provision-app.sh"
[ -f "$PROVISION" ] || { echo "no provision script at $PROVISION" >&2; exit 2; }
SSH_OPTS=(-o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)
[ -n "${SSH_KEY:-}" ] && SSH_OPTS+=(-i "$SSH_KEY")
[ -n "${SSH_PORT:-}" ] && SSH_OPTS+=(-p "$SSH_PORT")
SECRETS_JSON=""
if [ "$BACKEND" != - ]; then
  [ -d "$BACKEND" ] || { echo "no such backend folder: $BACKEND (give - when the app has no function secrets)" >&2; exit 2; }
  [ -f "$BACKEND/secrets.json" ] && SECRETS_JSON="$BACKEND/secrets.json"
fi
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ship-$APP-XXXX")"
trap 'rm -rf "$WORK"' EXIT
FOLDER="$WORK/$APP"

echo "==> 1/4 the folder (nodegx-deploy --full-stack)"
if [ -n "${NODEGX_DEPLOY_CMD:-}" ]; then
  # shellcheck disable=SC2086 # a command line, split on purpose
  $NODEGX_DEPLOY_CMD "$PROJECT" "$FOLDER" --full-stack > "$WORK/deploy.json"
else
  npx -y --package "${NODEGX_PREVIEW_PKG:-@nodegx/preview@latest}" nodegx-deploy "$PROJECT" "$FOLDER" --full-stack > "$WORK/deploy.json"
fi
# A function the engine could not build is NOT in the folder, so the app on the box would answer an error where the
# project calls it. Refuse rather than ship it short.
node -e '
  const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (!r.ok) { console.error("deploy refused:", r.stage, r.message); process.exit(1); }
  const full = r.fullStack;
  if (!full) { console.error("this nodegx-deploy wrote no full-stack folder; use a current @nodegx/preview (--preview)"); process.exit(1); }
  if (full.functionFailures.length) {
    console.error("cloud functions that would not build (nothing shipped):");
    for (const f of full.functionFailures) console.error("    " + f.name + ": " + f.reason);
    process.exit(1);
  }
  console.log("    " + r.projectName + ", build " + full.buildId + ", " + r.written.length + " files");
  // P26-SKELSHIP, P112-OWN023-DEPLOYLOOPBACK: what the engine published but warned about, said before the box is touched.
  for (const w of r.warnings || []) console.log("    ! " + w);
  console.log("    cloud functions: " + (full.uses.functions.length ? full.uses.functions.join(", ") : "none"));
  console.log("    access rules: " + (full.rules ? "the project'"'"'s own (they replace the server'"'"'s when they changed)" : "none in the project: the server keeps its own (the enforced defaults on a first ship)"));
' "$WORK/deploy.json"

echo "==> 2/4 stage and provision on $HOST"
ssh "${SSH_OPTS[@]}" "$HOST" "rm -rf /tmp/$APP-provision && mkdir -p /tmp/$APP-provision"
rsync -az -e "ssh ${SSH_OPTS[*]}" "$FOLDER/" "$HOST:/tmp/$APP-provision/"
CADDY=on; [ -n "$DOMAIN" ] || CADDY=off
ssh "${SSH_OPTS[@]}" "$HOST" "APP=$APP PORT=$PORT DOMAIN=$DOMAIN CADDY=$CADDY bash -s" < "$PROVISION"

echo "==> 3/4 the function secrets (from the local backend's store, over stdin)"
{ [ -n "$SECRETS_JSON" ] && node -e '
    const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).functions || {};
    for (const [name, value] of Object.entries(s))
      process.stdout.write("NODEGX_SECRET_" + name.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase() + "=" + value + "\n");
  ' "$SECRETS_JSON"; true; } \
  | ssh "${SSH_OPTS[@]}" "$HOST" "cat > /etc/$APP/secrets.env && chown root:$APP /etc/$APP/secrets.env && chmod 640 /etc/$APP/secrets.env && { sed 's/=.*//' /etc/$APP/secrets.env | sed 's/^/    /'; [ -s /etc/$APP/secrets.env ] || echo '    none'; } && systemctl restart $APP-backend"

echo "==> 4/4 up"
ssh "${SSH_OPTS[@]}" "$HOST" "for i in \$(seq 1 20); do curl -fsS http://127.0.0.1:$PORT/health >/dev/null 2>&1 && break; sleep 1; done; curl -fsS -o /dev/null -w '    health %{http_code}\n' http://127.0.0.1:$PORT/health && curl -fsS -o /dev/null -w '    the app %{http_code}\n' http://127.0.0.1:$PORT/"
if [ -n "$DOMAIN" ]; then
  echo "==> shipped $APP to https://$DOMAIN"
else
  echo "==> shipped $APP — no domain yet, so it answers on the box only. To see it:"
  echo "    ssh ${SSH_PORT:+-p $SSH_PORT }-L $PORT:127.0.0.1:$PORT $HOST   then open http://localhost:$PORT"
fi
