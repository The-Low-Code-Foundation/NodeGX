/**
 * The registry (NSP-012) — the fourth seam of the world: the shared, id-keyed store of RECORDS
 * (the runtime's `Model`, `packages/noodl-runtime/src/model.ts`) and ARRAYS (its `Collection`,
 * `src/collection.ts`) that the data nodes read and write. An Object node with id `x` in one
 * component and an Object node with id `x` in another are the SAME record; an Array node, an
 * Insert and a Repeater naming `cart` hold ONE array. The node alone is pure only in the sense
 * that its behaviour is a function of (state, inputs, the registry before) → (patch, the
 * registry after): the registry is the fourth input and the second output.
 *
 * THE RULE EVERY TARGET SHARES (the interpreter uses this file; the runtime target resets the
 * runtime's own two tables for a play and seeds them from the same script):
 *
 *   REGISTRY. One registry per play, empty but for what the world's script seeds. Records and
 *             arrays are reached BY NAME, create-on-read: `model(id)` / `collection(name)` hand
 *             back the one entry with that name, making it if there is none (`Model.get`,
 *             `Collection.get`). A name is `String(id)` — `7` and `'7'` are one record, as a plain
 *             object's keys make them (model.ts :79-86); `null` names the record `'null'` — while
 *             the entry KEEPS the raw value that first named it as its id (`new Model(id, …)`,
 *             :101-104; `_id: name`, collection.ts :769-777), so an Array node bound to `7`
 *             publishes the number 7. With NO
 *             name (`undefined`) an ANONYMOUS entry is minted under a 10-character guid drawn
 *             from the world's random source — ten draws per guid, model.ts :297-311, the same
 *             formula here (`guid`) — so an anonymous id is deterministic under a seed, and the
 *             order a node mints in is the order the stream is consumed in. Spelling an
 *             anonymous id later reaches the same entry (promotion, :228-234). `exists(id)` is
 *             true for both tiers. The runtime holds anonymous entries weakly; within one play
 *             nothing a node still names is ever collected, so this registry holds them for the
 *             play — the one place the two can differ is `exists` on an anonymous id nothing
 *             references any more, which no spec reads.
 *
 *             A RECORD holds `data` and notifies `change` per key written: `set(name, value)`
 *             notifies when the value DIFFERS (`!==`) or when `forceChange` is asked; `silent`
 *             mutes it; `resolve` follows a dotted path through records (:359-384). A record is
 *             handed out behind a Proxy — `record.title` reads `get('title')`, `record.title = x`
 *             writes `set` (:110-134) — because a Function or a map script may touch it either way.
 *             `toJSON` is the data plus `id` (:406-408): that is the record's wire form
 *             (canonical.ts).
 *
 *             An ARRAY is a real JavaScript array of records with a name (`getId`) and listeners.
 *             Five verbs notify: `add` (appends unless already a member, :658-672), `addAtIndex`,
 *             `remove` (a non-member is a silent no-op, :674-682), `removeAtIndex`, and `set(src)`
 *             — the DIFF (:480-617): plain objects become records (the same plain object becomes
 *             the same record every time this array sees it, F50; one with an `id` field names
 *             a record, one without mints an anonymous one — a draw), then every member not in
 *             the new set is removed, members are reordered or inserted in place, the rest
 *             appended; the structural events fire per item and exactly ONE `change` fires at
 *             the end, and NONE when nothing moved (`set([])` on an empty array is silent). Its
 *             wire form is `{ "$array": name, "items": [records] }` (canonical.ts).
 *
 *             A NOTIFICATION IS SYNCHRONOUS at the write, on every target (model.ts :329-337,
 *             collection.ts :619-648), and reaches every OTHER watching node's `change` handler
 *             before the next step. A node's reaction to ITS OWN write is written in the reducer
 *             that writes, beside the write: the runtime runs the node's listener inside the
 *             write (modelnode2.ts :107-116, variablenode2.ts :62-68, collectionnode2.ts :70-86),
 *             so a pulse the reaction sends sits exactly where the write sits among the frame's
 *             other pulses — a handler run after the reducer could not keep that order. The
 *             interpreter therefore never hands a node its own write; `set` on an array returns
 *             whether it notified, so a writer knows whether a listener would have run.
 *
 * Every rule above is read from the two runtime files; the line numbers are for the reader with
 * the files, never the only place a rule is stated.
 */

import type { Random } from './world';

