/**
 * STYLE-001: TokenCategorySection
 *
 * Renders a list of token rows within a category section.
 * Each row shows a color swatch (for colors) or a text preview, the token name,
 * current value, and a reset button if overridden.
 *
 * P102 CMP-001 (RC-3): for the five composer categories — shadow, gradient, easing, duration,
 * font family — a row whose value the codec can read shows the value **in words** with a real
 * preview and a pencil, and opens the composer. A value the codec cannot read keeps the text box.
 * The other nine categories keep their text box: a beginner can type `16px`.
 */

import { buildDefaultTokenMap } from '@nodegx/project-contract/tokens';
import {
  codecForCategory,
  describeTokenValue,
  easingPoints,
  fontLeadName,
  isComposerCategory,
  type EasingModel,
  type FontFamilyModel
} from '@nodegx/project-contract/token-codecs';
import React, { useEffect, useState } from 'react';

/**
 * ⚠️ **The two leaf modules, not the barrel.** `@noodl-models/StyleTokensModel`'s `index.ts` also
 * re-exports `StyleTokensModel`, which imports `projectmodel` → `bugtracker`, which reads
 * `platform.getUserDataPath()` at module scope. Importing the barrel therefore drags an editor
 * singleton chain into anything that touches this component — and that is why this file had no
 * test coverage: the suite failed to RUN, reporting `Tests: 0 total`. Both `TokenResolver` and
 * `StyleTokenRecord` live in self-contained files, and this row needs nothing else.
 *
 * P102: the codecs are the same shape — `@nodegx/project-contract/token-codecs` imports nothing
 * of the editor — so the words a row shows are graded under the same plain-Node runner.
 */
import { StyleTokenRecord } from '@noodl-models/StyleTokensModel/TokenCategories';
import { TokenResolver } from '@noodl-models/StyleTokensModel/TokenResolver';

import css from './TokenCategorySection.module.scss';

interface TokenCategorySectionProps {
  tokens: StyleTokenRecord[];
  onTokenChange: (name: string, value: string) => void;
  onTokenReset: (name: string) => void;
  /**
   * P102 CMP-001 §3 — resolve every `var()` inside a value before painting it. Omitted, the
   * row paints the raw text, which is the blank-gradient defect; every real caller passes one.
   */
  resolve?: (value: string) => string;
  /**
   * P102 CMP-001 — open the composer on a row. Omitted (a test render, a host with no popout
   * layer), the composer rows draw their words and preview but nothing opens.
   */
  onOpenComposer?: (token: StyleTokenRecord, anchor: HTMLElement) => void;
  /** P103 CMG-002 §3.3 — copy `var(--name)`. Omitted, no copy button is drawn. */
  onCopy?: (token: StyleTokenRecord) => void;
  /**
   * P103 CMG-002 §3.2 — delete a token a person ADDED (one with no shipped default). Omitted, no
   * delete button is drawn. Never offered on a default token: those are reset, not deleted.
   */
  onDelete?: (token: StyleTokenRecord) => void;
}

