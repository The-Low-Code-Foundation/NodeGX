/**
 * The Permissions page's model (BMG-006), pure so it is specced without a DOM:
 * the who × what matrix over `ruleVocabulary`, the transitions a click makes,
 * the templates, the words, and the function-row fields.
 *
 * A row is one operation and holds one `RuleSelection`; a column is an
 * audience — *Everyone*, *Signed in*, *No one*, one per role — plus, on a
 * collection, *Default*, which is the ABSENCE of a rule (the backend's defaults
 * decide). The storage keeps that absence per operation (`Pet` may set
 * `create` and inherit `find`), and a matrix that could not show it would
 * rewrite two inherited operations as explicit rules on the first Save.
 *
 * The exclusions are enforced at the click, by the vocabulary: *No one* is the
 * empty set, *Everyone* dominates (the other cells are implied and greyed), and
 * a role beside *Signed in* is kept and stored as `['authenticated','role:x']`
 * (AC1) — the vocabulary reports it redundant rather than deleting it.
 */
import {
  ClpOp,
  CLP_OPS,
  RuleSelection,
  RuleValue,
  atomsOf,
  isNobody,
  parseRule,
  roleName,
  selectionToRule,
  withAnyone,
  withInherit,
  withNobody,
  withRole,
  withSignedIn
} from './ruleVocabulary';

export type { ClpOp, RuleSelection, RuleValue };
export { CLP_OPS };

// --------------------------------------------------------------------- words --

/** A collection operation in a person's words, with the storage word as its badge. */
export const OP_ROWS: Array<{ op: ClpOp; word: string; verb: string }> = [
  { op: 'find', word: 'List', verb: 'list' },
  { op: 'get', word: 'Open one', verb: 'open' },
  { op: 'create', word: 'Create', verb: 'create' },
  { op: 'update', word: 'Change', verb: 'change' },
  { op: 'delete', word: 'Delete', verb: 'delete' }
];

export type FileOp = 'upload' | 'read' | 'delete';
export const FILE_ROWS: Array<{ op: FileOp; word: string; verb: string }> = [
  { op: 'upload', word: 'Upload', verb: 'upload' },
  { op: 'read', word: 'Open', verb: 'open' },
  { op: 'delete', word: 'Delete', verb: 'delete' }
];

export function opVerb(op: string): string {
  const row = OP_ROWS.find((r) => r.op === op) || FILE_ROWS.find((r) => r.op === op);
  return row ? row.verb : op === 'call' ? 'call' : op;
}

/** Who a selection lets through, in the page's words: *Everyone*, *Signed in*, *No one*, *editors, billing*. */
export function audienceWords(sel: RuleSelection, defaultSel?: RuleSelection): string {
  if (sel.inherit) return defaultSel ? 'Default (' + audienceWords(defaultSel) + ')' : 'Default';
  if (sel.anyone) return 'Everyone';
  const parts: string[] = [];
  if (sel.signedIn) parts.push('Signed in');
  parts.push(...sel.roles, ...sel.unknown);
  return parts.length ? parts.join(', ') : 'No one';
}

/** The same words straight from a stored rule. */
export function ruleWords(rule: RuleValue | undefined, fallback?: RuleValue): string {
  return audienceWords(parseRule(rule), fallback === undefined ? undefined : parseRule(fallback));
}

// ------------------------------------------------------------------- matrix --

export interface CollectionEntry {
  permissions?: Partial<Record<string, RuleValue>>;
  creatorOwns?: boolean;
}

export type Matrix<Op extends string = ClpOp> = Record<Op, RuleSelection>;

export function matrixFrom<Op extends string>(rules: Partial<Record<string, RuleValue>> | undefined, ops: Op[]): Matrix<Op> {
  const out = {} as Matrix<Op>;
  for (const op of ops) out[op] = parseRule(rules ? rules[op] : undefined);
  return out;
}

/** The rules to store: an inherited row writes no key. */
export function rulesFrom<Op extends string>(matrix: Matrix<Op>, ops: Op[]): Partial<Record<Op, RuleValue>> {
  const out: Partial<Record<Op, RuleValue>> = {};
  for (const op of ops) {
    const rule = selectionToRule(matrix[op]);
    if (rule !== undefined) out[op] = rule;
  }
  return out;
}

export function allInherit<Op extends string>(matrix: Matrix<Op>, ops: Op[]): boolean {
  return ops.every((op) => matrix[op].inherit);
}

