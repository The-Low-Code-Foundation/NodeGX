/**
 * `KeyValueEditor` — key, typed value, ✕; emits an object (BMG-001 §3.5.4).
 * Replaces every "payload (JSON)" textarea. Types: text, number, yes/no, date,
 * and JSON as the last resort for a value that is itself a list or an object.
 */
import { useState } from 'preact/hooks';

import { toLocalInput } from '../format';
import { ListEditor } from './ListEditor';

export type KvType = 'text' | 'number' | 'boolean' | 'date' | 'json';

export interface KvRow {
  key: string;
  type: KvType;
  /** The raw input state: a string for every type except boolean. */
  raw: string | boolean;
}

export const KV_TYPES: Array<{ id: KvType; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'number', label: 'Number' },
  { id: 'boolean', label: 'Yes / no' },
  { id: 'date', label: 'Date' },
  { id: 'json', label: 'JSON' }
];

/** From an object to rows, inferring each value's type. */
export function rowsFromObject(value: unknown): KvRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as object).map((key) => {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === 'boolean') return { key, type: 'boolean', raw: v };
    if (typeof v === 'number') return { key, type: 'number', raw: String(v) };
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T/.test(v) && !isNaN(new Date(v).getTime())) return { key, type: 'date', raw: toLocalInput(v) };
      return { key, type: 'text', raw: v };
    }
    return { key, type: 'json', raw: v === undefined ? '' : JSON.stringify(v) };
  });
}

/** From rows to the object. Throws a sentence naming the row that is wrong. */
export function objectFromRows(rows: KvRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  rows.forEach((row, i) => {
    const key = row.key.trim();
    if (!key) {
      if (row.raw === '' || row.raw === false) return;
      throw new Error('Row ' + (i + 1) + ' needs a name.');
    }
    if (key in out) throw new Error('"' + key + '" is listed twice.');
    switch (row.type) {
      case 'boolean':
        out[key] = row.raw === true;
        break;
      case 'number': {
        const s = String(row.raw).trim();
        if (s === '') throw new Error('"' + key + '" needs a number.');
        const n = Number(s);
        if (isNaN(n)) throw new Error('"' + key + '" must be a number.');
        out[key] = n;
        break;
      }
      case 'date': {
        const s = String(row.raw).trim();
        if (!s) throw new Error('"' + key + '" needs a date.');
        const d = new Date(s);
        if (isNaN(d.getTime())) throw new Error('"' + key + '" is not a date.');
        out[key] = d.toISOString();
        break;
      }
      case 'json': {
        const s = String(row.raw).trim();
        if (!s) throw new Error('"' + key + '" needs a value.');
        try {
          out[key] = JSON.parse(s);
        } catch (e) {
          throw new Error('"' + key + '" is not valid JSON: ' + (e as Error).message);
        }
        break;
      }
      default:
        out[key] = String(row.raw);
    }
  });
  return out;
}

export interface KeyValueEditorProps {
  rows: KvRow[];
  onChange: (rows: KvRow[]) => void;
  disabled?: boolean;
  keyPlaceholder?: string;
  id?: string;
}

export function KeyValueEditor(props: KeyValueEditorProps) {
  return (
    <ListEditor<KvRow>
      id={props.id}
      rows={props.rows}
      onChange={props.onChange}
      blank={() => ({ key: '', type: 'text', raw: '' })}
      addLabel="+ Add a value"
      disabled={props.disabled}
      renderRow={(row, update) => (
        <>
          <input
            type="text"
            class="kv-key"
            placeholder={props.keyPlaceholder || 'name'}
            aria-label="Name"
            value={row.key}
            disabled={props.disabled}
            onInput={(e) => update({ ...row, key: (e.currentTarget as HTMLInputElement).value })}
          />
          <select
            class="kv-type"
            aria-label="Type"
            value={row.type}
            disabled={props.disabled}
            onChange={(e) => {
              const type = (e.currentTarget as HTMLSelectElement).value as KvType;
              update({ ...row, type, raw: type === 'boolean' ? row.raw === true : row.type === 'boolean' ? '' : row.raw });
            }}
          >
            {KV_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <KvValue row={row} update={update} disabled={props.disabled} />
        </>
      )}
    />
  );
}

function KvValue({ row, update, disabled }: { row: KvRow; update: (next: KvRow) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  void focused;
  switch (row.type) {
    case 'boolean':
      return (
        <label class="check kv-value">
          <input type="checkbox" checked={row.raw === true} disabled={disabled} onChange={(e) => update({ ...row, raw: (e.currentTarget as HTMLInputElement).checked })} />
          {row.raw === true ? 'Yes' : 'No'}
        </label>
      );
    case 'number':
      return <input type="number" step="any" class="kv-value" aria-label="Value" value={String(row.raw)} disabled={disabled} onInput={(e) => update({ ...row, raw: (e.currentTarget as HTMLInputElement).value })} />;
    case 'date':
      return <input type="datetime-local" class="kv-value" aria-label="Value" value={String(row.raw)} disabled={disabled} onInput={(e) => update({ ...row, raw: (e.currentTarget as HTMLInputElement).value })} />;
    case 'json':
      return (
        <input
          type="text"
          class="kv-value mono"
          aria-label="Value"
          placeholder='["a", "b"] or { "k": 1 }'
          value={String(row.raw)}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => update({ ...row, raw: (e.currentTarget as HTMLInputElement).value })}
        />
      );
    default:
      return <input type="text" class="kv-value" aria-label="Value" value={String(row.raw)} disabled={disabled} onInput={(e) => update({ ...row, raw: (e.currentTarget as HTMLInputElement).value })} />;
  }
}