/** What the world's script seeds the registry with: named records with their data, named arrays with their members by id. */
export interface RegistryScript {
  models?: Record<string, Record<string, unknown>>;
  collections?: Record<string, readonly string[]>;
  /**
   * NSP-014 s21: the class a record was LOADED with — what `CloudStore._fromJSON` stamps on a record a Query Records or
   * Record node read from a backend (`model._class = collectionName`, cloudstore.js :407-424). A record made by name has
   * none. Seeded after `models`, on the record of that id (made if absent).
   */
  classes?: Record<string, string>;
}

/** The change a record notifies: one key. */
export interface RecordChange {
  name: string;
  value: unknown;
  old: unknown;
}

/** A record as a spec (and a map script) reads it — behind the Proxy. */
export interface RecordRef {
  readonly id: string;
  readonly data: Record<string, unknown>;
  getId(): string;
  get(name: string, args?: { resolve?: boolean }): unknown;
  set(name: string, value: unknown, args?: { resolve?: boolean; silent?: boolean; forceChange?: boolean }): void;
  toJSON(): Record<string, unknown>;
  /** The Proxy reads any other name through to `get` and writes it through to `set`. */
  [key: string]: unknown;
}

/** An array as a spec reads it. */
export interface CollectionRef extends Array<RecordRef> {
  getId(): string;
  size(): number;
  get(index: number): RecordRef | undefined;
  contains(item: unknown): boolean;
  add(item: RecordRef): void;
  addAtIndex(item: RecordRef, index: number): void;
  remove(item: RecordRef): void;
  removeAtIndex(index: number): void;
  /** The diff — see the header. `src` may be an array of records or plain objects, a collection, or nothing (empties). Returns whether a `change` was notified. */
  set(src: unknown): boolean;
  /** The array itself (the runtime's `items` is the memoised Proxy of the raw array; here they are one object). */
  readonly items: CollectionRef;
}

/** The registry as a REDUCER reads and writes it (spec.ts `WorldView.registry`). */
export interface RegistryView {
  /** `Model.get(id)`: the record named `id`, made if absent; with no id, a fresh anonymous one (a guid draw). */
  model(id?: unknown): RecordRef;
  /** `Model.create(data)`: the record named `data.id` (anonymous when there is none), with every other key of `data` set. */
  create(data?: unknown): RecordRef;
  /** `Model.exists(id)` — both tiers. Never creates. */
  modelExists(id: unknown): boolean;
  /** `Collection.get(name)`: the array named `name`, made if absent; with no name, a fresh anonymous one (a guid draw). */
  collection(name?: unknown): CollectionRef;
  /** `Collection.create(items)`: a fresh anonymous array (a draw), then `set(items)` when any were handed. */
  collectionCreate(items?: unknown): CollectionRef;
  /** `Collection.exists(name)`. Never creates. */
  collectionExists(name: unknown): boolean;
  /** `Model.instanceOf` / `Collection.instanceOf`: whether a value is one of this registry's entries. */
  isRecord(value: unknown): value is RecordRef;
  isCollection(value: unknown): value is CollectionRef;
  /** `Model.guid()`: ten draws from the world's random source, the runtime's own formula. */
  guid(): string;
}

/** Marks a registry entry so the interpreter never deep-freezes one that lands in a spec's state or inputs. */
export const REGISTRY_ENTRY = Symbol.for('nodegx.node-spec.registry-entry');

// ------------------------------------------------------------------------------------------------
// records

type Listener = (args?: unknown) => void;

class RecordImpl {
  readonly [REGISTRY_ENTRY] = true;
  listeners?: Record<string, Listener[]>;

  /** `id` is the RAW value that first named the record (model.ts :101-104); the registry keys it by `String(id)`. */
  /** `id` is the RAW value that first named the record (model.ts :101-104); the registry keys it by `String(id)`. */
  constructor(
    readonly registry: Registry,
    readonly id: string,
    readonly data: Record<string, unknown>
  ) {}

