/**
 * `ListEditor` — rows with ✕ and *+ Add*, each row a slot (BMG-001 §3.5.3).
 * The row's contents are the caller's; this owns the list.
 */
import type { ComponentChildren } from 'preact';

export interface ListEditorProps<T> {
  rows: T[];
  onChange: (rows: T[]) => void;
  /** A new, blank row. */
  blank: () => T;
  renderRow: (row: T, update: (next: T) => void, index: number) => ComponentChildren;
  addLabel?: string;
  removeTitle?: string;
  disabled?: boolean;
  /** When set, the list refuses to go below this many rows. */
  min?: number;
  /** Something to say above the first row (a header line), optional. */
  head?: ComponentChildren;
  id?: string;
}

export function ListEditor<T>(props: ListEditorProps<T>) {
  const update = (i: number, next: T) => props.onChange(props.rows.map((r, j) => (j === i ? next : r)));
  const remove = (i: number) => props.onChange(props.rows.filter((_, j) => j !== i));
  const canRemove = props.rows.length > (props.min || 0);
  return (
    <div class="list-editor" id={props.id}>
      {props.head}
      {props.rows.map((row, i) => (
        <div class="list-row" key={i}>
          {props.renderRow(row, (next) => update(i, next), i)}
          {props.disabled ? null : (
            <button
              type="button"
              class="btn tiny list-x"
              title={props.removeTitle || 'Remove this row'}
              aria-label={props.removeTitle || 'Remove this row'}
              disabled={!canRemove}
              onClick={() => remove(i)}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {props.disabled ? null : (
        <button type="button" class="btn tiny list-add" onClick={() => props.onChange([...props.rows, props.blank()])}>
          {props.addLabel || '+ Add'}
        </button>
      )}
    </div>
  );
}
