/**
 * `ScheduleBuilder` — a schedule as radios and controls, never as a cron field
 * unless the person asks for one (BMG-008 §3.1).
 *
 * Six modes (`schedule.ts`), one cron out. Under every mode: the sentence and
 * the next five runs, both from the `preview` fetcher the caller hands in —
 * the backend's `POST /admin/triggers/preview`, which reads the expression with
 * the scheduler's own parser. There is no cron reader in the page: the words
 * and the times are what the server will do, not a client's idea of it.
 *
 * 🔴 AC8: the cron text field is rendered in *Custom* only. Trigger-free by
 * design — BMG-011's orphan sweep and backup schedules use it as is.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { Chip, Hint, Notice } from '../ui/ui';
import { DAYS, MINUTE_STEPS, MODES, ScheduleState, fromCron, scheduleProblem, sortDays, toCron } from './schedule';

export interface SchedulePreview {
  valid: boolean;
  error?: string | null;
  words: string | null;
  next: string[];
  timezone?: string;
}

export interface ScheduleBuilderProps {
  /** The cron. '' for a new schedule (the builder starts on "every day at 09:00"). */
  value: string;
  onChange: (cron: string) => void;
  /** Ask the server what an expression means and when it fires next. */
  preview: (cron: string) => Promise<SchedulePreview>;
  disabled?: boolean;
  id?: string;
}

const PREVIEW_DELAY_MS = 250;

