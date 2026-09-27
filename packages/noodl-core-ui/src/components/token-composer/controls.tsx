/**
 * P102 CMP-001 — the controls every composer is built from.
 *
 * Sliders whose number is **typeable** (click the number to type; beginners slide, everyone
 * else types), preset tiles, colour chips (RC-2: the project's colours, Black, White and Clear),
 * a segmented switch, and a Play button. All of it is plain React over CSS modules so the JSON
 * composer's host can mount it and so nothing here reaches the editor.
 */

import {
  ColourValue,
  describeColour,
  encodeColour,
  hasStrength,
  tokenWords
} from '@nodegx/project-contract/token-codecs';
import React, { useEffect, useState } from 'react';

import css from './TokenComposer.module.scss';

// ─── Slider ──────────────────────────────────────────────────────────────────

export interface SliderRowProps {
  label: string;
  /** *"4px down"*, *"centred"* — plain words for the value, drawn beside the number. */
  words?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Greyed: the value is the browser's own choice until someone touches the slider (RC-6b). */
  muted?: boolean;
  hint?: string;
  onChange: (value: number) => void;
}

export function SliderRow({
  label,
  words,
  value,
  min,
  max,
  step = 1,
  unit = '',
  muted,
  hint,
  onChange
}: SliderRowProps) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (!typing) setText(String(value));
  }, [value, typing]);

  function commitText() {
    setTyping(false);
    const n = Number(text);
    if (Number.isFinite(n)) onChange(n);
    else setText(String(value));
  }

  return (
    <label className={`${css.SliderRow} ${muted ? css.muted : ''}`} title={hint}>
      <span className={css.SliderHead}>
        <span className={css.SliderLabel}>{label}</span>
        <span className={css.SliderValue}>
          {words && <span className={css.SliderWords}>{words}</span>}
          {typing ? (
            <input
              className={css.SliderNumber}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitText();
                if (e.key === 'Escape') {
                  setText(String(value));
                  setTyping(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className={css.SliderNumberButton}
              onClick={() => setTyping(true)}
              title="Click to type"
            >
              {value}
              {unit}
            </button>
          )}
        </span>
      </span>
      <input
        type="range"
        className={css.Range}
        min={Math.min(min, value)}
        max={Math.max(max, value)}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

// ─── Preset tiles ────────────────────────────────────────────────────────────

export interface PresetTilesProps {
  presets: { name: string; value: string }[];
  /** The preset whose value the draft matches, or `null`. */
  lit: string | null;
  /** The preset the draft started from when it no longer matches: reads *Lifted, changed*. */
  startedFrom: string | null;
  draw: (value: string) => React.ReactNode;
  onPick: (value: string) => void;
}

export function PresetTiles({ presets, lit, startedFrom, draw, onPick }: PresetTilesProps) {
  return (
    <div className={css.Section}>
      <div className={css.SectionTitle}>Start from</div>
      <div className={css.Tiles}>
        {presets.map((p) => {
          const on = lit === p.name;
          const changed = !on && startedFrom === p.name;
          return (
            <button
              key={p.name}
              type="button"
              className={`${css.Tile} ${on ? css.on : ''} ${changed ? css.changed : ''}`}
              aria-pressed={on}
              onClick={() => onPick(p.value)}
              title={p.value}
            >
              <span className={css.TileArt}>{draw(p.value)}</span>
              <span className={css.TileName}>
                {p.name}
                {changed ? ', changed' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Colour chips (RC-2, RC-6a) ──────────────────────────────────────────────

export interface ProjectColour {
  /** `--primary` */
  name: string;
  /** The resolved paint, `#3b82f6`. */
  value: string;
}

export interface ColourChipsProps {
  colours: ProjectColour[];
  value: ColourValue;
  /** Whether *Clear* is offered (gradients yes, shadows no). */
  allowClear?: boolean;
  /** Paints a token the list does not carry but the value names, so its chip is still drawn lit. */
  resolve?: (css: string) => string;
  onChange: (colour: ColourValue) => void;
}

export function ColourChips({ colours, value, allowClear, resolve, onChange }: ColourChipsProps) {
  const isOn = (c: ColourValue) => encodeColour(c) === encodeColour(value);
  const listed =
    value.kind === 'token' && !colours.some((c) => c.name === value.name)
      ? [...colours, { name: value.name, value: resolve ? resolve(`var(${value.name})`) : `var(${value.name})` }]
      : colours;
  const chip = (colour: ColourValue, paint: string, label: string) => (
    <button
      key={label}
      type="button"
      className={`${css.Chip} ${isOn(colour) ? css.on : ''}`}
      aria-pressed={isOn(colour)}
      title={label}
      onClick={() => onChange(colour)}
    >
      <span
        className={`${css.ChipSwatch} ${colour.kind === 'clear' ? css.checker : ''}`}
        style={{ background: paint }}
      />
      <span className={css.ChipName}>{label}</span>
    </button>
  );

  return (
    <div className={css.Chips}>
      {chip({ kind: 'black', alpha: hasStrength(value) ? value.alpha : 0.1 }, '#000000', 'Black')}
      {chip({ kind: 'white', alpha: hasStrength(value) ? value.alpha : 0.5 }, '#ffffff', 'White')}
      {allowClear && chip({ kind: 'clear' }, 'transparent', 'Clear')}
      {listed.map((c) => chip({ kind: 'token', name: c.name }, c.value, tokenWords(c.name)))}
      {value.kind === 'literal' && (
        <button type="button" className={`${css.Chip} ${css.on} ${css.custom}`} aria-pressed title={value.css} disabled>
          <span className={css.ChipSwatch} style={{ background: value.css }} />
          <span className={css.ChipName}>Custom</span>
        </button>
      )}
    </div>
  );
}

/** The Strength slider that rides beside a Black or White chip; nothing for the others. */
export function StrengthSlider({ value, onChange }: { value: ColourValue; onChange: (colour: ColourValue) => void }) {
  if (!hasStrength(value)) return null;
  const dark = value.kind === 'black';
  return (
    <SliderRow
      label={dark ? 'Darkness' : 'Strength'}
      value={Math.round(value.alpha * 100)}
      min={0}
      max={100}
      unit="%"
      words={describeColour(value)}
      onChange={(pct) => onChange({ kind: value.kind, alpha: Math.round(pct) / 100 })}
    />
  );
}

// ─── Segments and buttons ────────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={css.Segmented} role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${css.Segment} ${o.value === value ? css.on : ''}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SwitchRow({
  label,
  help,
  checked,
  onChange
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={css.SwitchRow}
      onClick={() => onChange(!checked)}
    >
      <span className={css.SwitchText}>
        <span className={css.SwitchLabel}>{label}</span>
        {help && <span className={css.SwitchHelp}>{help}</span>}
      </span>
      <span className={`${css.SwitchTrack} ${checked ? css.on : ''}`}>
        <span className={css.SwitchKnob} />
      </span>
    </button>
  );
}

export function SmallButton({
  children,
  onClick,
  primary,
  disabled,
  title
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`${css.Button} ${primary ? css.primary : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className={css.SectionTitle}>
      <span>{children}</span>
      {aside && <span className={css.SectionAside}>{aside}</span>}
    </div>
  );
}
