/**
 * P102 CMP-001 — the composer shell every composer lives in.
 *
 * Header (name, type chip, the value in words) · a big preview with a Light/Dark ground and *Hold
 * to compare* · **Start from** preset tiles · the type's own controls · **Show CSS** · Reset ·
 * Cancel · Apply.
 *
 * The rules it holds (README §6):
 *  - `decode` is `null` → text mode: the sentence, Show CSS open, the text box, and one door out,
 *    **Replace with a preset**. No visual control that could save is drawn.
 *  - Every change goes to `onDraft` and nowhere else (RC-7). The host shows it on the canvas
 *    through a style element; nothing is saved until Apply.
 *  - Apply hands the host one string; the host makes one undo step of it. Cancel and Escape hand
 *    back nothing.
 *  - A preset is a value, not a mode: the lit tile is the one whose value matches the draft.
 *
 * Kept in core-ui, beside the JSON composer, so a node's properties (CMP-008, P103) can open it
 * without moving it. Nothing here imports the editor.
 */

import {
  codecForCategory,
  COMPOSER_TYPE_LABEL,
  presetNamed,
  refusalReason,
  type ComposerCategory,
  type TokenCodec
} from '@nodegx/project-contract/token-codecs';
import React, { useEffect, useState } from 'react';

import { ProjectColour, PresetTiles, SmallButton } from './controls';
import { drawFontPreset, FontControls, FontPreview } from './FontComposer';
import { drawGradientPreset, GradientControls, GradientPreview } from './GradientComposer';
import {
  drawDurationPreset,
  drawEasingPreset,
  DurationControls,
  DurationPreview,
  EasingControls,
  EasingPreview
} from './MotionComposers';
import { drawShadowPreset, ShadowControls, ShadowPreview } from './ShadowComposer';
import css from './TokenComposer.module.scss';

export interface TokenComposerProps {
  tokenName: string;
  category: ComposerCategory;
  /** The saved value. */
  value: string;
  /** Whether the token overrides its default (Reset to default is offered only then). */
  isCustom: boolean;
  /** The project's colours for the pick lists, each resolved to paint. */
  colours: ProjectColour[];
  /** Resolve every `var()` inside a value against the project. */
  resolve: (value: string) => string;
  /** Fonts the project already uses (CMP-005). */
  projectFonts?: string[];
  /** Every change to the draft, already encoded. The host paints it; it saves nothing. */
  onDraft: (value: string) => void;
  onApply: (value: string) => void;
  onCancel: () => void;
  onReset: () => void;
}

type PreviewComponent = React.FC<{ css: string; resolve: (v: string) => string; dark: boolean }>;

interface TypeComposer {
  Preview: PreviewComponent;
  Controls: React.FC<{
    model: unknown;
    onChange: (model: unknown) => void;
    colours: ProjectColour[];
    resolve: (v: string) => string;
    savedValue: string;
    projectFonts?: string[];
  }>;
  drawPreset: (value: string, resolve: (v: string) => string) => React.ReactNode;
  /** Fonts list their choices instead of a tile strip. */
  presetStrip: boolean;
}

const TYPES: Record<ComposerCategory, TypeComposer> = {
  shadow: {
    Preview: ShadowPreview,
    Controls: ShadowControls as TypeComposer['Controls'],
    drawPreset: drawShadowPreset,
    presetStrip: true
  },
  gradient: {
    Preview: GradientPreview,
    Controls: GradientControls as TypeComposer['Controls'],
    drawPreset: drawGradientPreset,
    presetStrip: true
  },
  'animation-easing': {
    Preview: EasingPreview,
    Controls: EasingControls as TypeComposer['Controls'],
    drawPreset: drawEasingPreset,
    presetStrip: true
  },
  'animation-duration': {
    Preview: DurationPreview,
    Controls: DurationControls as TypeComposer['Controls'],
    drawPreset: drawDurationPreset,
    presetStrip: true
  },
  'typography-family': {
    Preview: FontPreview,
    Controls: FontControls as TypeComposer['Controls'],
    drawPreset: drawFontPreset,
    presetStrip: false
  }
};

type DraftState = { mode: 'visual'; model: unknown } | { mode: 'text'; text: string };

function open(codec: TokenCodec<unknown>, value: string): DraftState {
  const model = codec.decode(value);
  return model === null ? { mode: 'text', text: value } : { mode: 'visual', model };
}

export const TEXT_MODE_SENTENCE =
  "This value uses CSS the composer can't show yet. You can still edit it as text, or start again from a preset.";

