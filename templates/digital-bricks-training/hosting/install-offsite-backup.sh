#!/usr/bin/env bash
# Install (or update) the off-box backup on nexus-1. Run from this directory:
#   K="-i ~/.ssh/nexus_hetzner -o BatchMode=yes"; BOX=root@49.12.102.195
#   scp $K offsite-backup.sh dbtraining-offsite-backup.service dbtraining-offsite-backup.timer \
#          backup-public-key.asc $BOX:/tmp/
#   ssh $K $BOX 'bash -s' < install-offsite-backup.sh
# /etc/dbtraining/backup.env (root, 0600) holds the bucket credentials and is written by hand,
# never from this repo; README.md "Off-box backups" lists its keys.
set -euo pipefail
[ -f /etc/dbtraining/backup.env ] || { echo "write /etc/dbtraining/backup.env first"; exit 1; }
install -d -m 755 /opt/dbtraining/ops
install -m 755 /tmp/offsite-backup.sh /opt/dbtraining/ops/offsite-backup.sh
install -m 644 /tmp/backup-public-key.asc /etc/dbtraining/backup-public-key.asc
install -m 644 /tmp/dbtraining-offsite-backup.service /etc/systemd/system/
install -m 644 /tmp/dbtraining-offsite-backup.timer /etc/systemd/system/
install -d -m 700 /var/backups/dbtraining
rm -f /tmp/offsite-backup.sh /tmp/backup-public-key.asc /tmp/dbtraining-offsite-backup.service /tmp/dbtraining-offsite-backup.timer
systemctl daemon-reload
systemctl enable --now dbtraining-offsite-backup.timer
systemctl list-timers dbtraining-offsite-backup.timer --no-pager
