#!/bin/sh
# OWN-023: every shell command the agent runs gets the round's HOME (Claude Code's own HOME stays, for its login).
export HOME="/private/var/tmp/own023-r3/B-claude/home" TMPDIR="/private/var/tmp/own023-r3/B-claude/home/tmp" npm_config_cache="/private/var/tmp/own023-r3/B-claude/home/.npm" PLAYWRIGHT_BROWSERS_PATH="/private/var/tmp/own023-r3/B-claude/home/ms-playwright" PUPPETEER_CACHE_DIR="/private/var/tmp/own023-r3/B-claude/home/puppeteer" BROWSER=none
exec /bin/zsh -c "$*"
