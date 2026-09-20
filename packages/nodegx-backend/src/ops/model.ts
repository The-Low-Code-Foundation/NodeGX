/**
 * The operational config model, pure form (BAK-009).
 *
 * `ops.json` lives beside `security.json` / `search.json` in the data dir —
 * same convention, same strictness: unknown keys are ERRORS, not warnings, so a
 * config field that is accepted and then ignored cannot exist (BAK-003's
 * stance, restated). One file covers everything an operator tunes about how the
 * service behaves rather than what it stores: logging, rate limits, CORS,
 * the audit trail, and metrics.
 *
 * Everything here has a working default. A backend that never writes ops.json
 * gets sane production behaviour — limits on, logs structured, audit on — which
 * is the point: the operational floor is not opt-in.
 *
 * @module nodegx-backend/ops/model
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type LogFormat = 'json' | 'pretty' | 'auto';

/**
 * The route classes rate limits are expressed in. Coarse on purpose: an
 * operator tunes five numbers, not one per route (see `classifyRoute`).
 */
export type RouteClass = 'auth' | 'admin' | 'data' | 'files' | 'hooks' | 'functions' | 'realtime' | 'public';

export const ROUTE_CLASSES: RouteClass[] = [
  'auth',
  'admin',
  'data',
  'files',
  'hooks',
  'functions',
  'realtime',
  'public'
];

/**
 * A token-bucket policy. `ratePerMinute` is the sustained refill rate; `burst`
 * is the bucket size — how much of a spike is absorbed before refusals start.
 * `burst: 0` disables the class entirely (unlimited), which is what `realtime`
 * uses: an SSE stream is ONE long request, so counting requests would be both
 * useless and actively harmful (see RealtimeHub's connection cap, which is the
 * right limit for that shape).
 */
export interface RateLimitPolicy {
  ratePerMinute: number;
  burst: number;
}

export interface RateLimitConfig {
  /** Master switch. Off means no bucket is consulted at all. */
  enabled: boolean;
  /**
   * Whose `X-Forwarded-For` to believe. Default `["loopback"]` — trust the
   * proxy on the same machine and nobody else, which is correct for the
   * documented Caddy/nginx setups and safe when there is no proxy at all
   * (a direct client cannot forge its way into another client's bucket).
   * `[]` = never trust the header; `["*"]` = always (only sane when something
   * upstream strips and re-sets it).
   */
  trustedProxies: string[];
  policies: Record<RouteClass, RateLimitPolicy>;
  /**
   * How many SSE streams may be open at once (BAK-001's realtime hub).
   *
   * This is the `realtime` class's limit, and it is a COUNT rather than a rate
   * because one stream is one very long request: a request-rate bucket would
   * measure nothing while breaking legitimate reconnect storms. Each open
   * stream costs a socket and a queue, so the number that matters is how many
   * exist, not how often they are opened. 0 = unlimited.
   */
  realtimeMaxConnections: number;
}

export interface LoggingConfig {
  level: LogLevel;
  /** `auto` = pretty on a TTY, JSON when supervised (journald/docker/editor). */
  format: LogFormat;
  /** Log one line per HTTP request. Off only for very noisy embedded uses. */
  requests: boolean;
}

export interface CorsConfig {
  /**
   * Allowed origins. `["*"]` is permitted (and warned about at startup on a
   * non-loopback bind) because the runtime clients are browser apps served from
   * anywhere; an explicit list is what a production backend should carry.
   */
  origins: string[];
  /** Send `Access-Control-Allow-Credentials`. Illegal together with `*`. */
  credentials: boolean;
}

export interface AuditConfig {
  enabled: boolean;
  /** Days to keep `_Audit` rows. 0 = keep forever. */
  retentionDays: number;
}

/**
 * Execution history retention (CWF-013's loose end).
 *
 * `executions.sqlite` grew forever: `runRetentionCleanup()` and
 * `cleanupByAge()` were both fully implemented and neither had a caller, so a
 * backend that had run a function every minute for a year still held every
 * record and every step — which is what made CWF-013 cap a single run's Log
 * lines at 200 rather than trust the table to stay a sensible size.
 *
 * 30 days is the default because it is the number the substrate already
 * carried (`ExecutionLogger`'s own `retentionDays: 30`) — a default that
 * disagreed with the one other component holding an opinion would be a second
 * vocabulary for no gain. `audit.retentionDays` stays at 90 deliberately: an
 * audit entry is one small row about who did what, an execution is a record
 * plus every step plus their payloads, and they should not be tuned by the
 * same number.
 */
