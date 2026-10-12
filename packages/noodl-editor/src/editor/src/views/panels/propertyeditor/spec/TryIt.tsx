import React, { useEffect, useMemo, useRef, useState } from 'react';

import css from './HowItWorks.module.scss';
import type { AnyNodeSpec, Step, TryControls, ValueControl } from './tryNodeModel';
import { TryRows } from './TryRows';
import { TryStage, type StagePort } from './TryStage';

/**
 * NSP-019 R33 — *Try it*, the modal's right column: the node drawn as the canvas draws it, styled
 * controls (signal pills, − / + steppers, a switch per boolean; the clock and *Same frame* only
 * for a node that uses the clock), and *What happened*, which follows the latest row.
 *
 * It runs the node's SPEC in the interpreter (`tryNodeModel`, `@nodegx/node-spec`), never the
 * project, so an unwired node can be tried. The steps are the whole state: every change replays
 * them from a fresh mount (`playTry`). They start with one frame end — the node's first frame, as
 * the app runs one when it mounts — so the first row says what the node does at load.
 *
 * The spec package (~890 KB of source) arrives by a dynamic `import()` when the modal opens. In the
 * dev editor that chunk can wait on a webpack rebuild for a minute or more (NSP-019 §5.3: 99 s), so
 * after a few seconds the waiting text says why.
 *
 * Memory: a `Select` inside a `Modal` closes it — the enum control is a native `<select>`. Nothing
 * here imports `Icon` (an empty span in jest, and unloadable by the plain-Node runner).
 */
type Model = typeof import('./tryNodeModel');

export interface TryItProps {
  typeName: string;
  title: string;
  typeLabel: string;
  /** The node's parameters on the canvas — what the try starts with, kept to the spec's value inputs. */
  parameters?: Readonly<Record<string, unknown>>;
  /**
   * The spec package, when the caller already holds it. The modal never passes it (Try loads the
   * package itself on first opening); a test does, so a server render draws the loaded column.
   */
  loaded?: Model;
}

const FIRST_FRAME: readonly Step[] = ['settle'];
const LIT_MS = 1100;
const SLOW_MS = 4000;
const BUBBLE_TEXT = 18;

function bubble(model: Model, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const text = model.showValue(value);
  return text.length > BUBBLE_TEXT ? text.slice(0, BUBBLE_TEXT - 1) + '…' : text;
}

function SignalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function TrySection({
  children,
  onStartOver,
  canStartOver
}: {
  children: React.ReactNode;
  onStartOver?: () => void;
  canStartOver?: boolean;
}) {
  return (
    <section className={css['Try']} aria-label="Try it">
      <div className={css['TryHead']}>
        <h2 className={css['SectionTitle']}>Try it</h2>
        <span className={css['Spacer']} />
        {onStartOver && (
          <button type="button" className={css['Quiet']} onClick={onStartOver} disabled={!canStartOver}>
            Start over
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function TryIt({ typeName, title, typeLabel, parameters, loaded }: TryItProps) {
  const [model, setModel] = useState<Model | null>(loaded ?? null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [isSlow, setSlow] = useState(false);
  const [steps, setSteps] = useState<readonly Step[]>(FIRST_FRAME);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sameFrame, setSameFrame] = useState(false);
  const [advanceMs, setAdvanceMs] = useState('1000');
  const [isLit, setLit] = useState(false);
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (model) return;
    let cancelled = false;
    import('./tryNodeModel').then(
      (loaded) => {
        if (!cancelled) setModel(loaded);
      },
      (error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      }
    );
    const slow = setTimeout(() => !cancelled && setSlow(true), SLOW_MS);
    return () => {
      cancelled = true;
      clearTimeout(slow);
    };
  }, []);

  const spec: AnyNodeSpec | undefined = useMemo(() => model?.specNamed(typeName), [model, typeName]);
  const controls: TryControls | undefined = useMemo(() => (spec ? model?.controlsFor(spec) : undefined), [model, spec]);
  const startParams = useMemo(
    () => (spec && model ? model.startParamsFor(spec, parameters) : {}),
    [model, spec, parameters]
  );
  const play = useMemo(
    () => (spec && model ? model.playTry(spec, startParams, steps) : undefined),
    [model, spec, startParams, steps]
  );

  // light what the latest step reached, for about a second
  useEffect(() => {
    if (steps.length <= FIRST_FRAME.length) return;
    setLit(true);
    const timer = setTimeout(() => setLit(false), LIT_MS);
    return () => clearTimeout(timer);
  }, [steps]);

  // What happened follows the latest row
  useEffect(() => {
    const el = rowsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [play]);

  if (loadError) {
    return (
      <TrySection>
        <div className={css['Waiting']}>
          <span className={css['Error']}>The spec could not be loaded: {loadError}</span>
        </div>
      </TrySection>
    );
  }
  if (!model) {
    return (
      <TrySection>
        <div className={css['Waiting']} role="status">
          <span>Loading the node&apos;s spec…</span>
          {isSlow && (
            <span className={css['WaitingWhy']}>
              Still loading. The first time this opens, the editor fetches every node&apos;s spec and the interpreter
              that plays it. In the development editor that waits for webpack to finish rebuilding, which can take a
              minute or two.
            </span>
          )}
        </div>
      </TrySection>
    );
  }
  if (!spec || !controls || !play) {
    return (
      <TrySection>
        <div className={css['Waiting']}>
          <span>The spec package has no spec named {typeName}.</span>
        </div>
      </TrySection>
    );
  }

  const push = (...next: Step[]) => {
    setSteps((prev) => [...prev, ...next, ...(sameFrame ? [] : (['settle'] as Step[]))]);
  };
  const startOver = () => {
    setSteps(FIRST_FRAME);
    setDrafts({});
    setLit(false);
  };

  const current = (control: ValueControl): unknown =>
    control.port in play.inputs ? play.inputs[control.port] : control.default;
  const setValue = (control: ValueControl, value: unknown) => {
    setDrafts((prev) => {
      const { [control.port]: _gone, ...rest } = prev;
      return rest;
    });
    push({ set: control.port, value });
  };
  const draftFor = (control: ValueControl): string => {
    if (control.port in drafts) return drafts[control.port];
    const value = current(control);
    return value === undefined || value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  };
  const commit = (control: ValueControl) => {
    if (control.port in drafts) setValue(control, model.parseTyped(control.kind, drafts[control.port]));
  };
  const typing = (control: ValueControl) => ({
    value: draftFor(control),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value;
      setDrafts((prev) => ({ ...prev, [control.port]: value }));
    },
    onBlur: () => commit(control),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') commit(control);
    }
  });

  const litIn = new Set(isLit ? play.lit.inputs : []);
  const litOut = new Set(isLit ? play.lit.outputs : []);
  const valueByPort = new Map(controls.values.map((c) => [c.port, c]));
  const stageInputs: StagePort[] = model.inputsFor(spec).map((p) => {
    const control = valueByPort.get(p.port);
    return {
      ...p,
      value: p.signal || !control ? undefined : bubble(model, current(control)),
      lit: litIn.has(p.port)
    };
  });
  const stageOutputs: StagePort[] = model.outputsFor(spec).map((p) => ({
    ...p,
    value: p.signal || !(p.port in play.outputs) ? undefined : bubble(model, play.outputs[p.port]),
    lit: litOut.has(p.port)
  }));
  const first = stageOutputs.find((p) => !p.signal);
  const preview = first
    ? {
        label: first.label,
        value: first.port in play.outputs ? model.showValue(play.outputs[first.port]) : '—',
        lit: first.lit
      }
    : undefined;
  const clock = model.usesClock(spec);

  return (
    <TrySection onStartOver={startOver} canStartOver={steps.length > FIRST_FRAME.length}>
      <TryStage title={title} typeLabel={typeLabel} inputs={stageInputs} outputs={stageOutputs} preview={preview} />

      <div className={css['Controls']}>
        {controls.signals.length > 0 && (
          <div className={css['ControlGroup']}>
            <span className={css['Label']}>Send a signal</span>
            <div className={css['ControlRow']}>
              {controls.signals.map((control) => (
                <button
                  key={control.port}
                  type="button"
                  className={css['Signal']}
                  title={control.description}
                  onClick={() => push({ signal: control.port })}
                >
                  <SignalIcon />
                  {control.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {controls.values.length > 0 && (
          <div className={css['ControlGroup']}>
            <span className={css['Label']}>Set a value</span>
            <div className={css['ControlRow']}>
              {controls.values.map((control) => {
                if (control.kind === 'boolean') {
                  const on = current(control) === true || current(control) === 'true';
                  return (
                    <button
                      key={control.port}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      className={css['Switch']}
                      title={control.description}
                      onClick={() => setValue(control, !on)}
                    >
                      <span className={css['Track']} aria-hidden="true">
                        <span className={css['Knob']} />
                      </span>
                      {control.label}
                    </button>
                  );
                }
                if (control.kind === 'number') {
                  const step = (delta: number) => {
                    const n = Number(current(control));
                    setValue(control, (Number.isFinite(n) ? n : 0) + delta);
                  };
                  return (
                    <div
                      key={control.port}
                      role="group"
                      aria-label={control.label}
                      className={css['Box']}
                      title={control.description}
                    >
                      <span className={css['BoxLabel']}>{control.label}</span>
                      <button
                        type="button"
                        className={css['Step']}
                        aria-label={`${control.label} down by one`}
                        onClick={() => step(-1)}
                      >
                        −
                      </button>
                      <input
                        className={css['BoxInput']}
                        type="text"
                        inputMode="decimal"
                        aria-label={control.label}
                        {...typing(control)}
                      />
                      <button
                        type="button"
                        className={css['Step']}
                        aria-label={`${control.label} up by one`}
                        onClick={() => step(1)}
                      >
                        +
                      </button>
                    </div>
                  );
                }
                if (control.kind === 'enum' && control.enums) {
                  const value = draftFor(control);
                  return (
                    <label key={control.port} className={css['Box']} title={control.description}>
                      <span className={css['BoxLabel']}>{control.label}</span>
                      <select
                        className={css['BoxSelect']}
                        value={value}
                        onChange={(event) => setValue(control, event.currentTarget.value)}
                      >
                        {!control.enums.includes(value) && <option value={value}>{value || '—'}</option>}
                        {control.enums.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }
                return (
                  <label key={control.port} className={css['Box']} title={control.description}>
                    <span className={css['BoxLabel']}>{control.label}</span>
                    <input
                      className={`${css['BoxInput']} ${css['is-wide']}`}
                      type="text"
                      placeholder={control.kind === 'string' ? 'text' : 'JSON or text'}
                      {...typing(control)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {clock && (
          <div className={css['ControlGroup']}>
            <span className={css['Label']}>Time</span>
            <div className={css['ControlRow']}>
              <label className={css['Box']}>
                <input
                  className={css['BoxInput']}
                  type="text"
                  inputMode="numeric"
                  aria-label="Milliseconds to move the clock"
                  value={advanceMs}
                  onChange={(event) => setAdvanceMs(event.currentTarget.value)}
                />
                <span className={css['BoxLabel']}>ms</span>
                <button
                  type="button"
                  className={css['Quiet']}
                  style={{ marginRight: 6 }}
                  onClick={() => {
                    const ms = Number(advanceMs);
                    if (Number.isFinite(ms) && ms >= 0) push({ advance: ms });
                  }}
                >
                  Move time
                </button>
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={sameFrame}
                className={css['Switch']}
                title="Off: every action is its own frame. On: actions wait until you end the frame."
                onClick={() => setSameFrame((on) => !on)}
              >
                <span className={css['Track']} aria-hidden="true">
                  <span className={css['Knob']} />
                </span>
                Same frame
              </button>
              {sameFrame && (
                <button type="button" className={css['Quiet']} onClick={() => setSteps((prev) => [...prev, 'settle'])}>
                  End the frame
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={css['Happened']}>
        <span className={css['Label']}>What happened</span>
        <div ref={rowsRef} className={css['Rows']} aria-live="polite">
          <TryRows rows={play.rows} error={play.error} />
        </div>
      </div>
    </TrySection>
  );
}
