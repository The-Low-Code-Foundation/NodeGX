#!/usr/bin/env bash
# P112 — publish the npm kit's tested tarballs, in dependency order, skipping any version already on the registry.
#
#   scripts/own/publish-npm.sh <folder holding the .tgz files>
#
# Run it in your own terminal: npm asks for your one-time password (2FA) for each package. Each tarball is published
# exactly as tested (the session packed them in a worktree at a pushed commit), never re-packed here.
set -euo pipefail
dir="${1:?usage: publish-npm.sh <folder of .tgz files>}"
# @nodegx/mcp before create-nodegx: create-nodegx sets folders up with the mcp version it pins; create-nodegx-vibe
# (OWN-019, `npm create nodegx-vibe`) last, because it pins create-nodegx. `<name>-[0-9]*` so that create-nodegx
# never picks up create-nodegx-vibe-<v>.tgz.
for name in nodegx-preview nodegx-mcp create-nodegx create-nodegx-vibe; do
  tgz=$(ls "$dir"/"$name"-[0-9]*.tgz 2>/dev/null | head -1 || true)
  [ -n "$tgz" ] || { echo "skip $name: no tarball in $dir"; continue; }
  pkg=$(tar -xzOf "$tgz" package/package.json | node -pe 'const p=JSON.parse(require("fs").readFileSync(0,"utf8")); p.name+"@"+p.version')
  if npm view "$pkg" version >/dev/null 2>&1; then echo "skip $pkg: already published"; continue; fi
  echo "publishing $pkg from $(basename "$tgz") (shasum $(shasum "$tgz" | cut -c1-40))"
  npm publish "$tgz" --access public
  # 2026-10-14 (npm 0.2.0): npm can STAGE a publish (staged publishing, GA May 2026) instead of making it live, and
  # create-nodegx then pins an MCP version nobody can install. Wait until the registry serves each one, with the
  # tested shasum, before the next; stop rather than publish create-nodegx over a version that isn't there.
  want=$(shasum "$tgz" | cut -c1-40)
  for i in $(seq 1 30); do
    got=$(npm view "$pkg" dist.shasum 2>/dev/null || true)
    [ "$got" = "$want" ] && { echo "live: $pkg"; break; }
    [ "$i" = 30 ] && { echo "STOP: $pkg is not live after 5 min (staged? run: npx npm@11.15.0 stage list). Nothing after it was published." >&2; exit 1; }
    sleep 10
  done
done
echo "done. A first read of a new version can 404 for a minute or two; poll with: npm view <name>@<version> dist.shasum"
