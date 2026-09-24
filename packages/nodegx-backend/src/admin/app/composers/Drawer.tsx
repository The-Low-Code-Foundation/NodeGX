/**
 * `Drawer` — a right-hand panel with title, body, footer (BMG-001 §3.5.5).
 * Esc closes; focus is trapped inside while it is open; the URL binding is the
 * caller's (`#/collections/Pet/<id>` opens the record drawer on load, and
 * closing it navigates back to the collection).
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export interface DrawerProps {
  title: string;
  onClose: () => void;
  children?: ComponentChildren;
  footer?: ComponentChildren;
  /** A line under the title. */
  subtitle?: string;
  wide?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer(props: DrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<Element | null>(null);

  useEffect(() => {
    restore.current = document.activeElement;
    const node = panel.current;
    if (node) {
      // The first control in the BODY, not the close button in the head.
      const body = node.querySelector<HTMLElement>('.drawer-body');
      const first = (body && body.querySelector<HTMLElement>(FOCUSABLE)) || node.querySelector<HTMLElement>(FOCUSABLE);
      (first || node).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        props.onClose();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const all = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
      if (!all.length) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!node.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const back = restore.current as HTMLElement | null;
      if (back && typeof back.focus === 'function') back.focus();
    };
  }, []);

  return (
    <div class="drawer-scrim" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div class={'drawer' + (props.wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={props.title} tabIndex={-1} ref={panel}>
        <div class="drawer-head">
          <div>
            <h3>{props.title}</h3>
            {props.subtitle ? <div class="sub" style="margin:0">{props.subtitle}</div> : null}
          </div>
          <button type="button" class="btn tiny" aria-label="Close" onClick={props.onClose}>
            ✕
          </button>
        </div>
        <div class="drawer-body">{props.children}</div>
        {props.footer ? <div class="drawer-foot">{props.footer}</div> : null}
      </div>
    </div>
  );
}