/** Every role a matrix must offer as a column: the ones its rules name, in first-seen order. */
export function rolesNamed(rules: Array<RuleValue | undefined>): string[] {
  const out: string[] = [];
  for (const rule of rules) {
    for (const atom of atomsOf(rule)) {
      const name = typeof atom === 'string' ? roleName(atom) : null;
      if (name !== null && out.indexOf(name) === -1) out.push(name);
    }
  }
  return out;
}

export function matrixRules<Op extends string>(matrix: Matrix<Op>, ops: Op[]): Array<RuleValue | undefined> {
  return ops.map((op) => selectionToRule(matrix[op]));
}

/** A column of the matrix. A role column is `{ role }`. */
export type Column = 'default' | 'everyone' | 'signedIn' | 'noOne' | { role: string };

export interface CellState {
  checked: boolean;
  /** Greyed: *Everyone* is on, so this audience is let through whatever the box says. */
  implied: boolean;
}

/** What one cell shows for a selection. */
export function cellState(sel: RuleSelection, column: Column): CellState {
  if (column === 'default') return { checked: sel.inherit, implied: false };
  if (sel.inherit) return { checked: false, implied: false };
  if (column === 'everyone') return { checked: sel.anyone, implied: false };
  if (column === 'noOne') return { checked: isNobody(sel), implied: sel.anyone };
  if (column === 'signedIn') return { checked: sel.signedIn || sel.anyone, implied: sel.anyone };
  return { checked: sel.roles.indexOf(column.role) !== -1 || sel.anyone, implied: sel.anyone };
}

/**
 * The selection after a click on one cell. *No one* and *Default* are
 * exclusive; *Everyone* on clears the rest (they are implied) and *Everyone*
 * off leaves *No one*, from which the next tick builds up.
 */
export function toggleCell(sel: RuleSelection, column: Column, on: boolean): RuleSelection {
  if (column === 'default') return on ? withInherit() : withNobody();
  if (column === 'noOne') return on ? withNobody() : sel.inherit ? withNobody() : sel;
  if (column === 'everyone') return on ? withAnyone() : withNobody();
  if (column === 'signedIn') return withSignedIn(sel, on);
  return withRole(sel, column.role, on);
}

/** A role column can be removed once no row ticks it. */
export function roleColumnEmpty<Op extends string>(matrix: Matrix<Op>, ops: Op[], role: string): boolean {
  return ops.every((op) => matrix[op].roles.indexOf(role) === -1);
}

export function withoutRoleColumn<Op extends string>(matrix: Matrix<Op>, ops: Op[], role: string): Matrix<Op> {
  const out = { ...matrix };
  for (const op of ops) out[op] = withRole(out[op], role, false);
  return out;
}

// ---------------------------------------------------------------- templates --

export type TemplateId = 'public-read' | 'signed-in' | 'owner' | 'role-only' | 'locked';

export interface Template {
  id: TemplateId;
  label: string;
  /** One sentence a person can read before choosing it. */
  sentence: string;
  /** Needs a role picked before it can fill the matrix. */
  needsRole?: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: 'public-read',
    label: 'Public read, signed-in write',
    sentence: 'Anyone can list and open records. Only signed-in people can create, change or delete them.'
  },
  { id: 'signed-in', label: 'Signed-in only', sentence: 'Only signed-in people can see or change anything.' },
  {
    id: 'owner',
    label: 'Only the owner',
    sentence: 'Signed-in people can create records, and each person sees and changes only the records they created.'
  },
  { id: 'role-only', label: 'One role only', sentence: 'Only people in the role you pick can see or change anything.', needsRole: true },
  { id: 'locked', label: 'Locked', sentence: 'No one can reach this collection except the admin credential.' }
];

/**
 * What a template stores. *Only the owner* is `authenticated` on every
 * operation WITH creator-owns: the row's private ACL is what keeps other
 * signed-in people out. (The collection rule is checked before any row is
 * looked at, so *No one* on Change would lock the owner out too.)
 */
export function templateEntry(id: TemplateId, role?: string): CollectionEntry {
  const all = (rule: RuleValue): Record<ClpOp, RuleValue> => ({ find: rule, get: rule, create: rule, update: rule, delete: rule });
  switch (id) {
    case 'public-read':
      return { permissions: { find: 'public', get: 'public', create: 'authenticated', update: 'authenticated', delete: 'authenticated' }, creatorOwns: false };
    case 'signed-in':
      return { permissions: all('authenticated'), creatorOwns: false };
    case 'owner':
      return { permissions: all('authenticated'), creatorOwns: true };
    case 'role-only':
      return { permissions: all('role:' + (role || '')), creatorOwns: false };
    case 'locked':
      return { permissions: all('nobody'), creatorOwns: false };
  }
}

// --------------------------------------------------------------- collections --

