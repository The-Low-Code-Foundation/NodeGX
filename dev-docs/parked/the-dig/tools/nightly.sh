#!/bin/sh
# The night shift (a draft, not yet installed): plants tomorrow's rooms with Claude Code, headless.
# Meant for the nexus VM's crontab, e.g. at 03:00:   0 3 * * * cd /srv/the-dig && sh tools/nightly.sh >> data/nightly.log 2>&1
# Needs: Claude Code installed and signed in on the VM, and TODO_EXPORT set to a command that prints the todo list as JSON.
cd "$(dirname "$0")/.." || exit 1
TOMORROW=$(date -d tomorrow +%F 2>/dev/null || date -v+1d +%F)
OUT="data/plants/$TOMORROW.json"
[ -f "$OUT" ] && { echo "$(date) $OUT already planted"; exit 0; }
mkdir -p data/plants

# 1. His todo list, as it stands tonight. (To fill in when this is installed: the todo template's backend export.)
if [ -n "$TODO_EXPORT" ]; then sh -c "$TODO_EXPORT" > data/todo.json || echo '{}' > data/todo.json; else echo '{}' > data/todo.json; fi
[ -f data/answers.jsonl ] || : > data/answers.jsonl
[ -f data/trophies.json ] || echo '[]' > data/trophies.json

# 2. Claude plants the rooms: it may read data/ and write only tomorrow's file, and run the check.
PROMPT=$(sed "s/<TOMORROW>/$TOMORROW/g" tools/nightly-prompt.md)
claude -p "$PROMPT" \
  --allowedTools "Read" "Write(data/plants/$TOMORROW.json)" "Edit(data/plants/$TOMORROW.json)" "Bash(node tools/check-plants.mjs:*)" \
  --max-turns 30 || echo "$(date) claude exited $?"

# 3. Only a file that passes the check is kept; the game falls back to the last good day otherwise.
if node tools/check-plants.mjs "$OUT" --trophies data/trophies.json; then
  echo "$(date) planted $OUT"
else
  mv "$OUT" "$OUT.rejected" 2>/dev/null
  echo "$(date) $OUT failed the check: kept as .rejected"
  exit 1
fi
