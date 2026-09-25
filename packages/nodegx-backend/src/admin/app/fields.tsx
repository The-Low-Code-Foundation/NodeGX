/**
 * One control for one column, chosen by its type — shared by Collections
 * (record drawer, cell editing) and Schema (defaults). BMG-002 §3.3: every
 * type has a control made for it, and JSON is only ever behind *Edit as JSON*,
 * which the person opens themselves.
 *
 * A control holds a RAW value (what the inputs show); `parseRaw` turns it into
 * the plain value the API wants, `undefined` for "left empty", or throws a
 * sentence naming the field. The structured types (list, object, location,
 * file, access) keep their own raw shape, so a half-typed number in a list row
 * is a state, not a JSON parse error.
 *
 * Relation is not a field value — linking is its own write (the Parse wire's
 * `AddRelation` / `RemoveRelation`), so `RelationEditor` saves as it goes.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { AclState, aclFromValue, aclToValue } from './acl';
import { api, encode, session } from './api';
import { AclCard } from './composers/AclCard';
import { KeyValueEditor, KvRow, objectFromRows, rowsFromObject } from './composers/KeyValueEditor';
import { ListEditor } from './composers/ListEditor';
import { Picker } from './composers/Picker';
import { Column, fileLabel, isSystemField, plain, shortId, toLocalInput } from './format';

export type ItemType = 'text' | 'number' | 'boolean';

export interface ListRaw {
  t: 'list';
  itemType: ItemType;
  items: Array<string | boolean>;
  /** Non-null while the person edits the list as JSON. */
  json: string | null;
}

export interface KvRaw {
  t: 'kv';
  rows: KvRow[];
  json: string | null;
}

export interface GeoRaw {
  t: 'geo';
  lat: string;
  lng: string;
}

export interface FileValue {
  __type: 'File';
  name: string;
  url: string;
}

export interface FileRaw {
  t: 'file';
  file: FileValue | null;
}

export interface AclRaw {
  t: 'acl';
  acl: AclState;
}

export type Raw = string | boolean | ListRaw | KvRaw | GeoRaw | FileRaw | AclRaw;

export interface PointerItem {
  objectId: string;
  label: string;
  detail: string;
}

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/** A list's item type, from its first element; `null` when it holds anything a row cannot edit. */
export function listItemType(value: unknown[]): ItemType | null {
  if (!value.length) return 'text';
  const first = typeof value[0];
  const t: ItemType | null = first === 'number' ? 'number' : first === 'boolean' ? 'boolean' : first === 'string' ? 'text' : null;
  if (!t) return null;
  return value.every((v) => typeof v === typeof value[0]) ? t : null;
}

/** The raw input state for a stored value. */
export function rawFrom(col: Column, value: unknown): Raw {
  const v = plain(value);
  switch (col.type) {
    case 'Boolean':
      return v === true;
    case 'Number':
      return v === null || v === undefined ? '' : String(v);
    case 'Date':
      return v ? toLocalInput(v) : '';
    case 'Pointer':
      return v === null || v === undefined ? '' : String(v);
    case 'Array': {
      const arr = Array.isArray(v) ? v : [];
      const t = listItemType(arr);
      if (!t) return { t: 'list', itemType: 'text', items: [], json: JSON.stringify(arr, null, 2) };
      return { t: 'list', itemType: t, items: arr.map((x) => (t === 'boolean' ? x === true : String(x))), json: null };
    }
    case 'Object':
      return { t: 'kv', rows: isObj(v) ? rowsFromObject(v) : [], json: null };
    case 'GeoPoint':
      return isObj(v) && typeof v.latitude === 'number' ? { t: 'geo', lat: String(v.latitude), lng: String(v.longitude) } : { t: 'geo', lat: '', lng: '' };
    case 'File':
      return { t: 'file', file: isObj(v) && typeof v.url === 'string' ? { __type: 'File', name: String(v.name || ''), url: v.url } : null };
    case 'ACL':
      return { t: 'acl', acl: aclFromValue(value) };
    default:
      return v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
}

function parseJsonText(col: Column, text: string): unknown {
  const s = text.trim();
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new Error(col.name + ' is not valid JSON: ' + (e as Error).message);
  }
}