  on(event: string, listener: Listener): void {
    if (!this.listeners) this.listeners = {};
    (this.listeners[event] ??= []).push(listener);
  }
  off(event: string, listener: Listener): void {
    const l = this.listeners?.[event];
    if (!l) return;
    const i = l.indexOf(listener);
    if (i !== -1) l.splice(i, 1);
  }
  notify(event: string, args?: unknown): void {
    const l = this.listeners?.[event];
    if (!l) return;
    for (const fn of l.slice()) fn(args);
  }
  getId(): string {
    return this.id;
  }
  /** model.ts :359-384 */
  set(name: string, value: unknown, args?: { resolve?: boolean; silent?: boolean; forceChange?: boolean }): void {
    if (args && args.resolve && String(name).indexOf('.') !== -1) {
      const path = String(name).split('.');
      let model: RecordImpl = this;
      for (let i = 0; i < path.length - 1; i++) {
        const v = model.get(path[i]);
        if (this.registry.isRecord(v)) model = (v as unknown as { [RAW]: RecordImpl })[RAW];
        else return;
      }
      model.set(path[path.length - 1], value);
      return;
    }
    const forceChange = args && args.forceChange;
    const oldValue = this.data[name];
    this.data[name] = value;
    if ((forceChange || oldValue !== value) && (!args || !args.silent)) this.notify('change', { name, value, old: oldValue });
  }
  /** model.ts :390-404 */
  get(name: string, args?: { resolve?: boolean }): unknown {
    if (args && args.resolve && String(name).indexOf('.') !== -1) {
      const path = String(name).split('.');
      let model: RecordImpl = this;
      for (let i = 0; i < path.length - 1; i++) {
        const v = model.get(path[i]);
        if (this.registry.isRecord(v)) model = (v as unknown as { [RAW]: RecordImpl })[RAW];
        else return undefined;
      }
      return model.get(path[path.length - 1]);
    }
    return this.data[name];
  }
  /** model.ts :406-408 — the wire form: the data plus `id`, `id` last so it wins over a data key of that name. */
  toJSON(): Record<string, unknown> {
    return Object.assign({}, this.data, { id: this.id });
  }
}

const RAW = Symbol('nodegx.node-spec.raw-record');

/** model.ts :110-134 — the Proxy every record is handed out behind. */
const recordHandler: ProxyHandler<RecordImpl> = {
  get(target, prop, receiver) {
    if (prop === RAW) return target;
    const member = (target as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof member === 'function') return (member as (...a: unknown[]) => unknown).bind(target);
    if (prop in target) return Reflect.get(target, prop, receiver);
    return target.get(prop as string);
  },
  set(target, prop, value) {
    if (prop === '_class') (target as unknown as Record<string, unknown>)._class = value;
    else if (prop === 'id') return true; // read-only (:120-122)
    else target.set(prop as string, value);
    return true;
  },
  ownKeys(target) {
    return Reflect.ownKeys(target.data);
  },
  getOwnPropertyDescriptor(target, prop) {
    return Object.getOwnPropertyDescriptor(target.data, prop);
  }
};

// ------------------------------------------------------------------------------------------------
// arrays

class CollectionImpl extends Array<RecordRef> {
  /** Derived arrays (`map`, `filter`, `slice`) are plain arrays, as the runtime's are nameless (collection.ts :739). */
  static get [Symbol.species]() {
    return Array;
  }
  readonly [REGISTRY_ENTRY] = true;
  _id!: string;
  _registry!: Registry;
  _listeners?: Record<string, Listener[]>;
  _plainItemModels?: WeakMap<object, RecordRef>;
  _batch = { depth: 0, pendingChange: false };

