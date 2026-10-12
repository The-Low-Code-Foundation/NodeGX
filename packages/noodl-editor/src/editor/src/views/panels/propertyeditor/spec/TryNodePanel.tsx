import React, { useEffect, useMemo, useState } from 'react';

import { disagreementsFor, summariseDisagreements } from './specDisagreements';
import css from './SpecSections.module.scss';
import type { AnyNodeSpec, Step, TryControls, ValueControl } from './tryNodeModel';
import { TryTimeline } from './TryTimeline';

/**
 * NSP-019 AC2 — "Try this node": set its inputs, press its signals, move the clock, and read what
 * the node does — on its spec, not the project, so an unwired node can be tried.
 *
 * One component, state local: the steps the person took (the interpreter replays them from a
 * fresh mount on every change — `tryNodeModel.playTimeline`), the field drafts, and whether
 * actions share a frame. No store; a new node is a new `key` and starts over.
 *
 * The spec package is loaded with a dynamic `import()` the first time the panel is opened
 * (`isActive`): every spec and the interpreter are ~890 KB of source, and the Properties tab must
 * not pay for them on every selection. Until it lands the panel says so.
 *
 * Memory: a `Select` inside a `Modal` closes it — this is a panel, not a modal, and its `<select>`
 * is a plain element. Nothing here imports `Icon` (an empty span in jest), so the panel renders
 * in the plain-Node runner through `react-dom/server`.
 */
type Model = typeof import('./tryNodeModel');

export interface TryNodePanelProps {
  typeName: string;
  /** The node's parameters on the canvas — what the try starts with, kept to the spec's value inputs. */
  parameters?: Readonly<Record<string, unknown>>;
  /** True once the fold is open: the spec package loads on the first opening and stays. */
  isActive: boolean;
}

const DEFAULT_ADVANCE_MS = 1000;

