#!/bin/zsh
# OWN-029 — the runs, one after another (Ollama + Chrome is the one heavy job on this box).
#   ./series.sh A        the agent on every brief, 4 repair rounds
#   ./series.sh R        the control: random decisions, the model's words, no review
#   ./series.sh L        learned rules (run learn.mjs first) on three briefs
#   ./series.sh N        copy best-of-3 on three briefs
#   ./series.sh V        v3: one copy call per section + the contradiction critic, every brief
#   ./series.sh Q        v4: V + the quality term, quotes ≤2, colour from mood words
#   ./series.sh P        paired: A's round-0 decisions, words per line (P1) vs one call per section (P2)
#   ./series.sh R4       the control again, scored with v4's quality term
#   ./series.sh S2       s2 (the winners are the default): per brief a fresh round-0 source S0, then paired from it,
#                        interleaved, twice each: K = accept by constraint (default), W = accept by the s1 sum
cd "${0:A:h}"
LOG=runs/series-$1.log
mkdir -p runs
for b in puppy bakery running jazz pottery plumber; do
  case $1 in
    A) node agent.mjs --brief $b --run A-$b --rounds 4 ;;
    R) node agent.mjs --brief $b --run R-$b --no-review --random-decisions ;;
    L) [[ $b == (bakery|jazz|plumber) ]] && node agent.mjs --brief $b --run L-$b --rounds 4 --section-copy --contradict --learned ;;
    N) [[ $b == (puppy|running|pottery) ]] && node agent.mjs --brief $b --run N-$b --rounds 4 --copy-n 3 ;;
    V) node agent.mjs --brief $b --run V-$b --rounds 4 --section-copy --contradict ;;
    P) src=A2-$b; [[ -d runs/$src ]] || src=A-$b
       node agent.mjs --brief $b --run P1-$b --no-review --decisions-from $src
       node agent.mjs --brief $b --run P2-$b --no-review --decisions-from $src --section-copy ;;
    Q) node agent.mjs --brief $b --run Q-$b --rounds 4 --section-copy --contradict --v4 ;;
    R4) node agent.mjs --brief $b --run R4-$b --no-review --random-decisions --section-copy --contradict --v4 ;;
    S2) node agent.mjs --brief $b --run S0-$b --no-review
        for k in 1 2; do
          node agent.mjs --brief $b --run K$k-$b --rounds 4 --decisions-from S0-$b; echo "K$k $b exit $?"
          node agent.mjs --brief $b --run W$k-$b --rounds 4 --decisions-from S0-$b --accept sum; echo "W$k $b exit $?"
        done ;;
  esac >> $LOG 2>&1
  echo "$1 $b exit $?" >> $LOG
done
# the one heavy job ends by giving the memory back
for m in gemma4:e2b-it-qat gemma4:e4b-it-qat; do curl -s http://127.0.0.1:11434/api/generate -d "{\"model\":\"$m\",\"keep_alive\":0}" > /dev/null; done
echo "series $1 done" >> $LOG