  getId(): string {
    return this._id;
  }
  get items(): CollectionRef {
    return this as unknown as CollectionRef;
  }
  size(): number {
    return this.length;
  }
  get(index: number): RecordRef | undefined {
    return this[index];
  }
  contains(item: unknown): boolean {
    return this.indexOf(item as RecordRef) !== -1;
  }
  on(event: string, listener: Listener): void {
    if (!this._listeners) Object.defineProperty(this, '_listeners', { value: {}, enumerable: false, writable: true });
    (this._listeners![event] ??= []).push(listener);
  }
  off(event: string, listener: Listener): void {
    const l = this._listeners?.[event];
    if (!l) return;
    const i = l.indexOf(listener);
    if (i !== -1) l.splice(i, 1);
  }
  notify(event: string, args?: unknown): void {
    const l = this._listeners?.[event];
    if (!l) return;
    for (const fn of l.slice()) fn(args);
  }
  /** collection.ts :175-198 — one `change` per batched operation. Returns whether that `change` fired. */
  private withBatch(body: () => void): boolean {
    this._batch.depth++;
    let fired = false;
    try {
      body();
    } finally {
      this._batch.depth--;
      if (this._batch.depth === 0 && this._batch.pendingChange) {
        this._batch.pendingChange = false;
        fired = true;
        this.notify('change');
      }
    }
    return fired;
  }
  private notifyChange(): void {
    if (this._batch.depth > 0) {
      this._batch.pendingChange = true;
      return;
    }
    this.notify('change');
  }
  /** :658-672 */
  add(item: RecordRef): void {
    if (this.contains(item)) return;
    Array.prototype.push.call(this, item);
    this.notify('add', { item, index: this.length - 1 });
    this.notifyChange();
  }
  /** :684-696 */
  addAtIndex(item: RecordRef, index: number): void {
    if (this.contains(item)) return;
    Array.prototype.splice.call(this, index, 0, item);
    this.notify('add', { item, index });
    this.notifyChange();
  }
  /** :674-682 */
  remove(item: RecordRef): void {
    const idx = Array.prototype.indexOf.call(this, item);
    if (idx !== -1) this.removeAtIndex(idx);
  }
  /** :698-709 */
  removeAtIndex(idx: number): void {
    const item = this[idx];
    Array.prototype.splice.call(this, idx, 1);
    this.notify('remove', { item, index: idx });
    this.notifyChange();
  }
  /** :480-617 — the diff. Returns whether a `change` was notified (nothing moved → nothing fired). */
  set(src: unknown): boolean {
    if (src === this) return false;
    const source = (src || []) as ArrayLike<unknown>;
    const registry = this._registry;
    if (!this._plainItemModels) Object.defineProperty(this, '_plainItemModels', { value: new WeakMap(), enumerable: false, writable: true });
    const plainModels = this._plainItemModels!;

    const keyIndex = (a: ArrayLike<RecordRef>) => {
      const keys: Record<string, RecordRef> = {};
      for (let i = 0; i < a.length; i++) keys[a[i].getId()] = a[i];
      return keys;
    };

    const bItems: RecordRef[] = [];
    const length = source.length;
    for (let i = 0; i < length; i++) {
      const item = source[i];
      if (registry.isRecord(item)) {
        bItems.push(item);
        continue;
      }
      const plain = item as Record<string, unknown>;
      const isObject = typeof plain === 'object' && plain !== null;
      let model = isObject ? plainModels.get(plain) : undefined;
      if (model === undefined) {
        model = registry.create(plain); // :544 — the same conversion `Model.create` makes
        if (isObject) plainModels.set(plain, model);
      } else {
        // :547-555 — the same object, mutated in place since it was last seen
        for (const key in plain) {
          if (key === 'id') continue;
          if (model.data[key] !== plain[key]) model.set(key, plain[key]);
        }
      }
      bItems.push(model);
    }

    return this.withBatch(() => {
      const aItems = this;
      const aKeys = keyIndex(aItems);
      const bKeys = keyIndex(bItems);
      const has = (keys: Record<string, RecordRef>, id: string) => Object.prototype.hasOwnProperty.call(keys, id);

      let n = aItems.length;
      for (let i = 0; i < n; i++) {
        if (!has(bKeys, aItems[i].getId())) {
          this.removeAtIndex(i);
          i--;
          n--;
        }
      }
      for (let i = 0; i < Math.min(aItems.length, bItems.length); i++) {
        if (aItems[i] !== bItems[i]) {
          if (has(aKeys, bItems[i].getId())) this.remove(bItems[i]);
          this.addAtIndex(bItems[i], i);
        }
      }
      for (let i = aItems.length; i < bItems.length; i++) this.add(bItems[i]);
    });
  }
}

// ------------------------------------------------------------------------------------------------
// the registry

const GUID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789';

export class Registry implements RegistryView {
  private readonly records = new Map<string, RecordImpl>();
  private readonly proxies = new Map<string, RecordRef>();
  /** The anonymous tier: minted here, reachable by the holder of the reference — promoted on first naming. */
  private readonly anonymous = new Map<string, RecordImpl>();
  private readonly collections = new Map<string, CollectionImpl>();
  private readonly anonymousCollections = new Map<string, CollectionImpl>();

  constructor(
    private readonly random: Random,
    script?: RegistryScript
  ) {
    for (const [id, data] of Object.entries(script?.models ?? {})) {
      const m = this.model(id);
      for (const key of Object.keys(data)) m.set(key, data[key]);
    }
    for (const [name, members] of Object.entries(script?.collections ?? {})) {
      const c = this.collection(name);
      for (const id of members) c.add(this.model(id));
    }
    for (const [id, cls] of Object.entries(script?.classes ?? {})) (this.model(id) as unknown as { _class: string })._class = cls;
  }