export interface ExecutionsConfig {
  /** Days to keep `workflow_executions` rows (steps cascade). 0 = keep forever. */
  retentionDays: number;
  /**
   * CWF-016: hours to keep an answered idempotency key before the same
   * `Idempotency-Key` is allowed to run the graph again. 0 = keep forever.
   *
   * **Here rather than in its own section, on purpose.** It is the same class of
   * decision as `retentionDays` — how long this backend remembers what it did —
   * over rows in the same database file, swept on the same pass. A second
   * retention surface is how two retention policies come to disagree, and the
   * only thing an operator would gain from one is a second place to look.
   *
   * 24h is the industry default (Stripe's) and long enough to cover every
   * provider retry schedule worth naming; the number is here so a backend whose
   * upstream retries for a week can say so.
   */
  idempotencyTtlHours: number;
  /**
   * PRD-003: keep at most this many `workflow_executions` rows, oldest pruned first, whatever
   * their age. 0 = no count limit. Age cannot bound a FAST blowup — a misfiring workflow can
   * write a month's volume in an hour and every row is younger than `retentionDays` — so this
   * is the second control n8n needed and shipped as *"two weeks or 10,000, whichever first"*.
   * A prune reports which of the two limits bound it (`executions.pruned`, `/admin/status`),
   * because two silent limits interacting is its own outage.
   */
  maxCount: number;
  /**
   * PRD-002: the largest single value (a step's input, a trigger body, a log argument) an
   * execution record keeps whole, as JSON length. Larger values are replaced by a marker that
   * names the original size and keeps a 1,000-character preview. The default is the cap the
   * shared substrate already applied (50KB), so nothing about an ordinary run's record changes.
   */
  maxValueBytes: number;
  /**
   * PRD-002: the total an execution record may hold across every value in the run. Once
   * reached, further values are omitted (with a marker), `metadata.recordCapped` is stamped so
   * `GET /executions?capped=true` can name the workflow, and the run itself continues — this
   * bounds the RECORD, never the execution. A per-value cap alone lets a thousand 50KB values
   * through; this is the other half.
   */
  maxRunBytes: number;
}

/**
 * PRD-001 — the page cap on request-shaped reads.
 *
 * The outage this exists for needs no bug in the backend at all: a cloud
 * function builds a filter from an optional value, omits the key when the value
 * is missing, and an empty `where` with no `limit` is `SELECT * FROM table`.
 * Four hundred thousand rows later the process is gone.
 *
 * Two numbers rather than one, because they answer two different questions:
 * `defaultLimit` bounds the ACCIDENT (a caller who forgot to ask), `maxLimit`
 * bounds the DELIBERATE case (a caller who asked for everything). One number
 * would have to be both the sensible page a forgetful caller gets and the
 * ceiling a paging client may raise itself to, and those are not the same
 * number.
 *
 * 🔴 A capped result **says so** — `X-NodeGX-Result-Capped` — because silent
 * truncation turns an outage into a correctness bug, and a list that looks
 * complete and is not is worse than an error: it is believed.
 *
 * Readers that must see a whole table (backup, export, the orphan sweep, "every
 * session for this user") do not go through this at all; they call
 * `facade.rawQueryAll`, which is the greppable list of everything exempt.
 */
export interface QueriesConfig {
  /**
   * Rows returned when the caller supplied no `limit` at all. Also the cap on a
   * caller who supplies a NEGATIVE one — `LIMIT -1` is "no limit" in SQLite, so
   * a negative number is an unbounded read spelled differently.
   */
  defaultLimit: number;
  /** The ceiling on a caller who does supply a `limit`. Clamped, never refused. */
  maxLimit: number;
}

export interface MetricsConfig {
  /** Serve `GET /metrics`. */
  enabled: boolean;
  /**
   * When true, a request from loopback needs no admin credential — the usual
   * "Prometheus scrapes over localhost" setup. Off means admin-only always.
   */
  allowLoopback: boolean;
}

export interface OpsConfig {
  version: 1;
  logging: LoggingConfig;
  rateLimit: RateLimitConfig;
  cors: CorsConfig;
  audit: AuditConfig;
  executions: ExecutionsConfig;
  queries: QueriesConfig;
  metrics: MetricsConfig;
}

