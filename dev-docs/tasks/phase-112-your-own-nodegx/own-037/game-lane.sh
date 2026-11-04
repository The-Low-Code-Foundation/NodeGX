#!/bin/bash
# AC3 turn 1: the game brief, word for word, one arm at a time (two builders at once could drive each other's server)
cd "$(dirname "$0")" || exit 1
for a in $1; do
  node turn.mjs game-$a $a msg/game.txt --continues 0 > game-$a-1.out 2>&1
done
