#!/usr/bin/env bash
#
# THE NIGHTLY OFF-BOX COPY (sprint 53 §3.4, answered (a); built 2026-10-01).
#
# NodeGX takes its own backup at 03:15 UTC into <data dir>/backups and keeps seven. Those sit
# on the same disk as the database, so they survive "somebody broke a row" and not "the box
# is gone" — and nexus-1 also serves nodegx.io, the todo list and digitalbricks.io. This
# script takes the NEWEST NodeGX archive, PROVES it, encrypts it to Richard's backup key and
# puts it in the training-digitalbricks bucket (Hetzner Object Storage, nbg1), then READS IT
# BACK and prunes the bucket. It is the nodegx-community backup's shape on this box
# (/opt/nodegx-community/ops/backup.sh), adapted to a SQLite backend that already makes its
# own archive.
#
# 🔴 THE KEY IS ASYMMETRIC, AND THE SERVER CANNOT READ ITS OWN BACKUPS. Only the PUBLIC half
# of "Anchor DB backups" (DBEFAE89…34380CC, the L66 key) is on this box. The private half is
# in Richard's password manager and his laptop keyring. A passphrase (what the community
# backup uses) would have to live on the server, next to the thing it protects.
#
# 🔴 WHAT GOES UP IS MORE THAN THE NODEGX ARCHIVE. NodeGX's archive leaves out secrets.json
# (includesSecrets: false) and auth.json. A restore without them loses UNSUBSCRIBE_KEY — so
# every unsubscribe link already in somebody's inbox stops working (the product's L54 rule:
# an opt-out link must never stop working) — and the sign-in configuration. So the upload is
# one tar holding the archive plus those two files, encrypted as one. They are encrypted to
# the same key that protects every learner's data; there is no weaker copy anywhere.
#
# 🔴 THE BUCKET IS PRUNED AT SEVEN DAYS AND THAT IS A PROMISE, NOT A SETTING. The privacy
# notice says a deleted account is gone from the nightly copies "within seven days". So the
# prune age is a CONSTANT here, not an env value somebody can raise, and a prune that fails
# fails the unit. tools/check-privacy.mjs reads OFFSITE_PRUNE_AGE out of this file.
#
# Config: /etc/dbtraining/backup.env (root, 0600). Run by dbtraining-offsite-backup.service.

set -uo pipefail

OFFSITE_PRUNE_AGE="156h"    # 6½ days, in hours: rclone 1.60 on nexus-1 rejects "6d12h". The run after a copy turns 6½ days old deletes it, so none outlives seven days.

NODEGX_BACKUP_DIR="${NODEGX_BACKUP_DIR:-/var/lib/dbtraining/data/backups}"
DATA_DIR="${DATA_DIR:-/var/lib/dbtraining/data}"
STAGING_DIR="${STAGING_DIR:-/var/backups/dbtraining}"
OFFSITE_BUCKET="${OFFSITE_BUCKET:-}"
OFFSITE_PREFIX="${OFFSITE_PREFIX:-dbtraining}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
GPG_RECIPIENT="${GPG_RECIPIENT:-}"
KEY_FILE="${KEY_FILE:-/etc/dbtraining/backup-public-key.asc}"
STATUS_FILE="${STAGING_DIR}/last-offsite.json"

say() { echo "[offsite] $*"; }

# Written on EVERY outcome, failure included: the question asked of it is "when did a copy
# last actually leave this box", and a file that only exists after a success answers that
# with silence.
write_status() {  # write_status <state> <detail>
  printf '{"state":"%s","at":"%s","source":"%s","object":"%s","bytes":%s,"detail":"%s"}\n' \
    "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${SRC_NAME:-}" "${OBJECT:-}" "${UP_BYTES:-0}" \
    "${2//\"/\'}" > "$STATUS_FILE" 2>/dev/null || true
  chmod 644 "$STATUS_FILE" 2>/dev/null || true
}
die() { say "FAILED: $*"; write_status "failed" "$*"; rm -rf "${WORK:-}"; exit 1; }