  /** model.ts :297-311 — `_randomString(10)` over the world's `Math.random`. */
  guid(): string {
    let out = '';
    for (let i = 0; i < 10; ++i) out += GUID_CHARS[Math.floor((1 + this.random.next()) * 0x10000) % GUID_CHARS.length];
    return out;
  }

  private newRecord(id: unknown): RecordImpl {
    return new RecordImpl(this, id as string, {});
  }
  private proxyOf(instance: RecordImpl): RecordRef {
    const key = String(instance.id);
    let p = this.proxies.get(key);
    if (!p) {
      p = new Proxy(instance, recordHandler) as unknown as RecordRef;
      this.proxies.set(key, p);
    }
    return p;
  }

  /** model.ts :218-241 */
  model(id?: unknown): RecordRef {
    if (id === undefined) {
      const instance = this.newRecord(this.guid());
      this.anonymous.set(String(instance.id), instance);
      return this.proxyOf(instance);
    }
    const key = String(id);
    const named = this.records.get(key);
    if (named) return this.proxyOf(named);
    const promoted = this.anonymous.get(key);
    if (promoted) {
      this.anonymous.delete(key);
      this.records.set(key, promoted);
      return this.proxyOf(promoted);
    }
    const instance = this.newRecord(id); // the raw value is the id; the key is its string
    this.records.set(key, instance);
    return this.proxyOf(instance);
  }

  /** model.ts :243-252 — `for…in` over whatever was handed: a string's indices become keys, a number has none. */
  create(data?: unknown): RecordRef {
    const modelData = (data ? data : {}) as Record<string, unknown>;
    const m = this.model(modelData.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const key in modelData as any) {
      if (key === 'id') continue;
      m.set(key, (modelData as Record<string, unknown>)[key]);
    }
    return m;
  }

  modelExists(id: unknown): boolean {
    const key = String(id);
    return this.records.has(key) || this.anonymous.has(key);
  }

  private newCollection(name: unknown): CollectionImpl {
    const c = new CollectionImpl();
    Object.defineProperty(c, '_id', { value: name, enumerable: false, writable: false });
    Object.defineProperty(c, '_registry', { value: this, enumerable: false, writable: false });
    Object.defineProperty(c, '_batch', { value: { depth: 0, pendingChange: false }, enumerable: false, writable: true });
    return c;
  }

  /** collection.ts :789-807 */
  collection(name?: unknown): CollectionRef {
    if (name === undefined) {
      const c = this.newCollection(this.guid());
      this.anonymousCollections.set(String(c.getId()), c);
      return c as unknown as CollectionRef;
    }
    const key = String(name);
    const named = this.collections.get(key);
    if (named) return named as unknown as CollectionRef;
    const promoted = this.anonymousCollections.get(key);
    if (promoted) {
      this.anonymousCollections.delete(key);
      this.collections.set(key, promoted);
      return promoted as unknown as CollectionRef;
    }
    const c = this.newCollection(name); // the raw value is the id; the key is its string
    this.collections.set(key, c);
    return c as unknown as CollectionRef;
  }

  /** collection.ts :779-787 */
  collectionCreate(items?: unknown): CollectionRef {
    const c = this.collection();
    if (items) c.set(items);
    return c;
  }

  collectionExists(name: unknown): boolean {
    const key = String(name);
    return this.collections.has(key) || this.anonymousCollections.has(key);
  }

  isRecord(value: unknown): value is RecordRef {
    return !!value && typeof value === 'object' && (value as { [RAW]?: unknown })[RAW] instanceof RecordImpl;
  }
  isCollection(value: unknown): value is CollectionRef {
    return value instanceof CollectionImpl;
  }

  /** The listener seams the interpreter watches through — not part of a spec's view. */
  onRecord(id: unknown, listener: (change: RecordChange) => void): () => void {
    const raw = (this.model(id) as unknown as { [RAW]: RecordImpl })[RAW];
    raw.on('change', listener as Listener);
    return () => raw.off('change', listener as Listener);
  }
  onCollection(name: unknown, listener: () => void): () => void {
    const c = this.collection(name) as unknown as CollectionImpl;
    c.on('change', listener);
    return () => c.off('change', listener);
  }
}

/** Whether a value is a registry entry of ANY registry — the deep-freeze guard and the canonicaliser's test. */
export function isRegistryEntry(value: unknown): boolean {
  return !!value && typeof value === 'object' && (value as { [REGISTRY_ENTRY]?: unknown })[REGISTRY_ENTRY] === true;
}
