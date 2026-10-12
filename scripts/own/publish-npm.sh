#!/usr/bin/env bash
# P112 — publish the npm kit's tested tarballs, in dependency order, skipping any version already on the registry.
#
#   scripts/own/publish-npm.sh <folder holding the .tgz files>
#
# Run it in your own terminal: npm asks for your one-time password (2FA) for each package. Each tarball is published
# exactly as tested (the session packed them in a worktree at a pushed commit), never re-packed here.
set -euo pipefail
dir="${1:?usage: publish-npm.sh <folder of .tgz files>}"
# @nodegx/mcp before create-nodegx: create-nodegx sets folders up with the mcp version it pins.
for name in nodegx-preview nodegx-mcp create-nodegx; do
  tgz=$(ls "$dir"/"$name"-*.tgz 2>/dev/null | head -1 || true)
  [ -n "$tgz" ] || { echo "skip $name: no tarball in $dir"; continue; }
  pkg=$(tar -xzOf "$tgz" package/package.json | node -pe 'const p=JSON.parse(require("fs").readFileSync(0,"utf8")); p.name+"@"+p.version')
  if npm view "$pkg" version >/dev/null 2>&1; then echo "skip $pkg: already published"; continue; fi
  echo "publishing $pkg from $(basename "$tgz") (shasum $(shasum "$tgz" | cut -c1-40))"
  npm publish "$tgz" --access public
done
echo "done. A first read of a new version can 404 for a minute or two; poll with: npm view <name>@<version> dist.shasum"
