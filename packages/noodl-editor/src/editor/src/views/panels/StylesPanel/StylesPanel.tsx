/**
 * P94 STY-005 — the Styles panel.
 *
 * Richard, 2026-09-18: *"I wish actually there was a styles panel in the left menu of the editor to
 * manage colours, font styles, variants and whatnot … managing it through the nodes is a
 * nightmare."*
 *
 * 🔴 **Seven sections since P103 CMG-005 (2026-09-24):** Colours · Type · Spacing · Borders ·
 * Effects · Motion · Looks, every one a peer at the panel's top level. Until then the five token
 * groups sat inside ONE closed section called *Other tokens*, each closed again inside it, and
 * Richard's drive of P102 found the composer two closed levels down under a word that says
 * *unimportant*: *"The typography and animation bits are important, they're not 'Other'."*
 * The table of sections is `stylesPanelRoute.ts`, which also owns `revealStyle` — the seam that
 * lets a node's field or a Look row point this panel at one row.
 *
 * 🔴 **Three sections since P99 HLT-007 (a), 2026-09-22 — Richard's ruling, made knowing the
 * section was NOT empty.** *Text styles* listed the old text-style layer (`metadata.styles.text`,
 * loaded from the `textStyles` of `nodegx.styles.json`), while typography tokens sit under *Type*.
 * Measured before he ruled: 17 of 19 current-format projects and 16 shipped library prefabs carry
 * text styles. Those still apply at runtime and a Text node can still pick one, but this panel no
 * longer lists, creates, renames or deletes them. Converting them to Looks was raised as a
 * follow-up, not built.
 *
 * 🔴 This panel is **beside** the in-node pickers, never instead of them (R1). Picking a colour on
 * a selected node still happens on that node. This is where you manage the set.
 */
import { useProjectDesignTokenContext } from '@noodl-contexts/ProjectDesignTokenContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { TokenCategoryGroup } from '@noodl-models/StyleTokensModel/TokenCategories';

import { BasePanel } from '@noodl-core-ui/components/sidebar/BasePanel';

import { ToastLayer } from '../../ToastLayer/ToastLayer';
import { ColoursSection } from './components/ColoursSection/ColoursSection';
import { LooksSection } from './components/LooksSection/LooksSection';
import { TokenGroupSection } from './components/TokensSection';
import { useStylesModel, useStylesSectionsOpen } from './shared';
import css from './StylesPanel.module.scss';
import {
  REVEAL_HIGHLIGHT_MS,
  RevealStyleRequest,
  STYLES_PANEL_ID,
  STYLES_REVEAL_EVENT,
  STYLES_SECTIONS,
  StylesSectionId,
  StylesSectionSpec,
  sectionForTokenCategory,
  styleRowSelector,
  takePendingReveal
} from './stylesPanelRoute';

export const StylesPanel_ID = STYLES_PANEL_ID;

/** How long `Collapsible` takes to grow a section — its `transitionMs` default. */
const SECTION_OPEN_MS = 400;

export function StylesPanel() {
  const { stylesModel, revision } = useStylesModel();
  const { styleTokensModel } = useProjectDesignTokenContext();
  const [open, setOpen] = useStylesSectionsOpen();
  // The design-token list inside Colours is its own closed disclosure (P94: 88 rows buried the
  // colour styles). Not remembered: it is a list you open to look, not a section you work in.
  const [colourTokensOpen, setColourTokensOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * CMG-005 §3.3 — land on one row. Opens the section, waits for it to grow, scrolls the row into
   * view and marks it for the highlight rule in `StylesPanel.module.scss`.
   *
   * ⚠️ Two scroll passes: one now, for a section that is already open (the row exists and the
   * height is final), and one after the open transition, for a section that was closed (the row
   * exists at once but the section is still 0px tall, so the first scroll lands on the header).
   */
  const reveal = useCallback(
    (request: RevealStyleRequest) => {
      const section = sectionFor(request, styleTokensModel?.getToken(request.name)?.category);
      if (!section) {
        ToastLayer.showError(`There is no ${describeKind(request.kind)} called ${request.name} in this project`);
        return;
      }
      setOpen(section, true);
      if (section === 'colours' && request.kind === 'token') setColourTokensOpen(true);

      const land = () => {
        const root = rootRef.current;
        if (!root) return false;
        const row = root.querySelector<HTMLElement>(rowSelector(request));
        if (!row) return false;
        row.scrollIntoView({ block: 'center' });
        row.setAttribute('data-revealed', 'true');
        window.setTimeout(() => row.removeAttribute('data-revealed'), REVEAL_HIGHLIGHT_MS);
        return true;
      };

      window.setTimeout(() => {
        land();
        window.setTimeout(land, SECTION_OPEN_MS + 50);
      }, 0);
    },
    [setOpen, styleTokensModel]
  );

  // Claim a request made before this panel existed (first showing), then hear every later one.
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  useEffect(() => {
    const pending = takePendingReveal();
    if (pending) revealRef.current(pending);

    const onRequest = () => {
      const request = takePendingReveal();
      if (request) revealRef.current(request);
    };
    window.addEventListener(STYLES_REVEAL_EVENT, onRequest);
    return () => window.removeEventListener(STYLES_REVEAL_EVENT, onRequest);
  }, []);

  if (!ProjectModel.instance) {
    return (
      <BasePanel title="Styles" hasContentScroll>
        <div className={css['NoProject']}>Open a project to manage its colours, Looks and tokens.</div>
      </BasePanel>
    );
  }

  const openChange = (id: StylesSectionId) => (isOpen: boolean) => setOpen(id, isOpen);

  return (
    <BasePanel title="Styles" hasContentScroll>
      <div ref={rootRef} data-styles-panel>
        {STYLES_SECTIONS.map((section, index) => {
          if (section.id === 'colours') {
            return (
              <ColoursSection
                key={section.id}
                section={section}
                stylesModel={stylesModel}
                revision={revision}
                isFirst={index === 0}
                isOpen={open[section.id]}
                onOpenChange={openChange(section.id)}
                isTokensOpen={colourTokensOpen}
                onTokensOpenChange={setColourTokensOpen}
              />
            );
          }
          if (section.id === 'looks') {
            return (
              <LooksSection
                key={section.id}
                section={section}
                isOpen={open[section.id]}
                onOpenChange={openChange(section.id)}
              />
            );
          }
          return (
            <TokenGroupSection
              key={section.id}
              section={section as StylesSectionSpec & { group: TokenCategoryGroup }}
              isFirst={index === 0}
              isOpen={open[section.id]}
              onOpenChange={openChange(section.id)}
            />
          );
        })}
      </div>
    </BasePanel>
  );
}

function sectionFor(request: RevealStyleRequest, tokenCategory: string | undefined): StylesSectionId | null {
  switch (request.kind) {
    case 'look':
      return 'looks';
    case 'colourStyle':
      return 'colours';
    case 'token':
      return tokenCategory ? sectionForTokenCategory(tokenCategory) : null;
  }
}

function rowSelector(request: RevealStyleRequest): string {
  const base = styleRowSelector(request.name);
  if (request.kind === 'look' && request.typename) {
    return `${base}[data-style-typename="${CSS.escape(request.typename)}"]`;
  }
  return base;
}

function describeKind(kind: RevealStyleRequest['kind']): string {
  return kind === 'look' ? 'Look' : kind === 'colourStyle' ? 'colour style' : 'token';
}
