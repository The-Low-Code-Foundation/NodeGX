/**
 * One control for one column, chosen by its type — shared by Collections
 * (record form, cell editing) and Schema (defaults). The editor's data browser
 * had a form field per column type; this is that form, in this app's idiom.
 *
 * A control holds a RAW value (what the input shows); `parseRaw` turns it into
 * the plain value the API wants, `undefined` for "left empty", or throws a
 * sentence naming the field.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode } from './api';
import { Picker } from './composers/Picker';
import { Column, JSON_TYPES, isSystemField, plain, shortId, toLocalInput } from './format';

export type Raw = string | boolean;

export interface PointerItem {
  objectId: string;
  label: string;
  detail: string;
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
    default:
      if (JSON_TYPES.indexOf(col.type) !== -1) return v === null || v === undefined ? '' : JSON.stringify(v, null, 2);
      return v === null || v === undefined ? '' : String(v);
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
      return s ? new Date(s).toISOString() : undefined;
    }
    case 'Pointer':
      return String(raw) || undefined;
    default: {
      const s = String(raw);
      if (JSON_TYPES.indexOf(col.type) !== -1) {
        const text = s.trim();
        if (!text) return undefined;
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          throw new Error(col.name + ' is not valid JSON: ' + (e as Error).message);
        }
        if (col.type === 'Array' && !Array.isArray(parsed)) throw new Error(col.name + ' must be a list, written [ … ].');
        return parsed;
      }
      return s;
    }
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
    if (e.key === 'Enter' && onCommit) {
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
        <label class="check">
          <input type="checkbox" {...common} onBlur={undefined} checked={raw === true} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
          Yes
        </label>
      );
    case 'Number':
      return <input type="number" step="any" {...common} value={String(raw)} onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)} />;
    case 'Date':
      return <input type="datetime-local" {...common} value={String(raw)} onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)} />;
    case 'Pointer':
      return <PointerControl col={col} raw={String(raw)} onChange={onChange} onCommit={onCommit} disabled={disabled} autoFocus={autoFocus} />;
    default:
      if (JSON_TYPES.indexOf(col.type) !== -1) {
        return (
          <div>
            <textarea
              id={id}
              disabled={disabled}
              autoFocus={autoFocus}
              rows={4}
              spellcheck={false}
              aria-label={col.name}
              placeholder={col.type === 'Array' ? '["first", "second"]' : col.type === 'ACL' ? '{ "*": { "read": true } }' : '{ "key": "value" }'}
              value={String(raw)}
              onInput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
            />
            {col.type === 'ACL' ? (
              <span class="hint">Keys: * (everyone), a user objectId, or role:name. Empty makes the record public; {'{}'} grants nobody.</span>
            ) : null}
          </div>
        );
      }
      return <input type="text" {...common} value={String(raw)} onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)} />;
  }
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

  const fetchRecords = async (q: string): Promise<PointerItem[]> => {
    if (!col.targetClass) return [];
    const data = await api<{ results?: Array<Record<string, unknown>> }>(
      'GET',
      '/api/' + encode(col.targetClass) + '?limit=200&sort=' + encode('["-createdAt"]')
    );
    const items = (data.results || []).map(pointerItem);
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((i) => (i.label + ' ' + i.detail).toLowerCase().includes(needle)).slice(0, 20) : items.slice(0, 20);
  };

  return (
    <Picker<PointerItem>
      fetch={fetchRecords}
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
  );
}
