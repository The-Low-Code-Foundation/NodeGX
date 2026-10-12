import classNames from 'classnames';
import React from 'react';

import css from './HowItWorks.module.scss';

/**
 * NSP-019 R33 — the node as the canvas draws it, on the canvas's dotted ground: its card (title,
 * type), inputs left and outputs right with their dots, a value bubble on each port, and the
 * canvas's preview pill above it carrying the first value output.
 *
 * What a step reached is LIT for about a second (the caller decides when): the inputs it set or
 * pressed, the outputs it moved, and the pill when its port moved. A signal's bubble shows only
 * while lit — *sent* on an input, *fired* on an output — because a signal holds no value between
 * frames; a value port's bubble always shows what it holds.
 *
 * The card is the canvas's: a white (theme `bg-1`) body with a hairline outline in either theme —
 * not the category scheme the node picker paints, which is grey for most logic nodes. Hook-free, so
 * the plain-Node runner evaluates it as an element tree.
 */
export interface StagePort {
  port: string;
  label: string;
  signal: boolean;
  /** The bubble's text for a value port; `undefined` draws no bubble (nothing held yet). */
  value?: string;
  lit: boolean;
}

export interface StageColors {
  base: string;
  header: string;
  outline: string;
  text: string;
}

export interface TryStageProps {
  title: string;
  typeLabel: string;
  inputs: readonly StagePort[];
  outputs: readonly StagePort[];
  /** The first value output, for the pill above the card; absent for a node with none. */
  preview?: { label: string; value: string; lit: boolean };
}

function PortRow({ port, side }: { port: StagePort; side: 'in' | 'out' }) {
  const bubbleText = port.signal ? (port.lit ? (side === 'in' ? 'sent' : 'fired') : undefined) : port.value;
  const dot = <span className={classNames(css['Dot'], port.signal && css['is-signal'])} aria-hidden="true" />;
  const name = <span className={css['PortName']}>{port.label}</span>;
  const bubble = bubbleText !== undefined && <span className={css['Bubble']}>{bubbleText}</span>;
  return (
    <div
      className={classNames(css['Port'], port.lit && css['is-lit'])}
      data-port={port.port}
      data-lit={port.lit ? 'true' : undefined}
    >
      {side === 'in' ? (
        <>
          {dot}
          {name}
          {bubble}
        </>
      ) : (
        <>
          {bubble}
          {name}
          {dot}
        </>
      )}
    </div>
  );
}

export function TryStage({ title, typeLabel, inputs, outputs, preview }: TryStageProps) {
  return (
    <div className={css['Stage']} aria-label={`${title}, as the canvas draws it`}>
      {preview && (
        <div className={css['Preview']}>
          <div className={classNames(css['PreviewPill'], preview.lit && css['is-lit'])}>
            {preview.label}
            <span className={css['PreviewValue']}>{preview.value}</span>
          </div>
          <div className={css['PreviewTip']} aria-hidden="true" />
        </div>
      )}
      <div className={css['Card']}>
        <div className={css['CardHead']}>
          <span className={css['CardTitle']}>{title}</span>
          {typeLabel !== title && <span className={css['CardType']}>{typeLabel}</span>}
        </div>
        <div className={css['CardPorts']}>
          <div className={css['PortColumn']}>
            {inputs.map((port) => (
              <PortRow key={port.port} port={port} side="in" />
            ))}
          </div>
          <div className={classNames(css['PortColumn'], css['is-out'])}>
            {outputs.map((port) => (
              <PortRow key={port.port} port={port} side="out" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
