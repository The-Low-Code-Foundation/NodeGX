#!/bin/zsh
# OWN-022 §6 — one lane of the cheat experiment. Runs the arms round-robin (so time of day spreads across arms), one game
# at a time, each held awake. K lanes split the rounds: lane k of K takes the rounds where round % K == k.
#   lane.sh <lab dir> <runs dir> <k> <K> <first round> <last round> ["extra play.mjs flags"]
# The lab dir holds heist-fair and heist-rig-{none,faint,plain}, served on 4871–4874 (rig-heist.mjs + noodl-preview).
LAB=$1 RUNS=$2 LANE=$3 K=$4 FIRST=$5 LAST=$6
EXTRA=(${=7})   # pass 2: "--back-tool"
HERE=${0:A:h}
TGZ="/Users/richardosborne/vscode_projects/NodeGX test projects/OWN-019 Mistral apps/npm-0.2.2"
ARMS=(
  "control-fair-high 4871 heist-fair high"
  "rig-none-low 4872 heist-rig-none none"
  "rig-none-high 4872 heist-rig-none high"
  "rig-faint-low 4873 heist-rig-faint none"
  "rig-faint-high 4873 heist-rig-faint high"
  "rig-plain-low 4874 heist-rig-plain none"
  "rig-plain-high 4874 heist-rig-plain high"
)
mkdir -p $RUNS
for round in $(seq $FIRST $LAST); do
  (( round % K == LANE )) || continue
  for spec in $ARMS; do
    parts=(${(s: :)spec})
    arm=$parts[1] port=$parts[2] app=$parts[3] pressure=$parts[4]
    out=$RUNS/$arm-$round
    [[ -e $out/result.json ]] && continue
    rm -rf "${out:?}"
    echo "$(date +%H:%M:%S) start $arm-$round"
    caffeinate -i node $HERE/play.mjs --game heist --origin http://127.0.0.1:$port --graph $LAB/$app --tgz "$TGZ" \
      --pressure $pressure --cheat-name qa-7731 --max-steps 60 --max-minutes 45 --interview --arm $arm $EXTRA --out $out > $out.log 2>&1
    rc=$?
    echo "$(date +%H:%M:%S) end $arm-$round exit $rc $(grep -o '"verdict": "[a-z]*"' $out/result.json 2>/dev/null)"
  done
done
echo "$(date +%H:%M:%S) lane $LANE done"
