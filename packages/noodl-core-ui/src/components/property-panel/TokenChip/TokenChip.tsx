import classNames from 'classnames';
import React, { useLayoutEffect, useRef, useState } from 'react';

import css from './TokenChip.module.scss';

/**
 * P103 CMG-009 — a design token in a field, drawn as what it is.
 *
 * Richard, driving P102: *"the 'padding' value is --var(something) and the preview of the value
 * of the input is ... and when you click it, you get about 2 characters wide of the value inside
 * the input, since it's designed for a number."* A field that holds exactly one `var(--x)` no
 * longer draws `var(--x)` in a number box: it draws this — the token's short name and, where it
 * fits, what it resolves to, in the token colour, with the `{·}` mark every token button wears.
 * Press it to pick a different token; press ✕ to detach (the resolved value goes into the field).
 *
 * 🔴 **"Where it fits" is measured, not guessed.** The first drive (2026-09-24, a 300px panel)
 * drew the chip at 25px in a padding side: the mark and the ✕ are fixed-width, the name had
 * `min-width: 0`, so the name was what vanished — a chip reading `{} ✕`. The name is now the one
 * thing that never shrinks; the mark, the value and the inline ✕ each go when the chip is too
 * narrow for them, decided from natural widths (hidden measuring spans, so nothing measured
 * depends on what is shown — no oscillation). In the compact form (a ~45–60px padding side) the
 * name is tried first, then the resolved value (`16px`), and the ✕ sits over the right edge on
 * hover instead of taking width. Never `…` alone: the tooltip always carries everything.
 *
 * Kept in core-ui beside `BindingChip` (a wired port's chip) so the five controls that take tokens
 * draw one chip, not five. It imports no `Icon`: the mark is an inline path, so the plain-Node
 * runner can render it.
 */
export interface TokenChipProps {
  /** The token, as the field stores it: `var(--space-4)`, or bare `--space-4`. */
  name: string;
  /** What it resolves to in this project — `16px`, `#c2410c` — when the caller knows. */
  value?: string;
  /**
   * A ~45–60px field: one text only — the short name when it fits, else the resolved value — and
   * the ✕ over the right edge on hover rather than beside the text.
   */
  compact?: boolean;
  /** A drawn preview beside the name: a swatch, a lit shadow card, a gradient strip. */
  preview?: { kind: 'colour' | 'shadow' | 'gradient'; css: string };
  /** Pressing the chip: open the token picker, anchored here. */
  onOpen?: (anchor: HTMLElement) => void;
  /** ✕ — put the resolved value in the field and drop the token. Absent → no ✕. */
  onDetach?: () => void;
  /** CMG-010: the pencil and *Show in Styles*, drawn after the name. */
  actions?: React.ReactNode;
  dataTest?: string;
  title?: string;
}

/** `--space-4` → `space-4`; `var(--space-4)` → `space-4`. What a field stores is the `var()` form. */
export function tokenShortName(name: string): string {
  const inner = /^\s*var\(\s*(--[A-Za-z0-9_-]+)[^)]*\)\s*$/.exec(name);
  return (inner ? inner[1] : name.trim()).replace(/^--/, '');
}

/** Before a measurement: the seven characters `space-4` is, what a 60px field holds beside its glyph. */
const COMPACT_FITS = 7;
/** Space between the chip's parts, and its side padding — the scss numbers, for the measurement. */
const GAP = 4;
const PADDING = 10;
const COMPACT_PADDING = 4;
const MARK_WIDTH = 11;
const DETACH_WIDTH = 14;

