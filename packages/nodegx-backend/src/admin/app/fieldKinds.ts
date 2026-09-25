/**
 * BMG-003 — what a field IS, in a person's words, and how that becomes what
 * the storage keeps.
 *
 * The page offers eleven kinds (§3.1). Ten map straight onto a storage type;
 * *Choice* is a String plus a declared check (`oneOf`) that the backend
 * enforces on every write (HLT-016), which is what makes it a choice and not a
 * hint. The storage names stay visible as a small badge for the people who
 * know them; the MCP and the schema export are unchanged, because no storage
 * type is added here.
 *
 * Everything in this file is pure: a draft in, a column and its checks out,
 * or the sentence that refuses it. The drawer in `views/schema.tsx` renders it.
 */
import { Column, validName } from './format';

export type KindId = 'text' | 'number' | 'yesno' | 'date' | 'choice' | 'link' | 'links' | 'file' | 'location' | 'list' | 'anything';

export interface Kind {
  id: KindId;
  /** The tile's name. */
  label: string;
  /** One line under it. */
  line: string;
  /** A glyph for the tile — text, so it paints from the tokens like everything else. */
  icon: string;
  /** The storage type it becomes. */
  storage: string;
}

export const KINDS: Kind[] = [
  { id: 'text', label: 'Text', line: 'words, names, descriptions', icon: 'Aa', storage: 'String' },
  { id: 'number', label: 'Number', line: 'amounts, counts, prices', icon: '#', storage: 'Number' },
  { id: 'yesno', label: 'Yes / No', line: 'a switch', icon: '◐', storage: 'Boolean' },
  { id: 'date', label: 'Date & time', line: 'when something happened', icon: '◷', storage: 'Date' },
  { id: 'choice', label: 'Choice', line: 'one of a list you define', icon: '☰', storage: 'String' },
  { id: 'link', label: 'Link', line: 'points at one record in another collection', icon: '→', storage: 'Pointer' },
  { id: 'links', label: 'Links', line: 'points at many records in another collection', icon: '⇉', storage: 'Relation' },
  { id: 'file', label: 'Picture or file', line: 'an upload', icon: '▣', storage: 'File' },
  { id: 'location', label: 'Location', line: 'a point on the map', icon: '⌖', storage: 'GeoPoint' },
  { id: 'list', label: 'List', line: 'several values', icon: '≡', storage: 'Array' },
  { id: 'anything', label: 'Anything', line: 'structured data for developers', icon: '{}', storage: 'Object' }
];

export function kindById(id: string): Kind {
  return KINDS.find((k) => k.id === id) || KINDS[0];
}

/** The tiles whose name or line contains the query (case-insensitive); all of them for an empty query. */
export function searchKinds(query: string): Kind[] {
  const q = query.trim().toLowerCase();
  if (!q) return KINDS;
  return KINDS.filter((k) => (k.label + ' ' + k.line + ' ' + k.storage).toLowerCase().indexOf(q) !== -1);
}

// ------------------------------------------------------------------ checks --

/** One declared rule, as `GET /admin/schema` carries it (HLT-016 + the BMG-003 shapes). */
export interface Rule {
  exactlyOne?: string[];
  allOrNone?: string[];
  field?: string;
  min?: number;
  max?: number;
  oneOf?: Array<string | number>;
  maxLength?: number;
  looksLike?: 'email' | 'url';
  whole?: true;
}

export interface RuleStatus {
  name: string;
  rule: Rule;
  /** The backend's sentence: "status is one of open, closed". */
  description: string;
  built: boolean;
  declared: boolean;
}

/** The fields a rule reads. */
export function ruleFields(rule: Rule): string[] {
  if (rule.exactlyOne) return rule.exactlyOne;
  if (rule.allOrNone) return rule.allOrNone;
  return rule.field ? [rule.field] : [];
}

/** The single-field rules on one field. */
export function rulesOn(field: string, checks: RuleStatus[] | undefined): Rule[] {
  return (checks || []).filter((c) => c.declared && c.rule.field === field).map((c) => c.rule);
}

/** What kind a stored column is, read back: a String with a one-of rule is a Choice. */
export function kindOf(col: Column, checks?: RuleStatus[]): Kind {
  if (col.type === 'String' && rulesOn(col.name, checks).some((r) => r.oneOf)) return kindById('choice');
  return KINDS.find((k) => k.storage === col.type && k.id !== 'choice') || { id: 'anything', label: col.type, line: '', icon: '?', storage: col.type };
}

