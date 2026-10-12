#!/usr/bin/env bash
#
# TPL-008-RC — Today and things that repeat, on todo.digitalbricks.io (nexus-1). Run as root on the box:
#   bash /tmp/todo-recurring/provision-recurring.sh
#
# Before running, stage in /tmp/todo-recurring/:
#   security.json  — the LIVE policy merged with templates/todo-list.security.json by
#                    planning-digitalbricks/merge-policy.js (it adds Routine and RoutineCheck, nothing else)
#   sender.js      — todo-digitalbricks/push/sender.js (pushes each routine at its time)
#
# Additive. The policy is installed only if the live one has no RoutineCheck yet, a copy of the old file is kept
# beside it, and the staged one must still hold the todo list's and the planner's collections. The site itself
# (with the new sw.js) is deployed the usual way — README.md here, "Redeploy the app".

set -euo pipefail

STAGE=/tmp/todo-recurring
DATA_DIR=/var/lib/todo/data
PUSH=/opt/todo/push
BACKEND_UNIT=todo-backend
PUSH_UNIT=todo-push
BACKEND_PORT=8690

fatal() { echo "FATAL: $*" >&2; exit 1; }
[ -f "$DATA_DIR/security.json" ] || fatal "$DATA_DIR/security.json missing"
systemctl is-active --quiet "$BACKEND_UNIT" || fatal "$BACKEND_UNIT is not running"

if grep -q '"RoutineCheck"' "$DATA_DIR/security.json"; then
  echo "==> policy already has Routine and RoutineCheck; leaving it alone"
else
  S="$STAGE/security.json"
  [ -f "$S" ] || fatal "$S missing (run merge-policy.js locally and scp it)"
  grep -q '"Routine"' "$S" && grep -q '"RoutineCheck"' "$S" || fatal "the staged policy has no Routine/RoutineCheck; refusing"
  # Every collection the live policy has must still be there: Planning's ship rewrites this file too, and a
  # policy merged before the other app's collections landed would take them away.
python3 - "$DATA_DIR/security.json" "$STAGE/security.json" <<'KEEP' || fatal "the staged policy would drop a collection the live one has; refusing"
import json, sys
live = set(json.load(open(sys.argv[1]))['collections'])
staged = set(json.load(open(sys.argv[2]))['collections'])
lost = sorted(live - staged)
if lost:
    print('would drop: ' + ', '.join(lost), file=sys.stderr)
    sys.exit(1)
KEEP
  cp -a "$DATA_DIR/security.json" "$DATA_DIR/security.json.bak-$(date +%Y%m%d%H%M%S)"
  install -o todo -g todo -m 640 "$S" "$DATA_DIR/security.json"
  systemctl restart "$BACKEND_UNIT"
  for i in $(seq 1 20); do
    curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null || { journalctl -u "$BACKEND_UNIT" -n 40 --no-pager >&2; fatal "backend not healthy after the policy change"; }
  echo "==> policy: Routine and RoutineCheck added (old file kept beside it)"
fi

if [ -f "$STAGE/sender.js" ]; then
  grep -q 'BEGIN SCHEDULE_FNS' "$STAGE/sender.js" || fatal "the staged sender.js does not push routines; refusing"
  cp -a "$PUSH/sender.js" "$PUSH/sender.js.bak-$(date +%Y%m%d%H%M%S)"
  install -o root -g root -m 644 "$STAGE/sender.js" "$PUSH/sender.js"
  systemctl restart "$PUSH_UNIT"
  sleep 2
  systemctl is-active --quiet "$PUSH_UNIT" || { journalctl -u "$PUSH_UNIT" -n 40 --no-pager >&2; fatal "$PUSH_UNIT did not come back"; }
  runuser -u todo -- /usr/bin/node --no-warnings "$PUSH/sender.js" --dry-run </dev/null | tail -5
  echo "==> sender: routine reminders on"
fi
