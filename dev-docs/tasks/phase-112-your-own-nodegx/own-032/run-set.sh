#!/bin/zsh
# OWN-032 s4 — run-set.sh <prefix> <edit.json> m-bakery s-jazz …  — arm.mjs one request at a time (waits for an empty
# Ollama before each), on the s3/s4 requests: a calm (m-) and a bold (s-) one per brief. Log: runs/arm-<run>.log
cd /Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-112-your-own-nodegx/own-032
P=$1; E=$2; shift 2
B="$HOME/vscode_projects/NodeGX test projects"
typeset -A REQ
REQ[m-bakery]="A simple, calm page for Maison Levain, our family bakery in Lyon. Lots of white space."
REQ[s-bakery]="Something bold and stylish for Maison Levain, our bakery in Lyon. Make it stand out."
REQ[m-jazz]="A clean, quiet page for The Blue Room's jazz evening on 14 November."
REQ[s-jazz]="The Blue Room, a jazz evening on 14 November. Dark, moody and glamorous."
REQ[m-plumber]="A plain, uncluttered page for Dupont Plumbing."
REQ[s-plumber]="Dupont Plumbing: make it look cool and confident, with strong colours."
REQ[m-running]="A calm, simple page for Park Runners, our Saturday morning running club in the park."
REQ[s-running]="Park Runners, our Saturday morning running club in the park. Make it bold, punchy and full of energy."
REQ[m-pottery]="A quiet, minimal page for Potter Portfolio: handmade bowls and weekend pottery classes. Lots of white space."
REQ[s-pottery]="Potter Portfolio: handmade bowls and weekend classes. Something striking and stylish, with a dark background."
# s6 (11a): a calm puppy control, and the three warm requests
REQ[m-puppy]="A simple, calm page for Puppy Haven, a puppy adoption site. Lots of white space."
REQ[w-bakery]="A warm, friendly page for Maison Levain, our family bakery in Lyon. Soft and welcoming."
REQ[w-pottery]="A warm, gentle page for Potter Portfolio: handmade bowls and weekend pottery classes. Soft and welcoming."
REQ[w-puppy]="A warm, friendly page for Puppy Haven, where families adopt puppies. Soft and welcoming."
# s8 (13e): a plain request (13d's, word for word) and a warm one with no look word, for lookD's `--style auto`
REQ[p-puppy]="A page for my dental surgery."
REQ[k-puppy]="A page for Puppy Haven that feels like a hug, where families adopt puppies."
for k in "$@"; do
  brief=${k#*-}
  while [ -n "$(ollama ps | tail -n +2)" ]; do sleep 20; done
  nice -n 10 node arm.mjs --run "$P${k%%-*}-$brief" --brief "$brief" --turns 40 --look script --bench "$B/own-032-bench-$brief" --edit "$E" ${=EXTRA} --request "${REQ[$k]}" > "runs/arm-$P${k%%-*}-$brief.log" 2>&1
  echo "$P${k%%-*}-$brief exit $?: $(tail -1 runs/arm-$P${k%%-*}-$brief.log | cut -c1-200)"
done