/**
 * The columns with their rules folded in, for the record controls (AC2: a Choice
 * is a select; a bounded number is a bounded input). Never sent back.
 */
export function withRules(columns: Column[], checks: RuleStatus[] | undefined): Column[] {
  if (!checks || !checks.length) return columns;
  return columns.map((c) => {
    const rules = rulesOn(c.name, checks);
    if (!rules.length) return c;
    const out: Column = { ...c };
    rules.forEach((r) => {
      if (r.oneOf) out.allowed = r.oneOf;
      if (r.min !== undefined) out.min = r.min;
      if (r.max !== undefined) out.max = r.max;
      if (r.maxLength !== undefined) out.maxLength = r.maxLength;
      if (r.looksLike) out.looksLike = r.looksLike;
      if (r.whole) out.whole = true;
    });
    return out;
  });
}

// ------------------------------------------------------------------- draft --

/** What the drawer edits. Strings for everything typed, so a half-typed number is kept. */
export interface FieldDraft {
  kind: KindId;
  name: string;
  description: string;
  required: boolean;
  unique: boolean;
  /** Text / Number: the default as typed. Choice: one of `values` or ''. */
  dflt: string;
  /** Yes / No: whether a default is set, and what it is. Never a word (AC8). */
  boolDefaultSet: boolean;
  boolDefault: boolean;
  /** Text. */
  maxLength: string;
  looksLike: '' | 'email' | 'url';
  /** Number. */
  min: string;
  max: string;
  whole: boolean;
  /** Choice. */
  values: string[];
  /** Link / Links. */
  target: string;
}

export function blankDraft(kind: KindId = 'text'): FieldDraft {
  return {
    kind,
    name: '',
    description: '',
    required: false,
    unique: false,
    dflt: '',
    boolDefaultSet: false,
    boolDefault: false,
    maxLength: '',
    looksLike: '',
    min: '',
    max: '',
    whole: false,
    values: [],
    target: ''
  };
}

/** Whether this kind takes a default at all (a stored `DEFAULT`, on both engines). */
export function takesDefault(kind: KindId): boolean {
  return kind === 'text' || kind === 'number' || kind === 'yesno' || kind === 'choice';
}

/** Whether this kind can be unique (an index over one column of a comparable type). */
export function takesUnique(kind: KindId): boolean {
  return kind === 'text' || kind === 'number' || kind === 'date' || kind === 'choice' || kind === 'link';
}

export interface DraftContext {
  /** The names already on the collection. */
  taken: string[];
  /** Every collection, for a Link's target. */
  collections: string[];
  /**
   * How many records the collection already holds (0 for a new one, or one
   * still empty). Both engines add a required column to a table with rows only
   * with a default — the rows already there must get a value (§6) — so here
   * that is the rule the drawer shows, not a sentence the engine throws.
   */
  records: number;
}

const num = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return isNaN(n) ? NaN : n;
};

/** The sentence that refuses the draft, or null when it can be added. */
export function draftProblem(d: FieldDraft, ctx: DraftContext): string | null {
  const n = d.name.trim();
  const problem = validName(n, ctx.taken, 'The field');
  if (problem) return problem;
  const kind = kindById(d.kind);
  if ((d.kind === 'link' || d.kind === 'links') && !d.target) return 'Choose the collection it points at.';
  if ((d.kind === 'link' || d.kind === 'links') && ctx.collections.indexOf(d.target) === -1) return 'There is no collection called ' + d.target + '.';
  if (d.kind === 'choice') {
    if (!d.values.length) return 'A choice needs at least one value.';
    if (d.dflt && d.values.indexOf(d.dflt) === -1) return 'The default must be one of the choices.';
  }
  if (d.kind === 'number') {
    const lo = num(d.min);
    const hi = num(d.max);
    if (lo !== null && isNaN(lo)) return 'The minimum must be a number.';
    if (hi !== null && isNaN(hi)) return 'The maximum must be a number.';
    if (lo !== null && hi !== null && lo > hi) return 'The minimum is above the maximum.';
    const df = num(d.dflt);
    if (df !== null && isNaN(df)) return 'The default must be a number.';
    if (df !== null && d.whole && !Number.isInteger(df)) return 'The default must be a whole number.';
    if (df !== null && lo !== null && df < lo) return 'The default is below the minimum.';
    if (df !== null && hi !== null && df > hi) return 'The default is above the maximum.';
    if (d.whole && lo !== null && !Number.isInteger(lo)) return 'With whole numbers only, the minimum is a whole number too.';
    if (d.whole && hi !== null && !Number.isInteger(hi)) return 'With whole numbers only, the maximum is a whole number too.';
  }
  if (d.kind === 'text') {
    const ml = num(d.maxLength);
    if (ml !== null && (isNaN(ml) || !Number.isInteger(ml) || ml < 1)) return 'The max length is a whole number of at least 1.';
    if (ml !== null && d.dflt.length > ml) return 'The default is longer than the max length.';
  }
  if (d.required && ctx.records > 0 && !takesDefault(kind.id)) {
    return 'A required ' + kind.label + ' can only be added while the collection is empty: the ' + recordsWord(ctx.records) + ' already here would have nothing in it.';
  }
  if (d.required && ctx.records > 0 && !hasDefault(d)) {
    return 'A required field needs a default here, so the ' + recordsWord(ctx.records) + ' already in the collection get a value.';
  }
  return null;
}