export function ScheduleBuilder(props: ScheduleBuilderProps) {
  const [state, setState] = useState<ScheduleState>(() => (props.value ? fromCron(props.value) : fromCron('0 9 * * *')));
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [asking, setAsking] = useState(false);
  const emitted = useRef<string | null>(null);
  const seq = useRef(0);

  const cron = toCron(state);
  const problem = scheduleProblem(state);

  // Tell the caller whenever the controls make a different cron (including '' while the state is incomplete).
  useEffect(() => {
    if (emitted.current === cron) return;
    emitted.current = cron;
    props.onChange(cron);
  }, [cron]);

  // A value set from outside (a drawer re-opened on another trigger) re-reads the controls.
  useEffect(() => {
    if (props.value === emitted.current) return;
    if (!props.value && emitted.current !== null) return;
    setState(props.value ? fromCron(props.value) : fromCron('0 9 * * *'));
  }, [props.value]);

  // The sentence and the next runs, a moment after the last change.
  useEffect(() => {
    if (!cron) {
      setPreview(null);
      return;
    }
    const mine = ++seq.current;
    setAsking(true);
    const timer = setTimeout(() => {
      props
        .preview(cron)
        .then((answer) => {
          if (mine !== seq.current) return;
          setPreview(answer);
          setAsking(false);
        })
        .catch((e) => {
          if (mine !== seq.current) return;
          setPreview({ valid: false, error: (e as Error).message, words: null, next: [] });
          setAsking(false);
        });
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cron]);

  const set = (patch: Partial<ScheduleState>) => setState({ ...state, ...patch });
  const disabled = !!props.disabled;
  const group = 'sched-mode-' + (props.id || 'x');

  return (
    <div class="sched" id={props.id}>
      <div class="sched-modes" role="radiogroup" aria-label="How often">
        {MODES.map((m) => (
          <label key={m.id} class={'sched-mode' + (state.mode === m.id ? ' on' : '')}>
            <input
              type="radio"
              name={group}
              value={m.id}
              checked={state.mode === m.id}
              disabled={disabled}
              // Custom opens on the cron the controls had just made, so switching there loses nothing.
              onChange={() => set(m.id === 'custom' && cron ? { mode: m.id, custom: cron } : { mode: m.id })}
            />
            {m.label}
          </label>
        ))}
      </div>

      <div class="sched-controls">
        {state.mode === 'minutes' ? (
          <div class="field-line">
            <span>Every</span>
            <select aria-label="Minutes" value={String(state.everyMinutes)} disabled={disabled} onChange={(e) => set({ everyMinutes: Number((e.currentTarget as HTMLSelectElement).value) })}>
              {MINUTE_STEPS.map((n) => (
                <option key={n} value={String(n)}>
                  {n === 1 ? 'minute' : n + ' minutes'}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {state.mode === 'hourly' ? (
          <div class="field-line">
            <span>Every hour at</span>
            <input type="number" min={0} max={59} step={1} aria-label="Minute past the hour" class="sched-minute" value={String(state.minute)} disabled={disabled} onInput={(e) => set({ minute: Number((e.currentTarget as HTMLInputElement).value) })} />
            <span>minutes past</span>
          </div>
        ) : null}

        {state.mode === 'daily' ? (
          <div class="field-line">
            <span>Every day at</span>
            <input type="time" aria-label="Time of day" value={state.time} disabled={disabled} onInput={(e) => set({ time: (e.currentTarget as HTMLInputElement).value })} />
          </div>
        ) : null}

        {state.mode === 'weekly' ? (
          <>
            <div class="sched-days" role="group" aria-label="Days of the week">
              {DAYS.map((d) => {
                const on = state.days.indexOf(d.n) !== -1;
                return (
                  <label key={d.n} class={'sched-day' + (on ? ' on' : '')} title={d.long}>
                    <input type="checkbox" aria-label={d.long} checked={on} disabled={disabled} onChange={(e) => set({ days: sortDays((e.currentTarget as HTMLInputElement).checked ? [...state.days, d.n] : state.days.filter((x) => x !== d.n)) })} />
                    {d.short}
                  </label>
                );
              })}
            </div>
            <div class="field-line">
              <span>at</span>
              <input type="time" aria-label="Time of day" value={state.time} disabled={disabled} onInput={(e) => set({ time: (e.currentTarget as HTMLInputElement).value })} />
            </div>
          </>
        ) : null}

        {state.mode === 'monthly' ? (
          <div class="field-line">
            <span>On day</span>
            <input type="number" min={1} max={31} step={1} aria-label="Day of the month" class="sched-minute" value={String(state.dayOfMonth)} disabled={disabled} onInput={(e) => set({ dayOfMonth: Number((e.currentTarget as HTMLInputElement).value) })} />
            <span>of every month at</span>
            <input type="time" aria-label="Time of day" value={state.time} disabled={disabled} onInput={(e) => set({ time: (e.currentTarget as HTMLInputElement).value })} />
            {state.dayOfMonth > 28 ? <Hint>Months without day {state.dayOfMonth} are skipped.</Hint> : null}
          </div>
        ) : null}

        {state.mode === 'custom' ? (
          <div class="field">
            <input type="text" class="mono" aria-label="Cron expression" placeholder="minute hour day-of-month month day-of-week" value={state.custom} disabled={disabled} onInput={(e) => set({ custom: (e.currentTarget as HTMLInputElement).value })} />
            <Hint>
              Five fields: minute (0–59), hour (0–23), day of month (1–31), month (1–12 or jan–dec), day of week (0–7 or sun–sat, Sunday is 0). <span class="mono">*</span> is any, <span class="mono">*/5</span> every fifth, <span class="mono">1-5</span> a range, <span class="mono">1,3,5</span> a list. Presets: <span class="mono">@hourly @daily @weekly @monthly</span>.
            </Hint>
          </div>
        ) : null}
      </div>

      <div class="sched-readout" aria-live="polite">
        {problem ? (
          <Notice kind="warn">{problem}</Notice>
        ) : preview && !preview.valid ? (
          <Notice kind="bad">{preview.error || 'That is not a schedule this backend can read.'}</Notice>
        ) : preview ? (
          <>
            <div class="sched-words">{preview.words || <span class="hint">No plain reading of this expression — the times below are what it does.</span>}</div>
            <div class="sched-next">
              <b>Next runs</b>
              <ol>
                {preview.next.map((iso) => (
                  <li key={iso}>{new Date(iso).toLocaleString()}</li>
                ))}
              </ol>
            </div>
            <Hint>
              Times are the backend’s local time{preview.timezone ? ', ' + preview.timezone : ''}.
              {asking ? <Chip> updating…</Chip> : null}
            </Hint>
          </>
        ) : (
          <Hint>{asking ? 'Working out the next runs…' : ''}</Hint>
        )}
      </div>
    </div>
  );
}
