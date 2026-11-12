#!/bin/zsh
# OWN-034, one DeepSeek round: the retry tap in front of ClinePass, then own-020/round-cline.mjs on §3's brief.
#   zsh round-d.sh <run-name> <scratch-dir> <cline-bin> <tap-port> [-- round-cline flags: --bare | --kit cline <tgz-dir>]
# The round's root sits in <scratch-dir> (round-cline refuses a folder inside a git repo); afterwards the record
# (journal, result, seal audit, tap log, the app) is copied to own-034/runs/<run-name>/. home/ is not copied.
set -u
HERE=${0:A:h}
NAME=$1 SCRATCH=$2 BIN=$3 PORT=$4
shift 4; [[ ${1:-} == -- ]] && shift
TGZ=-
if [[ ${1:-} == --kit ]]; then TGZ=$3; set -- --kit $2; fi
ROOT=$SCRATCH/$NAME
TAPDIR=$SCRATCH/$NAME-tap
OUT=$HERE/runs/$NAME
[[ -e $OUT ]] && { echo "$OUT exists"; exit 2; }
lsof -nP -iTCP:$PORT -sTCP:LISTEN && { echo "port $PORT is taken"; exit 2; }

nice -n 19 node $HERE/../own-020/stream-tap.mjs $PORT $TAPDIR --mode retry &
TAP=$!
sleep 1
T0=$(date +%s)
nice -n 19 node $HERE/../own-020/round-cline.mjs $ROOT $TGZ $HERE/brief.txt --model cline-pass/deepseek-v4.1-flash \
  --cline-bin $BIN --base-url http://127.0.0.1:$PORT/api/v1 "$@"
kill $TAP
echo "wall $(( $(date +%s) - T0 ))s"

mkdir -p $OUT
cp $ROOT/{agent.jsonl,agent.stderr,agent.exit,command.txt,seal-audit.txt,create.log} $OUT/ 2>/dev/null
cp $ROOT/run-result.json $OUT/ 2>/dev/null
cp -R $ROOT/work/apps $OUT/app
cp -R $TAPDIR $OUT/tap
gzip -9 $OUT/agent.jsonl # a kit round's journal is ~23 MB (d-kit-1); d-code-1's went in plain
cat $OUT/agent.exit; echo
