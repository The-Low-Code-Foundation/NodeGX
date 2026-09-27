/**
 * P102 CMP-003 — the gradient composer: presets, linear/radial, direction, centre, colours.
 */

import {
  ARROW_ANGLES,
  ColourValue,
  describeColour,
  directionArrow,
  encodeGradient,
  type GradientDirection,
  type GradientModel,
  type GradientStop,
  type RadialShape
} from '@nodegx/project-contract/token-codecs';
import React, { useState } from 'react';

import {
  ColourChips,
  ProjectColour,
  SectionTitle,
  Segmented,
  SliderRow,
  SmallButton,
  StrengthSlider
} from './controls';
import css from './TokenComposer.module.scss';

export function GradientPreview({
  css: value,
  resolve,
  dark
}: {
  css: string;
  resolve: (v: string) => string;
  dark: boolean;
}) {
  return (
    <div className={`${css.Stage} ${dark ? css.dark : ''}`} style={{ padding: 10 }}>
      <div className={css.Hero} style={{ backgroundImage: resolve(value) }}>
        <div className={css.HeroTitle}>Build something people love</div>
        <div className={css.HeroButton}>Get started</div>
      </div>
    </div>
  );
}

export function drawGradientPreset(value: string, resolve: (v: string) => string) {
  return <span style={{ width: '100%', height: '100%', backgroundImage: resolve(value) }} />;
}

const ARROWS: { arrow: string | null; glyph: string; label: string }[] = [
  { arrow: 'top left', glyph: '↖', label: 'Towards the top left' },
  { arrow: 'top', glyph: '↑', label: 'Towards the top' },
  { arrow: 'top right', glyph: '↗', label: 'Towards the top right' },
  { arrow: 'left', glyph: '←', label: 'Towards the left' },
  { arrow: null, glyph: '', label: '' },
  { arrow: 'right', glyph: '→', label: 'Towards the right' },
  { arrow: 'bottom left', glyph: '↙', label: 'Towards the bottom left' },
  { arrow: 'bottom', glyph: '↓', label: 'Towards the bottom' },
  { arrow: 'bottom right', glyph: '↘', label: 'Towards the bottom right' }
];

const SPOTS: { label: string; x: number; y: number }[] = [
  { label: 'Top left', x: 0, y: 0 },
  { label: 'Top', x: 50, y: 0 },
  { label: 'Top right', x: 100, y: 0 },
  { label: 'Left', x: 0, y: 50 },
  { label: 'Middle', x: 50, y: 50 },
  { label: 'Right', x: 100, y: 50 },
  { label: 'Bottom left', x: 0, y: 100 },
  { label: 'Bottom', x: 50, y: 100 },
  { label: 'Bottom right', x: 100, y: 100 }
];

const DEFAULT_SHAPE: RadialShape = { w: 90, h: 120, x: 50, y: 50 };

/** The keyword spelling for an arrow, `to bottom right`. */
function keywordFor(arrow: string): GradientDirection {
  const sides = arrow.split(' ') as ('top' | 'bottom' | 'left' | 'right')[];
  return sides.length === 2 ? { kind: 'keyword', sides: [sides[0], sides[1]] } : { kind: 'keyword', sides: [sides[0]] };
}