mkdir -p "$STAGING_DIR" && chmod 700 "$STAGING_DIR" || die "cannot create $STAGING_DIR"
[ -n "$OFFSITE_BUCKET" ] || die "OFFSITE_BUCKET is not set — there is nowhere off this box to put a copy"
[ -n "$GPG_RECIPIENT" ] || die "GPG_RECIPIENT is not set"
[ -r "$KEY_FILE" ] || die "no public key at $KEY_FILE"
for c in gpg rclone python3 tar sha256sum; do command -v "$c" >/dev/null || die "$c is not installed"; done

WORK="$(mktemp -d)"; chmod 700 "$WORK"

# ⚠️ HETZNER'S STORE CAN ANSWER 403 TO A VALID KEY, INTERMITTENTLY. Measured 2026-10-01 on the
# day the bucket and its key were made: ~25% of PUT, LIST and HEAD requests refused, while the
# community backup's older key on the same endpoint answered 30 of 30. A 403 is not retried at
# rclone's low level, so every remote call here retries at the top level with a pause, and the
# read-back loops. A key that is truly wrong still fails every attempt, and the unit fails.
RETRY="--retries 8 --retries-sleep 15s"

# ── the newest NodeGX archive, and it must be from last night ────────────────
SRC="$(ls -1t "$NODEGX_BACKUP_DIR"/backup-*.ngxbackup.tar.gz 2>/dev/null | head -1)"
[ -n "$SRC" ] || die "no NodeGX backup in $NODEGX_BACKUP_DIR"
SRC_NAME="${SRC##*/}"
AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$SRC") ) / 3600 ))
# ⚠️ Uploading an old archive again would read as a green night while the backend's own
# schedule has stopped. That is the failure this check exists for.
[ "$AGE_H" -le "$MAX_AGE_HOURS" ] \
  || die "newest NodeGX backup ($SRC_NAME) is ${AGE_H}h old — the backend's own nightly backup did not run"

# ── prove it: every entry's sha256 against the manifest, the database's integrity, and a
#    table for every collection the archive's own schema names ─────────────────────────
mkdir "$WORK/x"
tar -xzf "$SRC" -C "$WORK/x" 2>"$WORK/tar.err" || die "cannot unpack $SRC_NAME: $(head -c 200 "$WORK/tar.err")"
python3 - "$WORK/x" <<'PY' >"$WORK/prove.out" 2>&1 || die "archive is not sound: $(tr '\n' ' ' < "$WORK/prove.out" | head -c 300)"
import hashlib, json, sqlite3, sys
root = sys.argv[1]
m = json.load(open(f"{root}/manifest.json"))
assert m.get("format") == "nodegx-backup", "not a nodegx-backup manifest"
for e in m["entries"]:
    h = hashlib.sha256(open(f"{root}/{e['name']}", "rb").read()).hexdigest()
    assert h == e["sha256"], f"{e['name']} does not match its manifest hash"
db = sqlite3.connect(f"file:{root}/{m['dbEntry']}?mode=ro", uri=True)
ok = db.execute("pragma integrity_check").fetchone()[0]
assert ok == "ok", f"integrity_check: {ok}"
tables = {r[0] for r in db.execute("select name from sqlite_master where type='table'")}
schema = json.load(open(f"{root}/config/schema.json"))
names = [c.get("name") or c.get("className") for c in schema]
missing = [n for n in names if n and n not in tables]
assert not missing, f"collections with no table: {missing}"
print(f"{len(m['entries'])} entries hashed, integrity ok, {len(names)} collections present")
PY
say "proved $SRC_NAME: $(cat "$WORK/prove.out")"
rm -rf "$WORK/x"   # the plaintext database does not outlive the proof