/** The collections the page draws: never a `_` table, which the validator refuses and the backend locks. */
export function visibleCollections(names: string[]): string[] {
  return names.filter((n) => !n.startsWith('_')).sort((a, b) => a.localeCompare(b));
}

/** The words the collection list shows beside a name. */
export function entrySummary(entry: CollectionEntry | undefined, defaults: Partial<Record<string, RuleValue>>): string {
  if (!entry || (!entry.permissions && entry.creatorOwns === undefined)) return 'The defaults';
  const rules = entry.permissions || {};
  const parts = OP_ROWS.filter((r) => rules[r.op] !== undefined).map((r) => r.verb + ': ' + ruleWords(rules[r.op]));
  if (entry.creatorOwns !== undefined) parts.push(entry.creatorOwns ? 'records belong to their creator' : 'records are shared');
  const inherited = OP_ROWS.filter((r) => rules[r.op] === undefined).length;
  if (inherited && inherited < OP_ROWS.length) parts.push(inherited + ' from the defaults');
  return parts.join(' · ') || 'The defaults';
}

// ------------------------------------------------------------------ sign-up --

export type SignupChoice = 'public' | 'nobody' | 'other';

export function signupChoice(rule: RuleValue | undefined): SignupChoice {
  const sel = parseRule(rule);
  if (sel.anyone) return 'public';
  if (isNobody(sel) || sel.inherit) return 'nobody';
  return 'other';
}

// ---------------------------------------------------------------- functions --

export interface FunctionIdempotency {
  enabled: boolean;
  requireKey?: boolean;
  hashBody?: boolean;
}

export interface RateLimit {
  ratePerMinute: number;
  burst: number;
}

/** One row of `GET /admin/permissions/functions`. */
export interface FunctionRow {
  name: string;
  deployed: boolean;
  workflow: string | null;
  call: RuleValue;
  source: 'configured' | 'graph';
  configured: RuleValue | null;
  allowNoAuth: boolean;
  runAs: string | null;
  rateLimit: RateLimit | null;
  effectiveRateLimit: RateLimit | null;
  rateLimitSource: 'declared' | 'public-write-default' | 'none';
  timeoutMs: number | null;
  idempotency: FunctionIdempotency | null;
  graphRefusesAnonymous: boolean;
}

/** The stored shape of one function's entry in `security.json`. */
export interface FunctionEntry {
  call?: RuleValue;
  runAs?: 'system';
  rateLimit?: RateLimit;
  timeoutMs?: number;
  idempotency?: FunctionIdempotency;
}

export type IdempotencyChoice = 'off' | 'key' | 'key-body' | 'required' | 'required-body';

export const IDEMPOTENCY_OPTIONS: Array<[IdempotencyChoice, string]> = [
  ['off', 'Run every time'],
  ['key', 'Replay on a repeated key'],
  ['key-body', 'Replay on key + body'],
  ['required', 'Require a key, then replay'],
  ['required-body', 'Require a key + body']
];

export function idempotencyChoice(value: FunctionIdempotency | null | undefined): IdempotencyChoice {
  if (!value || !value.enabled) return 'off';
  if (value.requireKey) return value.hashBody ? 'required-body' : 'required';
  return value.hashBody ? 'key-body' : 'key';
}

/** The exact block the backend validates, or undefined for "no block". */
export function idempotencyValue(choice: IdempotencyChoice): FunctionIdempotency | undefined {
  switch (choice) {
    case 'off':
      return undefined;
    case 'key':
      return { enabled: true };
    case 'key-body':
      return { enabled: true, hashBody: true };
    case 'required':
      return { enabled: true, requireKey: true };
    case 'required-body':
      return { enabled: true, requireKey: true, hashBody: true };
  }
}

/** What a function row edits. `call.inherit` means "from the graph" (no entry key). */
export interface FunctionDraft {
  call: RuleSelection;
  runAs: '' | 'system';
  /** Its own budget, or off for "the class bucket alone". */
  ownLimit: boolean;
  perMinute: number;
  burst: number;
  /** Seconds as typed; '' = the service default. */
  timeoutSeconds: string;
  idempotency: IdempotencyChoice;
}

export function draftFrom(row: FunctionRow): FunctionDraft {
  return {
    call: parseRule(row.configured === null ? undefined : row.configured),
    runAs: row.runAs === 'system' ? 'system' : '',
    ownLimit: row.rateLimit !== null,
    perMinute: row.rateLimit ? row.rateLimit.ratePerMinute : 60,
    burst: row.rateLimit ? row.rateLimit.burst : 30,
    timeoutSeconds: row.timeoutMs === null ? '' : String(row.timeoutMs / 1000),
    idempotency: idempotencyChoice(row.idempotency)
  };
}