export function GradientControls({
  model,
  onChange,
  colours,
  resolve
}: {
  model: GradientModel;
  onChange: (model: GradientModel) => void;
  colours: ProjectColour[];
  resolve: (v: string) => string;
}) {
  const [selected, setSelected] = useState(0);
  const sel = Math.min(selected, model.stops.length - 1);
  const stop = model.stops[sel];

  const setStops = (stops: GradientStop[]) => onChange({ ...model, stops } as GradientModel);
  const patchStop = (p: Partial<GradientStop>) => setStops(model.stops.map((s, i) => (i === sel ? { ...s, ...p } : s)));
  const setColour = (colour: ColourValue) => patchStop({ colour });

  const setKind = (kind: 'linear' | 'radial') => {
    if (kind === model.kind) return;
    if (kind === 'linear') onChange({ kind: 'linear', direction: { kind: 'angle', deg: 180 }, stops: model.stops });
    else onChange({ kind: 'radial', shape: { ...DEFAULT_SHAPE }, stops: model.stops });
  };

  return (
    <>
      <div className={css.Section}>
        <SectionTitle>Kind</SectionTitle>
        <Segmented
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' }
          ]}
          value={model.kind}
          onChange={setKind}
        />
        <div className={css.Help}>
          {model.kind === 'linear'
            ? 'Colours blend along a straight line, from one side to the other.'
            : 'Colours spread out from one spot, like light falling on the page.'}
        </div>
      </div>

      {model.kind === 'linear' ? (
        <LinearDirection model={model} onChange={onChange} />
      ) : (
        <RadialCentre model={model} onChange={onChange} />
      )}

      <div className={css.Section}>
        <SectionTitle
          aside={
            <SmallButton
              onClick={() => {
                const colour: ColourValue = colours[0]
                  ? { kind: 'token', name: colours[0].name }
                  : { kind: 'black', alpha: 0.5 };
                setStops([...model.stops, { colour }]);
                setSelected(model.stops.length);
              }}
            >
              + Add colour
            </SmallButton>
          }
        >
          Colours
        </SectionTitle>
        <div className={css.Bar} style={{ backgroundImage: resolve(encodeGradient(model)) }} />
        <div className={css.Layers}>
          {model.stops.map((s, i) => (
            <div key={i} className={`${css.LayerRow} ${i === sel ? css.on : ''}`} onClick={() => setSelected(i)}>
              <span
                className={css.LayerArt}
                style={{ background: s.colour.kind === 'clear' ? 'transparent' : resolve(colourCss(s.colour)) }}
              />
              <span className={css.LayerText}>
                <span className={css.LayerName}>{describeColour(s.colour)}</span>
                <span className={css.LayerWords}>
                  {s.position === undefined ? 'spaced evenly' : `at ${s.position}%`}
                </span>
              </span>
              {model.stops.length > 2 && (
                <button
                  type="button"
                  className={css.Remove}
                  title="Remove this colour"
                  aria-label={`Remove colour ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStops(model.stops.filter((_, j) => j !== i));
                    setSelected(0);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {stop && (
        <div className={css.Section}>
          <SectionTitle>Colour {sel + 1}</SectionTitle>
          <ColourChips colours={colours} value={stop.colour} onChange={setColour} allowClear resolve={resolve} />
          <StrengthSlider value={stop.colour} onChange={setColour} />
          <SliderRow
            label="Position"
            hint="Where along the gradient this colour sits"
            value={stop.position ?? Math.round((sel / Math.max(model.stops.length - 1, 1)) * 100)}
            min={-50}
            max={150}
            unit="%"
            muted={stop.position === undefined}
            words={stop.position === undefined ? 'spaced evenly until you move it' : undefined}
            onChange={(position) => patchStop({ position })}
          />
        </div>
      )}
    </>
  );
}

function colourCss(colour: ColourValue): string {
  switch (colour.kind) {
    case 'token':
      return `var(${colour.name})`;
    case 'black':
      return `rgb(0 0 0 / ${colour.alpha})`;
    case 'white':
      return `rgb(255 255 255 / ${colour.alpha})`;
    case 'clear':
      return 'transparent';
    case 'literal':
      return colour.css;
  }
}

function LinearDirection({
  model,
  onChange
}: {
  model: Extract<GradientModel, { kind: 'linear' }>;
  onChange: (model: GradientModel) => void;
}) {
  const lit = directionArrow(model.direction);
  const angle =
    model.direction === null
      ? 180
      : model.direction.kind === 'angle'
      ? model.direction.deg
      : ARROW_ANGLES[directionArrow(model.direction) ?? 'bottom'];

  const press = (arrow: string) => {
    // RC-6c: an arrow writes the spelling the value already used. Only the Angle slider turns a
    // keyword into degrees, and only by hand.
    const direction: GradientDirection =
      model.direction?.kind === 'keyword' ? keywordFor(arrow) : { kind: 'angle', deg: ARROW_ANGLES[arrow] };
    onChange({ ...model, direction });
  };

  return (
    <div className={css.Section}>
      <SectionTitle>Direction</SectionTitle>
      <div className={css.DirectionRow}>
        <div className={css.Arrows}>
          {ARROWS.map((a, i) => (
            <button
              key={i}
              type="button"
              className={`${css.Arrow} ${a.arrow === null ? css.blank : ''} ${a.arrow === lit ? css.on : ''}`}
              aria-label={a.label || undefined}
              aria-pressed={a.arrow === lit}
              title={a.label}
              disabled={a.arrow === null}
              onClick={() => a.arrow && press(a.arrow)}
            >
              {a.glyph}
            </button>
          ))}
        </div>
        <div className={css.DirectionRight}>
          <SliderRow
            label="Angle"
            value={angle}
            min={0}
            max={360}
            unit="°"
            onChange={(deg) => onChange({ ...model, direction: { kind: 'angle', deg } })}
          />
        </div>
      </div>
    </div>
  );
}

function RadialCentre({
  model,
  onChange
}: {
  model: Extract<GradientModel, { kind: 'radial' }>;
  onChange: (model: GradientModel) => void;
}) {
  const shape = model.shape ?? DEFAULT_SHAPE;
  const spot = SPOTS.find((s) => s.x === shape.x && s.y === shape.y);
  const ratio = shape.w === 0 ? 1 : shape.h / shape.w;

  return (
    <div className={css.Section}>
      <SectionTitle>Where the light starts</SectionTitle>
      <select
        className={css.Select}
        value={spot ? spot.label : 'custom'}
        aria-label="Centre"
        onChange={(e) => {
          const next = SPOTS.find((s) => s.label === e.target.value);
          if (next) onChange({ ...model, shape: { ...shape, x: next.x, y: next.y } });
        }}
      >
        {SPOTS.map((s) => (
          <option key={s.label} value={s.label}>
            {s.label}
          </option>
        ))}
        {!spot && (
          <option value="custom" disabled>
            Custom spot ({shape.x}% {shape.y}%)
          </option>
        )}
      </select>
      <SliderRow
        label="Spread"
        hint="How far the light reaches"
        value={shape.w}
        min={20}
        max={200}
        unit="%"
        words={shape.w < 60 ? 'tight' : shape.w < 120 ? 'medium' : 'wide'}
        onChange={(w) => onChange({ ...model, shape: { ...shape, w, h: Math.round(w * ratio) } })}
      />
    </div>
  );
}
