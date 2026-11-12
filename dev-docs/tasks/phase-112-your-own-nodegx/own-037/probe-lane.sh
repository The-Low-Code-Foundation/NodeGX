#!/bin/bash
# AC1: the probe, two turns per arm; lane = "va vb" or "ca cb"
cd "$(dirname "$0")" || exit 1
for a in $1; do
  node turn.mjs probe-$a $a msg/probe-1.txt --timeout-min 15 > probe-$a.out 2>&1
  node turn.mjs probe-$a $a msg/probe-2.txt --reply --timeout-min 10 >> probe-$a.out 2>&1
done
