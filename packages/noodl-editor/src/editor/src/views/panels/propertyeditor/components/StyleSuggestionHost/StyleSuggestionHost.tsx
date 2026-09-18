/**
 * P94 STY-002 AC5 — the StyleAnalyzer's suggestion banner, on its own.
 *
 * 🔴 **This file is what is left of `ElementStyleSectionHost` after the presets were removed, and
 * it exists rather than being deleted for one measured reason:** it was the only mount point of
 * `SuggestionBanner` anywhere in the editor. Deleting the host with the picker would have taken a
 * live feature out alongside a retired one and nothing in the tree would have said so.
 *
 * What went with the picker was `ElementStyleSection` — the `Preset` and `Size` rows that stamped
 * an `ElementConfig` variant's parameters in place. That is the second styling mechanism
 * `STY-DESIGN-THE-LOOK-MODEL.md` rule 1 forbids; a node now wears a Look or owns its styles.
 *
 * The suggestions themselves are about **tokens** — "this hard-coded colour matches
 * `--primary`" — and have nothing to do with presets, so nothing here changed but its neighbours.
 *
 * Keeps its own `StyleTokensModel` instance for suggestion actions. Multiple instances are safe —
 * they sync via `ProjectModel.metadataChanged` events.
 */

import { useStyleSuggestions } from '@noodl-hooks/useStyleSuggestions';
import React, { useCallback, useEffect, useState } from 'react';

import { StyleTokensModel } from '@noodl-models/StyleTokensModel';

import { SuggestionBanner } from '@noodl-core-ui/components/StyleSuggestions';

import { executeSuggestionAction } from '../../../../../services/StyleAnalyzer/SuggestionActionHandler';

export function StyleSuggestionHost() {
  const [tokenModel] = useState<StyleTokensModel>(() => new StyleTokensModel());

  // Dispose the model when the host unmounts to avoid listener leaks
  useEffect(() => {
    return () => tokenModel.dispose();
  }, [tokenModel]);

  const { activeSuggestion, dismissSession, dismissPermanent, refresh } = useStyleSuggestions();

  const handleAccept = useCallback(() => {
    if (!activeSuggestion) return;
    executeSuggestionAction(activeSuggestion, { tokenModel, onComplete: refresh });
  }, [activeSuggestion, tokenModel, refresh]);

  const handleDismiss = useCallback(() => {
    if (!activeSuggestion) return;
    dismissSession(activeSuggestion.id);
  }, [activeSuggestion, dismissSession]);

  const handleNeverShow = useCallback(() => {
    if (!activeSuggestion) return;
    dismissPermanent(activeSuggestion.id);
  }, [activeSuggestion, dismissPermanent]);

  if (!activeSuggestion) return null;

  return (
    <SuggestionBanner
      suggestion={activeSuggestion}
      onAccept={handleAccept}
      onDismiss={handleDismiss}
      onNeverShow={handleNeverShow}
    />
  );
}
