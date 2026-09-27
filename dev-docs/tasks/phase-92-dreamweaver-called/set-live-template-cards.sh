#!/usr/bin/env bash
#
# CHR-006 AC4 — give the four live shelf templates their homepage picture and eyebrow.
#
#   dev-docs/tasks/phase-92-dreamweaver-called/set-live-template-cards.sh
#
# Written 2026-09-15 after Richard approved the deploy of nodegx-community `0029`.
#
# 🔴 THE CARD ONLY — NOT A REPUBLISH. `publish-project-template.ts --thumbnail` would also
# replace each template's PAYLOAD with the working copy under `OpenNoodl/templates/`, and on
# the day this was written `templates/rocket-school` held another session's uncommitted edits.
# A picture is not a reason to ship somebody's half-finished project. So this updates the
# three `0029` columns on rows that are already published, and touches nothing else: not the
# payload, not `version`, not `updated_at`. `0029`'s CHECKs still gate every value.
#
# The tunnel is `release-0.2.2/publish-members-area.sh`'s, for its reason: the production
# Postgres is bound to the server's own loopback. The password is read over ssh into a shell
# variable, never written to disk and never echoed.
set -euo pipefail

SSH_KEY="${NODEGX_SSH_KEY:-$HOME/.ssh/nexus_hetzner}"
HOST="${NODEGX_HOST:-root@49.12.102.195}"
LOCAL_PORT="${NODEGX_TUNNEL_PORT:-15433}"
ENV_FILE=/etc/nodegx-community/nodegx-community.env
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHOTS="$HERE/audit/demos"
COMMUNITY="${NODEGX_COMMUNITY_DIR:-$HOME/vscode_projects/nodegx-community}"

# slug | eyebrow (the homepage's) | shot
CARDS=(
  "rocket-school|Game · ages 8–12|rocket-school.webp"
  "todo-list|Productivity|todo-list.webp"
  "pixel-dungeon|Game|pixel-dungeon.webp"
  "story-engine|Interactive story|story-engine.webp"
)

for card in "${CARDS[@]}"; do
  shot="$SHOTS/${card##*|}"
  [ -f "$shot" ] || { echo "REFUSING: no shot at $shot" >&2; exit 1; }
done
if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "REFUSING: something is already listening on $LOCAL_PORT. Set NODEGX_TUNNEL_PORT." >&2
  exit 1
fi

echo "==> reading DATABASE_URL from $HOST:$ENV_FILE"
DB_URL_REMOTE="$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$HOST" \
  "grep '^DATABASE_URL=' $ENV_FILE | cut -d= -f2-")"
DB_URL_LOCAL="${DB_URL_REMOTE/@127.0.0.1:5432/@127.0.0.1:$LOCAL_PORT}"
if [ -z "$DB_URL_REMOTE" ] || [ "$DB_URL_LOCAL" = "$DB_URL_REMOTE" ]; then
  echo "REFUSING: DATABASE_URL is missing or does not point at 127.0.0.1:5432." >&2
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
lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1 || { echo "REFUSING: the tunnel never came up." >&2; exit 1; }

cd "$COMMUNITY"
DATABASE_URL="$DB_URL_LOCAL" SHOTS="$SHOTS" CARDS="$(printf '%s\n' "${CARDS[@]}")" node --input-type=module -e '
import { readFileSync } from "node:fs";
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
let failed = 0;
try {
  const [{ exists }] = await sql`select exists (select 1 from information_schema.columns
    where table_name = ${"project_templates"} and column_name = ${"thumbnail"}) as exists`;
  if (!exists) throw new Error("0029 is not applied on this database — deploy first");
  for (const line of process.env.CARDS.trim().split("\n")) {
    const [slug, eyebrow, file] = line.split("|");
    const bytes = readFileSync(`${process.env.SHOTS}/${file}`);
    const rows = await sql`update project_templates
         set eyebrow = ${eyebrow}, thumbnail = ${bytes}, thumbnail_type = ${"image/webp"}
       where slug = ${slug} and published_at is not null
       returning slug, version, octet_length(thumbnail) as bytes`;
    if (rows.length !== 1) { failed++; console.error(`  ${slug}: NOT UPDATED (no published row)`); continue; }
    console.log(`  ${slug}: eyebrow "${eyebrow}", ${rows[0].bytes} bytes, version ${rows[0].version} (unchanged)`);
  }
} finally {
  await sql.end();
}
process.exit(failed ? 1 : 0);
'
echo "==> done. Verify: curl https://community.nodegx.io/api/v1/community/templates"
