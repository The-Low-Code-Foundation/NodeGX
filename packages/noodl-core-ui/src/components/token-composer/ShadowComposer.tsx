/**
 * P102 CMP-002 — the shadow composer: presets, layers, sliders, colour + strength, *Inside the box*.
 */

import {
  ColourValue,
  describeShadowLayer,
  encodeShadow,
  newShadowLayer,
  px,
  type ShadowLayer,
  type ShadowModel
} from '@nodegx/project-contract/token-codecs';
import React, { useState } from 'react';

import {
  ColourChips,
  ProjectColour,
  SectionTitle,
  SliderRow,
  SmallButton,
  StrengthSlider,
  SwitchRow
} from './controls';
import css from './TokenComposer.module.scss';

export function ShadowPreview({
  css: value,
  resolve,
  dark
}: {
  css: string;
  resolve: (v: string) => string;
  dark: boolean;
}) {
  const shadow = value === 'none' ? 'none' : resolve(value);
  return (
    <div className={`${css.Stage} ${dark ? css.dark : ''}`}>
      <div className={css.Card} style={{ boxShadow: shadow }}>
        <div className={css.CardLine} style={{ width: '70%' }} />
        <div className={css.CardLine} style={{ width: '45%' }} />
        <div className={css.CardButton} style={{ boxShadow: shadow }}>
          Get started
        </div>
      </div>
    </div>
  );
}

export function drawShadowPreset(value: string, resolve: (v: string) => string) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 4,
        background: '#fff',
        boxShadow: value === 'none' ? 'none' : resolve(value)
      }}
    />
  );
}

const words = (n: number, unit: string, positive: string, negative: string, zero: string) =>
  n === 0 ? zero : `${Math.abs(n)}${unit} ${n < 0 ? negative : positive}`;

export function ShadowControls({
  model,
  onChange,
  colours,
  resolve
}: {
  model: ShadowModel;
  onChange: (model: ShadowModel) => void;
  colours: ProjectColour[];
  resolve: (v: string) => string;
}) {
  const [selected, setSelected] = useState(0);
  const sel = Math.min(selected, Math.max(model.layers.length - 1, 0));
  const layer: ShadowLayer | undefined = model.layers[sel];

  const setLayers = (layers: ShadowLayer[]) => onChange({ layers });
  const patch = (p: Partial<ShadowLayer>) => setLayers(model.layers.map((l, i) => (i === sel ? { ...l, ...p } : l)));
  const setColour = (colour: ColourValue) => patch({ colour });

  return (
    <>
      <div className={css.Section}>
        <SectionTitle
          aside={
            <SmallButton
              onClick={() => {
                setLayers([...model.layers, newShadowLayer()]);
                setSelected(model.layers.length);
              }}
            >
              + Add layer
            </SmallButton>
          }
        >
          Layers
        </SectionTitle>
        {model.layers.length === 0 ? (
          <div className={css.Help}>No shadow. Pick a starting point above, or add a layer.</div>
        ) : (
          <div className={css.Layers}>
            {model.layers.map((l, i) => (
              <div key={i} className={`${css.LayerRow} ${i === sel ? css.on : ''}`} onClick={() => setSelected(i)}>
                <span className={css.LayerArt}>
                  <span className={css.LayerCard} style={{ boxShadow: resolve(encodeShadow({ layers: [l] })) }} />
                </span>
                <span className={css.LayerText}>
                  <span className={css.LayerName}>Layer {i + 1}</span>
                  <span className={css.LayerWords}>{describeShadowLayer(l)}</span>
                </span>
                <button
                  type="button"
                  className={css.Remove}
                  title={`Remove layer ${i + 1}`}
                  aria-label={`Remove layer ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayers(model.layers.filter((_, j) => j !== i));
                    setSelected(0);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {layer && (
        <>
          <div className={css.Section}>
            <SectionTitle>Layer {sel + 1}</SectionTitle>
            <SliderRow
              label="Softness"
              hint="How blurred the edge is"
              value={layer.blur?.n ?? 0}
              min={0}
              max={80}
              unit="px"
              words={(layer.blur?.n ?? 0) === 0 ? 'hard edge' : undefined}
              onChange={(n) => patch({ blur: px(n) })}
            />
            <SliderRow
              label="Size"
              hint="Bigger or smaller than the box"
              value={layer.spread?.n ?? 0}
              min={-30}
              max={30}
              unit="px"
              words={words(layer.spread?.n ?? 0, 'px', 'bigger', 'smaller', 'same as the box')}
              onChange={(n) => patch({ spread: px(n) })}
            />
            <SliderRow
              label="Across"
              hint="Left or right of the box"
              value={layer.x.n}
              min={-40}
              max={40}
              unit="px"
              words={words(layer.x.n, 'px', 'right', 'left', 'centred')}
              onChange={(n) => patch({ x: px(n) })}
            />
            <SliderRow
              label="Down"
              hint="Below or above the box"
              value={layer.y.n}
              min={-40}
              max={40}
              unit="px"
              words={words(layer.y.n, 'px', 'down', 'up', 'level')}
              onChange={(n) => patch({ y: px(n) })}
            />
          </div>

          <div className={css.Section}>
            <SectionTitle>Colour</SectionTitle>
            <ColourChips colours={colours} value={layer.colour} onChange={setColour} resolve={resolve} />
            <StrengthSlider value={layer.colour} onChange={setColour} />
            {layer.colour.kind === 'literal' && (
              <div className={css.Help}>
                A colour written by hand. It is kept exactly as it is; pick a chip to replace it.
              </div>
            )}
          </div>

          <div className={css.Section}>
            <SwitchRow
              label="Inside the box"
              help="The shadow falls inwards, like a pressed button"
              checked={layer.inset}
              onChange={(inset) => patch({ inset })}
            />
          </div>
        </>
      )}
    </>
  );
}
