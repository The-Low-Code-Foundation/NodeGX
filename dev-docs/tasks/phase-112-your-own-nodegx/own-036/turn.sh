#!/bin/bash
# One turn of one arm: ./turn.sh <arm> <n> <message file> [continue]
# Writes out/<arm>-<n>.json (Claude Code's --output-format json). Turn 1 starts the session; later turns --continue it.
cd "$(dirname "$0")" || exit 1
mkdir -p out
arm=$1; n=$2; msg=$(cat "$3")
extra=()
[ "$4" = continue ] && extra=(--continue)
nice -n 10 node arm.mjs "$arm" -- -p "$msg" --output-format json --permission-mode auto "${extra[@]}" > "out/$arm-$n.json" 2> "out/$arm-$n.err"
echo "arm $arm turn $n exit $?"
