/**
 * `DangerZone` — the red-bordered card at the bottom of a settings page
 * (BMG-001 §3.5.6). Each action goes through `confirmDestructive`: the person
 * types the name of the thing before it is destroyed. This is the one place
 * a page may reach for the danger colour outside a failure.
 */
import type { ComponentChildren } from 'preact';

import { WriteBtn } from '../ui/ui';
import { confirmDestructive } from '../ui/modal';

export function DangerZone({ children, title = 'Danger zone' }: { children?: ComponentChildren; title?: string }) {
  return (
    <div class="danger-zone">
      <div class="danger-zone-title">{title}</div>
      {children}
    </div>
  );
}

export interface DangerActionProps {
  /** The button's words. */
  label: string;
  /** One sentence on what it does, shown beside the button. */
  why: string;
  /** The confirmation's title, warning, and the name the person must type. */
  title: string;
  warning: string;
  expected: string;
  onConfirm: () => void;
  verb?: string;
}

export function DangerAction(props: DangerActionProps) {
  return (
    <div class="danger-action">
      <div class="danger-why">{props.why}</div>
      <WriteBtn kind="danger" onClick={() => confirmDestructive(props.title, props.warning, props.expected, props.onConfirm, props.verb || props.label)}>
        {props.label}
      </WriteBtn>
    </div>
  );
}
