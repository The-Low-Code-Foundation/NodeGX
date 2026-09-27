/**
 * The schedule builder's model (BMG-008 §3.1): six modes, each with its own
 * controls, all emitting one cron string — and the way back, so a saved cron
 * opens in the mode that can show it, or in *Custom* when none can.
 *
 * Pure: no DOM, no fetch, no cron PARSER. The backend's `parseCron` is the one
 * reader of a cron; this only spells the shapes the modes can emit and
 * recognises exactly those shapes on the way back. Anything else is *Custom*,
 * with the text shown as it is. BMG-011's sweep and backup schedules use the
 * same model — nothing in here knows what a trigger is.
 */

export type ScheduleMode = 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ScheduleState {
  mode: ScheduleMode;
  /** Every N minutes: one of MINUTE_STEPS. */
  everyMinutes: number;
  /** Every hour at: the minute past, 0–59. */
  minute: number;
  /** Daily / weekly / monthly: "HH:MM". */
  time: string;
  /** Weekly: days as cron numbers, Sunday 0, in week order (Monday first). */
  days: number[];
  /** Monthly: the day of the month, 1–31. */
  dayOfMonth: number;
  /** Custom: the expression as typed. */
  custom: string;
}

export const MINUTE_STEPS = [1, 5, 10, 15, 30];

export const MODES: Array<{ id: ScheduleMode; label: string }> = [
  { id: 'minutes', label: 'Every few minutes' },
  { id: 'hourly', label: 'Every hour' },
  { id: 'daily', label: 'Every day' },
  { id: 'weekly', label: 'Every week' },
  { id: 'monthly', label: 'Every month' },
  { id: 'custom', label: 'Custom' }
];

/** Monday first, Sunday last, as a person reads a week; `n` is cron's number. */
export const DAYS: Array<{ n: number; short: string; long: string }> = [
  { n: 1, short: 'Mon', long: 'Monday' },
  { n: 2, short: 'Tue', long: 'Tuesday' },
  { n: 3, short: 'Wed', long: 'Wednesday' },
  { n: 4, short: 'Thu', long: 'Thursday' },
  { n: 5, short: 'Fri', long: 'Friday' },
  { n: 6, short: 'Sat', long: 'Saturday' },
  { n: 0, short: 'Sun', long: 'Sunday' }
];

/** What a fresh builder shows: every day at 09:00. */
export const DEFAULT_SCHEDULE: ScheduleState = {
  mode: 'daily',
  everyMinutes: 15,
  minute: 0,
  time: '09:00',
  days: [1, 2, 3, 4, 5],
  dayOfMonth: 1,
  custom: ''
};

const PRESET_FIELDS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
  '@minutely': '* * * * *'
};

const INT = /^\d+$/;
const TIME = /^(\d{1,2}):(\d{2})$/;