# ── bundle with the two files the archive leaves out, and encrypt ───────────
BASE="dbtraining-${SRC_NAME%.ngxbackup.tar.gz}"
mkdir "$WORK/b"
cp "$SRC" "$WORK/b/"
for f in secrets.json auth.json; do
  [ -r "$DATA_DIR/$f" ] || die "cannot read $DATA_DIR/$f"
  cp "$DATA_DIR/$f" "$WORK/b/$f"
done
tar -cf "$WORK/$BASE.tar" -C "$WORK/b" . || die "cannot bundle"
rm -rf "$WORK/b"

export GNUPGHOME="$WORK/gnupg"; mkdir -m 700 "$GNUPGHOME"
gpg --batch --quiet --import "$KEY_FILE" 2>"$WORK/gpg.err" || die "cannot import the public key: $(head -c 200 "$WORK/gpg.err")"
# The key file and the recipient must agree, or a swapped key file encrypts to a stranger.
gpg --batch --with-colons --fingerprint "$GPG_RECIPIENT" 2>/dev/null | grep -q "^fpr:::::::::${GPG_RECIPIENT}:" \
  || die "the key in $KEY_FILE is not $GPG_RECIPIENT"
gpg --batch --yes --quiet --trust-model always --encrypt --recipient "$GPG_RECIPIENT" \
    --output "$STAGING_DIR/$BASE.tar.gpg" "$WORK/$BASE.tar" 2>"$WORK/gpg.err" \
  || die "gpg: $(head -c 200 "$WORK/gpg.err")"
rm -f "$WORK/$BASE.tar"
UP="$STAGING_DIR/$BASE.tar.gpg"

# ── upload, then READ IT BACK — the exit code is not evidence ───────────────
OBJECT="${OFFSITE_BUCKET}/${OFFSITE_PREFIX}/${BASE}.tar.gpg"
REMOTE="offsite:${OBJECT}"
rclone copyto "$UP" "$REMOTE" --s3-no-check-bucket $RETRY 2>"$WORK/rclone.err" \
  || die "upload: $(grep -v NOTICE "$WORK/rclone.err" | tr '\n' ' ' | head -c 300)"
UP_BYTES="$(stat -c %s "$UP")"
RJ=""
for _ in 1 2 3 4 5 6 7 8; do
  RJ="$(rclone lsjson --hash "$REMOTE" 2>/dev/null || true)"
  printf '%s' "$RJ" | grep -q '"Size"' && break
  sleep 15
done
RB="$(printf '%s' "$RJ" | sed -n 's/.*"Size":\([0-9]*\).*/\1/p' | head -1)"
[ "$RB" = "$UP_BYTES" ] || die "remote object is ${RB:-unreadable} bytes, local is ${UP_BYTES}"
RM="$(printf '%s' "$RJ" | sed -n 's/.*"md5":"\([0-9a-f]*\)".*/\1/p' | head -1)"
if [ -n "$RM" ]; then
  [ "$RM" = "$(md5sum "$UP" | cut -d' ' -f1)" ] || die "remote md5 $RM does not match the upload"
  say "uploaded and read back: $OBJECT, ${RB} bytes, md5 $RM"
else
  say "uploaded and read back: $OBJECT, ${RB} bytes (store returned no md5; size only)"
fi
rm -f "$UP"

# ── prune the bucket: this is what keeps the notice's seven days true ────────
rclone delete "offsite:${OFFSITE_BUCKET}/${OFFSITE_PREFIX}" --min-age "$OFFSITE_PRUNE_AGE" $RETRY 2>"$WORK/prune.err" \
  || { write_status "ok-prune-failed" "uploaded, but the prune failed: $(grep -v NOTICE "$WORK/prune.err" | head -c 200)"
       say "FAILED: uploaded, but the bucket prune failed — copies may outlive seven days"; rm -rf "$WORK"; exit 1; }
find "$STAGING_DIR" -name 'dbtraining-*.tar.gpg' -mmin +120 -delete 2>/dev/null || true

rm -rf "$WORK"
write_status "ok" ""
say "done"
