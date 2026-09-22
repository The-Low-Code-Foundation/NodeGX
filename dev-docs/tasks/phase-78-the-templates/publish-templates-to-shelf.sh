#!/usr/bin/env bash
#
# Publish the templates behind nodegx.io's demos to the community shelf, so a visitor who likes a
# demo can download NodeGX and find the same app in the launcher's Templates tab.
#
#   dev-docs/tasks/phase-78-the-templates/publish-templates-to-shelf.sh                 # DRAFT rows, all four
#   dev-docs/tasks/phase-78-the-templates/publish-templates-to-shelf.sh --publish       # make them visible
#   dev-docs/tasks/phase-78-the-templates/publish-templates-to-shelf.sh todo-list       # just one (any flag works too)
#
# Written 2026-09-15 on Richard's ruling (route: the community shelf; `game` is a new category, which
# is nodegx-community `0028` and has to be deployed first).
#
# The shape is `release-0.2.2/publish-members-area.sh`'s, for its reasons: the production Postgres is
# bound to nexus-1's own loopback, and the publisher reads the bundle off THIS disk — so forward 5432
# through ssh, read the password into a variable (never to disk, never echoed), and point the publisher
# at the near end.
#
# 🔴 THE REFUSALS. `readbundledirectory.ts` ships everything under a directory with no skip list, and
# opening a project in the editor writes `.mcp.json` (absolute developer paths), `CLAUDE.md` and a
# `.gitignore` block into it. So each template is refused if any of those exist, or if its file count is
# not the one measured at commit `3206e12e5` — a count that moved means somebody opened or regenerated it,
# and the right response is to look, not to publish.
#
# ✅ PLANNER JOINED ON 2026-09-22 at 211 files (TPL-010 through R2.5), published the same day as its
# demo went on nodegx.io. Like the todo list it needs a backend, and 0.2.4's community route does not
# carry `needsBackend`, so its START-HERE says how to make one.
#
# 🔴 TWO COUNTS HAVE MOVED AND ARE NOT UPDATED HERE, ON PURPOSE: `todo-list` is 121 files (was 112)
# and `story-engine` is 35 (was 30). Both are refusals waiting to happen, and both are real work the
# shelf has not been given — the todo list's icons, date picker and reminders among them. Look at
# what moved, then update the count and republish in the same commit.
#
# ✅ ROCKET SCHOOL IS 285 SINCE `5ca1192ae` (P95, 2026-09-18), AND THE MOVE WAS LOOKED AT: the eleven
# are `Hangar/Confirm`, `Hangar/Sum row` and `Logic/Roll face` (three files each) plus the Nunito faces
# moving out of `rocket-school-fonts` into a shared `preset-font-nunito` module. `npm run template:rocket`
# reproduces the directory byte for byte, and none of the three editor-written files is in it.
#
# ⚠️ These templates install into v0.2.4, whose runtime lacks GAM-006: every States node in them keeps
# `useTransitions: false` (tpl005/tpl006 gates). And v0.2.4's community route does not carry
# `needsBackend`, so the todo list installs WITHOUT the automatic backend setup — its START-HERE says how.
set -euo pipefail

SSH_KEY="${NODEGX_SSH_KEY:-$HOME/.ssh/nexus_hetzner}"
HOST="${NODEGX_HOST:-root@49.12.102.195}"
LOCAL_PORT="${NODEGX_TUNNEL_PORT:-15432}"
ENV_FILE=/etc/nodegx-community/nodegx-community.env
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMMUNITY="${NODEGX_COMMUNITY_DIR:-$HOME/vscode_projects/nodegx-community}"

# slug | directory under templates/ | category | expected files | title | summary
TEMPLATES=(
  "planner|planner|data-app|211|Planner|A week for people who bill by the hour: hour budgets for billable, building, admin and hobby work, a strip of next moves, money that is ticked when it happens, and one sentence a night about what to do tomorrow. Needs a NodeGX backend."
  "rocket-school|rocket-school|game|285|Rocket School|Maths and typing practice for ages 8 to 12, in English and French: four games, 62 skills from CE2 to 6e, and progress kept in the browser."
  "pixel-dungeon|pixel-game|game|34|Pixel dungeon|A turn-based dungeon played with the arrow keys. The five rooms are one list in one node, so a sixth room is one more entry."
  "story-engine|story-engine|game|30|Story engine|A branching story where choices hand you things and some only appear once you carry them. The whole story is one list you can rewrite."
  "todo-list|todo-list|data-app|112|Todo list|One list in the order you will do things, with deadlines, next actions and a history nothing is deleted from. Needs a NodeGX backend."
)

