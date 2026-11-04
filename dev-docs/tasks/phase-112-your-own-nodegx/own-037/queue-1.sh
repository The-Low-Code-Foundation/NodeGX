#!/bin/bash
# one builder at a time: wait for game-cb turn 1, then vb turn 2 (Richard's answers), then va and ca turn 1
cd "$(dirname "$0")" || exit 1
until grep -q " game-cb cb game.txt exit" turns.log; do sleep 20; done
node turn.mjs game-vb vb msg/vb-2.txt --reply --continues 2 > game-vb-2.out 2>&1
for a in va ca; do node turn.mjs game-$a $a msg/game.txt --continues 0 > game-$a-1.out 2>&1; done
