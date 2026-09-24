/**
 * P102 CMP-001 — open the token composer as a popout beside the Styles panel.
 *
 * The composer itself lives in core-ui and knows nothing of the editor. This is the host: it
 * mounts the React root the way `openListValueEditor()` does (`flushSync` before `showPopout`, or
 * the popout measures 0×0 and opens off-screen — FH-005), and it is the **only** place the three
 * editor seams are touched:
 *
 *  - the draft goes to `PreviewTokenInjector.setDraft` (RC-7): a style element in each preview,
 *    never `setToken`;
 *  - Apply is one `setToken(name, value, { undo: true })` — one undo step (README §6.4);
 *  - Reset is one `deleteCustomToken`.
 *
 * Cancel, Escape, a click outside and a project close all end in `onClose`, which removes the
 * draft element and unmounts the root. Nothing before Apply touches the model, the file or undo.
 */

import { isComposerCategory, type ComposerCategory } from '@nodegx/project-contract/token-codecs';
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import { ProjectModel } from '@noodl-models/projectmodel';
import type { StyleTokensModel } from '@noodl-models/StyleTokensModel/StyleTokensModel';
import { StyleTokenRecord } from '@noodl-models/StyleTokensModel/TokenCategories';
import { TokenResolver } from '@noodl-models/StyleTokensModel/TokenResolver';

import { TokenComposer, type ProjectColour } from '@noodl-core-ui/components/token-composer';

import { unmountReactRoot } from '../../../../../../shared/utils/unmountReactRoot';
import { PreviewTokenInjector } from '../../../../services/PreviewTokenInjector';
import PopupLayer from '../../../popuplayer';
import { loadProjectFontFaces } from './projectFontFaces';

/**
 * The colours the chips offer (RC-2), in the order a person reaches for them. Every semantic
 * colour the project has follows, so nothing a value already names is missing from the list.
 */
const FIRST_COLOURS = [
  '--primary',
  '--primary-hover',
  '--accent',
  '--foreground',
  '--background',
  '--surface',
  '--muted',
  '--success',
  '--warning',
  '--danger',
  '--border'
];

export function projectColoursForPicking(tokens: StyleTokenRecord[], resolver: TokenResolver): ProjectColour[] {
  const semantic = tokens.filter((t) => t.category === 'color-semantic');
  const byName = new Map(semantic.map((t) => [t.name, t]));
  const ordered: StyleTokenRecord[] = [];
  for (const name of FIRST_COLOURS) {
    const t = byName.get(name);
    if (t) ordered.push(t);
  }
  for (const t of semantic) if (!ordered.includes(t)) ordered.push(t);
  return ordered
    .map((t) => ({ name: t.name, value: resolver.resolve(t.name) ?? t.value }))
    .filter((c) => !/var\(/.test(c.value));
}

export function openTokenComposer(args: {
  token: StyleTokenRecord;
  anchor: HTMLElement;
  tokens: StyleTokenRecord[];
  model: StyleTokensModel;
  /** Runs once the popout is gone, however it went. A host that built `model` for this disposes it here. */
  onClosed?: () => void;
}): void {
  const { token } = args;
  if (!isComposerCategory(token.category)) return;
  const category: ComposerCategory = token.category;

  // A font list offers only faces a visitor will see (CMP-005): the ones the project's modules
  // declare, drawn from their own files. Read before the list first measures anything.
  if (category === 'typography-family') {
    void loadProjectFontFaces(ProjectModel.instance?._retainedProjectDirectory).then(
      (projectFonts) => mountComposer(args, category, projectFonts),
      () => mountComposer(args, category, [])
    );
    return;
  }
  mountComposer(args, category, []);
}

function mountComposer(
  args: Parameters<typeof openTokenComposer>[0],
  category: ComposerCategory,
  projectFonts: string[]
): void {
  const { token, anchor, tokens, model, onClosed } = args;

  const map = new Map(tokens.map((t) => [t.name, t]));
  const resolver = new TokenResolver(map);
  const injector = PreviewTokenInjector.instance;

  const div = document.createElement('div');
  const root: Root = createRoot(div);
  let popout: ReturnType<typeof PopupLayer.instance.showPopout> | null = null;
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    if (popout) PopupLayer.instance.hidePopout(popout);
  };

  flushSync(() =>
    root.render(
      React.createElement(TokenComposer, {
        tokenName: token.name,
        category,
        value: token.value,
        isCustom: token.isCustom,
        colours: projectColoursForPicking(tokens, resolver),
        resolve: (value: string) => resolver.resolveInline(value),
        projectFonts,
        onDraft: (value: string) => injector.setDraft(token.name, value),
        onApply: (value: string) => {
          injector.clearDraft();
          if (value !== token.value) {
            model.setToken(token.name, value, { undo: true, label: `Change ${token.name}` });
          }
          close();
        },
        onCancel: close,
        onReset: () => {
          injector.clearDraft();
          model.deleteCustomToken(token.name, { undo: true, label: `Reset ${token.name}` });
          close();
        }
      })
    )
  );

  popout = PopupLayer.instance.showPopout({
    content: { el: div },
    attachTo: anchor,
    position: 'right',
    disableDynamicPositioning: true,
    onClose: () => {
      closed = true;
      // Whatever closed it — Cancel, Escape, a click outside, a project close — the draft goes.
      injector.clearDraft();
      unmountReactRoot(root);
      onClosed?.();
    }
  });
}
