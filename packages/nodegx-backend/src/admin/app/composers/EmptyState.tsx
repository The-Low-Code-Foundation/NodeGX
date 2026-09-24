/**
 * `EmptyState` — one sentence and one primary CTA (BMG-001 §3.5.7). Every
 * list that is empty says what to do first; a list that is empty because a
 * filter matched nothing says that instead, with no CTA.
 */
import type { ComponentChildren } from 'preact';

import { WriteBtn, Btn } from '../ui/ui';

export interface EmptyStateProps {
  /** The sentence. */
  children?: ComponentChildren;
  icon?: string;
  action?: { label: string; onClick: () => void; write?: boolean };
  docs?: { label: string; href: string };
}

export function EmptyState({ children, icon, action, docs }: EmptyStateProps) {
  const Button = action && action.write !== false ? WriteBtn : Btn;
  return (
    <div class="empty-state">
      {icon ? <div class="empty-icon" aria-hidden="true">{icon}</div> : null}
      <div class="empty-text">{children}</div>
      {action ? (
        <Button kind="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {docs ? (
        <a class="empty-docs" href={docs.href} target="_blank" rel="noreferrer">
          {docs.label}
        </a>
      ) : null}
    </div>
  );
}