export function TryNodePanel({ typeName, parameters, isActive }: TryNodePanelProps) {
  const [model, setModel] = useState<Model | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [steps, setSteps] = useState<Step[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sameFrame, setSameFrame] = useState(false);
  const [advanceMs, setAdvanceMs] = useState(String(DEFAULT_ADVANCE_MS));

  useEffect(() => {
    if (!isActive || model) return;
    let cancelled = false;
    import('./tryNodeModel').then(
      (loaded) => {
        if (!cancelled) setModel(loaded);
      },
      (error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [isActive, model]);

  const spec: AnyNodeSpec | undefined = useMemo(() => model?.specNamed(typeName), [model, typeName]);
  const controls: TryControls | undefined = useMemo(() => (spec ? model?.controlsFor(spec) : undefined), [model, spec]);
  const startParams = useMemo(
    () => (spec ? model?.startParamsFor(spec, parameters) ?? {} : {}),
    [model, spec, parameters]
  );
  const timeline = useMemo(
    () => (spec && model ? model.playTimeline(spec, startParams, steps) : undefined),
    [model, spec, startParams, steps]
  );

  const disagreements = disagreementsFor(typeName);

  const push = (...next: Step[]) =>
    setSteps((prev) => [...prev, ...next, ...(sameFrame ? [] : (['settle'] as Step[]))]);
  const endFrame = () => setSteps((prev) => [...prev, 'settle']);
  const startOver = () => {
    setSteps([]);
    setDrafts({});
  };

  const draftFor = (control: ValueControl): string => {
    if (control.port in drafts) return drafts[control.port];
    const current = startParams[control.port] ?? control.default;
    return current === undefined || current === null ? '' : String(current);
  };
  const commit = (control: ValueControl) => {
    if (!(control.port in drafts) || !model) return;
    push({ set: control.port, value: model.parseTyped(control.kind, drafts[control.port]) });
  };

  return (
    <div className={css['Try']}>
      {disagreements.length > 0 && (
        <div className={css['Disagreed']} role="note">
          <p className={css['DisagreedTitle']}>
            The spec and the running node disagreed {summariseDisagreements(disagreements)}.
          </p>
          <ul className={css['DisagreedList']}>
            {disagreements.map((row) => (
              <li key={row.id} className={css['DisagreedRow']}>
                <span className={css['DisagreedId']}>{row.id}</span> {row.title}
                <span className={css['DisagreedStatus']}>
                  {' '}
                  — {row.status}
                  {row.commit ? ` in ${row.commit}` : ''}
                </span>
                {row.ruling && <div className={css['DisagreedRuling']}>{row.ruling}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!model && !loadError && (
        <p className={css['Empty']}>{isActive ? 'Loading the spec…' : 'Open to try the node on its spec.'}</p>
      )}
      {loadError && <p className={css['TimelineError']}>The spec could not be loaded: {loadError}</p>}
      {model && !spec && <p className={css['Empty']}>The spec package has no spec named {typeName}.</p>}

      {model && spec && controls && (
        <>
          <p className={css['Intro']}>
            Runs the spec in the interpreter, not the app: what you see is what the node is specified to do with these
            values, wired to nothing.
          </p>

          {controls.values.length > 0 && (
            <div className={css['Controls']}>
              {controls.values.map((control) => (
                <label key={control.port} className={css['Field']} title={control.description}>
                  <span className={css['FieldLabel']}>{control.label}</span>
                  {control.kind === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={draftFor(control) === 'true'}
                      onChange={(event) => {
                        const value = event.currentTarget.checked;
                        setDrafts((prev) => ({ ...prev, [control.port]: String(value) }));
                        push({ set: control.port, value });
                      }}
                    />
                  ) : control.kind === 'enum' && control.enums ? (
                    <select
                      className={css['FieldInput']}
                      value={draftFor(control)}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setDrafts((prev) => ({ ...prev, [control.port]: value }));
                        push({ set: control.port, value });
                      }}
                    >
                      {!control.enums.includes(draftFor(control)) && (
                        <option value={draftFor(control)}>{draftFor(control) || '—'}</option>
                      )}
                      {control.enums.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={css['FieldInput']}
                      type="text"
                      inputMode={control.kind === 'number' ? 'decimal' : undefined}
                      value={draftFor(control)}
                      placeholder={
                        control.kind === 'number' ? 'a number' : control.kind === 'string' ? 'text' : 'JSON or text'
                      }
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setDrafts((prev) => ({ ...prev, [control.port]: value }));
                      }}
                      onBlur={() => commit(control)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commit(control);
                      }}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          <div className={css['Actions']}>
            {controls.signals.map((control) => (
              <button
                key={control.port}
                type="button"
                className={css['Press']}
                title={control.description}
                onClick={() => push({ signal: control.port })}
              >
                {control.label}
              </button>
            ))}
            <span className={css['Clock']}>
              <input
                className={css['ClockInput']}
                type="text"
                inputMode="numeric"
                value={advanceMs}
                aria-label="Milliseconds to move the clock"
                onChange={(event) => setAdvanceMs(event.currentTarget.value)}
              />
              <button
                type="button"
                className={css['Press']}
                onClick={() => {
                  const ms = Number(advanceMs);
                  if (Number.isFinite(ms) && ms >= 0) push({ advance: ms });
                }}
              >
                Move time
              </button>
            </span>
          </div>

          <div className={css['FrameRow']}>
            <label className={css['SameFrame']}>
              <input
                type="checkbox"
                checked={sameFrame}
                onChange={(event) => setSameFrame(event.currentTarget.checked)}
              />
              Same frame
            </label>
            {sameFrame && (
              <button type="button" className={css['Press']} onClick={endFrame}>
                End the frame
              </button>
            )}
            <button type="button" className={css['Quiet']} onClick={startOver} disabled={steps.length === 0}>
              Start over
            </button>
          </div>

          {timeline && <TryTimeline entries={timeline.entries} error={timeline.error} />}
        </>
      )}
    </div>
  );
}