/** The plain value, `undefined` for empty, or a thrown sentence. */
export function parseRaw(col: Column, raw: Raw): unknown {
  switch (col.type) {
    case 'Boolean':
      return raw === true;
    case 'Number': {
      const s = String(raw).trim();
      if (s === '') return undefined;
      const n = Number(s);
      if (isNaN(n)) throw new Error(col.name + ' must be a number.');
      return n;
    }
    case 'Date': {
      const s = String(raw);
      if (!s) return undefined;
      const d = new Date(s);
      if (isNaN(d.getTime())) throw new Error(col.name + ' is not a date.');
      return d.toISOString();
    }
    case 'Pointer':
      return String(raw) || undefined;
    case 'Array': {
      const r = raw as ListRaw;
      if (r.json !== null) {
        const parsed = parseJsonText(col, r.json);
        if (parsed !== undefined && !Array.isArray(parsed)) throw new Error(col.name + ' must be a list, written [ … ].');
        return parsed;
      }
      if (!r.items.length) return undefined;
      return r.items.map((item, i) => {
        if (r.itemType === 'boolean') return item === true;
        const s = String(item);
        if (r.itemType === 'number') {
          const n = Number(s.trim());
          if (s.trim() === '' || isNaN(n)) throw new Error(col.name + ': item ' + (i + 1) + ' must be a number.');
          return n;
        }
        return s;
      });
    }
    case 'Object': {
      const r = raw as KvRaw;
      if (r.json !== null) {
        const parsed = parseJsonText(col, r.json);
        if (parsed !== undefined && !isObj(parsed)) throw new Error(col.name + ' must be an object, written { … }.');
        return parsed;
      }
      if (!r.rows.length) return undefined;
      try {
        return objectFromRows(r.rows);
      } catch (e) {
        throw new Error(col.name + ': ' + (e as Error).message);
      }
    }
    case 'GeoPoint': {
      const r = raw as GeoRaw;
      const lat = r.lat.trim();
      const lng = r.lng.trim();
      if (!lat && !lng) return undefined;
      const la = Number(lat);
      const lo = Number(lng);
      if (!lat || !lng || isNaN(la) || isNaN(lo)) throw new Error(col.name + ' needs both a latitude and a longitude.');
      if (la < -90 || la > 90) throw new Error(col.name + ': latitude is between -90 and 90.');
      if (lo < -180 || lo > 180) throw new Error(col.name + ': longitude is between -180 and 180.');
      return { __type: 'GeoPoint', latitude: la, longitude: lo };
    }
    case 'File': {
      const r = raw as FileRaw;
      return r.file ? { __type: 'File', name: r.file.name, url: r.file.url } : undefined;
    }
    case 'ACL':
      // `null` is a real value here (public), never "left empty".
      return aclToValue((raw as AclRaw).acl);
    default:
      return String(raw);
  }
}

/** A record's first readable text field, and its second as the quieter line. */
export function pointerItem(r: Record<string, unknown>): PointerItem {
  const texts: string[] = [];
  for (const k of Object.keys(r)) {
    if (isSystemField(k) || k === 'ACL') continue;
    const v = r[k];
    if (typeof v === 'string' && v) texts.push(v);
  }
  const id = String(r.objectId || '');
  return { objectId: id, label: texts[0] || shortId(id), detail: texts[1] || '' };
}

/** Search a collection's records by what they say. The label is never an id. */
export async function searchRecords(collection: string, q: string): Promise<PointerItem[]> {
  const data = await api<{ results?: Array<Record<string, unknown>> }>('GET', '/api/' + encode(collection) + '?limit=200&sort=' + encode('["-createdAt"]'));
  const items = (data.results || []).map(pointerItem);
  const needle = q.trim().toLowerCase();
  return (needle ? items.filter((i) => (i.label + ' ' + i.detail).toLowerCase().includes(needle)) : items).slice(0, 20);
}

export interface FieldControlProps {
  col: Column;
  raw: Raw;
  onChange: (raw: Raw) => void;
  autoFocus?: boolean;
  /** Inline (in a cell): Enter commits, Esc cancels, leaving commits. */
  onCommit?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  id?: string;
}

