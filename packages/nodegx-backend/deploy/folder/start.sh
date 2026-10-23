#!/bin/sh
# Starts this NodeGX app — see DEPLOY.md. Options: --port <n> (default: the first free port from 3000).
command -v node >/dev/null 2>&1 || { echo "This app needs Node.js 22.13 or later: https://nodejs.org" >&2; exit 1; }
exec node "$(dirname "$0")/start.js" "$@"
