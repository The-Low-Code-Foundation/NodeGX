#!/usr/bin/env bash
# Install (or update) the off-box backup on nexus-1. Run from this directory:
#   K="-i ~/.ssh/nexus_hetzner -o BatchMode=yes"; BOX=root@49.12.102.195
#   scp $K offsite-backup.sh dbuniversity-offsite-backup.service dbuniversity-offsite-backup.timer \
#          backup-public-key.asc $BOX:/tmp/
#   ssh $K $BOX 'bash -s' < install-offsite-backup.sh
# /etc/dbuniversity/backup.env (root, 0600) holds the bucket credentials and is written by hand,
# never from this repo; README.md "Off-box backups" lists its keys.
set -euo pipefail
[ -f /etc/dbuniversity/backup.env ] || { echo "write /etc/dbuniversity/backup.env first"; exit 1; }
install -d -m 755 /opt/dbuniversity/ops
install -m 755 /tmp/offsite-backup.sh /opt/dbuniversity/ops/offsite-backup.sh
install -m 644 /tmp/backup-public-key.asc /etc/dbuniversity/backup-public-key.asc
install -m 644 /tmp/dbuniversity-offsite-backup.service /etc/systemd/system/
install -m 644 /tmp/dbuniversity-offsite-backup.timer /etc/systemd/system/
install -d -m 700 /var/backups/dbuniversity
rm -f /tmp/offsite-backup.sh /tmp/backup-public-key.asc /tmp/dbuniversity-offsite-backup.service /tmp/dbuniversity-offsite-backup.timer
systemctl daemon-reload
systemctl enable --now dbuniversity-offsite-backup.timer
systemctl list-timers dbuniversity-offsite-backup.timer --no-pager