export function FieldControl({ col, raw, onChange, autoFocus, onCommit, onCancel, disabled, id }: FieldControlProps) {
  const keys = (e: KeyboardEvent) => {
    if (!onCommit && !onCancel) return;
    if (e.key === 'Enter' && onCommit && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };
  const blur = () => {
    if (onCommit) onCommit();
  };
  const common = { id, disabled, autoFocus, onKeyDown: keys, onBlur: blur, 'aria-label': col.name };
  switch (col.type) {
    case 'Boolean':
      return (
        <label class="switch">
          <input type="checkbox" role="switch" {...common} onBlur={undefined} checked={raw === true} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
          <span class="switch-track" aria-hidden="true" />
          {raw === true ? 'Yes' : 'No'}
        </label>
      );
    case 'Number':
      return (
        <input
          type="number"
          step={col.whole ? 1 : 'any'}
          min={col.min}
          max={col.max}
          {...common}
          value={String(raw)}
          title="⌥↑ / ⌥↓ nudges by 10"
          onKeyDown={(e) => {
            if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault();
              const n = Number(String(raw).trim() || '0');
              if (!isNaN(n)) onChange(String(n + (e.key === 'ArrowUp' ? 10 : -10)));
              return;
            }
            keys(e);
          }}
          onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
        />
      );
    case 'Date':
      return <DateControl col={col} raw={String(raw)} onChange={onChange} common={common} inline={!!onCommit} />;
    case 'Pointer':
      return <PointerControl col={col} raw={String(raw)} onChange={onChange} onCommit={onCommit} disabled={disabled} autoFocus={autoFocus} />;
    case 'Array':
      return <ListControl col={col} raw={raw as ListRaw} onChange={onChange} disabled={disabled} />;
    case 'Object':
      return <ObjectControl col={col} raw={raw as KvRaw} onChange={onChange} disabled={disabled} />;
    case 'GeoPoint':
      return <GeoControl col={col} raw={raw as GeoRaw} onChange={onChange} disabled={disabled} />;
    case 'File':
      return <FileControl col={col} raw={raw as FileRaw} onChange={onChange} disabled={disabled} />;
    case 'ACL':
      return <AclCard state={(raw as AclRaw).acl} onChange={(acl) => onChange({ t: 'acl', acl })} disabled={disabled} />;
    default: {
      const text = String(raw);
      // BMG-003 AC2: a Choice (a String with a one-of rule) is a select of its
      // values, never a box a person can spell one wrong in.
      if (col.allowed && col.allowed.length) {
        const known = col.allowed.map(String).indexOf(text) !== -1 || text === '';
        return (
          <select {...common} value={text} onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}>
            <option value="">— none —</option>
            {col.allowed.map((v) => (
              <option key={String(v)} value={String(v)}>
                {String(v)}
              </option>
            ))}
            {known ? null : <option value={text}>{text + ' (not one of the choices)'}</option>}
          </select>
        );
      }
      if (text.indexOf('\n') !== -1 && !onCommit) {
        return <textarea id={id} disabled={disabled} autoFocus={autoFocus} rows={4} aria-label={col.name} value={text} onInput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)} />;
      }
      return (
        <input
          type={col.looksLike === 'email' ? 'email' : col.looksLike === 'url' ? 'url' : 'text'}
          maxLength={col.maxLength}
          {...common}
          value={text}
          onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
        />
      );
    }
  }
}

/** The viewer's timezone, said once beside every date control. */
function zone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

function DateControl({ col, raw, onChange, common, inline }: { col: Column; raw: string; onChange: (raw: Raw) => void; common: Record<string, unknown>; inline: boolean }) {
  const [date, time] = raw ? raw.split('T') : ['', ''];
  const set = (d: string, t: string) => onChange(d ? d + 'T' + (t || '00:00') : '');
  if (inline) return <input type="datetime-local" {...common} value={raw} onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)} />;
  return (
    <div class="field-line date-control">
      <input type="date" id={common.id as string} disabled={common.disabled as boolean} autoFocus={common.autoFocus as boolean} aria-label={col.name + ' date'} value={date || ''} onInput={(e) => set((e.currentTarget as HTMLInputElement).value, time)} />
      <input type="time" disabled={common.disabled as boolean} aria-label={col.name + ' time'} value={time || ''} onInput={(e) => set(date || toLocalInput(new Date().toISOString()).split('T')[0], (e.currentTarget as HTMLInputElement).value)} />
      <button type="button" class="btn tiny" disabled={common.disabled as boolean} onClick={() => onChange(toLocalInput(new Date().toISOString()))}>
        Now
      </button>
      {raw ? (
        <button type="button" class="btn tiny" disabled={common.disabled as boolean} aria-label={'Clear ' + col.name} onClick={() => onChange('')}>
          ✕
        </button>
      ) : null}
      <span class="hint">{zone()}</span>
    </div>
  );
}

