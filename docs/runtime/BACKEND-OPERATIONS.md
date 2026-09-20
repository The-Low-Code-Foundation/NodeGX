# Running a NodeGX backend in production

This is the operator's page: logs, limits, metrics, the audit trail, shutdown
behaviour, and the reverse proxy that puts TLS in front of it. If you are
deploying for the first time, start with [Self-hosting](./SELF-HOSTING.md) —
this page is what you read afterwards, and when something is wrong.

Everything here is **single-process** by design. In-memory rate limits, local
log files, one process's metrics. There is no Redis, no log shipper, no APM
agent: your reverse proxy, `journald`/`docker logs`, and your Prometheus do the
fleet-grade parts, and they do them better than a backend service would.

---

## The one config file

Operational settings live in `ops.json`, beside `security.json` in the
backend's data directory. It is written with working defaults on first run, so
there is always something to edit:

```jsonc
{
  "version": 1,
  "logging":   { "level": "info", "format": "auto", "requests": true },
  "rateLimit": {
    "enabled": true,
    "trustedProxies": ["loopback"],
    "policies": {
      "auth":      { "ratePerMinute": 60,   "burst": 30 },
      "admin":     { "ratePerMinute": 300,  "burst": 100 },
      "data":      { "ratePerMinute": 1200, "burst": 400 },
      "files":     { "ratePerMinute": 300,  "burst": 100 },
      "hooks":     { "ratePerMinute": 300,  "burst": 150 },
      "functions": { "ratePerMinute": 600,  "burst": 200 },
      "realtime":  { "ratePerMinute": 0,    "burst": 0 },
      "public":    { "ratePerMinute": 600,  "burst": 200 }
    },
    "realtimeMaxConnections": 500
  },
  "cors":    { "origins": ["*"], "credentials": false },
  "audit":   { "enabled": true, "retentionDays": 90 },
  "executions": {
    "retentionDays": 30, "idempotencyTtlHours": 24,
    "maxCount": 10000, "maxValueBytes": 51200, "maxRunBytes": 8388608
  },
  "queries": { "defaultLimit": 1000, "maxLimit": 10000 },
  "metrics": { "enabled": true, "allowLoopback": true }
}
```

**Unknown keys are errors, not warnings.** A backend refuses to start on an
invalid `ops.json` rather than running a configuration that is not what the
file says. That is deliberate: a setting that is accepted and quietly ignored
is worse than one that is rejected.

You can also read and patch it over HTTP — `GET /admin/ops`, `PUT /admin/ops`
with any subset of the sections — or from an agent with the
`get_backend_ops_config` MCP tool. A patch touching one field leaves its
neighbours alone, and the merged document is validated before anything is
written.

---

## Logs

One structured line per request on stdout, plus application events:

```json
{"ts":"2026-07-26T20:49:03.342Z","level":"info","event":"request","requestId":"ef39…",
 "method":"GET","route":"health","path":"/health","status":200,"durationMs":15,
 "principal":"anonymous","ip":"172.17.0.1"}
```

`ts`, `level` and `event` come first on every line, so `jq` and `grep` both
work. `route` is the low-cardinality pattern (`api/:table`) for grouping;
`path` is what was actually requested.

* **`principal` is a KIND, never a credential** — `anonymous`, `user`,
  `apiKey`, `admin`, `admin:readonly`. Tokens, passwords, session and API keys
  are redacted everywhere by a single rule shared with the execution history,
  and a test plants a secret in every real config shape to prove it.
