#!/bin/zsh
# OWN-030 — the four lanes, one brief after another (Ollama + Chrome is the one heavy job on this box).
#   ./lanes.sh                 every brief
#   ./lanes.sh bakery jazz     those briefs
# Per brief: graph (OWN-029 s3, paired from S0), its look; emit of graph's kept round, its look; code-guided from
# graph's round-0 answers, its look; code-bare, its look. Each step logs its exit code; a failed step does not stop
# the series, and the next steps that need it say so.
cd "${0:A:h}"
LOG=runs/lanes.log
mkdir -p runs
BRIEFS=(${@:-puppy bakery running jazz pottery plumber})
kept() { node -e 'const L=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const b=L.result.bestRound;console.log(L.roundsLog.find(r=>r.round===b).project+"\t"+b)' ../own-029/runs/G-$1/ledger.json; }
for b in $BRIEFS; do
  {
    echo "== $b $(date +%H:%M:%S)"
    node ../own-029/agent.mjs --brief $b --run G-$b --rounds 4 --decisions-from S0-$b; echo "graph $b exit $?"
    IFS=$'\t' read -r proj best <<< "$(kept $b)"
    node look.mjs "$proj" runs/graph-$b/look; echo "look graph $b exit $?"
    node emit.mjs ../own-029/runs/G-$b/r$best/tree.json "$proj" runs/emit-$b/site; echo "emit $b exit $?"
    node look.mjs "$proj" runs/emit-$b/look --html runs/emit-$b/site/index.html; echo "look emit $b exit $?"
    node code.mjs guided $b G-$b runs/guided-$b/site; echo "guided $b exit $?"
    node look.mjs "$proj" runs/guided-$b/look --html runs/guided-$b/site/index.html; echo "look guided $b exit $?"
    req=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).request)' ../own-029/runs/G-$b/ledger.json)
    node code.mjs bare $b "$req" runs/bare-$b/site; echo "bare $b exit $?"
    node look.mjs "$proj" runs/bare-$b/look --html runs/bare-$b/site/index.html; echo "look bare $b exit $?"
  } >> $LOG 2>&1
done
# the one heavy job ends by giving the memory back
for m in gemma4:e2b-it-qat gemma4:e4b-it-qat; do curl -s http://127.0.0.1:11434/api/generate -d "{\"model\":\"$m\",\"keep_alive\":0}" > /dev/null; done
echo "lanes done $(date +%H:%M:%S)" >> $LOG
