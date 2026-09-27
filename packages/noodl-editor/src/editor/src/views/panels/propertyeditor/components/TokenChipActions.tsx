import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import type { StyleTokenRecord } from '@noodl-models/StyleTokensModel/TokenCategories';
import { changesEverywhereText, type TokenUsage } from '@noodl-models/StyleTokensModel/tokenUsage';

import css from './TokenChipActions.module.scss';
import { unmountReactRoot } from '../../../../../../shared/utils/unmountReactRoot';

/**
 * P103 CMG-010 §3.1 — from the field to the token, and back.
 *
 * Richard, driving P102: *"I can see 'Shadow' now has a dropdown with the option 'From a style
 * token' which is very cool, but there should be a pointer to the styles tab that jumps the user
 * to that style to edit it if they need to, to make a better connection between those two
 * points."*
 *
 * Two buttons on every token chip (CMG-009), not only the shadow's:
 *  - **✎ Edit** — for the four composer types, the composer (`openTokenComposer`) beside the
 *    field, as *Make this a token* already opens it at creation; for the other nine, a small
 *    popout with the same text editor the Styles row has. Either says what an Apply reaches:
 *    *"Changes --space-4 everywhere (14 places)"*.
 *  - **⇱ Show in Styles** — `revealStyle({ kind: 'token', name })` (CMG-005): the section opens,
 *    the row scrolls into view and is highlighted.
 *
 * 🔴 **Everything the editor's singletons touch is required at press time, not at import.**
 * This component rides on `NumberWithUnits`, `Dimension`, the padding box, `BasicType` and the
 * picker rows — the path `tests-unit/rel-014` and `hlt-012` travel under the plain-Node runner.
 * A top-level import of the token model, the project, the popup layer or the Styles route would
 * switch those gates off ([[an-import-added-for-a-feature-can-switch-a-sibling-gate-off]]).
 */
export interface TokenChipActionsProps {
  /** The stored reference, `var(--space-4)`. */
  reference: string;
  /** The port, for the test ids. */
  port: string;
}

/** `var(--space-4)` → `--space-4`; a bare name passes through. */
export function tokenNameOfReference(reference: string): string {
  const m = /^\s*var\(\s*(--[A-Za-z0-9_-]+)[^)]*\)\s*$/.exec(reference);
  return m ? m[1] : reference.trim();
}

export function TokenChipActions({ reference, port }: TokenChipActionsProps) {
  const name = tokenNameOfReference(reference);
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <span className={css['Root']} data-token-actions={name}>
      <button
        type="button"
        className={css['Action']}
        title={`Edit ${name} — changes it everywhere it is worn`}
        aria-label={`Edit ${name}`}
        data-test={`token-edit-${port}`}
        onMouseDown={stop}
        onClick={(e) => {
          stop(e);
          openTokenEdit({ name, anchor: (e.currentTarget as HTMLElement).closest('[data-token-chip]') as HTMLElement });
        }}
      >
        ✎
      </button>
      <button
        type="button"
        className={css['Action']}
        title={`Show ${name} in Styles`}
        aria-label={`Show ${name} in Styles`}
        data-test={`token-show-${port}`}
        onMouseDown={stop}
        onClick={(e) => {
          stop(e);
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('../../StylesPanel/stylesPanelRoute').revealStyle({ kind: 'token', name });
        }}
      >
        ⇱
      </button>
    </span>
  );
}

/**
 * ✎ — the composer for a composer type, the row editor for the rest. The model is built per
 * press and disposed when the popout goes, as `makeShadowToken` and `openTokenFieldPopout` do.
 */
export function openTokenEdit({ name, anchor }: { name: string; anchor: HTMLElement | null }): void {
  if (!anchor) return;
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { StyleTokensModel } = require('@noodl-models/StyleTokensModel/StyleTokensModel');
  const { isComposerCategory } = require('@nodegx/project-contract/token-codecs');
  const { openTokenComposer } = require('../../StylesPanel/composer/openTokenComposer');
  const { tokenUsageIn } = require('@noodl-models/StyleTokensModel/tokenUsage');
  const { ProjectModel } = require('@noodl-models/projectmodel');
  const { ToastLayer } = require('../../../ToastLayer/ToastLayer');
  /* eslint-enable @typescript-eslint/no-var-requires */

  const model = new StyleTokensModel();
  const token: StyleTokenRecord | undefined = model.getToken(name);
  if (!token) {
    model.dispose();
    ToastLayer.showError(`${name} is not a token of this project`);
    return;
  }
  const tokens: StyleTokenRecord[] = model.getTokens();
  if (isComposerCategory(token.category)) {
    openTokenComposer({ token, anchor, tokens, model, onClosed: () => model.dispose() });
    return;
  }
  const usage: TokenUsage = tokenUsageIn(ProjectModel.instance, tokens, name);
  openTokenRowEditor({ token, anchor, usage, model, onClosed: () => model.dispose() });
}

/**
 * The nine non-composer types: a value box with the same commit rule the Styles row has (blur or
 * Enter; empty is not an edit), *Apply* writes `setToken` with undo, and the sentence says what
 * the write reaches.
 */
export function openTokenRowEditor(args: {
  token: StyleTokenRecord;
  anchor: HTMLElement;
  usage: TokenUsage;
  model: { setToken(name: string, value: string, opts?: { undo?: boolean; label?: string }): void };
  onClosed?: () => void;
}): void {
  const { token, anchor, usage, model, onClosed } = args;
  /* eslint-disable @typescript-eslint/no-var-requires */
  const PopupLayer = require('../../../popuplayer').default;
  /* eslint-enable @typescript-eslint/no-var-requires */

  const div = document.createElement('div');
  const root = createRoot(div);
  let popout: unknown = null;
  const close = () => popout && PopupLayer.instance.hidePopout(popout);

  flushSync(() =>
    root.render(
      <TokenRowEditor
        token={token}
        usage={usage}
        onApply={(value) => {
          if (value !== token.value) model.setToken(token.name, value, { undo: true, label: `Change ${token.name}` });
          close();
        }}
        onCancel={close}
      />
    )
  );

  popout = PopupLayer.instance.showPopout({
    content: { el: div },
    attachTo: anchor,
    position: 'right',
    onClose: () => {
      unmountReactRoot(root);
      onClosed?.();
    }
  });
}

export function TokenRowEditor({
  token,
  usage,
  onApply,
  onCancel
}: {
  token: StyleTokenRecord;
  usage: TokenUsage;
  onApply: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(token.value);
  useEffect(() => setDraft(token.value), [token.value]);
  const next = draft.trim();
  const canApply = next !== '' && next !== token.value;

  return (
    <div className={css['Editor']} data-test="token-row-editor" data-token-row-editor={token.name}>
      <div className={css['EditorName']}>{token.name}</div>
      <div className={css['EditorReach']} data-test="token-row-editor-reach">
        {changesEverywhereText(token.name, usage)}
      </div>
      <input
        className={css['EditorValue']}
        value={draft}
        spellCheck={false}
        autoFocus
        aria-label={`Value for ${token.name}`}
        data-test="token-row-editor-value"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canApply) onApply(next);
          else if (e.key === 'Escape') onCancel();
        }}
      />
      <div className={css['EditorButtons']}>
        <button type="button" className={css['EditorButton']} onClick={onCancel} data-test="token-row-editor-cancel">
          Cancel
        </button>
        <button
          type="button"
          className={`${css['EditorButton']} ${css['is-primary']}`}
          disabled={!canApply}
          onClick={() => onApply(next)}
          data-test="token-row-editor-apply"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