/** A Pointer is chosen from the records it can point at, by what they say, not typed as an id. */
function PointerControl({
  col,
  raw,
  onChange,
  onCommit,
  disabled,
  autoFocus
}: {
  col: Column;
  raw: string;
  onChange: (raw: Raw) => void;
  onCommit?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [current, setCurrent] = useState<PointerItem | null>(raw ? { objectId: raw, label: shortId(raw), detail: '' } : null);
  useEffect(() => {
    if (!raw) {
      setCurrent(null);
      return;
    }
    if (current && current.objectId === raw && current.label !== shortId(raw)) return;
    if (!col.targetClass) return;
    api<Record<string, unknown>>('GET', '/api/' + encode(col.targetClass) + '/' + encode(raw))
      .then((r) => setCurrent(pointerItem(r)))
      .catch(() => setCurrent({ objectId: raw, label: shortId(raw), detail: '' }));
  }, [raw, col.targetClass]);

  return (
    <div class="field-line">
      <Picker<PointerItem>
        fetch={(q) => (col.targetClass ? searchRecords(col.targetClass, q) : Promise.resolve([]))}
        label={(i) => i.label}
        detail={(i) => i.detail}
        keyOf={(i) => i.objectId}
        value={current}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={'Search ' + (col.targetClass || 'records') + '…'}
        emptyText={'No ' + (col.targetClass || 'record') + ' matches.'}
        onPick={(item) => {
          setCurrent(item);
          onChange(item ? item.objectId : '');
          if (onCommit) setTimeout(onCommit, 0);
        }}
      />
      {raw && col.targetClass && !onCommit ? (
        <a class="btn tiny" href={'#/collections/' + encode(col.targetClass) + '/' + encode(raw)} title={'Open this ' + col.targetClass}>
          open ↗
        </a>
      ) : null}
    </div>
  );
}

/** *Edit as JSON* / *Back to the form* — the only door to JSON, opened by the person. */
function JsonToggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" class="btn tiny json-toggle" disabled={disabled} onClick={onToggle}>
      {on ? 'Back to the form' : 'Edit as JSON'}
    </button>
  );
}

