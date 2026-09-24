/**
 * `Picker` — search-as-you-type over a fetcher (BMG-001 §3.5.1).
 *
 * Renders a LABEL (a username, a record's first text field, a function name)
 * and never an id; keyboard up/down/Enter/Escape; a "no match" state; an
 * optional *create new…* row. Every page that used to offer a `<select>` of
 * two hundred `username — objectId` rows uses this instead.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

export interface PickerProps<T> {
  /** Answer the query. Called after a short pause on every keystroke, and once on focus with ''. */
  fetch: (query: string) => Promise<T[]>;
  label: (item: T) => string;
  /** A stable key per item (the id is fine HERE — it is never rendered). */
  keyOf: (item: T) => string;
  /** A second, quieter line under the label (an email, a type). Never an id. */
  detail?: (item: T) => string;
  value: T | null;
  onPick: (item: T | null) => void;
  placeholder?: string;
  /** When set, a query with no exact match offers this row. */
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  emptyText?: string;
}

export function Picker<T>(props: PickerProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const search = (q: string) => {
    const mine = ++seq.current;
    setLoading(true);
    props
      .fetch(q)
      .then((found) => {
        if (mine !== seq.current) return;
        setItems(found);
        setActive(0);
        setLoading(false);
      })
      .catch(() => {
        if (mine !== seq.current) return;
        setItems([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 150);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, open]);

  useEffect(() => {
    if (props.autoFocus && input.current) input.current.focus();
  }, []);

  const exact = items.some((i) => props.label(i).toLowerCase() === query.trim().toLowerCase());
  const canCreate = !!props.onCreate && query.trim() !== '' && !exact && !loading;
  const rows = items.length + (canCreate ? 1 : 0);

  const choose = (index: number) => {
    if (index < items.length) {
      props.onPick(items[index]);
      setOpen(false);
      setQuery('');
    } else if (canCreate && props.onCreate) {
      props.onCreate(query.trim());
      setOpen(false);
      setQuery('');
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(rows ? (active + 1) % rows : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(rows ? (active - 1 + rows) % rows : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows) choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (props.value && !open) {
    return (
      <div class="picker picked" id={props.id}>
        <span class="picker-value" title={props.detail ? props.detail(props.value) : undefined}>
          {props.label(props.value)}
        </span>
        {props.disabled ? null : (
          <button type="button" class="picker-clear" aria-label="Clear" onClick={() => props.onPick(null)}>
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div class="picker" id={props.id}>
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={props.placeholder || 'Type to search…'}
        disabled={props.disabled}
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onInput={(e) => {
          setQuery((e.currentTarget as HTMLInputElement).value);
          setOpen(true);
        }}
        onKeyDown={onKey}
      />
      {open ? (
        <div class="picker-list" role="listbox">
          {loading && !items.length ? <div class="picker-empty">Searching…</div> : null}
          {!loading && !rows ? <div class="picker-empty">{props.emptyText || 'No match.'}</div> : null}
          {items.map((item, i) => (
            <div
              key={props.keyOf(item)}
              role="option"
              aria-selected={i === active}
              class={'picker-row' + (i === active ? ' active' : '')}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span class="picker-label">{props.label(item)}</span>
              {props.detail ? <span class="picker-detail">{props.detail(item)}</span> : null}
            </div>
          ))}
          {canCreate ? (
            <div
              role="option"
              aria-selected={active === items.length}
              class={'picker-row picker-create' + (active === items.length ? ' active' : '')}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(items.length);
              }}
              onMouseEnter={() => setActive(items.length)}
            >
              {props.createLabel ? props.createLabel(query.trim()) : 'Create "' + query.trim() + '"…'}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
