import { nodeColorNameForModel, useNodeColorScheme } from '@noodl-hooks/useNodeColorScheme';
import React, { useEffect, useRef } from 'react';

import type { NodeGraphNode } from '@noodl-models/nodegraphmodel';

import { BaseDialog, DialogBackground } from '@noodl-core-ui/components/layout/BaseDialog';

import { HowItWorks } from './HowItWorks';
import css from './HowItWorks.module.scss';

/**
 * NSP-019 R33 — the pop-out Richard asked for (R30: "That way you can really focus on the node and
 * what it does. You don't need to see the rest of the editor for that"), over the dimmed editor.
 *
 * The editor's own centred dialog (`BaseDialog` with a backdrop, as `Modal` uses it); the body is
 * drawn by `HowItWorks`. Three things only a shell can do live here:
 *
 * - the node's colours, from the canvas's theme-aware scheme for its category (`useNodeColorScheme`),
 *   so the card on the stage is the card on the canvas in either theme;
 * - `data-keyboard-scope`: focus inside the modal is an own-surface for `utils/keyboardhandler.ts`,
 *   so no canvas shortcut runs behind it — Backspace or Delete would otherwise delete the selected
 *   node while a person reads its rules. Focus moves into the modal when it opens;
 * - Escape closes it.
 *
 * ⚠️ `BaseDialog` renders its children twice (an `inert`, zero-height measuring copy, memory:
 * BaseDialog renders every dialog twice). The copy plays the first frame once and is never
 * pressed; a drive must read the visible copy (`:not([class*=MeasuringContainer]) …`).
 */
export interface HowItWorksModalProps {
  model: NodeGraphNode;
  onClose: () => void;
}

export function HowItWorksModal({ model, onClose }: HowItWorksModalProps) {
  const scheme = useNodeColorScheme(nodeColorNameForModel(model));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const type = model.type as { displayName?: string; name?: string } | undefined;
  const typeLabel = type?.displayName || type?.name || model.typename;
  const title = (model.label as string | undefined) || typeLabel;

  return (
    <BaseDialog
      hasBackdrop
      isVisible
      background={DialogBackground.Bg1}
      onClose={onClose}
      UNSAFE_className={css['Dialog']}
    >
      <div
        ref={rootRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`How the ${typeLabel} works`}
        data-keyboard-scope="how-it-works"
        style={{ outline: 'none' }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <HowItWorks
          typeName={model.typename}
          title={title}
          typeLabel={typeLabel}
          parameters={model.parameters}
          colors={{ base: scheme.base, header: scheme.header, outline: scheme.outline, text: scheme.text }}
          onClose={onClose}
        />
      </div>
    </BaseDialog>
  );
}