* **`format: "auto"`** is pretty on a TTY and JSON everywhere else (systemd,
  Docker, the editor's supervisor) — the cases where something downstream wants
  to parse it.
* **`NODEGX_LOG_LEVEL` and `NODEGX_LOG_FORMAT` beat `ops.json`.** That is how
  you turn up detail on a misbehaving service without editing a file inside a
  container:

  ```bash
  docker compose run -e NODEGX_LOG_LEVEL=debug backend
  ```

Collecting them:

| Setup | Command |
|---|---|
| systemd | `journalctl -u nodegx-backend -f` |
| Docker Compose | `docker compose logs -f backend` |
| Only the errors | `journalctl -u nodegx-backend -o cat \| jq 'select(.level=="error")'` |
| Slowest requests | `… \| jq -c 'select(.event=="request" and .durationMs > 500)'` |

### Request ids

Every request gets an `X-Request-Id` — echoed from the caller if they sent a
short, boring one, minted otherwise. It appears in the access log, in error
response bodies, in audit entries, and in the execution record of any function,
webhook or workflow the request started. A user reporting an error only has to
send you that id:

```bash
journalctl -u nodegx-backend -o cat | jq 'select(.requestId=="ef39…")'
curl -s "$BACKEND/executions" -H "authorization: Bearer $ADMIN_TOKEN" \
  | jq '.executions[] | select(.metadata.requestId=="ef39…")'
```

---

## Rate limits

Token buckets, per route class, keyed by principal (an authenticated caller
gets its own bucket) or by client address for anonymous traffic. Over the
limit is `429` with `Retry-After` and a message naming the class and its
budget.

`ratePerMinute` is the sustained rate; `burst` is how big a spike is absorbed.
Setting `burst: 0` makes a class unlimited.

**Which class is a route in?** `auth` covers the routes where a credential is
presented — `/login`, signup, password reset, verify, and the `/_admin` login
page. `users/me` and `logout` are ordinary app traffic and use the `data`
budget. Admin routes are `admin`, webhooks are `hooks`, `/functions/…` is
`functions`, files are `files`, everything else is `public`. `GET /admin/ops`
tells you the live numbers.

`auth` is deliberately not set as low as one human's rate: fifty people behind
one office NAT signing in at 9am is one address making fifty auth requests a
minute. Online credential *guessing* is bounded by a separate control — ten
wrong credentials from one client in five minutes locks that client out for the
rest of the window — and the account-mail endpoints carry much stricter budgets
of their own (5 password-reset requests per 15 minutes).

**Realtime is capped by connection COUNT, not rate.** One SSE stream is a
single very long request, so counting requests would measure nothing while
breaking reconnect storms. `realtimeMaxConnections` bounds what is actually
finite; at the cap a new stream is refused with `503` + `Retry-After` before
any stream headers are written.

### Behind a proxy

`trustedProxies` decides whose `X-Forwarded-For` is believed:

| Value | Meaning |
|---|---|
| `["loopback"]` (default) | A reverse proxy on the same machine. Correct for the Caddy and nginx examples below. |
| `["private"]` | Also RFC1918 / container networks — use this when the proxy is a separate container or host. Note it includes loopback. |
| `["10.0.0.8"]` | Exactly that proxy. |
| `[]` | Never believe the header. |
| `["*"]` | Always. Only sane when something upstream strips and re-sets it — the backend warns about this on a public bind. |

The header is read **right to left**: a proxy appends the peer it saw, so the
rightmost untrusted hop is the real client. A client sending its own
`X-Forwarded-For: 9.9.9.9` does not get a fresh rate-limit bucket or a forged
audit origin. (Verified live — see the checklist at the end.)

Get this wrong and every request is attributed to the proxy: one shared bucket
for the whole internet, and an audit trail whose origin column always says the
same thing.

---

## Metrics

`GET /metrics`, Prometheus text format, admin credential **or** loopback (with
`metrics.allowLoopback`, the default — that is the usual same-host scrape).
The format is the product: no dashboards ship with it.

```yaml
# prometheus.yml
scrape_configs:
  - job_name: nodegx
    static_configs:
      - targets: ['127.0.0.1:8577']
```

| Series | What it tells you |
|---|---|
| `nodegx_requests_total{class,method,status}` | Traffic and error rates by route class |
| `nodegx_request_duration_seconds{class}` | Latency histogram — the `_bucket` series feed `histogram_quantile` |
| `nodegx_ratelimit_refusals_total{class}` | Whether your limits are biting real users |
| `nodegx_realtime_connections` | Open SSE streams (against `realtimeMaxConnections`) |
| `nodegx_trigger_fires_total{type,outcome}` | Cron/webhook/db-change automation health |
| `nodegx_emails_sent_total{outcome}` | Mail actually leaving |
| `nodegx_backup_age_seconds` | Seconds since the last successful backup |
| `nodegx_db_file_bytes` | Database growth (`local.db`) |
| `nodegx_executions_db_file_bytes` | Execution history growth — what `executions.retentionDays` / `maxCount` bound, and what compaction gives back |
| `nodegx_uptime_seconds`, `process_*`, `nodejs_heap_used_bytes` | Restarts and memory |

**`nodegx_backup_age_seconds` is absent, not zero, until a backup succeeds.**
An absent series is a louder alert than a `0`, which would read as "backed up
just now". Alert on `absent()` as well as on the age:

```yaml
- alert: NodeGXBackupsStopped
  expr: absent(nodegx_backup_age_seconds) or nodegx_backup_age_seconds > 172800
  for: 1h
```

Labels are route CLASS and never path — a path label would mean one series per
collection per status per method, and a metrics endpoint that costs more than
the service is one that gets turned off.

---

## The audit trail

Privileged actions are recorded in an `_Audit` table: permission and role
edits, API keys issued and revoked, schema changes, backups and restores,
config edits, and admin logins including the failures. Each entry has the
actor, the origin address, the outcome (a *refused* change is recorded as a
failure, not as nothing), and the request id that ties it to the access log.

Read it in the dashboard under **Ops → Audit**, over HTTP:

```bash
curl -s "$BACKEND/admin/audit?action=permissions.collection.update" \
  -H "authorization: Bearer $ADMIN_TOKEN" | jq '.entries[0]'
```

or with the `query_backend_audit` MCP tool. `GET /admin/audit` also returns the
full list of action names, so a filter can never drift from the code.

Entries are written by the request dispatcher from a declared action per route,
not by individual handlers — a handler cannot forget, and a CI test fails any
new privileged route that is neither declared nor explicitly exempted.

**The honest limit:** this is a plain table in the backend's own database.
Anyone who can reach that file can edit it. There is no hash chain and no
append-only pretence, because a tamper-proofing story that `rm` defeats invites
trust it cannot carry. If you need a copy an attacker on that machine cannot
rewrite, ship the structured logs off-box: every audited action also produces a
log line carrying the same request id.

Retention is `audit.retentionDays` (90 by default; `0` keeps everything), and
pruning runs at startup and hourly. Entries are included in
[backups](./BACKEND-SERVICES.md) like any other collection.

---

## Execution history: bounded, pruned, and the disk given back

Every function and workflow run is recorded in `<dataDir>/executions.sqlite`.
Three things keep that file from becoming the outage — each one taken from an
incident somebody else had — and all three ship **on**:

**A run's record is bounded by bytes, not just by count.** One value (a step's
input, a trigger body, a `Log` node's argument) is kept whole up to
`executions.maxValueBytes` (50KB); a larger one is replaced by a marker that
names its original size and keeps a 1,000-character preview. The whole run's
record is bounded by `executions.maxRunBytes` (8MB); once reached, further
values are omitted with a marker and the run **still completes** — this bounds
the record, never the execution. A run that hit either bound is stamped
`metadata.recordCapped` and is findable without reading the source:

```bash
curl -s "$BACKEND/executions?capped=true" -H "authorization: Bearer $ADMIN_TOKEN" \
  | jq '.[] | {workflowId, startedAt, capped: .metadata.recordCapped}'
```

Both bounds are applied **after** secret scrubbing, so a credential can never be
cut in half and escape the match.

**Pruning is by age and by count, and says which one fired.** `retentionDays`
(30) removes old runs; `maxCount` (10,000) removes the oldest beyond that many,
whatever their age — a misfiring workflow can write a month's volume in an hour
and every row is younger than the window. `0` disables either. Each prune logs
`executions.pruned` with `byAge`, `byCount` and `boundBy`, and the same report
is on `GET /admin/status` under `executions.lastPrune`, because two retention
limits interacting invisibly is its own support thread.

**Pruning gives the disk back.** A backend created from this version onward
makes `executions.sqlite` with SQLite's incremental vacuum, and each prune that
removed rows is followed by a bounded, yielding reclaim — many short write
locks, never one long one. `nodegx_executions_db_file_bytes` visibly moves. A
file created **before** this version cannot be converted without one full
rewrite, so that is left to you: `GET /admin/status` reports
`executions.compaction.manual: true` with the reason, and

```bash
curl -s -X POST "$BACKEND/admin/executions/compact" -H "authorization: Bearer $ADMIN_TOKEN"
```

rewrites the file once under a write lock (seconds per GB), converts it, and
answers with `beforeBytes`, `afterBytes` and `durationMs`. After that, every
prune reclaims on its own. Nothing runs that rewrite automatically.

---

## No query returns everything

A query that forgot its filter used to return the whole table. Nothing in the
backend was broken for that to happen: a cloud function builds a filter from an
optional value, omits the key when the value is missing, and an empty filter
with no limit is `SELECT * FROM table`. Four hundred thousand rows come back
through one process, and the process is what you lose.

Two numbers bound it, and they answer two different questions:

| `ops.json` | default | what it bounds |
|---|---|---|
| `queries.defaultLimit` | `1000` | the rows a caller gets when it supplied **no** `limit` — the accident |
| `queries.maxLimit` | `10000` | the ceiling on a caller that **did** supply one — the deliberate case |

A request above the ceiling is **clamped, never refused**: an export-shaped
client asking for everything gets ten thousand rows and a 200, not an error it
has no path for.

**A capped result says so.** Silent truncation is worse than an error, because
a list that looks complete is believed. Every capped response carries two
headers, on the Parse routes and the BYOB `/api/*` routes alike:

```
X-NodeGX-Result-Capped: true
X-NodeGX-Result-Limit: 1000
```

They are headers rather than body fields because the Parse wire format is
shared with clients this change did not touch. A result *smaller* than the cap
carries neither header, and neither does a caller paging with its own smaller
`limit` — the signal means "we shortened your request", not "your page is
full". `count` still describes the whole matching set, so the usual
`limit=0&count=1` count-only query is unaffected: ask for the count, then page.

**The two list-shaped reads are bounded too, at the ceiling.**
`GET /aggregate/:collection?distinct=<prop>` answers with a list of values
rather than a page, and nothing in the wire format bounds it — `SELECT DISTINCT
city` over four hundred thousand rows returns as many values as there are
cities. It is clamped at `queries.maxLimit` rather than `defaultLimit`, because
a distinct is an aggregate by intent and the route has no `limit` parameter for
a caller to raise, and it carries the same two headers when it was shortened.
The grouped aggregate beside it returns one object of scalars and is normally
far below any cap; an entry that comes back as a *list* is bounded on the same
rule.

**Backups and exports are not capped.** They read whole tables by design,
through a separate, explicitly named path (`facade.rawQueryAll`), as do the
file orphan sweep, the role and API-key registries, and every "revoke every
session for this user". Lowering `queries.maxLimit` cannot truncate a backup —
which matters, because a backup that stopped at a page would restore cleanly
and have lost data.

Both numbers are live-patchable (`PUT /admin/ops`) and take effect on the next
request.

---

## Secrets: provisioned, never invented

By default a backend **mints** the secrets it needs and nobody supplied — the
admin credential (`adminToken`) and the HMAC key behind signed file URLs
(`files.signingSecret`) — and writes them to `<dataDir>/secrets.json`. That is
right for a laptop and wrong for a deploy: the next empty volume mints a
*different* one, comes up healthy, and locks you out of everything under the
old one. It is the most-reported production failure in the n8n ecosystem, and
the shape is identical here.

For a deploy, take the other stance:

```bash
nodegx-backend serve --data-dir /var/lib/nodegx --host 0.0.0.0 --require-secrets
# or, for a container that cannot edit its command line:
NODEGX_REQUIRE_SECRETS=1
```

Under `--require-secrets`, every secret the backend would otherwise mint must be
**provisioned** — and a start that cannot find one **refuses**, naming the
secret, every place it looked, and the command that fixes it. Nothing is minted
on the way to refusing. Supply them from your secret manager:

| Secret | Environment variable | Also |
|---|---|---|
| `adminToken` | `NODEGX_ADMIN_TOKEN` or `NODEGX_ADMIN_TOKEN_FILE` | `--token`; an existing `secrets.json` |
| `adminReadonlyToken` (optional) | `NODEGX_READONLY_TOKEN` or `NODEGX_READONLY_TOKEN_FILE` | `--readonly-token`; an existing `secrets.json` |
| `files.signingSecret` | `NODEGX_FILES_SIGNING_SECRET` or `NODEGX_FILES_SIGNING_SECRET_FILE` | an existing `secrets.json` |

`<VAR>_FILE` wins over `<VAR>` (Docker and Compose secrets), a trailing newline
is stripped, and an unreadable `_FILE` is a refusal, not a mint. A value read
from the environment is **never written to `secrets.json`** — that is the point
of supplying it from the environment. `--token` keeps its existing behaviour
and does persist. An existing `secrets.json` satisfies the stance as it is.

`GET /admin/status` reports, per secret, where it came from — `cli`, `env`,
`env-file`, `file`, `generated` or `absent` — and whether it is persisted.
Never the value. That is how you audit a fleet, and it is the number to look at
before "it works on this box" turns into the paragraph above.

---

## Shutdown and restarts

On `SIGTERM` (what `docker stop` and `systemctl stop` send) the backend:

1. stops accepting new connections;
2. sends every SSE client a `resync` event with `reason: "server-shutdown"`, so
   clients re-query instead of silently losing their feed;
3. drains in-flight requests for up to 10 seconds;
4. closes idle keep-alive sockets, destroys anything still hanging, and exits 0.

A second `SIGTERM` exits immediately with status 1 — that is how you say "stop
waiting". A drain that hits its bound logs `shutdown.drain-timeout` with the
number of requests it gave up on.

Give the service enough grace to use that window: `docker stop` defaults to 10
seconds, which is exactly the drain bound, so raise it a little.

```ini
# /etc/systemd/system/nodegx-backend.service
[Unit]
Description=NodeGX backend
After=network-online.target

[Service]
Type=simple
User=nodegx
WorkingDirectory=/opt/nodegx
ExecStart=/usr/bin/node /opt/nodegx/dist/cli.js serve \
  --data-dir /var/lib/nodegx --port 8577 --host 127.0.0.1
Environment=NODE_ENV=production
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=30

# The service needs its data directory and nothing else.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/nodegx

[Install]
WantedBy=multi-user.target
```

```yaml
# docker-compose.yml (excerpt)
services:
  backend:
    stop_grace_period: 30s
    healthcheck:
      test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:8577/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
```

---

## TLS: the reverse proxy

The backend does not speak TLS and will not. Certificate issue and renewal is
solved better by a proxy than by a BaaS, and both examples below put the app
and the API on **one origin**, which is what a NodeGX app's baked-in endpoint
expects.

### Caddy

[`packages/nodegx-backend/deploy/Caddyfile.example`](../../packages/nodegx-backend/deploy/Caddyfile.example)
— point your hostname's DNS at the machine and Caddy obtains and renews a
Let's Encrypt certificate on its own. Two directives are not decoration:
`flush_interval -1` on `/realtime*` (SSE must not be buffered) and a long
`read_timeout` (a quiet stream is healthy, not stuck).

### nginx

[`packages/nodegx-backend/deploy/nginx.conf`](../../packages/nodegx-backend/deploy/nginx.conf)
is the one the packaged Compose deploy uses. Add `certbot` or your own
certificate for TLS. Note `proxy_buffering off` on the realtime location —
without it, SSE is buffered into silence and then killed at 60 seconds, which
looks exactly like "realtime doesn't work" and is miserable to diagnose.

Both examples **refuse `/metrics` at the edge**. It is not secret, but it is an
inventory of what your backend does and how busy it is; scrape it from the
machine itself instead. A test reads the marker in `nginx.conf` and treats that
as a declared exemption rather than a missing route.

---

## CORS

`cors.origins` defaults to `["*"]`, which is right for local development and
for the single-origin deploy (where CORS never comes up at all). On an
internet-facing backend serving a browser app from a different origin, name the
origins:

```json
"cors": { "origins": ["https://app.example.com"], "credentials": false }
```

The backend warns at startup when a non-loopback bind is still answering `*`.
A refused origin still gets its response — CORS is the browser's rule, not
access control, and conflating the two would break every non-browser client.
Access control is [BAK-003's permission model](./BACKEND-ACCESS-CONTROL.md).

---

## What to check when it is slow

In order, because each step rules out the next:

1. **Is it the backend at all?** `nodegx_request_duration_seconds` gives server-side
   latency. If that is flat and users are unhappy, the problem is between them
   and the proxy.
2. **Which class?** Group by `class` in the histogram. `data` slow while
   `public` is fine points at queries or database size (`nodegx_db_file_bytes`).
3. **Are you refusing people?** `nodegx_ratelimit_refusals_total` climbing on a
   class real users depend on means the budget is too tight — or that everyone
   is sharing one bucket because `trustedProxies` is wrong (check the `ip`
   field in the access log: if every request shows the same private address,
   that is it).
4. **Slow individual requests.** `jq 'select(.durationMs > 500)'` over the log,
   then take the `requestId` to `/executions` — if the time is inside a
   function or workflow, the execution record has the per-step breakdown.
5. **Streams piling up?** `nodegx_realtime_connections` near
   `realtimeMaxConnections` means clients are reconnecting without closing, or
   the cap is too low.
6. **Memory.** `process_resident_memory_bytes` growing without traffic growing
   is worth a restart and an issue. `nodegx_ratelimit_buckets` should stay
   bounded — refilled buckets are swept every minute.

---

## Verified, and how to repeat it

The proxy examples on this page were run for real against a live backend rather
than written from memory (BAK-009). Caddy 2 in Docker with `tls internal`, in
front of a backend bound with `devOpen: false`, `trustedProxies: ["private"]`
and a deliberately tiny `auth` budget of 6/min burst 3:

| Checked | Result |
|---|---|
| TLS terminated, app + API on one origin | `HTTP/2 200` from `https://localhost:8443/health` |
| Honest `Server` header, correlation id | `server: nodegx-backend/0.1.0`, `x-request-id: ef39…` |
| `/metrics` refused at the edge, served locally | `404` through Caddy; exposition text on `127.0.0.1:8577` |
| Client address through the proxy | Access log recorded the forwarded client, not the proxy |
| Forged `X-Forwarded-For: 9.9.9.9` | **Ignored** — the rightmost hop won |
| Rate limit through TLS | 3 allowed, then `429` with `Retry-After: 10` |
| Audit of a failed admin login | Entry with `outcome: failure`, `status: 401`, origin, request id |
| The refused permission body | `400` naming the expected shape, **and** a `failure` audit entry |
| SSE through the proxy | `connected` frame arrived immediately — unbuffered |
| `SIGTERM` | `resync`/`server-shutdown` to the stream, drained in 26ms, exit 0 |

To repeat it on your own machine, run the backend, put the example Caddyfile in
front of it, and walk the table. The rate-limit and shutdown rows are also
covered by the automated suite (`tests/ops-rate-limit.test.ts`,
`tests/ops-shutdown.test.ts` — the latter spawns the real CLI and sends a real
signal).

---

## See also

- [Scaling](./SCALING.md) — the storage and process ceilings, and which one you are hitting
- [Self-hosting](./SELF-HOSTING.md) — the packaged Compose deploy
- [Access control](./BACKEND-ACCESS-CONTROL.md) — permissions, roles, API keys
- [Admin dashboard](./BACKEND-ADMIN-DASHBOARD.md) — including the Audit view
- [Backend services](./BACKEND-SERVICES.md) — backups, export/import, promotion
- [Realtime](./REALTIME.md) — the SSE protocol clients speak