export function TokenCategorySection({
  tokens,
  onTokenChange,
  onTokenReset,
  resolve,
  onOpenComposer,
  onCopy,
  onDelete
}: TokenCategorySectionProps) {
  return (
    <div className={css.TokenList}>
      {tokens.map((token) => (
        <TokenRow
          key={token.name}
          token={token}
          onTokenChange={onTokenChange}
          onTokenReset={onTokenReset}
          resolve={resolve ?? identity}
          onOpenComposer={onOpenComposer}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

const identity = (value: string) => value;

/** The shipped defaults, read once: the contract's map is rebuilt on every call. */
const DEFAULTS = buildDefaultTokenMap();

interface TokenRowProps {
  token: StyleTokenRecord;
  onTokenChange: (name: string, value: string) => void;
  onTokenReset: (name: string) => void;
  resolve: (value: string) => string;
  onOpenComposer?: (token: StyleTokenRecord, anchor: HTMLElement) => void;
  onCopy?: (token: StyleTokenRecord) => void;
  onDelete?: (token: StyleTokenRecord) => void;
}

/**
 * One token, and — since FIX-015 slice 1 — an editable one.
 *
 * 🔴 **`onTokenChange` used to be accepted and thrown away.** The parameter was destructured to
 * `_onTokenChange` behind an eslint-disable, with a comment deferring the work to "Phase 3:
 * TokenPicker". The write path was never the missing piece: `DesignTokensTab` already passes
 * `styleTokensModel.setToken(name, value, { undo: true })`, a real, undoable write — it arrived
 * here and stopped. That is gap A of FIX-015 ("no human editing surface at all"), and it was one
 * component deep, not a phase away.
 *
 * ⚠️ **And it is NOT TokenPicker, which is what slice 1 assumed.** `TokenPicker` chooses *which
 * token a property references* — its callback is `onTokenSelect(cssVar)`, "the full CSS
 * `var(--token-name)` string, ready to use as a style value". It cannot change a token's own
 * value, which is the whole of what this panel is for. Editing `--primary` from `#3b82f6` to
 * `#ff0000` needs a value input, so that is what this is.
 *
 * P102 CMP-001 (RC-3): a composer-category row whose value decodes shows words instead of the
 * text box. The words come from the codec's `describe()`; the row never guesses from the text.
 * A value the codec refuses keeps the input exactly as before, so the FIX-015 gate still holds
 * for it.
 */
function TokenRow({ token, onTokenChange, onTokenReset, resolve, onOpenComposer, onCopy, onDelete }: TokenRowProps) {
  const isColor = token.category === 'color-semantic' || token.category === 'color-palette';
  const isRef = TokenResolver.isReference(token.value);
  const defaultValue = DEFAULTS.get(token.name)?.value;
  // A token a person ADDED: stored, and with no shipped default to go back to.
  const isAdded = token.isCustom && defaultValue === undefined;
  const words = isComposerCategory(token.category) ? describeTokenValue(token.category, token.value) : null;
  const composes = words !== null;

  /**
   * Edited locally, committed on blur or Enter.
   *
   * 🔴 **Not committed per keystroke.** `setToken` writes through to the project with `undo: true`,
   * so a keystroke-per-write would put one undo entry on the stack for every character and
   * re-render every subscriber mid-word. The same reason `PropertyPanelNumberInput` commits on
   * blur.
   */
  const [draft, setDraft] = useState(token.value);

  // A token changed from elsewhere — a reset, an undo, an AI edit — must show here. Keyed on the
  // token's own value so an external write wins over a stale draft.
  useEffect(() => setDraft(token.value), [token.value]);

  function commit() {
    const next = draft.trim();
    // ⚠️ An empty value is not an edit, it is a half-typed one. Reverting the draft rather than
    // writing `''` keeps the token at its last good value — clearing is what the reset button is
    // for, and it restores the DEFAULT rather than leaving the token undefined.
    if (next === '' || next === token.value) {
      setDraft(token.value);
      return;
    }
    onTokenChange(token.name, next);
  }

  const open = (e: React.MouseEvent<HTMLElement>) => {
    onOpenComposer?.(token, e.currentTarget.closest(`.${css.TokenRow}`) as HTMLElement);
  };

  return (
    <div
      className={`${css.TokenRow} ${token.isCustom ? css.isOverridden : ''} ${composes ? css.composes : ''}`}
      // P103 CMG-005: the one selector `revealStyle` uses to find any row — `StyleRow` carries
      // the same attribute, so a token, a Look and a colour style are found the same way.
      data-style-row={token.name}
    >
      {/* Preview swatch for colors */}
      {isColor && (
        <div
          className={css.ColorSwatch}
          style={{ backgroundColor: isRef ? `var(${token.name})` : token.value }}
          title={token.value}
        />
      )}

      {/* Non-color preview (spacing bar, font weight number, etc.) */}
      {!isColor &&
        (composes ? (
          <button
            type="button"
            className={css.PreviewButton}
            onClick={open}
            title={token.value}
            aria-label={`Edit ${token.name}`}
          >
            <TokenPreview token={token} resolve={resolve} large />
          </button>
        ) : (
          <TokenPreview token={token} resolve={resolve} />
        ))}

      {/* Token name + value */}
      <div className={css.TokenInfo}>
        <span className={css.TokenName} title={token.description}>
          {token.name}
        </span>
        {composes ? (
          <span className={css.TokenWords} title={token.value} onClick={open}>
            {words}
          </span>
        ) : (
          <input
            className={css.TokenValue}
            value={draft}
            spellCheck={false}
            aria-label={`Value for ${token.name}`}
            title={isRef ? `References ${token.value}` : token.value}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commit();
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setDraft(token.value);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        )}
      </div>

      {/* The pencil: opens the composer (RC-4). A text-mode value on a composer category gets
          the pencil too — the composer opens in text mode with *Replace with a preset*. */}
      {isComposerCategory(token.category) && codecForCategory(token.category) && (
        <button
          type="button"
          className={css.PencilButton}
          onClick={open}
          title={composes ? `Edit ${token.name}` : `Open ${token.name} in the composer`}
          aria-label={`Open composer for ${token.name}`}
        >
          ✎
        </button>
      )}

      {/* P103 CMG-002 §3.3 — copy the reference, on every row. */}
      {onCopy && (
        <button
          type="button"
          className={css.CopyButton}
          onClick={() => onCopy(token)}
          title={`Copy var(${token.name})`}
          aria-label={`Copy var(${token.name})`}
          data-test={`token-copy-${token.name}`}
        >
          ⧉
        </button>
      )}

      {/* P103 CMG-002 §3.2 — delete, only for a token somebody added. A default is reset, never deleted. */}
      {onDelete && isAdded && (
        <button
          type="button"
          className={css.DeleteButton}
          onClick={() => onDelete(token)}
          title={`Delete ${token.name} — you added it`}
          aria-label={`Delete ${token.name}`}
          data-test={`token-delete-${token.name}`}
        >
          ✕
        </button>
      )}

      {/* Override indicator + reset. CMG-004: drawn when the VALUE differs from the default (a
          pinned default is not a change), and the title says what it goes back to. */}
      {defaultValue !== undefined && defaultValue !== token.value && (
        <button
          className={css.ResetButton}
          onClick={() => onTokenReset(token.name)}
          title={`Reset to default (${defaultValue})`}
          aria-label={`Reset ${token.name} to default`}
        >
          ↺
        </button>
      )}
    </div>
  );
}

function TokenPreview({
  token,
  resolve,
  large
}: {
  token: StyleTokenRecord;
  resolve: (value: string) => string;
  large?: boolean;
}) {
  const cat = token.category;
  const box = large ? css.LargePreview : css.ShadowPreview;

  if (cat === 'spacing') {
    // Render a bar whose width reflects the spacing value
    const px = parseInt(token.value, 10);
    const clampedWidth = Math.min(Math.max(px / 2, 1), 48);
    return (
      <div className={css.SpacingPreview}>
        <div className={css.SpacingBar} style={{ width: `${clampedWidth}px` }} />
      </div>
    );
  }

  if (cat === 'border-radius') {
    return <div className={css.RadiusPreview} style={{ borderRadius: token.value }} title={token.value} />;
  }

  if (cat === 'gradient') {
    // VIB-002. The swatch is the only readable preview a gradient has: its value
    // is a whole `linear-gradient(...)` referencing other tokens, so the text
    // column beside it shows a declaration nobody can picture.
    //
    // P102 CMP-001 §3: painted with every `var()` resolved. Four of the five defaults are built
    // from `var(--primary)` and friends, which the editor's own window cannot resolve, and they
    // drew BLANK until this.
    return <div className={`${box} ${css.GradientPreview}`} style={{ backgroundImage: resolve(token.value) }} />;
  }

  if (cat === 'shadow') {
    return (
      <div className={css.ShadowStage}>
        <div className={box} style={{ boxShadow: token.value === 'none' ? 'none' : resolve(token.value) }} />
      </div>
    );
  }

  if (cat === 'animation-easing') {
    const codec = codecForCategory(cat);
    const model = codec?.decode(token.value) as EasingModel | null;
    const p = model ? easingPoints(model) : null;
    return (
      <div className={box}>
        <svg width="100%" height="100%" viewBox="0 0 40 40" aria-hidden="true" style={{ overflow: 'visible' }}>
          {p ? (
            <path
              d={`M4 36 C ${4 + 32 * p[0]} ${36 - 32 * p[1]}, ${4 + 32 * p[2]} ${36 - 32 * p[3]}, 36 4`}
              fill="none"
              stroke="var(--theme-color-primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          ) : (
            <path d="M4 36 L36 4" fill="none" stroke="var(--theme-color-fg-default-shy)" strokeWidth="2" />
          )}
        </svg>
      </div>
    );
  }

  if (cat === 'animation-duration') {
    const ms = parseInt(token.value, 10);
    const width = Number.isFinite(ms) ? Math.min(Math.max(ms / 1000, 0.08), 1) : 0;
    return (
      <div className={box}>
        <div className={css.DurationBar} style={{ width: `${Math.round(width * 100)}%` }} />
      </div>
    );
  }

  if (cat === 'typography-family') {
    const codec = codecForCategory(cat);
    const model = codec?.decode(token.value) as FontFamilyModel | null;
    return (
      <span
        className={`${box} ${css.FamilyPreview}`}
        style={{ fontFamily: token.value }}
        title={model ? fontLeadName(model) : token.value}
      >
        Aa
      </span>
    );
  }

  if (cat === 'typography-size') {
    return (
      <span className={css.FontSizePreview} style={{ fontSize: token.value }}>
        Aa
      </span>
    );
  }

  // Fallback: dot
  return <div className={css.DotPreview} />;
}