/**
 * Defaults. Generous enough that no ordinary app notices them, tight enough
 * that a scraping or guessing loop does: `auth` is the class that bites first
 * (spec success criterion: hammering /login 429s while data routes stay
 * unaffected).
 *
 * `auth` is not set as low as a single human's real rate, deliberately. Fifty
 * people behind one office NAT logging in at 9am is one address making fifty
 * auth requests in a minute, and refusing them would be a self-inflicted
 * outage. Online credential GUESSING is not this control's job: BAK-005's
 * failure budget locks a client out after ten wrong credentials, and the
 * account-mail endpoints carry their own much stricter buckets (email-routes).
 * What this class stops is the firehose.
 */
export function defaultOpsConfig(): OpsConfig {
  return {
    version: 1,
    logging: { level: 'info', format: 'auto', requests: true },
    rateLimit: {
      enabled: true,
      trustedProxies: ['loopback'],
      policies: {
        auth: { ratePerMinute: 60, burst: 30 },
        admin: { ratePerMinute: 300, burst: 100 },
        data: { ratePerMinute: 1200, burst: 400 },
        files: { ratePerMinute: 300, burst: 100 },
        hooks: { ratePerMinute: 300, burst: 150 },
        functions: { ratePerMinute: 600, burst: 200 },
        realtime: { ratePerMinute: 0, burst: 0 },
        public: { ratePerMinute: 600, burst: 200 }
      },
      realtimeMaxConnections: 500
    },
    cors: { origins: ['*'], credentials: false },
    audit: { enabled: true, retentionDays: 90 },
    executions: {
      retentionDays: 30,
      idempotencyTtlHours: 24,
      maxCount: 10_000,
      maxValueBytes: 50 * 1024,
      maxRunBytes: 8 * 1024 * 1024
    },
    // PRD-001. 1,000 is a page no ordinary app notices and no single response
    // can take the process down with; 10,000 is a deliberate export-shaped read
    // that still fits in a response. Neither is a guess about the ceiling — the
    // ceiling is PRD-004's measurement, and these move when it lands.
    queries: { defaultLimit: 1000, maxLimit: 10_000 },
    metrics: { enabled: true, allowLoopback: true }
  };
}

/** The floor under both record byte caps — see the validation note beside `executions`. */
export const MIN_RECORD_VALUE_BYTES = 4096;

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
const LOG_FORMATS: LogFormat[] = ['json', 'pretty', 'auto'];

