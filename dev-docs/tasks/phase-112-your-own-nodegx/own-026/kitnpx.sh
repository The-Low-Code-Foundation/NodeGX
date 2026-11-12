#!/bin/bash
# OWN-026 fix loop: when a round's kit carries its own @nodegx/preview (a runtime fix the registry's copy lacks),
# `npx @nodegx/preview …` (any version spec, as the command or as -p / --package) runs that tarball, exactly as a person
# with that kit release would get. Every other npx call passes through untouched. NODEGX_LAB_PREVIEW_TGZ names the
# tarball; NODEGX_LAB_REAL_NPX is the real npx beside node.
args=(); prev=""; command_seen=""
for a in "$@"; do
  case "$a" in
    @nodegx/preview|@nodegx/preview@*)
      if [ "$prev" = "-p" ] || [ "$prev" = "--package" ]; then args+=("$NODEGX_LAB_PREVIEW_TGZ")
      elif [ -z "$command_seen" ]; then args+=("--package=$NODEGX_LAB_PREVIEW_TGZ" "preview"); command_seen=1
      else args+=("$a"); fi ;;
    --package=@nodegx/preview|--package=@nodegx/preview@*) args+=("--package=$NODEGX_LAB_PREVIEW_TGZ") ;;
    -*) args+=("$a") ;;
    *) if [ "$prev" != "-p" ] && [ "$prev" != "--package" ] && [ "$prev" != "-c" ]; then command_seen=1; fi; args+=("$a") ;;
  esac
  prev="$a"
done
exec "$NODEGX_LAB_REAL_NPX" "${args[@]}"
