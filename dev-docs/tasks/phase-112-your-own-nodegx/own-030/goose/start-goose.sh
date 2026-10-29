#!/bin/sh
# Start Goose Desktop with HOME pointed at ~/.goose-home: a folder of links to everything in the real home except
# .claude. Goose 1.57.0 lists every SKILL.md under ~/.claude/skills in its system prompt (about 3.6k tokens of
# Richard's Claude skills), whatever its Skills switch says, and it has no setting to turn that off. Its server
# takes HOME from the app's environment, so a home without .claude hides them; Library is a link, so the keychain
# and Application Support are the real ones. The nodegx extension sets HOME back (nodegx-launch.sh).
# OWN-031 / own-030/goose/FINDINGS.md row 9. Usage: start-goose.sh (quits a running Goose first).
REAL="/Users/richardosborne"
FAKE="$REAL/.goose-home"
mkdir -p "$FAKE"
# drop links whose target is gone, then link every top-level entry except .claude and the stand-in itself
for l in "$FAKE"/.[!.]* "$FAKE"/*; do [ -L "$l" ] && [ ! -e "$l" ] && rm "$l"; done
for e in "$REAL"/.[!.]* "$REAL"/*; do
  n=$(basename "$e")
  case "$n" in .claude|.goose-home|'.[!.]*'|'*') continue ;; esac
  [ -e "$FAKE/$n" ] || [ -L "$FAKE/$n" ] || ln -s "$e" "$FAKE/$n"
done
if pgrep -x Goose >/dev/null; then osascript -e 'quit app "Goose"'; i=0; while pgrep -x Goose >/dev/null && [ $i -lt 20 ]; do sleep 0.5; i=$((i+1)); done; fi
exec open -a Goose --env HOME="$FAKE"
