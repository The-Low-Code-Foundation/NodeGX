# PRD-005 — Secrets are provisioned, never invented

**Status: ✅ Built and gated, s1 (2026-09-19). AC1–AC6 green.**

## 1. The person sentence

**A deploy that is missing its credentials stops and says which one — instead of inventing a fresh
secret, coming up healthy, and locking you out of your own data later.**

## 2. Why this is here

This is the **most-reported scaling failure in the n8n ecosystem**, and it is not architectural.
`N8N_ENCRYPTION_KEY` is auto-generated on first run and written to a settings file; a second process
then either cannot decrypt stored credentials or refuses to start with *"Mismatching encryption
keys"*. Their docs now say the key *"must be shared with all worker and webhook processor nodes"*.
Community threads on it are numerous and the fix is always archaeology — *which* file, reconciled
against *which* variable.

**NodeGX has the same shape.** `--token` provisions the admin credential and *"one is generated if
you don't pass `--token`"*; `secrets.json` (mode 0600) holds it plus SMTP, S3 and webhook secrets,
written whole-file with an atomic rename (`config/SecretsStore.ts:78`).

Today that is **fine and convenient** — one process, one data directory, and generating a token for
a local dev backend is exactly right. It stops being fine the first time a deploy is rebuilt from
config, or a container starts with an empty volume, or a second process appears. **The cheap moment
to fix it is before any of those, not during.**

## 3. Design

### 3.1 A production stance, not a behaviour change

Generation stays the default for local development — removing it would make the dev experience worse
to solve a production problem, which is the wrong trade.

Add an explicit stance a deploy can take: **secrets must be provided; refuse to start if one is
missing.** A flag, or an ops setting, or implied by a non-loopback bind — that choice is the task's
one real decision. The backend already refuses to bind non-loopback with `devOpen` on, so the
precedent and the machinery both exist.

### 3.2 Read from the environment

A deploy should be able to supply secrets without writing them into a file that lands in an image or
a volume snapshot. Environment variables (or a file path per secret, the `_FILE` convention n8n
uses — **and which has its own open bugs**, so read those before copying it) let a secret manager own
the value.

### 3.3 🔴 Say which secret, and what to do

n8n's mismatch error is *correct* and still costs people hours, because it does not name which file
to reconcile against which variable. A refusal here must name **the secret, where it looked, and the
one command that fixes it.** That sentence is the entire value of this task; everything else is
plumbing.

### 3.4 Report provenance

`/admin/status` should say, per secret, whether it was **provisioned** or **generated**. An operator
who cannot tell has no way to audit a fleet, and "it works on this box" is how the n8n failures
start.

## 4. Acceptance criteria

1. With the production stance on, a missing required secret **refuses to start** and names it.
2. The refusal names where it looked and how to supply it.
3. Secrets can be supplied by environment variable without touching `secrets.json`.
4. Default (development) behaviour is **unchanged** — generation still happens, still convenient.
5. `/admin/status` reports provisioned-vs-generated per secret, and never the values.
6. An existing deploy with a populated `secrets.json` keeps working untouched.

## 5. Tests

- Production stance, empty data directory, no environment: refuses, and the message names the secret.
- Production stance, secret in the environment: starts, and reports it as provisioned.
- Default stance, empty data directory: starts and generates, as today.
- `/admin/status` never returns a secret value — extend the existing `hasClientSecret` pattern.

## 6. Out of scope

- Rotation. Real, larger, and wants the multi-process story settled first.
- Integrating a specific secret manager. Environment variables are the interface every one of them
  already speaks.
- Sharing secrets **across** processes — that is the study's stage 2, and this task is the
  precondition rather than the solution.

## 7. Session 1 (2026-09-19) — what was built

### 7.1 The one real decision (§3.1): an explicit flag, not implied by the bind

`--require-secrets`, or `NODEGX_REQUIRE_SECRETS=1` for a container that cannot edit its command.
**Not** implied by a non-loopback bind: today a non-loopback start without `--token` mints, the
Compose entrypoint relies on that (*"the backend will mint one on first start"*), and flipping it
silently would be the accept-and-change behaviour this model bans. Instead the CLI prints a
one-time warning on a non-loopback bind with a minted credential, naming the flag.

### 7.2 The set of secrets, and the reader

Two secrets are minted today and are what the stance covers: `adminToken` (`security/state.ts`)
and `files.signingSecret` (`storage/FileSubsystem.ts` — minted **on first signed URL**, now settled
at startup by `verifyProvisionedSecrets()` so the refusal happens before the port opens, not on a
request a week later). Everything else in `secrets.json` is provisioned-only by nature.

`config/provisioned-secrets.ts` is the one reader: `NODEGX_ADMIN_TOKEN`, `NODEGX_READONLY_TOKEN`,
`NODEGX_FILES_SIGNING_SECRET`, each with the `_FILE` form winning — the convention
`deploy/entrypoint.sh` already speaks and translates to `--token`; the service now reads it
directly so systemd/Kubernetes deploys get the same door. **A value from the environment is never
written to `secrets.json`** (AC3 — the point of supplying it from the environment); `--token`
keeps its persisting behaviour. Precedence: flag → environment → file → mint-or-refuse.

### 7.3 The refusal (§3.3) and the provenance (§3.4)

`describeMissingSecret()` names the secret, its purpose, **every place it looked in order**, and a
working command — and nothing is minted on the way to refusing (asserted: `secrets.json` has no
`adminToken` after the refusal). `GET /admin/status` — and only it, not public `/health` — reports
`secrets.stance` and per secret `{ source: cli|env|env-file|file|generated|absent, persisted }`.
Never a value; every spec asserts the planted values are absent from the response text.

### 7.4 The tests (`tests/prd-005-secrets-provisioned.test.ts`, 11 specs)

Refusal naming everything and minting nothing; the second secret named when only the first is
given; unreadable `_FILE` refuses under either stance; env is the credential, provisioned,
persisted nowhere; `_FILE` wins and trims; env wins over a stale file value without rewriting it;
read-only from env; default stance mints and says `generated`; an existing `secrets.json`
satisfies the stance byte-for-byte untouched; the switch; the reader.