/** Why a draft cannot be stored yet, in words, or null. */
export function draftProblem(d: FunctionDraft): string | null {
  if (d.ownLimit && (!Number.isFinite(d.perMinute) || d.perMinute < 0 || !Number.isFinite(d.burst) || d.burst < 0)) {
    return 'A limit is a number of calls per minute and a burst, each 0 or more (0 and 0 means no limit at all).';
  }
  if (d.timeoutSeconds.trim() !== '') {
    const s = Number(d.timeoutSeconds);
    if (!Number.isFinite(s) || s < 0) return 'The time limit is a number of seconds, 0 or more (0 means no limit).';
  }
  return null;
}

/** The entry to store for a draft, or undefined when it says nothing (the key is deleted). */
export function entryFromDraft(d: FunctionDraft): FunctionEntry | undefined {
  const entry: FunctionEntry = {};
  const call = selectionToRule(d.call);
  if (call !== undefined) entry.call = call;
  if (d.runAs === 'system') entry.runAs = 'system';
  if (d.ownLimit) entry.rateLimit = { ratePerMinute: d.perMinute, burst: d.burst };
  if (d.timeoutSeconds.trim() !== '') entry.timeoutMs = Math.round(Number(d.timeoutSeconds) * 1000);
  const idem = idempotencyValue(d.idempotency);
  if (idem) entry.idempotency = idem;
  return Object.keys(entry).length ? entry : undefined;
}

export interface DriftChip {
  kind: '' | 'warn' | 'accent' | 'bad';
  label: string;
  why: string;
}

/** The chips a function row wears: drift between declared and effective, never hidden. */
export function functionChips(row: FunctionRow, publicWriteDefault: RateLimit | null): DriftChip[] {
  const chips: DriftChip[] = [];
  if (!row.deployed) {
    chips.push({ kind: 'warn', label: 'not deployed', why: 'A rule guards the name ' + row.name + ', but no deployed function answers to it. It grants nothing until one does.' });
  }
  if (row.source === 'graph') {
    chips.push({
      kind: '',
      label: 'from the graph',
      why: 'No rule of its own: the graph’s Allow Unauthenticated port decides (' + (row.allowNoAuth ? 'ticked, so everyone' : 'unticked, so signed in') + ').'
    });
  }
  if (row.graphRefusesAnonymous) {
    chips.push({
      kind: 'bad',
      label: 'fails for signed-out callers',
      why:
        'This rule lets a signed-out caller through, but the function’s Request node does not have Allow Unauthenticated ticked, so the call reaches the graph and fails there. Tick the port on the canvas, or set this to Signed in.'
    });
  }
  if (row.rateLimitSource === 'public-write-default' && publicWriteDefault) {
    chips.push({
      kind: 'accent',
      label: publicWriteDefault.ratePerMinute + '/min default',
      why:
        'Anyone can call it and it writes records, and it has no limit of its own, so the public-write default applies: ' +
        publicWriteDefault.ratePerMinute +
        ' a minute, burst ' +
        publicWriteDefault.burst +
        ', per caller.'
    });
  }
  if (row.rateLimitSource === 'declared' && row.effectiveRateLimit === null) {
    chips.push({ kind: 'accent', label: 'no limit, on purpose', why: 'Its limit is 0 and 0, which means no budget of its own — the opt-out for a provider’s webhook.' });
  }
  return chips;
}

// ------------------------------------------------------------------ try as --

/** What `POST /admin/permissions/check` answers. */
export interface CheckAnswer {
  allowed: boolean;
  kind?: 'collection' | 'function';
  rule: RuleValue;
  reason: string;
  devOpen?: boolean;
  source?: string;
  recordAllowed?: boolean;
  recordAccess?: 'read' | 'write';
}

/** *Ann may change Pet.* / *Someone signed out may not list Pet.* — the record answer folded in. */
export function verdictSentence(who: string, op: string, what: string, answer: CheckAnswer): string {
  const verb = opVerb(op);
  const refusedRow = answer.allowed && answer.recordAllowed === false;
  const may = answer.allowed && !refusedRow ? ' may ' : ' may not ';
  const tail = op === 'call' ? 'call ' + what : verb + ' ' + what;
  return who + may + tail + (refusedRow ? ': the collection allows it, but that record’s sharing does not.' : '.');
}

/** The rule that decided, in words. */
export function verdictRule(answer: CheckAnswer): string {
  const words = ruleWords(answer.rule);
  return 'The rule for it is ' + words + (answer.source === 'graph' ? ' (from the graph’s Allow Unauthenticated port)' : '') + '.';
}