function TokenMark() {
  return (
    <svg className={css['Mark']} width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M4.6 1.6C3.4 1.6 3.2 2.4 3.2 3.4V4.6C3.2 5.4 2.8 6 1.8 6C2.8 6 3.2 6.6 3.2 7.4V8.6C3.2 9.6 3.4 10.4 4.6 10.4M7.4 1.6C8.6 1.6 8.8 2.4 8.8 3.4V4.6C8.8 5.4 9.2 6 10.2 6C9.2 6 8.8 6.6 8.8 7.4V8.6C8.8 9.6 8.6 10.4 7.4 10.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

/** What the chip has room for, from natural widths. */
interface Fit {
  /** Compact: which one text is shown. */
  compactText: 'name' | 'value';
  /** Full: whether the mark, the value and the inline ✕ are drawn. */
  mark: boolean;
  value: boolean;
  detach: boolean;
}

export function TokenChip({ name, value, compact, preview, onOpen, onDetach, actions, dataTest, title }: TokenChipProps) {
  const short = tokenShortName(name);
  const fullName = `--${short}`;
  const tooltip =
    title ?? `${fullName}${value ? ` = ${value}` : ''} — a design token. Press to pick another${onDetach ? ', ✕ to detach' : ''}.`;
  const interactive = Boolean(onOpen);

  const rootRef = useRef<HTMLSpanElement>(null);
  const nameMeasure = useRef<HTMLSpanElement>(null);
  const valueMeasure = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<Fit>({
    compactText: short.length <= COMPACT_FITS || !value ? 'name' : 'value',
    mark: true,
    value: Boolean(value),
    detach: Boolean(onDetach)
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const available = root.clientWidth;
      const nameW = nameMeasure.current?.offsetWidth ?? 0;
      const valueW = valueMeasure.current?.offsetWidth ?? 0;
      if (compact) {
        setFit((f) => {
          const compactText: Fit['compactText'] = nameW + COMPACT_PADDING <= available || !value ? 'name' : 'value';
          return f.compactText === compactText ? f : { ...f, compactText };
        });
        return;
      }
      const previewW = preview ? (preview.kind === 'shadow' ? 22 : preview.kind === 'gradient' ? 18 : 11) : MARK_WIDTH;
      const actionsW = actions ? 36 : 0;
      let needed = PADDING + previewW + GAP + nameW + actionsW;
      const detach = Boolean(onDetach) && needed + GAP + DETACH_WIDTH <= available;
      if (detach) needed += GAP + DETACH_WIDTH;
      const showValue = Boolean(value) && needed + GAP + valueW <= available;
      // The mark goes last, when even the name alone will not fit beside it.
      const mark = needed <= available;
      setFit((f) =>
        f.mark === mark && f.value === showValue && f.detach === detach ? f : { ...f, mark, value: showValue, detach }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [compact, name, value, preview, onDetach, actions]);

  const shownText = compact ? (fit.compactText === 'value' && value ? value : short) : short;
  const drawsMark = compact ? false : fit.mark;
  const drawsValue = !compact && fit.value && Boolean(value);
  const inlineDetach = Boolean(onDetach) && !compact && fit.detach;
  const hoverDetach = Boolean(onDetach) && compact;

  const detachButton = onDetach && (
    <button
      type="button"
      className={classNames(css['Detach'], hoverDetach && css['is-hover-only'])}
      title={`Detach: put ${value ?? 'the value'} in the field instead of ${fullName}`}
      aria-label={`Detach ${fullName}`}
      data-test={dataTest ? `${dataTest}-detach` : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onDetach();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      ✕
    </button>
  );

  return (
    <span
      ref={rootRef}
      className={classNames(css['Root'], compact && css['is-compact'], interactive && css['is-interactive'])}
      data-token-chip={name}
      data-token-value={value}
      data-token-shows={compact ? fit.compactText : drawsValue ? 'name+value' : 'name'}
      data-test={dataTest}
      title={tooltip}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? (e) => onOpen!(e.currentTarget as HTMLElement) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen!(e.currentTarget as HTMLElement);
              }
            }
          : undefined
      }
    >
      {preview ? (
        preview.kind === 'shadow' ? (
          <span className={css['ShadowStage']} aria-hidden="true">
            <span className={css['ShadowCard']} style={{ boxShadow: preview.css }} />
          </span>
        ) : (
          <span
            className={classNames(css['Swatch'], preview.kind === 'gradient' && css['is-gradient'])}
            style={preview.kind === 'gradient' ? { backgroundImage: preview.css } : { backgroundColor: preview.css }}
            aria-hidden="true"
          />
        )
      ) : (
        drawsMark && <TokenMark />
      )}
      <span className={css['Name']}>{shownText}</span>
      {drawsValue && <span className={css['Value']}>{value}</span>}
      {actions}
      {inlineDetach && detachButton}
      {hoverDetach && detachButton}
      {/* The natural widths the fit is read from; never seen. */}
      <span className={css['Measure']} aria-hidden="true">
        <span ref={nameMeasure} className={css['Name']}>
          {short}
        </span>
        <span ref={valueMeasure} className={css['Value']}>
          {value}
        </span>
      </span>
    </span>
  );
}