function pad(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

/** "HH:MM" → [hour, minute], or null when it is not a time of day. */
export function parseTime(time: string): [number, number] | null {
  const m = TIME.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return [h, min];
}

/** Week order (Monday first, Sunday last), duplicates dropped. */
export function sortDays(days: number[]): number[] {
  const seen = new Set<number>();
  return days
    .map((d) => (d === 7 ? 0 : d))
    .filter((d) => d >= 0 && d <= 6 && !seen.has(d) && !!seen.add(d))
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
}

/**
 * Why the state cannot be turned into a cron, in words — or null when it can.
 * *Custom* is never refused here: the backend's parser is the one that reads it,
 * and the preview route relays its sentence.
 */
export function scheduleProblem(s: ScheduleState): string | null {
  switch (s.mode) {
    case 'minutes':
      return MINUTE_STEPS.indexOf(s.everyMinutes) === -1 ? 'Pick how many minutes.' : null;
    case 'hourly':
      return Number.isInteger(s.minute) && s.minute >= 0 && s.minute <= 59 ? null : 'Pick a minute past the hour (0–59).';
    case 'daily':
      return parseTime(s.time) ? null : 'Pick a time of day.';
    case 'weekly':
      if (!parseTime(s.time)) return 'Pick a time of day.';
      return s.days.length ? null : 'Pick at least one day.';
    case 'monthly':
      if (!parseTime(s.time)) return 'Pick a time of day.';
      return Number.isInteger(s.dayOfMonth) && s.dayOfMonth >= 1 && s.dayOfMonth <= 31 ? null : 'Pick a day of the month (1–31).';
    default:
      return s.custom.trim() ? null : 'Type a cron expression.';
  }
}

/** The cron for a state, or '' when `scheduleProblem` has something to say. */
export function toCron(s: ScheduleState): string {
  if (scheduleProblem(s)) return '';
  switch (s.mode) {
    case 'minutes':
      return '*/' + s.everyMinutes + ' * * * *';
    case 'hourly':
      return s.minute + ' * * * *';
    case 'daily': {
      const [h, m] = parseTime(s.time)!;
      return m + ' ' + h + ' * * *';
    }
    case 'weekly': {
      const [h, m] = parseTime(s.time)!;
      // Cron order (Sunday 0 first) — the parser does not care, a diff reader does.
      const days = sortDays(s.days).slice().sort((a, b) => a - b);
      return m + ' ' + h + ' * * ' + days.join(',');
    }
    case 'monthly': {
      const [h, m] = parseTime(s.time)!;
      return m + ' ' + h + ' ' + s.dayOfMonth + ' * *';
    }
    default:
      return s.custom.trim();
  }
}

/** A day-of-week field of numbers (lists, ranges, 7 = Sunday), or null for anything else. */
function readDays(field: string): number[] | null {
  const out: number[] = [];
  for (const part of field.split(',')) {
    const piece = part.trim();
    const range = /^(\d+)-(\d+)$/.exec(piece);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      if (lo > hi || hi > 7) return null;
      for (let d = lo; d <= hi; d++) out.push(d);
    } else if (INT.test(piece) && Number(piece) <= 7) {
      out.push(Number(piece));
    } else {
      return null;
    }
  }
  return out.length ? sortDays(out) : null;
}

/**
 * A saved cron, back into the mode that can show it. A shape no mode can show
 * (a step of hours, a month, a name, a range of minutes) opens in *Custom* with
 * the text as it was, so nothing is lost by opening the drawer.
 */
export function fromCron(cron: string): ScheduleState {
  const raw = (cron || '').trim();
  const base: ScheduleState = { ...DEFAULT_SCHEDULE, custom: raw };
  if (!raw) return { ...base, mode: 'custom' };
  const custom: ScheduleState = { ...base, mode: 'custom' };

  const expr = raw.startsWith('@') ? PRESET_FIELDS[raw.toLowerCase()] : raw;
  if (!expr) return custom;
  const parts = expr.split(/\s+/);
  if (parts.length !== 5) return custom;
  const [min, hour, dom, month, dow] = parts;
  if (month !== '*') return custom;

  if (hour === '*' && dom === '*' && dow === '*') {
    if (min === '*') return { ...base, mode: 'minutes', everyMinutes: 1 };
    const step = /^\*\/(\d+)$/.exec(min);
    if (step && MINUTE_STEPS.indexOf(Number(step[1])) !== -1) return { ...base, mode: 'minutes', everyMinutes: Number(step[1]) };
    if (INT.test(min) && Number(min) <= 59) return { ...base, mode: 'hourly', minute: Number(min) };
    return custom;
  }

  if (!INT.test(min) || !INT.test(hour) || Number(min) > 59 || Number(hour) > 23) return custom;
  const time = pad(Number(hour)) + ':' + pad(Number(min));

  if (dom === '*' && dow === '*') return { ...base, mode: 'daily', time };
  if (dom === '*') {
    const days = readDays(dow);
    return days ? { ...base, mode: 'weekly', time, days } : custom;
  }
  if (dow === '*' && INT.test(dom) && Number(dom) >= 1 && Number(dom) <= 31) {
    return { ...base, mode: 'monthly', time, dayOfMonth: Number(dom) };
  }
  return custom;
}