export function TokenComposer(props: TokenComposerProps) {
  const { tokenName, category, value, isCustom, colours, resolve, projectFonts, onDraft, onApply, onCancel, onReset } =
    props;
  const codec = codecForCategory(category)!;
  const type = TYPES[category];

  const [state, setState] = useState<DraftState>(() => open(codec, value));
  const [startedFrom, setStartedFrom] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [showCss, setShowCss] = useState(() => state.mode === 'text');
  const [holding, setHolding] = useState(false);

  const draft = state.mode === 'visual' ? codec.encode(state.model) : state.text;
  const lit = presetNamed(codec.presets, draft);
  const summary =
    state.mode === 'visual' ? codec.describe(state.model) : refusalReason(category, draft) ?? 'Written as CSS';

  // RC-7: every change to the draft goes to the host, and only there.
  useEffect(() => {
    onDraft(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Escape hands back nothing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const setModel = (model: unknown) => setState({ mode: 'visual', model });
  // The door out of text mode starts from a preset with something to slide: *None* is a legitimate
  // shadow preset and a dead end as a starting point (no layers, so no controls).
  const doorPreset = codec.presets.find((p) => p.value !== 'none') ?? codec.presets[0];
  const pickPreset = (presetValue: string) => {
    const model = codec.decode(presetValue);
    if (model === null) return;
    setStartedFrom(presetNamed(codec.presets, presetValue));
    setModel(model);
  };

  const Preview = type.Preview;
  const shown = holding ? value : draft;
  // The lit preset's name leads the summary — unless `describe()` already starts with it (easing,
  // duration and font words do), which read "Quick · Quick · 150 ms" on the first drive.
  const summaryPrefix =
    lit && !summary.startsWith(lit)
      ? `${lit} · `
      : !lit && startedFrom && state.mode === 'visual'
      ? `${startedFrom}, changed · `
      : '';
  const dirty = draft !== value;

  return (
    <div className={css.Root} data-token-composer={tokenName}>
      <div className={css.Scroll}>
        <div className={css.Header}>
          <div className={css.HeaderRow}>
            <span className={css.TokenName}>{tokenName}</span>
            <span className={css.TypeChip}>{COMPOSER_TYPE_LABEL[category]}</span>
          </div>
          <div className={css.Summary} data-summary>
            {summaryPrefix}
            {summary}
          </div>
        </div>

        <div className={css.Preview}>
          <Preview css={shown} resolve={resolve} dark={dark} />
          <div className={css.PreviewBar}>
            <span>
              <button
                type="button"
                className={`${css.Segment} ${!dark ? css.on : ''}`}
                aria-pressed={!dark}
                onClick={() => setDark(false)}
              >
                Light
              </button>
              <button
                type="button"
                className={`${css.Segment} ${dark ? css.on : ''}`}
                aria-pressed={dark}
                onClick={() => setDark(true)}
              >
                Dark
              </button>
            </span>
            <button
              type="button"
              className={`${css.Button} ${css.Hold}`}
              disabled={!dirty}
              title="Press and hold to see the saved value"
              onPointerDown={() => setHolding(true)}
              onPointerUp={() => setHolding(false)}
              onPointerLeave={() => setHolding(false)}
              onPointerCancel={() => setHolding(false)}
            >
              {holding ? 'Saved value' : 'Hold to compare'}
            </button>
          </div>
        </div>

        {state.mode === 'text' ? (
          <>
            <div className={css.Sentence} data-text-mode>
              {TEXT_MODE_SENTENCE}
              {refusalReason(category, draft) && (
                <>
                  {' '}
                  <span className={css.Help}>({refusalReason(category, draft)}.)</span>
                </>
              )}
            </div>
            <textarea
              className={css.TextBox}
              value={state.text}
              spellCheck={false}
              aria-label={`Value for ${tokenName}`}
              onChange={(e) => setState({ mode: 'text', text: e.target.value })}
            />
            <div className={css.Section}>
              <SmallButton onClick={() => pickPreset(doorPreset.value)} title={doorPreset.value}>
                Replace with a preset ({doorPreset.name})
              </SmallButton>
              <div className={css.Help}>
                Starts again from {doorPreset.name}. The text above is gone only when you press Apply; Cancel keeps it.
              </div>
            </div>
          </>
        ) : (
          <>
            {type.presetStrip && (
              <PresetTiles
                presets={codec.presets}
                lit={lit}
                startedFrom={startedFrom}
                draw={(v) => type.drawPreset(v, resolve)}
                onPick={pickPreset}
              />
            )}
            <type.Controls
              model={state.model}
              onChange={setModel}
              colours={colours}
              resolve={resolve}
              savedValue={value}
              projectFonts={projectFonts}
            />
          </>
        )}

        {showCss && (
          <pre className={css.CssBox} data-show-css>
            {tokenName}: {draft};
          </pre>
        )}
      </div>

      <div className={css.Footer}>
        <span style={{ display: 'flex', gap: 6 }}>
          <SmallButton onClick={() => setShowCss(!showCss)}>{showCss ? 'Hide CSS' : 'Show CSS'}</SmallButton>
          {isCustom && (
            <SmallButton onClick={onReset} title="Back to the default value">
              Reset to default
            </SmallButton>
          )}
        </span>
        <span className={css.FooterRight}>
          <SmallButton onClick={onCancel}>Cancel</SmallButton>
          <SmallButton primary onClick={() => onApply(draft)} disabled={draft.trim() === ''}>
            Apply
          </SmallButton>
        </span>
      </div>
    </div>
  );
}
