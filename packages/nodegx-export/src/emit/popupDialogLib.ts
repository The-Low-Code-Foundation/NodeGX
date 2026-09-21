/**
 * `src/lib/popupDialog.ts` — the popup slot's container, emitted into the app (HLT-014 §3.5).
 *
 * The runtime's popup container became a modal dialog in HLT-014 (`noodl-viewer-react/src/popup-dialog.ts`,
 * with Escape decided by `NodeContext.cancelTopPopup`). The export rendered each popup slot as a bare
 * `<div className={styles.popupLayer}>` portal — so without this, an exported app and the editor preview
 * of the same project would disagree about whether a popup is a dialog at all, which is the second-copy
 * drift P99 exists to close. One drive, `scripts/devtools/drive-hlt014-popup.js --export`, grades both.
 *
 * The contract, transcribed:
 *
 * - `role="dialog"`, `aria-modal="true"`, `tabIndex={-1}`, named by Show Popup's `Accessible Name` or, when
 *   it has none, by the first `h1`–`h3` inside (`aria-labelledby`).
 * - Everything behind the TOP dialog is `inert`: every other child of `<body>`, and every other open dialog.
 * - Focus moves in on open and goes back to the element that opened it on close — else to the dialog now on
 *   top, else to the app — never to `body`.
 * - Escape closes the top dialog only, unless its node set `Close On Escape` off.
 *
 * ⚠️ Why a MODULE-LEVEL stack and not React context: the runtime has one popup stack per app, and two
 * components can each hold an open slot — one dialog does not contain the other in the React tree, but it
 * is on top of it. Same reason `pageStack.ts` gives for its registry.
 *
 * ⚠️ Nothing here touches `document` at import time: an exported app can be server-rendered, and the only
 * reads are inside effects and the key listener.
 */

/** Where the module lands in the exported app. */
export const POPUP_DIALOG_LIB_PATH = 'src/lib/popupDialog.ts';

/**
 * The module's source.
 *
 * ⚠️ A plain string array rather than a template literal, for `dateLib.ts`'s stated reason.
 */
