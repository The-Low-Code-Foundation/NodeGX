/**
 * A cron expression in a person's words (BMG-008 §3.4).
 *
 * `cronWords('0 9 * * 1,3,5')` → *"Every Monday, Wednesday and Friday at 09:00"*.
 * The gloss lived in the editor (`models/triggers/TriggerBackendClient.ts`,
 * `cronGloss`); this is the one copy now. The admin page never parses a cron
 * itself — the list route decorates each schedule trigger with these words and
 * the preview route answers them for an unsaved expression, so what the page
 * says a schedule does is what the scheduler will do. The editor keeps its own
 * structural copy until BMG-012 deletes its form: it does not import this
 * package (`models/workflow/types.ts` says why).
 *
 * The rule is the editor's: a gloss is only ever offered for a shape it fully
 * understands, and `null` otherwise. A wrong sentence about when something
 * runs is worse than no sentence — it is read as the truth.
 *
 * @module nodegx-backend/triggers/cronWords
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_TOKENS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PRESET_WORDS: Record<string, string> = {
  '@yearly': 'Every year on 1 January at 00:00',
  '@annually': 'Every year on 1 January at 00:00',
  '@monthly': 'On the 1st of every month at 00:00',
  '@weekly': 'Every Sunday at 00:00',
  '@daily': 'Every day at 00:00',
  '@midnight': 'Every day at 00:00',
  '@hourly': 'Every hour, on the hour',
  '@minutely': 'Every minute'
};

const INT = /^\d+$/;

function pad(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

/** 1 → "1st", 22 → "22nd", 13 → "13th". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return n + 'th';
  switch (n % 10) {
    case 1:
      return n + 'st';
    case 2:
      return n + 'nd';
    case 3:
      return n + 'rd';
    default:
      return n + 'th';
  }
}

/** "Monday", "Monday and Friday", "Monday, Wednesday and Friday". */
export function listWords(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/**
 * The days a day-of-week field names, in week order (Monday first, Sunday last), or
 * null when the field uses something this gloss does not read (a step, a name it
 * does not know). Lists and ranges of numbers or three-letter names are read;
 * `7` is Sunday.
 */
export function daysOfWeek(field: string): number[] | null {
  const found = new Set<number>();
  for (const part of field.split(',')) {
    const piece = part.trim().toLowerCase();
    if (!piece || piece.indexOf('/') !== -1) return null;
    const dash = piece.indexOf('-');
    // Cron's own number (0–7, both ends Sunday), so a range is read numerically as the parser reads it.
    const one = (token: string): number | null => {
      if (INT.test(token)) {
        const n = Number(token);
        return n >= 0 && n <= 7 ? n : null;
      }
      return Object.prototype.hasOwnProperty.call(DAY_TOKENS, token) ? DAY_TOKENS[token] : null;
    };
    if (dash > 0) {
      const lo = one(piece.slice(0, dash));
      const hi = one(piece.slice(dash + 1));
      if (lo === null || hi === null || lo > hi) return null;
      for (let d = lo; d <= hi; d++) found.add(d % 7);
    } else {
      const n = one(piece);
      if (n === null) return null;
      found.add(n % 7);
    }
  }
  if (!found.size) return null;
  // Week order: Monday (1) … Saturday (6), then Sunday (0).
  return Array.from(found).sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
}

/** "Every weekday", "Every Monday, Wednesday and Friday", "Every day". */
function daysWords(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && days.join(',') === '1,2,3,4,5') return 'Every weekday';
  if (days.length === 2 && days.join(',') === '6,0') return 'Every weekend day';
  return 'Every ' + listWords(days.map((d) => DAY_NAMES[d]));
}

/**
 * The sentence for a cron expression, or null when it has a shape this does not
 * read. The five-field grammar is `cron.ts`'s; this never validates, so a
 * sentence for an invalid expression is possible only for a shape that looks
 * like one of these (`60 9 * * *` reads as "at 09:60"). The preview route runs
 * `parseCron` first and only offers words for a valid expression.
 */
export function cronWords(cron: string): string | null {
  const expr = (cron || '').trim();
  if (!expr) return null;
  const preset = PRESET_WORDS[expr.toLowerCase()];
  if (preset) return preset;

  const parts = expr.split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hour, dom, month, dow] = parts;
  const everyDate = dom === '*' && month === '*' && dow === '*';

  // Every N minutes.
  const stepMinutes = /^\*\/(\d+)$/.exec(min);
  if (stepMinutes && hour === '*' && everyDate) {
    const n = Number(stepMinutes[1]);
    return n === 1 ? 'Every minute' : 'Every ' + n + ' minutes';
  }
  if (min === '*' && hour === '*' && everyDate) return 'Every minute';

  if (!INT.test(min)) return null;
  const m = Number(min);

  // Every hour / every N hours, at a minute past.
  const stepHours = /^\*\/(\d+)$/.exec(hour);
  if (stepHours && everyDate) {
    const n = Number(stepHours[1]);
    const every = n === 1 ? 'Every hour' : 'Every ' + n + ' hours';
    return m === 0 ? every + ', on the hour' : every + ' at ' + m + ' past';
  }
  if (hour === '*' && everyDate) return m === 0 ? 'Every hour, on the hour' : 'Every hour at ' + m + ' past';

  if (!INT.test(hour)) return null;
  const at = pad(Number(hour)) + ':' + pad(m);

  // Every day at HH:MM.
  if (everyDate) return 'Every day at ' + at;

  // Every <days> at HH:MM.
  if (dom === '*' && month === '*') {
    const days = daysOfWeek(dow);
    return days ? daysWords(days) + ' at ' + at : null;
  }

  // On the Nth of every month at HH:MM.
  if (INT.test(dom) && month === '*' && dow === '*') {
    const d = Number(dom);
    if (d < 1 || d > 31) return null;
    return 'On the ' + ordinal(d) + ' of every month at ' + at;
  }

  // Every year on D Month at HH:MM.
  if (INT.test(dom) && INT.test(month) && dow === '*') {
    const d = Number(dom);
    const mo = Number(month);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
    return 'Every year on ' + d + ' ' + MONTH_NAMES[mo - 1] + ' at ' + at;
  }

  return null;
}
