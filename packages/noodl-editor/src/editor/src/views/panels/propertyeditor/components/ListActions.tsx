import React, { MouseEvent } from 'react';

import { IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { IconButton, IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';

import css from './ListInputRow.module.scss';

/**
 * CHR-009 — one look for the list rows' actions. The string list (States, Model, Page Inputs, …) drew
 * `</>` and `+` borderless under the list; the prop list (Function's Script Inputs/Outputs, Page Stack,
 * access rules) drew the same two actions as Chromium's unstyled bordered `<button>` — its
 * `components-panel-edit-button` class had no rule anywhere — pinned 30px up over the group heading.
 * That overlay assumed the list was the first row of a group whose heading is shown, which a
 * single-group node (`showHeaders: false`) or a filtered panel does not give it. Both now draw this
 * bar after the list: the node head's own 26px `IconButton`s, so every icon action in the panel is one
 * kind of control.
 */
export function ListIconButton({
  icon,
  title,
  testId,
  onClick
}: {
  icon: IconName;
  title: string;
  testId?: string;
  onClick: (anchor: HTMLElement) => void;
}) {
  return (
    <span className={css['IconButton']} title={title}>
      <IconButton
        icon={icon}
        size={IconSize.Tiny}
        variant={IconButtonVariant.OpaqueOnHover}
        testId={testId}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onClick(e.currentTarget);
        }}
      />
    </span>
  );
}

export function ListActions({ onOpenCode, onAdd }: { onOpenCode: (anchor: HTMLElement) => void; onAdd: () => void }) {
  return (
    <div className={css['Actions']}>
      <ListIconButton icon={IconName.Code} title="Edit as JSON" testId="list-edit-json" onClick={onOpenCode} />
      <ListIconButton icon={IconName.Plus} title="Add entry" testId="list-add-entry" onClick={() => onAdd()} />
    </div>
  );
}
