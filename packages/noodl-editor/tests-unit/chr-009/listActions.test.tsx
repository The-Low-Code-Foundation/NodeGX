/**
 * CHR-009 slice 12 — one look for the list rows' actions.
 *
 * The prop list (Function's Script Inputs) drew `</>` and `+` as Chromium's unstyled bordered `<button>` over the group
 * heading; the string list (States) drew the same two actions borderless under the list. Both now draw `ListActions`:
 * the node head's 26px `IconButton`s. What can go wrong without looking wrong is the wiring — `</>` must hand the JSON
 * editor the pressed element as its anchor, and neither press may reach the row underneath (a row click starts a rename).
 */
// FLD-017: `Icon.tsx` uses webpack's `require.context`, which ts-jest rejects at load.
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: { Code: 'code', Plus: 'plus', Pencil: 'pencil', Trash: 'trash' },
  IconSize: { Tiny: 'tiny' },
  IconVariant: {}
}));

import React from 'react';

import { IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';

import { ListActions } from '../../src/editor/src/views/panels/propertyeditor/components/ListActions';
import { render, walk } from '../support/renderElements';

const pressable = (tree: ReturnType<typeof render>) => walk(tree).filter((n) => typeof n.props.testId === 'string');

describe('CHR-009 — the list actions', () => {
  it('draws exactly the two actions, as the head icon buttons', () => {
    const buttons = pressable(render(<ListActions onOpenCode={() => undefined} onAdd={() => undefined} />));
    expect(buttons.map((b) => b.props.testId)).toEqual(['list-edit-json', 'list-add-entry']);
    for (const b of buttons) expect(b.props.variant).toBe(IconButtonVariant.OpaqueOnHover);
    expect(walk(render(<ListActions onOpenCode={() => undefined} onAdd={() => undefined} />)).some((n) => n.type === 'button')).toBe(false);
  });

  it('opens the JSON editor anchored on the pressed button, and adds on +, without the press reaching the row', () => {
    const opened: unknown[] = [];
    let added = 0;
    const [code, add] = pressable(render(<ListActions onOpenCode={(a) => opened.push(a)} onAdd={() => added++} />));
    const anchor = { tag: 'the pressed button' };
    const stops: string[] = [];
    const press = (b: typeof code, name: string) =>
      (b.props.onClick as (e: unknown) => void)({ currentTarget: anchor, stopPropagation: () => stops.push(name) });

    press(code, 'code');
    expect(opened).toEqual([anchor]);
    expect(added).toBe(0);

    press(add, 'add');
    expect(added).toBe(1);
    expect(opened).toHaveLength(1);
    expect(stops).toEqual(['code', 'add']);
  });
});