function ListControl({ col, raw, onChange, disabled }: { col: Column; raw: ListRaw; onChange: (raw: Raw) => void; disabled?: boolean }) {
  const [problem, setProblem] = useState<string | null>(null);
  if (raw.json !== null) {
    return (
      <div class="json-edit">
        <textarea rows={5} spellcheck={false} disabled={disabled} aria-label={col.name + ' as JSON'} value={raw.json} onInput={(e) => onChange({ ...raw, json: (e.currentTarget as HTMLTextAreaElement).value })} />
        <div class="field-line">
          <JsonToggle
            on
            disabled={disabled}
            onToggle={() => {
              try {
                const v = parseRaw(col, raw);
                const back = rawFrom(col, v === undefined ? [] : v) as ListRaw;
                if (back.json !== null) return setProblem('This list holds values a row cannot edit (objects, lists, or mixed types). It stays JSON.');
                setProblem(null);
                onChange(back);
              } catch (e) {
                setProblem((e as Error).message);
              }
            }}
          />
          {problem ? <span class="chips-problem">{problem}</span> : null}
        </div>
      </div>
    );
  }
  return (
    <div class="struct-edit">
      <ListEditor<string | boolean>
        rows={raw.items}
        onChange={(items) => onChange({ ...raw, items })}
        blank={() => (raw.itemType === 'boolean' ? false : '')}
        addLabel="+ Add an item"
        disabled={disabled}
        renderRow={(item, update, i) =>
          raw.itemType === 'boolean' ? (
            <label class="check">
              <input type="checkbox" aria-label={col.name + ' item ' + (i + 1)} checked={item === true} disabled={disabled} onChange={(e) => update((e.currentTarget as HTMLInputElement).checked)} />
              {item === true ? 'Yes' : 'No'}
            </label>
          ) : (
            <input
              type={raw.itemType === 'number' ? 'number' : 'text'}
              step="any"
              class="kv-value"
              aria-label={col.name + ' item ' + (i + 1)}
              value={String(item)}
              disabled={disabled}
              onInput={(e) => update((e.currentTarget as HTMLInputElement).value)}
            />
          )
        }
      />
      <div class="field-line">
        <select
          aria-label={col.name + ' item type'}
          value={raw.itemType}
          disabled={disabled || raw.items.length > 0}
          title={raw.items.length ? 'Remove the items to change what the list holds.' : undefined}
          onChange={(e) => onChange({ ...raw, itemType: (e.currentTarget as HTMLSelectElement).value as ItemType })}
        >
          <option value="text">A list of text</option>
          <option value="number">A list of numbers</option>
          <option value="boolean">A list of yes / no</option>
        </select>
        <JsonToggle on={false} disabled={disabled} onToggle={() => onChange({ ...raw, json: JSON.stringify(safe(() => parseRaw(col, raw)) || [], null, 2) })} />
      </div>
    </div>
  );
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

function ObjectControl({ col, raw, onChange, disabled }: { col: Column; raw: KvRaw; onChange: (raw: Raw) => void; disabled?: boolean }) {
  const [problem, setProblem] = useState<string | null>(null);
  if (raw.json !== null) {
    return (
      <div class="json-edit">
        <textarea rows={5} spellcheck={false} disabled={disabled} aria-label={col.name + ' as JSON'} value={raw.json} onInput={(e) => onChange({ ...raw, json: (e.currentTarget as HTMLTextAreaElement).value })} />
        <div class="field-line">
          <JsonToggle
            on
            disabled={disabled}
            onToggle={() => {
              try {
                const v = parseRaw(col, raw);
                setProblem(null);
                onChange({ t: 'kv', rows: rowsFromObject(v || {}), json: null });
              } catch (e) {
                setProblem((e as Error).message);
              }
            }}
          />
          {problem ? <span class="chips-problem">{problem}</span> : null}
        </div>
      </div>
    );
  }
  return (
    <div class="struct-edit">
      <KeyValueEditor rows={raw.rows} onChange={(rows) => onChange({ ...raw, rows })} disabled={disabled} />
      <div class="field-line">
        <JsonToggle on={false} disabled={disabled} onToggle={() => onChange({ ...raw, json: JSON.stringify(safe(() => parseRaw(col, raw)) || {}, null, 2) })} />
      </div>
    </div>
  );
}

function GeoControl({ col, raw, onChange, disabled }: { col: Column; raw: GeoRaw; onChange: (raw: Raw) => void; disabled?: boolean }) {
  const [problem, setProblem] = useState<string | null>(null);
  const locate = () => {
    if (!navigator.geolocation) return setProblem('This browser cannot tell where you are.');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setProblem(null);
        onChange({ t: 'geo', lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) });
      },
      (e) => setProblem(e.message || 'Your location was not shared.')
    );
  };
  return (
    <div class="field-line geo-control">
      <input type="number" step="any" min={-90} max={90} placeholder="Latitude" aria-label={col.name + ' latitude'} value={raw.lat} disabled={disabled} onInput={(e) => onChange({ ...raw, lat: (e.currentTarget as HTMLInputElement).value })} />
      <input type="number" step="any" min={-180} max={180} placeholder="Longitude" aria-label={col.name + ' longitude'} value={raw.lng} disabled={disabled} onInput={(e) => onChange({ ...raw, lng: (e.currentTarget as HTMLInputElement).value })} />
      <button type="button" class="btn tiny" disabled={disabled} onClick={locate}>
        Use my location
      </button>
      {problem ? <span class="chips-problem">{problem}</span> : null}
    </div>
  );
}

function bytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

/**
 * The path and query of a URL the backend wrote. It builds file URLs on its
 * own loopback address (`http://127.0.0.1:<port>/files/…`), which is not the
 * address a browser reached a hosted backend on; the page is served by the
 * same backend, so the path is the part that is true for the viewer.
 */
export function samePath(url: string): string {
  const m = /^[a-z]+:\/\/[^/]+(\/.*)$/i.exec(url);
  return m ? m[1] : url;
}