export function popupDialogLibSource(): string {
  return [
    '//',
    '// A popup slot is a modal dialog — transcribed from the viewer it has to agree with:',
    '// noodl-viewer-react/src/popup-dialog.ts, and NodeContext.cancelTopPopup for Escape.',
    '//',
    '',
    "import { createElement, useLayoutEffect, useRef, type ReactNode } from 'react';",
    '',
    'interface OpenDialog {',
    '  element: HTMLElement;',
    '  opener: HTMLElement | null;',
    '  closeOnEscape: () => boolean;',
    '  cancel: () => void;',
    '}',
    '',
    '/** Open dialogs, oldest first. The last one is on top. */',
    'const open: OpenDialog[] = [];',
    'let listening = false;',
    'let titleIds = 0;',
    '',
    'const FOCUSABLE = [',
    "  'a[href]',",
    "  'area[href]',",
    "  'button:not([disabled])',",
    "  'input:not([disabled]):not([type=\"hidden\"])',",
    "  'select:not([disabled])',",
    "  'textarea:not([disabled])',",
    "  'iframe',",
    "  '[contenteditable=\"\"]',",
    "  '[contenteditable=\"true\"]',",
    "  '[tabindex]:not([tabindex=\"-1\"])'",
    "].join(',');",
    '',
    'function focusQuietly(el: HTMLElement | null | undefined): boolean {',
    '  if (!el || !el.isConnected) return false;',
    '  el.focus({ preventScroll: true });',
    '  return document.activeElement === el;',
    '}',
    '',
    '/** Everything but the top dialog is inert: the app, and every dialog beneath it. */',
    'function applyInert(): void {',
    '  const top = open.length > 0 ? open[open.length - 1].element : null;',
    '  const dialogs = open.map((d) => d.element);',
    '  // A slot portals its dialog straight into <body>, so every other body child is the app.',
    '  for (const child of Array.from(document.body.children)) {',
    '    if (dialogs.includes(child as HTMLElement)) continue;',
    "    if (top !== null) child.setAttribute('inert', '');",
    "    else child.removeAttribute('inert');",
    '  }',
    '  for (const element of dialogs) {',
    "    if (element === top) element.removeAttribute('inert');",
    "    else element.setAttribute('inert', '');",
    '  }',
    '}',
    '',
    'function onKeyDown(event: KeyboardEvent): void {',
    "  if (event.key !== 'Escape' || event.defaultPrevented) return;",
    '  const top = open[open.length - 1];',
    '  // A top dialog that opted out spends nothing — and does not let the key through to the one beneath.',
    '  if (!top || !top.closeOnEscape()) return;',
    '  event.preventDefault();',
    '  top.cancel();',
    '}',
    '',
    '/** The app, when there is nothing better to hand focus back to: the first body child that is not a dialog. */',
    'function focusApp(): void {',
    '  const app = Array.from(document.body.children).find(',
    '    (c): c is HTMLElement => c instanceof HTMLElement && !open.some((d) => d.element === c)',
    '  );',
    '  if (!app) return;',
    "  if (!app.hasAttribute('tabindex')) app.setAttribute('tabindex', '-1');",
    '  focusQuietly(app);',
    '}',
    '',
    'export interface PopupDialogProps {',
    '  className?: string;',
    "  /** Show Popup's `Accessible Name`; without it the dialog is named by its first heading. */",
    '  label?: string;',
    "  /** Show Popup's `Close On Escape` — on unless the node turned it off. */",
    '  closeOnEscape?: boolean;',
    '  /** Escape pressed while this dialog was on top. */',
    '  onCancel: () => void;',
    '  children?: ReactNode;',
    '}',
    '',
    'export function PopupDialog({ className, label, closeOnEscape = true, onCancel, children }: PopupDialogProps) {',
    '  const ref = useRef<HTMLDivElement>(null);',
    '  // Read at key time, so a re-render with new props is honoured without re-registering.',
    '  const latest = useRef({ closeOnEscape, onCancel });',
    '  latest.current = { closeOnEscape, onCancel };',
    '',
    '  useLayoutEffect(() => {',
    '    const element = ref.current;',
    '    if (!element) return;',
    '    const active = document.activeElement;',
    '    const entry: OpenDialog = {',
    '      element,',
    '      opener: active instanceof HTMLElement && active !== document.body ? active : null,',
    '      closeOnEscape: () => latest.current.closeOnEscape,',
    '      cancel: () => latest.current.onCancel()',
    '    };',
    '    open.push(entry);',
    '    if (!listening) {',
    "      document.addEventListener('keydown', onKeyDown);",
    '      listening = true;',
    '    }',
    '    applyInert();',
    '    if (!label && !element.hasAttribute(\'aria-labelledby\')) {',
    "      const heading = element.querySelector('h1, h2, h3');",
    '      if (heading) {',
    '        if (!heading.id) heading.id = `popup-title-${++titleIds}`;',
    "        element.setAttribute('aria-labelledby', heading.id);",
    '      }',
    '    }',
    '    const first = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE)).find(',
    '      (el) => el.getClientRects().length > 0',
    '    );',
    '    if (!focusQuietly(first)) focusQuietly(element);',
    '',
    '    return () => {',
    '      const index = open.indexOf(entry);',
    '      if (index !== -1) open.splice(index, 1);',
    '      applyInert();',
    '      if (open.length === 0 && listening) {',
    "        document.removeEventListener('keydown', onKeyDown);",
    '        listening = false;',
    '      }',
    '      const opener = entry.opener;',
    "      if (opener && opener.isConnected && !opener.closest('[inert]') && focusQuietly(opener)) return;",
    '      const top = open[open.length - 1];',
    '      if (!focusQuietly(top ? top.element : null)) focusApp();',
    '    };',
    '    // Mount-only, like the runtime: the opener and the focus move belong to the moment it opened.',
    '    // eslint-disable-next-line react-hooks/exhaustive-deps',
    '  }, []);',
    '',
    '  return createElement(',
    "    'div',",
    '    {',
    '      ref,',
    '      className,',
    "      role: 'dialog',",
    "      'aria-modal': true,",
    "      'aria-label': label || undefined,",
    '      tabIndex: -1',
    '    },',
    '    children',
    '  );',
    '}',
    ''
  ].join('\n');
}
