/**
 * Modals, opened imperatively from anywhere: `openModal((close) => <Dialog …/>)`.
 * A `Dialog` is the frame (title, body, foot); the two confirmations every page
 * uses are here too, so a destructive press looks the same on every page.
 */
import type { ComponentChildren, VNode } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { createStore, useStore } from '../store';
import { Btn } from './ui';

interface OpenModal {
  id: number;
  render: (close: () => void) => VNode;
  onClose?: () => void;
}

const modals = createStore<{ items: OpenModal[] }>({ items: [] });
let nextId = 1;

export interface ModalHandle {
  close(): void;
}

export function openModal(render: (close: () => void) => VNode, onClose?: () => void): ModalHandle {
  const id = nextId++;
  const close = () => {
    const before = modals.get().items;
    if (!before.some((m) => m.id === id)) return;
    modals.set({ items: before.filter((m) => m.id !== id) });
    if (onClose) onClose();
  };
  modals.set({ items: [...modals.get().items, { id, render: () => render(close), onClose }] });
  return { close };
}

export function closeAllModals(): void {
  modals.set({ items: [] });
}

export function ModalHost() {
  const { items } = useStore(modals);
  return (
    <div id="modal-root">
      {items.map((m) => (
        <ModalFrame key={m.id} modal={m} />
      ))}
    </div>
  );
}

function ModalFrame({ modal }: { modal: OpenModal }) {
  const close = () => modals.set({ items: modals.get().items.filter((x) => x.id !== modal.id) });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        if (modal.onClose) modal.onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal.id]);
  return (
    <div
      class="backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          close();
          if (modal.onClose) modal.onClose();
        }
      }}
    >
      {modal.render(close)}
    </div>
  );
}

export interface DialogProps {
  title: string;
  wide?: boolean;
  children?: ComponentChildren;
  actions?: ComponentChildren;
  /** The first field focuses itself on open; pass false for read-only dialogs. */
  autoFocus?: boolean;
}

export function Dialog({ title, wide, children, actions, autoFocus = true }: DialogProps) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!autoFocus || !box.current) return;
    const first = box.current.querySelector<HTMLElement>('input:not([type=checkbox]), select, textarea, button.btn');
    if (first) setTimeout(() => first.focus(), 0);
  }, []);
  return (
    <div class={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={box}>
      <h3>{title}</h3>
      {children}
      {actions ? <div class="foot">{actions}</div> : null}
    </div>
  );
}

/**
 * A destructive confirmation that cannot be muscle-memoried away: the
 * operator types the exact name of the thing being destroyed.
 */
export function confirmDestructive(title: string, warning: string, expected: string, onConfirm: () => void, verb = 'Delete'): void {
  openModal((close) => (
    <TypedConfirm title={title} warning={warning} expected={expected} verb={verb} close={close} onConfirm={onConfirm} />
  ));
}

function TypedConfirm(props: { title: string; warning: string; expected: string; verb: string; close: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  const ready = typed === props.expected;
  return (
    <Dialog
      title={props.title}
      actions={
        <>
          <Btn onClick={props.close}>Cancel</Btn>
          <Btn
            kind="danger"
            disabled={!ready}
            onClick={() => {
              // A disabled button fires no click in a browser; under a synthetic dispatch it can.
              if (!ready) return;
              props.close();
              props.onConfirm();
            }}
          >
            {props.verb}
          </Btn>
        </>
      }
    >
      <div class="notice bad">{props.warning}</div>
      <p class="sub">Type "{props.expected}" to confirm. This cannot be undone.</p>
      <input
        type="text"
        placeholder={props.expected}
        aria-label={'Type ' + props.expected + ' to confirm'}
        style="width:100%;margin-top:8px"
        value={typed}
        onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
      />
    </Dialog>
  );
}

/** A plain yes/no for deleting records — typing a UUID back is not a safeguard anyone can use. */
export function confirmSimple(title: string, warning: string, onConfirm: () => void, verb = 'Delete'): void {
  openModal((close) => (
    <Dialog
      title={title}
      autoFocus={false}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            kind="danger"
            onClick={() => {
              close();
              onConfirm();
            }}
          >
            {verb}
          </Btn>
        </>
      }
    >
      <div class="notice bad">{warning}</div>
    </Dialog>
  ));
}
