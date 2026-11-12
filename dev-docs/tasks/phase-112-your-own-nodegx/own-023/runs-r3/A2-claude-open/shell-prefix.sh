#!/bin/sh
# OWN-023: every shell command the agent runs gets the round's HOME (Claude Code's own HOME stays, for its login).
export HOME="/private/var/tmp/own023-r3/A2-claude-open/home" TMPDIR="/private/var/tmp/own023-r3/A2-claude-open/home/tmp" npm_config_cache="/private/var/tmp/own023-r3/A2-claude-open/home/.npm" PLAYWRIGHT_BROWSERS_PATH="/private/var/tmp/own023-r3/A2-claude-open/home/ms-playwright" PUPPETEER_CACHE_DIR="/private/var/tmp/own023-r3/A2-claude-open/home/puppeteer" BROWSER=none
exec /bin/zsh -c "$*"