function checkKeys(errors: string[], where: string, value: unknown, allowed: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${where} must be an object`);
    return false;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (!allowed.includes(key)) errors.push(`unknown key "${key}" in ${where}`);
  }
  return true;
}

function checkStringArray(errors: string[], where: string, value: unknown): void {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    errors.push(`${where} must be an array of strings`);
  }
}

/** Strict validation. Returns error strings; empty = valid. */
export function validateOpsConfig(raw: unknown): string[] {
  const errors: string[] = [];
  if (
    !checkKeys(errors, 'ops config', raw, ['version', 'logging', 'rateLimit', 'cors', 'audit', 'executions', 'queries', 'metrics'])
  ) {
    return errors;
  }
  const cfg = raw as Record<string, unknown>;
  if (cfg.version !== 1) errors.push(`unsupported version ${JSON.stringify(cfg.version)} (expected 1)`);

  if (cfg.logging !== undefined && checkKeys(errors, 'logging', cfg.logging, ['level', 'format', 'requests'])) {
    const logging = cfg.logging as Record<string, unknown>;
    if (logging.level !== undefined && !LOG_LEVELS.includes(logging.level as LogLevel)) {
      errors.push(`logging.level must be one of ${LOG_LEVELS.join(', ')}`);
    }
    if (logging.format !== undefined && !LOG_FORMATS.includes(logging.format as LogFormat)) {
      errors.push(`logging.format must be one of ${LOG_FORMATS.join(', ')}`);
    }
    if (logging.requests !== undefined && typeof logging.requests !== 'boolean') {
      errors.push('logging.requests must be a boolean');
    }
  }

  if (
    cfg.rateLimit !== undefined &&
    checkKeys(errors, 'rateLimit', cfg.rateLimit, ['enabled', 'trustedProxies', 'policies', 'realtimeMaxConnections'])
  ) {
    const rl = cfg.rateLimit as Record<string, unknown>;
    if (rl.enabled !== undefined && typeof rl.enabled !== 'boolean') errors.push('rateLimit.enabled must be a boolean');
    if (rl.trustedProxies !== undefined) checkStringArray(errors, 'rateLimit.trustedProxies', rl.trustedProxies);
    if (
      rl.realtimeMaxConnections !== undefined &&
      (typeof rl.realtimeMaxConnections !== 'number' ||
        !Number.isFinite(rl.realtimeMaxConnections) ||
        rl.realtimeMaxConnections < 0)
    ) {
      errors.push('rateLimit.realtimeMaxConnections must be a number >= 0 (0 = unlimited)');
    }
    if (rl.policies !== undefined && checkKeys(errors, 'rateLimit.policies', rl.policies, ROUTE_CLASSES)) {
      for (const [name, policy] of Object.entries(rl.policies as Record<string, unknown>)) {
        if (!checkKeys(errors, `rateLimit.policies.${name}`, policy, ['ratePerMinute', 'burst'])) continue;
        const p = policy as Record<string, unknown>;
        for (const field of ['ratePerMinute', 'burst']) {
          const v = p[field];
          if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
            errors.push(`rateLimit.policies.${name}.${field} must be a number >= 0`);
          }
        }
      }
    }
  }

  if (cfg.cors !== undefined && checkKeys(errors, 'cors', cfg.cors, ['origins', 'credentials'])) {
    const cors = cfg.cors as Record<string, unknown>;
    if (cors.origins !== undefined) {
      checkStringArray(errors, 'cors.origins', cors.origins);
      if (Array.isArray(cors.origins) && cors.origins.length === 0) {
        errors.push('cors.origins must list at least one origin (use ["*"] to allow any)');
      }
    }
    if (cors.credentials !== undefined && typeof cors.credentials !== 'boolean') {
      errors.push('cors.credentials must be a boolean');
    }
    // The browser rejects this combination outright, so accepting it would be
    // shipping a config that silently does not work.
    if (cors.credentials === true && Array.isArray(cors.origins) && cors.origins.includes('*')) {
      errors.push('cors.credentials cannot be true while cors.origins includes "*" (browsers refuse that pair)');
    }
  }

  if (cfg.audit !== undefined && checkKeys(errors, 'audit', cfg.audit, ['enabled', 'retentionDays'])) {
    const audit = cfg.audit as Record<string, unknown>;
    if (audit.enabled !== undefined && typeof audit.enabled !== 'boolean') errors.push('audit.enabled must be a boolean');
    if (
      audit.retentionDays !== undefined &&
      (typeof audit.retentionDays !== 'number' || !Number.isFinite(audit.retentionDays) || audit.retentionDays < 0)
    ) {
      errors.push('audit.retentionDays must be a number >= 0 (0 = keep forever)');
    }
  }

  if (
    cfg.executions !== undefined &&
    checkKeys(errors, 'executions', cfg.executions, [
      'retentionDays',
      'idempotencyTtlHours',
      'maxCount',
      'maxValueBytes',
      'maxRunBytes'
    ])
  ) {
    const executions = cfg.executions as Record<string, unknown>;
    // PRD-002/003. `maxCount: 0` is "no count limit", the same vocabulary as `retentionDays: 0`.
    // The two byte caps have a FLOOR rather than a zero escape hatch: a record bound of 0 would
    // be a record of nothing, and the marker a cut value leaves behind is itself ~1.2KB, so a
    // cap below that could never be honoured. 4KB is the smallest value that still keeps a
    // preview; an operator who wants "no cap" sets a number they are prepared to see on disk.
    if (
      executions.maxCount !== undefined &&
      (typeof executions.maxCount !== 'number' || !Number.isInteger(executions.maxCount) || executions.maxCount < 0)
    ) {
      errors.push('executions.maxCount must be an integer >= 0 (0 = no count limit)');
    }
    if (
      executions.maxValueBytes !== undefined &&
      (typeof executions.maxValueBytes !== 'number' ||
        !Number.isInteger(executions.maxValueBytes) ||
        executions.maxValueBytes < MIN_RECORD_VALUE_BYTES)
    ) {
      errors.push(`executions.maxValueBytes must be an integer >= ${MIN_RECORD_VALUE_BYTES}`);
    }
    if (
      executions.maxRunBytes !== undefined &&
      (typeof executions.maxRunBytes !== 'number' ||
        !Number.isInteger(executions.maxRunBytes) ||
        executions.maxRunBytes < MIN_RECORD_VALUE_BYTES)
    ) {
      errors.push(`executions.maxRunBytes must be an integer >= ${MIN_RECORD_VALUE_BYTES}`);
    }
    if (
      typeof executions.maxRunBytes === 'number' &&
      typeof executions.maxValueBytes === 'number' &&
      executions.maxRunBytes < executions.maxValueBytes
    ) {
      errors.push('executions.maxRunBytes must be >= executions.maxValueBytes (a run holds at least one value)');
    }
    if (
      executions.retentionDays !== undefined &&
      (typeof executions.retentionDays !== 'number' ||
        !Number.isFinite(executions.retentionDays) ||
        executions.retentionDays < 0)
    ) {
      errors.push('executions.retentionDays must be a number >= 0 (0 = keep forever)');
    }
    if (
      executions.idempotencyTtlHours !== undefined &&
      (typeof executions.idempotencyTtlHours !== 'number' ||
        !Number.isFinite(executions.idempotencyTtlHours) ||
        executions.idempotencyTtlHours < 0)
    ) {
      errors.push('executions.idempotencyTtlHours must be a number >= 0 (0 = keep forever)');
    }
  }

  if (cfg.queries !== undefined && checkKeys(errors, 'queries', cfg.queries, ['defaultLimit', 'maxLimit'])) {
    const queries = cfg.queries as Record<string, unknown>;
    // PRD-001. No zero escape hatch on either: `defaultLimit: 0` would mean a
    // plain query returns nothing, and `maxLimit: 0` would mean every query
    // does. "No cap" is not a supported setting — that is the whole task — so
    // an operator who wants a very high ceiling writes a very high number and
    // can see it in the file.
    for (const field of ['defaultLimit', 'maxLimit']) {
      const value = queries[field];
      if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 1)) {
        errors.push(`queries.${field} must be an integer >= 1`);
      }
    }
    if (
      typeof queries.defaultLimit === 'number' &&
      typeof queries.maxLimit === 'number' &&
      queries.maxLimit < queries.defaultLimit
    ) {
      errors.push('queries.maxLimit must be >= queries.defaultLimit (a caller may not ask for less than the default)');
    }
  }

  if (cfg.metrics !== undefined && checkKeys(errors, 'metrics', cfg.metrics, ['enabled', 'allowLoopback'])) {
    const metrics = cfg.metrics as Record<string, unknown>;
    for (const field of ['enabled', 'allowLoopback']) {
      if (metrics[field] !== undefined && typeof metrics[field] !== 'boolean') {
        errors.push(`metrics.${field} must be a boolean`);
      }
    }
  }

  return errors;
}

/** Merge a validated partial over the defaults (per-section, one level). */
export function mergeOpsConfig(partial: unknown): OpsConfig {
  return mergeOpsOver(defaultOpsConfig(), partial);
}

/**
 * Merge a partial over an arbitrary base. Section-wise and one level deep, with
 * rate-limit policies merged per class — so `{rateLimit:{enabled:false}}` turns
 * limiting off and leaves the tuned numbers and the proxy list alone. A patch
 * that only mentions one field must not silently reset its neighbours.
 */
export function mergeOpsOver(base: OpsConfig, partial: unknown): OpsConfig {
  const raw = (partial || {}) as Partial<OpsConfig>;
  const policies = { ...base.rateLimit.policies };
  const rawPolicies = (raw.rateLimit && raw.rateLimit.policies) || {};
  for (const cls of ROUTE_CLASSES) {
    if (rawPolicies[cls]) policies[cls] = { ...policies[cls], ...rawPolicies[cls] };
  }
  return {
    version: 1,
    logging: { ...base.logging, ...(raw.logging || {}) },
    rateLimit: { ...base.rateLimit, ...(raw.rateLimit || {}), policies },
    cors: { ...base.cors, ...(raw.cors || {}) },
    audit: { ...base.audit, ...(raw.audit || {}) },
    executions: { ...base.executions, ...(raw.executions || {}) },
    queries: { ...base.queries, ...(raw.queries || {}) },
    metrics: { ...base.metrics, ...(raw.metrics || {}) }
  };
}
