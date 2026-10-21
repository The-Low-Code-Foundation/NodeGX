#!/usr/bin/env bash
# P112 — publish the npm kit's tested tarballs, in dependency order, skipping any version already on the registry.
#
#   scripts/own/publish-npm.sh <folder holding the .tgz files>
#
# Run it in your own terminal: npm asks for your one-time password (2FA) for each package. Each tarball is published
# exactly as tested (the session packed them in a worktree at a pushed commit), never re-packed here.
set -euo pipefail
dir="${1:?usage: publish-npm.sh <folder of .tgz files>}"
# Dependencies first. @nodegx/node-spec before @nodegx/project-contract, whose published manifest depends on it
# (`^<node-spec version>`, written by build-publish.mjs); @nodegx/canvas-look depends on nothing (a folder without its
# tarball is skipped, so a cut that leaves it at its published version just omits it). @nodegx/mcp before
# create-nodegx: create-nodegx sets folders up with the mcp version it pins; create-nodegx-vibe (OWN-019,
# `npm create nodegx-vibe`) and create-nodegx-cline (OWN-020) last, because each pins create-nodegx. `<name>-[0-9]*` so
# that create-nodegx never picks up create-nodegx-vibe-<v>.tgz. create-nodegx-cline needs a create-nodegx with
# `--cline` (0.2.4 and later), so its first tarball comes with the 0.2.4 cut. @nodegx/export (P18 EXP-023, Richard's ruling of
# 2026-10-21: the off-ramp is on npm) depends on nothing published and is cut at the kit's version from the 0.2.5 cut on.
# 2026-10-20 (npm 0.2.4): `npm view <name>@<version>` answered "not there" for over an hour after @nodegx/mcp@0.2.4 went
# live (its cache and the registry's abbreviated document lag), so a re-run after a partial publish tried mcp again and
# stopped on E403 "cannot publish over the previously published versions". The full document is the registry's own
# record: read the version's shasum from it, with no npm cache in between.
registry_shasum() { # <name> <version> → the published version's shasum, or nothing
  curl -fsS -H 'Cache-Control: no-cache' "https://registry.npmjs.org/$(printf %s "$1" | sed 's|/|%2f|')" 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const v=(JSON.parse(s).versions||{})[process.argv[1]];if(v)process.stdout.write(v.dist.shasum)}catch(e){}})' "$2"
}
for name in nodegx-node-spec nodegx-project-contract nodegx-canvas-look nodegx-preview nodegx-export nodegx-mcp create-nodegx create-nodegx-vibe create-nodegx-cline; do
  tgz=$(ls "$dir"/"$name"-[0-9]*.tgz 2>/dev/null | head -1 || true)
  [ -n "$tgz" ] || { echo "skip $name: no tarball in $dir"; continue; }
  pkg=$(tar -xzOf "$tgz" package/package.json | node -pe 'const p=JSON.parse(require("fs").readFileSync(0,"utf8")); p.name+"@"+p.version')
  if [ -n "$(registry_shasum "${pkg%@*}" "${pkg##*@}")" ]; then echo "skip $pkg: already published"; continue; fi
  echo "publishing $pkg from $(basename "$tgz") (shasum $(shasum "$tgz" | cut -c1-40))"
  npm publish "$tgz" --access public
  # 2026-10-14 (npm 0.2.0): npm can STAGE a publish (staged publishing, GA May 2026) instead of making it live, and
  # create-nodegx then pins an MCP version nobody can install. Wait until the registry serves each one, with the
  # tested shasum, before the next; stop rather than publish create-nodegx over a version that isn't there.
  want=$(shasum "$tgz" | cut -c1-40)
  for i in $(seq 1 30); do
    got=$(registry_shasum "${pkg%@*}" "${pkg##*@}")
    [ "$got" = "$want" ] && { echo "live: $pkg"; break; }
    [ "$i" = 30 ] && { echo "STOP: $pkg is not live after 5 min (staged? run: npx npm@11.15.0 stage list). Nothing after it was published." >&2; exit 1; }
    sleep 10
  done
done
echo "done. A first read of a new version can 404 for a minute or two; each one above was read live from the registry's full document."
