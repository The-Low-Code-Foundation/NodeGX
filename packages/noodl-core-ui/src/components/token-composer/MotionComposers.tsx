/**
 * P102 CMP-004 — easing (named curves and a ball that plays) and duration (chips, a slider, a ball).
 */

import {
  durationFeel,
  easingPoints,
  type DurationModel,
  type EasingModel
} from '@nodegx/project-contract/token-codecs';
import React, { useState } from 'react';

import { SectionTitle, SliderRow, SmallButton } from './controls';
import css from './TokenComposer.module.scss';

/** The little curve a tile and a row draw. */
export function CurveGlyph({
  points,
  size = 36,
  stroke = 'currentColor'
}: {
  points: [number, number, number, number];
  size?: number;
  stroke?: string;
}) {
  const [a, b, c, d] = points;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path d="M4 36 L36 4" fill="none" stroke="rgba(127,127,127,0.4)" strokeWidth="1" strokeDasharray="2 2" />
      <path
        d={`M4 36 C ${4 + 32 * a} ${36 - 32 * b}, ${4 + 32 * c} ${36 - 32 * d}, 36 4`}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Tracks({
  thisLabel,
  thisTransition,
  steadyLabel,
  steadyTransition,
  big
}: {
  thisLabel: string;
  thisTransition: string;
  steadyLabel: string;
  steadyTransition: string;
  big?: React.ReactNode;
}) {
  const [on, setOn] = useState(false);
  const left = on ? 'calc(100% - 22px)' : '4px';
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {big ?? <span className={css.TrackLabel}>Shown over half a second, so you can see the shape</span>}
        <SmallButton primary onClick={() => setOn(!on)} title="Play">
          ▶ Play
        </SmallButton>
      </div>
      <div className={css.TrackLabel}>{thisLabel}</div>
      <div className={css.Track}>
        <div className={css.Ball} style={{ left, transition: thisTransition }} />
      </div>
      <div className={css.TrackLabel}>{steadyLabel}</div>
      <div className={css.Track}>
        <div className={`${css.Ball} ${css.grey}`} style={{ left, transition: steadyTransition }} />
      </div>
    </div>
  );
}

// ─── Easing ──────────────────────────────────────────────────────────────────

export function EasingPreview({ css: value, dark }: { css: string; resolve: (v: string) => string; dark: boolean }) {
  return (
    <div className={`${css.Stage} ${dark ? css.dark : ''}`} style={{ height: 'auto', padding: 12 }}>
      <Tracks
        thisLabel="This curve"
        thisTransition={`left 500ms ${value}`}
        steadyLabel="Steady, for comparison"
        steadyTransition="left 500ms linear"
      />
    </div>
  );
}

export function drawEasingPreset(value: string) {
  const m = /^cubic-bezier\((.*)\)$/.exec(value);
  const points = (m ? m[1].split(', ').map(Number) : [0, 0, 1, 1]) as [number, number, number, number];
  return <CurveGlyph points={points} size={30} />;
}

export function EasingControls({ model, onChange }: { model: EasingModel; onChange: (model: EasingModel) => void }) {
  const points = easingPoints(model);
  const set = (i: number, v: number) => {
    const next = [...points] as [number, number, number, number];
    next[i] = v;
    onChange({ kind: 'bezier', points: next });
  };
  return (
    <div className={css.Section}>
      <SectionTitle>Your own curve</SectionTitle>
      <div className={css.Help}>
        The four numbers of the curve. Steep means fast, flat means slow; going above 1 means it overshoots and settles
        back.
      </div>
      <div className={css.Numbers}>
        {points.map((p, i) => (
          <input
            key={i}
            className={css.NumberInput}
            type="number"
            step="0.05"
            min={i % 2 === 0 ? 0 : undefined}
            max={i % 2 === 0 ? 1 : undefined}
            value={p}
            aria-label={['x1', 'y1', 'x2', 'y2'][i]}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) set(i, n);
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CurveGlyph points={points} size={72} stroke="var(--theme-color-primary)" />
      </div>
    </div>
  );
}

// ─── Duration ────────────────────────────────────────────────────────────────

export function DurationPreview({ css: value, dark }: { css: string; resolve: (v: string) => string; dark: boolean }) {
  const ms = parseInt(value, 10);
  return (
    <div className={`${css.Stage} ${dark ? css.dark : ''}`} style={{ height: 'auto', padding: 12 }}>
      <Tracks
        big={
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className={css.Big}>{Number.isFinite(ms) ? `${ms} ms` : value}</span>
            {Number.isFinite(ms) && <span className={css.TrackLabel}>= {ms / 1000} seconds</span>}
          </span>
        }
        thisLabel="This speed"
        thisTransition={`left ${value} cubic-bezier(0, 0, 0.2, 1)`}
        steadyLabel="Normal, 300 ms, for comparison"
        steadyTransition="left 300ms cubic-bezier(0, 0, 0.2, 1)"
      />
    </div>
  );
}

export function drawDurationPreset(value: string) {
  return <span style={{ fontSize: 12, fontWeight: 600 }}>{value.replace('ms', ' ms')}</span>;
}

export function DurationControls({
  model,
  onChange
}: {
  model: DurationModel;
  onChange: (model: DurationModel) => void;
}) {
  const feel = durationFeel(model.ms);
  return (
    <div className={css.Section}>
      <SliderRow
        label="Or set it exactly"
        value={model.ms}
        min={0}
        max={1000}
        step={25}
        unit=" ms"
        onChange={(ms) => onChange({ ms: Math.max(0, Math.round(ms)) })}
      />
      <div className={css.Help}>
        <b>{feel.feel}</b> {feel.use}
      </div>
    </div>
  );
}