export function recordsWord(n: number): string {
  return n === 1 ? '1 record' : n + ' records';
}

/**
 * AC5 — what the drawer says beside Default. With no records yet, a required
 * field has no default (every record must say it), so the control is disabled
 * with this reason. With records, the default is what those records get, so
 * it is asked for instead.
 */
export function defaultRule(d: FieldDraft, records: number): { disabled: boolean; why: string } {
  if (!takesDefault(d.kind)) return { disabled: true, why: '' };
  if (!d.required) return { disabled: false, why: '' };
  if (records > 0) return { disabled: false, why: 'The ' + recordsWord(records) + ' already here get this value; new records must say it.' };
  return { disabled: true, why: 'A required field has no default: every record must say it.' };
}

/** Whether the draft carries a default value. */
export function hasDefault(d: FieldDraft): boolean {
  if (d.kind === 'yesno') return d.boolDefaultSet;
  if (!takesDefault(d.kind)) return false;
  return d.dflt.trim() !== '';
}

/** The column to send: `POST /admin/schema {action:'addColumn', column}`. */
export function toColumn(d: FieldDraft): Column {
  const kind = kindById(d.kind);
  const column: Column = { name: d.name.trim(), type: kind.storage };
  if (d.kind === 'link' || d.kind === 'links') column.targetClass = d.target;
  if (d.required) column.required = true;
  if (d.description.trim()) column.description = d.description.trim();
  if (d.kind === 'yesno') {
    if (d.boolDefaultSet) column.defaultValue = d.boolDefault;
  } else if (d.kind === 'number') {
    const df = num(d.dflt);
    if (df !== null && !isNaN(df)) column.defaultValue = df;
  } else if (d.kind === 'text' || d.kind === 'choice') {
    if (d.dflt.trim()) column.defaultValue = d.dflt.trim();
  }
  return column;
}

/** The single-field rules the draft declares on its column. */
export function toRules(d: FieldDraft): Rule[] {
  const field = d.name.trim();
  const out: Rule[] = [];
  if (d.kind === 'choice') out.push({ field, oneOf: d.values.slice() });
  if (d.kind === 'text') {
    const ml = num(d.maxLength);
    if (ml !== null && !isNaN(ml)) out.push({ field, maxLength: ml });
    if (d.looksLike) out.push({ field, looksLike: d.looksLike });
  }
  if (d.kind === 'number') {
    const lo = num(d.min);
    const hi = num(d.max);
    const range: Rule = { field };
    if (lo !== null && !isNaN(lo)) range.min = lo;
    if (hi !== null && !isNaN(hi)) range.max = hi;
    if (range.min !== undefined || range.max !== undefined) out.push(range);
    if (d.whole) out.push({ field, whole: true });
  }
  return out;
}

/**
 * The FULL check list to push (`setChecks` takes the whole declaration): the
 * collection's rules with this field's single-field rules replaced.
 */
export function mergeRules(existing: RuleStatus[] | undefined, field: string, mine: Rule[]): Rule[] {
  const kept = (existing || []).filter((c) => c.declared && c.rule.field !== field).map((c) => c.rule);
  return kept.concat(mine);
}

/** The rules with every rule that reads `field` taken out — what a drop sends first. */
export function rulesWithout(existing: RuleStatus[] | undefined, field: string): Rule[] {
  return (existing || []).filter((c) => c.declared && ruleFields(c.rule).indexOf(field) === -1).map((c) => c.rule);
}

/** A stored default, for the row: never the words true/false for a Yes / No (AC8). */
export function defaultWords(col: Column): string {
  if (col.defaultValue === undefined || col.defaultValue === null) return '';
  if (col.type === 'Boolean') return col.defaultValue === true ? 'Yes' : 'No';
  return String(col.defaultValue);
}
