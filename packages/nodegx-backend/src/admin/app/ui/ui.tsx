/**
 * The page's own small vocabulary of parts. Every view is built from these;
 * they carry the phase-23 rules — azure is the action accent, RED IS DANGER
 * ONLY — and backend values reach the DOM as text (Preact escapes; the source
 * gate forbids the raw-markup prop).
 */
import type { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';

import { useSession } from '../api';

export type ChipKind = '' | 'ok' | 'warn' | 'bad' | 'accent' | 'type';

export function Chip({ kind, children, title }: { kind?: ChipKind; children?: ComponentChildren; title?: string }) {
  return (
    <span class={'chip' + (kind ? ' ' + kind : '')} title={title}>
      {children}
    </span>
  );
}

export type NoticeKind = '' | 'warn' | 'bad' | 'accent';

export function Notice({ kind, children, style }: { kind?: NoticeKind; children?: ComponentChildren; style?: string }) {
  return (
    <div class={'notice' + (kind ? ' ' + kind : '')} style={style}>
      {children}
    </div>
  );
}

export interface BtnProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'onClick'> {
  kind?: '' | 'primary' | 'danger';
  tiny?: boolean;
  onClick?: (e: MouseEvent) => void;
  children?: ComponentChildren;
}

export function Btn({ kind, tiny, children, class: cls, className, ...rest }: BtnProps) {
  const classes = ['btn', kind || '', tiny ? 'tiny' : '', String(cls || className || '')].filter(Boolean).join(' ');
  return (
    <button type="button" {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)} class={classes}>
      {children}
    </button>
  );
}

/** A button that changes something: disabled, with an explanation, for read-only admins. */
export function WriteBtn(props: BtnProps) {
  const { readonly } = useSession();
  if (!readonly) return <Btn {...props} />;
  return <Btn {...props} disabled title="The read-only admin credential cannot make changes." />;
}

export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children?: ComponentChildren }) {
  return (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p class="sub">{subtitle}</p> : null}
      {children}
    </div>
  );
}

export function Row({ children, style, class: cls }: { children?: ComponentChildren; style?: string; class?: string }) {
  return (
    <div class={'row' + (cls ? ' ' + cls : '')} style={style}>
      {children}
    </div>
  );
}

export function Card({ children, style, id, class: cls }: { children?: ComponentChildren; style?: string; id?: string; class?: string }) {
  return (
    <div class={'card' + (cls ? ' ' + cls : '')} style={style} id={id}>
      {children}
    </div>
  );
}

export function Spacer() {
  return <span style="flex:1" />;
}

export function Gap({ h = 12 }: { h?: number }) {
  return <div style={'height:' + h + 'px'} />;
}

export function Sub({ children, style }: { children?: ComponentChildren; style?: string }) {
  return (
    <p class="sub" style={style}>
      {children}
    </p>
  );
}

export function Hint({ children }: { children?: ComponentChildren }) {
  return <span class="hint">{children}</span>;
}

/** Emphasised words (a name at the head of a card). */
export function Hi({ children }: { children?: ComponentChildren }) {
  return <b class="hi">{children}</b>;
}

/** A labelled control in a column: label above, control below. */
export function Field({ label, children, style }: { label: string; children?: ComponentChildren; style?: string }) {
  return (
    <label class="field" style={style}>
      {label}
      {children}
    </label>
  );
}

export function Check({
  checked,
  onChange,
  children,
  disabled,
  style
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ComponentChildren;
  disabled?: boolean;
  style?: string;
}) {
  return (
    <label class="check" style={style}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
      {children}
    </label>
  );
}

export interface TableProps<T> {
  columns: ComponentChildren[];
  rows: T[];
  renderRow: (row: T, index: number) => ComponentChildren;
  /** What an empty list says. Every list page passes an `EmptyState` with a CTA. */
  empty?: ComponentChildren;
  class?: string;
  head?: ComponentChildren;
}

export function Table<T>({ columns, rows, renderRow, empty, class: cls, head }: TableProps<T>) {
  if (!rows.length) return <div class="scroller">{empty || <div class="empty">Nothing here yet.</div>}</div>;
  return (
    <div class="scroller">
      <table class={cls}>
        <thead>
          {head || (
            <tr>
              {columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>{rows.map((r, i) => renderRow(r, i))}</tbody>
      </table>
    </div>
  );
}

export function ActionCell({ children }: { children?: ComponentChildren }) {
  return <td class="actions">{children}</td>;
}

/** A labelled section that opens on a click. Used for what must stay one action away. */
export function Disclosure({ label, children, open: initiallyOpen }: { label: string; children?: ComponentChildren; open?: boolean }) {
  const [open, setOpen] = useState(!!initiallyOpen);
  return (
    <div class="disclose">
      <div class="disclose-head" role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}>
        <span class="jx-twist">{open ? '▾' : '▸'}</span>
        <span>{label}</span>
      </div>
      {open ? <div class="disclose-body">{children}</div> : null}
    </div>
  );
}

/** The colour a leaf wears. None of them is red — that is reserved for a step that failed. */
function leafClass(value: unknown): string {
  if (value === null || value === undefined) return 'jx-null';
  if (typeof value === 'number') return 'jx-num';
  if (typeof value === 'boolean') return 'jx-bool';
  return 'jx-str';
}

function leafText(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return '"' + value + '"';
  return String(value);
}

/**
 * The explorer: a value as a collapsible tree of ELEMENTS — never markup. Containers deeper than
 * `openTo` start collapsed, which is the difference between an explorer and a second textarea.
 */
export function JsonTree({ value, name, depth = 0, openTo = 1 }: { value: unknown; name?: string | null; depth?: number; openTo?: number }) {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object' && !isArray;
  const [open, setOpen] = useState(depth < openTo);
  if (!isArray && !isObject) {
    return (
      <div class="jx-node">
        <div class="jx-line">
          <span class="jx-twist"> </span>
          {name !== null && name !== undefined ? <span class="jx-key">{name}:</span> : null}
          <span class={'jx-val ' + leafClass(value)}>{leafText(value)}</span>
        </div>
      </div>
    );
  }
  const entries: Array<{ k: string; v: unknown }> = isArray
    ? (value as unknown[]).map((v, i) => ({ k: String(i), v }))
    : Object.keys(value as object).map((k) => ({ k, v: (value as Record<string, unknown>)[k] }));
  const meta = isArray
    ? '[' + entries.length + (entries.length === 1 ? ' item]' : ' items]')
    : '{' + entries.length + (entries.length === 1 ? ' field}' : ' fields}');
  return (
    <div class="jx-node">
      <div class="jx-line" onClick={() => setOpen(!open)}>
        <span class="jx-twist">{open ? '▾' : '▸'}</span>
        {name !== null && name !== undefined ? <span class="jx-key">{name}:</span> : null}
        <span class="jx-meta">{meta}</span>
      </div>
      {open ? (
        <div class="jx-children">
          {entries.map((e) => (
            <JsonTree key={e.k} value={e.v} name={e.k} depth={depth + 1} openTo={openTo} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Copy text to the clipboard and say so. */
export async function copyText(text: string, what = 'Copied'): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  void what;
  return false;
}