PUBLISH=0
ONLY=()
for arg in "$@"; do
  case "$arg" in
    --publish) PUBLISH=1 ;;
    -*) echo "usage: $(basename "$0") [--publish] [slug ...]" >&2; exit 1 ;;
    *) ONLY+=("$arg") ;;
  esac
done

selected() {
  [ "${#ONLY[@]}" -eq 0 ] && return 0
  local s
  for s in "${ONLY[@]}"; do [ "$s" = "$1" ] && return 0; done
  return 1
}

# ── refusals, before anything is touched ─────────────────────────────────────

for row in "${TEMPLATES[@]}"; do
  IFS='|' read -r slug dir category expected title summary <<<"$row"
  selected "$slug" || continue
  path="$REPO_ROOT/templates/$dir"
  for f in .mcp.json CLAUDE.md .gitignore; do
    if [ -n "$(find "$path" -name "$f" -print -quit)" ]; then
      echo "REFUSING: $path contains $f — the project has been opened in the editor." >&2
      echo "  Delete it, regenerate with 'npm run template:*', and confirm the artefact before publishing." >&2
      exit 1
    fi
  done
  files="$(find "$path" -type f | wc -l | tr -d ' ')"
  if [ "$files" != "$expected" ]; then
    echo "REFUSING: $slug has $files files, expected $expected (measured at 3206e12e5)." >&2
    exit 1
  fi
  echo "==> $slug: $files files, category $category, none of the editor-written files"
done

if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "REFUSING: something is already listening on $LOCAL_PORT. Set NODEGX_TUNNEL_PORT." >&2
  exit 1
fi

# ── the credential, and the tunnel ───────────────────────────────────────────

echo "==> reading DATABASE_URL from $HOST:$ENV_FILE"
DB_URL_REMOTE="$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$HOST" \
  "grep '^DATABASE_URL=' $ENV_FILE | cut -d= -f2-")"
if [ -z "$DB_URL_REMOTE" ]; then
  echo "REFUSING: no DATABASE_URL in $ENV_FILE on $HOST." >&2
  exit 1
fi
DB_URL_LOCAL="${DB_URL_REMOTE/@127.0.0.1:5432/@127.0.0.1:$LOCAL_PORT}"
if [ "$DB_URL_LOCAL" = "$DB_URL_REMOTE" ]; then
  echo "REFUSING: DATABASE_URL does not point at 127.0.0.1:5432 as provision.sh writes it." >&2
  exit 1
fi

echo "==> opening tunnel localhost:$LOCAL_PORT -> $HOST 127.0.0.1:5432"
ssh -i "$SSH_KEY" -N -L "$LOCAL_PORT:127.0.0.1:5432" "$HOST" &
TUNNEL_PID=$!
trap 'kill "$TUNNEL_PID" 2>/dev/null || true' EXIT
for _ in $(seq 1 20); do
  lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1 && break
  sleep 0.5
done
if ! lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "REFUSING: the tunnel never came up on $LOCAL_PORT." >&2
  exit 1
fi

# ── the writes ───────────────────────────────────────────────────────────────
#
# ⚠️ --publish is opt-in, and a re-run WITHOUT it does not unpublish a live row.

cd "$COMMUNITY"
for row in "${TEMPLATES[@]}"; do
  IFS='|' read -r slug dir category expected title summary <<<"$row"
  selected "$slug" || continue
  ARGS=("$slug" "$REPO_ROOT/templates/$dir" "$category" "$summary" --title "$title")
  [ "$PUBLISH" = "1" ] && ARGS+=(--publish)
  if [ "$PUBLISH" = "1" ]; then echo "==> $slug: publishing (visible on the shelf)"; else echo "==> $slug: writing a DRAFT row"; fi
  DATABASE_URL="$DB_URL_LOCAL" npx tsx scripts/publish-project-template.ts "${ARGS[@]}"
done

echo
echo "==> done. Verify on the live shelf, never from this script's silence:"
echo "    curl -s https://community.nodegx.io/api/v1/community/templates"
