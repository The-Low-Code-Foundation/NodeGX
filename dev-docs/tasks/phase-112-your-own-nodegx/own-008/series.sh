#!/bin/zsh
# OWN-008: the three strangers one after another (memory: one heavy job), each in its own lab, never two at once.
# Usage: nohup ./series.sh <labRoot> > <labRoot>/series.log 2>&1 &
# <labRoot>/base must be what `npm create nodegx@0.2.2 base` wrote. A round stopped by the quota guard ends the series.
HERE=${0:A:h}
LAB_ROOT=$1
[[ -d $LAB_ROOT/base/.claude/skills/nodegx-your-own-editor ]] || { echo "no base lab in $LAB_ROOT"; exit 2; }
for name in table blocks map; do
  echo "$(date '+%F %T') start $name"
  node $HERE/round.mjs $name $LAB_ROOT
  echo "$(date '+%F %T') end $name: $(cat $LAB_ROOT/out/$name/agent.exit)"
  grep -q '"quotaStop":{' $LAB_ROOT/out/$name/agent.exit && { echo "quota stop: series ends"; exit 3; }
done
echo "$(date '+%F %T') series done"