function FileControl({ col, raw, onChange, disabled }: { col: Column; raw: FileRaw; onChange: (raw: Raw) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setProblem(null);
    try {
      const headers: Record<string, string> = { 'content-type': file.type || 'application/octet-stream' };
      const { token } = session.get();
      if (token) headers.authorization = 'Bearer ' + token;
      const res = await fetch('/files/' + encode(file.name), { method: 'POST', headers, body: file });
      const json = await res.json().catch(() => null);
      if (res.status >= 400 || !json || !json.url) throw new Error((json && (json.error || json.message)) || 'The upload was refused (HTTP ' + res.status + ').');
      setSize(file.size);
      onChange({ t: 'file', file: { __type: 'File', name: json.name, url: json.url } });
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pick = (files: FileList | null) => {
    if (files && files[0]) upload(files[0]);
  };

  // An <img> or a link cannot send the admin credential, and a file may be
  // private: show and download it through a short-lived signed URL.
  const [signed, setSigned] = useState<string | null>(null);
  const stored = raw.file ? raw.file.name : '';
  useEffect(() => {
    setSigned(null);
    if (!stored) return;
    api<{ url: string }>('GET', '/files/' + encode(stored) + '/sign')
      .then((d) => setSigned(samePath(d.url)))
      .catch(() => setSigned(raw.file ? samePath(raw.file.url) : null));
  }, [stored]);

  if (raw.file) {
    const image = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(raw.file.name);
    const href = signed || samePath(raw.file.url);
    return (
      <div class="file-card">
        {image && signed ? <img class="file-thumb" src={signed} alt="" /> : <span class="file-icon" aria-hidden="true">▤</span>}
        <span class="file-text">
          <b>{fileLabel(raw.file.name)}</b>
          {size !== null ? <span class="hint">{bytes(size)}</span> : null}
        </span>
        <a class="btn tiny" href={href} download={fileLabel(raw.file.name)} target="_blank" rel="noopener">
          Download
        </a>
        {disabled ? null : (
          <button type="button" class="btn tiny" aria-label={'Remove ' + col.name} onClick={() => onChange({ t: 'file', file: null })}>
            ✕
          </button>
        )}
      </div>
    );
  }
  return (
    <div
      class={'dropzone' + (over ? ' over' : '')}
      role="button"
      tabIndex={0}
      aria-label={'Upload ' + col.name}
      onClick={() => !disabled && input.current && input.current.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && input.current) {
          e.preventDefault();
          input.current.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) pick(e.dataTransfer ? e.dataTransfer.files : null);
      }}
    >
      <input ref={input} type="file" hidden disabled={disabled} onChange={(e) => pick((e.currentTarget as HTMLInputElement).files)} />
      {busy ? 'Uploading…' : 'Drop a file here, or click to choose one'}
      {problem ? <span class="chips-problem">{problem}</span> : null}
    </div>
  );
}

/**
 * A Relation: the linked records as chips, a Picker to link another, ✕ to
 * unlink. Reads through `$relatedTo`; each change is saved at once through
 * the Parse wire (`AddRelation` / `RemoveRelation`), the op the runtime sends.
 */
export function RelationEditor({ collection, id, col, disabled }: { collection: string; id: string; col: Column; disabled?: boolean }) {
  const [linked, setLinked] = useState<PointerItem[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const target = col.targetClass || '';

  const load = () => {
    if (!target) return;
    const where = { $relatedTo: { object: { __type: 'Pointer', className: collection, objectId: id }, key: col.name } };
    api<{ results?: Array<Record<string, unknown>> }>('GET', '/api/' + encode(target) + '?limit=200&where=' + encode(JSON.stringify(where)))
      .then((d) => setLinked((d.results || []).map(pointerItem)))
      .catch((e) => setProblem((e as Error).message));
  };
  useEffect(load, [collection, id, col.name]);

  const op = (kind: 'AddRelation' | 'RemoveRelation', objectId: string) =>
    api('PUT', '/classes/' + encode(collection) + '/' + encode(id), { [col.name]: { __op: kind, objects: [{ __type: 'Pointer', className: target, objectId }] } })
      .then(() => {
        setProblem(null);
        load();
      })
      .catch((e) => setProblem((e as Error).message));

  if (!target) return <span class="hint">This relation has no target collection.</span>;
  return (
    <div class="chips relation">
      <div class="chips-set">
        {(linked || []).map((item) => (
          <span class="chip accent" key={item.objectId}>
            <a href={'#/collections/' + encode(target) + '/' + encode(item.objectId)}>{item.label}</a>
            {disabled ? null : (
              <button type="button" class="chip-x" aria-label={'Unlink ' + item.label} onClick={() => op('RemoveRelation', item.objectId)}>
                ✕
              </button>
            )}
          </span>
        ))}
        {linked && !linked.length ? <span class="hint">Nothing linked yet.</span> : null}
        {!linked ? <span class="hint">Loading…</span> : null}
      </div>
      {disabled ? null : (
        <Picker<PointerItem>
          fetch={(q) => searchRecords(target, q).then((found) => found.filter((f) => !(linked || []).some((l) => l.objectId === f.objectId)))}
          label={(i) => i.label}
          detail={(i) => i.detail}
          keyOf={(i) => i.objectId}
          value={null}
          placeholder={'Link a ' + target + '…'}
          emptyText={'No other ' + target + ' matches.'}
          onPick={(item) => {
            if (item) op('AddRelation', item.objectId);
          }}
        />
      )}
      <span class="hint">Linking and unlinking are saved as you go.</span>
      {problem ? <span class="chips-problem">{problem}</span> : null}
    </div>
  );
}
