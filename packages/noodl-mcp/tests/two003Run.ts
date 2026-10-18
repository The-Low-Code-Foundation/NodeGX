/**
 * TWO-003 — run a marketplace page script the way the Function node does, against fixture rows: `Inputs`, `Outputs`
 * (values set, signals called), `Noodl.Records.query` over tables, `Noodl.CloudFunctions.run` answered by a stub,
 * `Noodl.Files.sign` answered by another, the phone's `localStorage`, the page's `Component.Object`, and `location`.
 *
 * `query` understands what the scripts send: `equalTo` (a value or a pointer), `containedIn` (ids or pointers),
 * `relatedTo` (answered from `tables.__relations`, keyed `Class:id:key`), and `and`. Anything else throws, so a script
 * that starts asking for something new fails here instead of passing on an unfiltered table.
 *
 * @module noodl-mcp/tests/two003Run
 */
export type Row = Record<string, any>;
export const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...a: unknown[]) => Promise<void>;
export const PARAMS = ['Inputs', 'Outputs', 'Noodl', 'Component', 'localStorage', 'location'];

export interface Ran {
  out: Record<string, any>;
  fired: string[];
  stored: Record<string, string>;
  kept: Record<string, unknown>;
  called: Array<[string, unknown]>;
  /** Every file `Noodl.Files.sign` was asked for, in order. */
  signed: unknown[];
}

export interface RunOptions {
  tables?: Record<string, Row[]>;
  stored?: Record<string, string>;
  kept?: Record<string, unknown>;
  cloud?: (name: string, params: Row) => unknown;
  /** The page's address; a script that sets `location.href` leaves it here. */
  location?: Row;
  /** `Noodl.Users.Current`: who the runtime holds as signed in (TWO-005), or nobody. */
  current?: Row;
  /** `Noodl.Files.sign` (TWO-005 slice 2): the link for a file, or throw to refuse it. Unset, a sign throws. */
  sign?: (file: unknown) => Row;
}

const idOf = (v: unknown) => (v && typeof v === 'object' ? String((v as Row).objectId) : String(v));

function matches(row: Row, where: Row, tables: Record<string, Row[]>, cls: string): boolean {
  return Object.entries(where || {}).every(([field, cond]) => {
    if (field === 'and') return (cond as Row[]).every((w) => matches(row, w, tables, cls));
    if (field === 'relatedTo') {
      const r = cond as { id: string; key: string; className: string };
      const ids = ((tables.__relations as unknown as Record<string, string[]>) || {})[`${r.className}:${r.id}:${r.key}`] || [];
      return ids.includes(row.objectId);
    }
    const c = cond as Row;
    const value = field === 'objectId' ? row.objectId : row[field];
    if ('equalTo' in c) return idOf(value) === idOf(c.equalTo);
    if ('containedIn' in c) return (c.containedIn as unknown[]).map(idOf).includes(idOf(value));
    throw new Error(`the fixture query can't answer ${cls}.${field}: ${JSON.stringify(c)}`);
  });
}

export async function run(script: string, inputs: Row, opts: RunOptions = {}): Promise<Ran> {
  const tables = opts.tables || {};
  const stored = opts.stored || {};
  const kept = opts.kept || {};
  const out: Record<string, any> = {};
  const fired: string[] = [];
  const called: Array<[string, unknown]> = [];
  const signed: unknown[] = [];
  const Outputs = new Proxy(out, {
    get: (_t, k) => () => fired.push(String(k)),
    set: (t, k, v) => ((t[String(k)] = v), true)
  });
  const Noodl = {
    Users: { Current: opts.current },
    Records: {
      query: async (cls: string, where: Row = {}) => (tables[cls] || []).filter((r) => matches(r, where, tables, cls))
    },
    Files: {
      sign: async (file: unknown) => {
        signed.push(file);
        if (!opts.sign) throw new Error('no sign stub');
        return opts.sign(file);
      }
    },
    CloudFunctions: {
      run: async (name: string, params: Row) => {
        called.push([name, params]);
        if (!opts.cloud) throw new Error(`no cloud stub for ${name}`);
        return opts.cloud(name, params);
      }
    }
  };
  const localStorage = { getItem: (k: string) => stored[k] ?? null, setItem: (k: string, v: string) => (stored[k] = v) };
  const Component = { Object: { get: (k: string) => kept[k], set: (k: string, v: unknown) => (kept[k] = v) } };
  await new AsyncFunction(...PARAMS, script)(inputs, Outputs, Noodl, Component, localStorage, opts.location || { href: 'https://shop.example/item/x' });
  return { out, fired, stored, kept, called, signed };
}

/** Whether a script compiles as the Function node will compile it. */
export function compiles(code: string): boolean {
  try {
    new AsyncFunction(...PARAMS, code);
    return true;
  } catch {
    return false;
  }
}
