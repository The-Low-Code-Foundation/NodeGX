/**
 * P94 STY-005 — the Styles panel.
 *
 * Richard, 2026-09-18: *"I wish actually there was a styles panel in the left menu of the editor to
 * manage colours, font styles, variants and whatnot … managing it through the nodes is a
 * nightmare."*
 *
 * Four sections, and the fourth is here on purpose. R4 named three — colours, text styles, Looks.
 * The Tokens section is the phase-9 token editor MOVED here rather than rebuilt, because R2 ruled
 * that both storage layers live in one panel, each row badged with which one it came from: *"a
 * person does not know we have two systems and should not have to."*
 *
 * 🔴 This panel is **beside** the in-node pickers, never instead of them (R1). Picking a colour on
 * a selected node still happens on that node. This is where you manage the set.
 */
import React from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';

import { BasePanel } from '@noodl-core-ui/components/sidebar/BasePanel';

import { ColoursSection } from './components/ColoursSection/ColoursSection';
import { LooksSection } from './components/LooksSection/LooksSection';
import { TextStylesSection } from './components/TextStylesSection/TextStylesSection';
import { TokensSection } from './components/TokensSection';
import { useStylesModel } from './shared';
import css from './StylesPanel.module.scss';

export const StylesPanel_ID = 'styles';

export function StylesPanel() {
  const { stylesModel, revision } = useStylesModel();

  if (!ProjectModel.instance) {
    return (
      <BasePanel title="Styles" hasContentScroll>
        <div className={css['NoProject']}>Open a project to manage its colours, text styles and Looks.</div>
      </BasePanel>
    );
  }

  return (
    <BasePanel title="Styles" hasContentScroll>
      <ColoursSection stylesModel={stylesModel} revision={revision} />
      <TextStylesSection stylesModel={stylesModel} revision={revision} />
      <LooksSection />

      {/*
        The colour and typography tokens are drawn by the two sections above, beside the styles they
        collide with — so this section holds what has no style-layer twin. Repeating them here would
        make the same token editable in two places on one screen, which is the shape of the
        two-systems confusion this panel exists to end, not a convenience.
      */}
      <TokensSection excludeGroups={['Colors', 'Typography']} />
    </BasePanel>
  );
}
