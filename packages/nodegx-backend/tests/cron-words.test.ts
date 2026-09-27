/**
 * BMG-008 §3.4 — a cron in a person's words. The one gloss: the admin page's
 * list and the preview route both read it, and the editor's copy goes with
 * its form (BMG-012).
 */
import { cronWords, daysOfWeek, listWords, ordinal } from '../src/triggers/cronWords';
import { parseCron } from '../src/triggers/cron';

describe('cronWords', () => {
  const table: Array<[string, string]> = [
    ['* * * * *', 'Every minute'],
    ['*/1 * * * *', 'Every minute'],
    ['*/5 * * * *', 'Every 5 minutes'],
    ['*/15 * * * *', 'Every 15 minutes'],
    ['0 * * * *', 'Every hour, on the hour'],
    ['30 * * * *', 'Every hour at 30 past'],
    ['0 */2 * * *', 'Every 2 hours, on the hour'],
    ['15 */6 * * *', 'Every 6 hours at 15 past'],
    ['0 9 * * *', 'Every day at 09:00'],
    ['5 3 * * *', 'Every day at 03:05'],
    ['0 9 * * 1', 'Every Monday at 09:00'],
    ['0 9 * * 1,3,5', 'Every Monday, Wednesday and Friday at 09:00'],
    ['0 9 * * 5,1,3', 'Every Monday, Wednesday and Friday at 09:00'],
    ['0 9 * * 1-5', 'Every weekday at 09:00'],
    ['0 9 * * mon-fri', 'Every weekday at 09:00'],
    ['0 9 * * 6,0', 'Every weekend day at 09:00'],
    ['0 9 * * 0', 'Every Sunday at 09:00'],
    ['0 9 * * 7', 'Every Sunday at 09:00'],
    ['0 9 * * 0-6', 'Every day at 09:00'],
    ['0 9 1 * *', 'On the 1st of every month at 09:00'],
    ['0 9 22 * *', 'On the 22nd of every month at 09:00'],
    ['0 9 13 * *', 'On the 13th of every month at 09:00'],
    ['0 0 1 1 *', 'Every year on 1 January at 00:00'],
    ['30 8 25 12 *', 'Every year on 25 December at 08:30'],
    ['@hourly', 'Every hour, on the hour'],
    ['@daily', 'Every day at 00:00'],
    ['@midnight', 'Every day at 00:00'],
    ['@weekly', 'Every Sunday at 00:00'],
    ['@monthly', 'On the 1st of every month at 00:00'],
    ['@yearly', 'Every year on 1 January at 00:00'],
    ['@minutely', 'Every minute']
  ];

  it.each(table)('%s → "%s"', (cron, words) => {
    expect(cronWords(cron)).toBe(words);
    // Every sentence here is about an expression the scheduler accepts.
    expect(() => parseCron(cron)).not.toThrow();
  });

  it('says nothing about a shape it does not fully read', () => {
    for (const cron of ['0 0 1-5,10 */2 3', '0 9 * * */2', '0-30 9 * * *', '0 9 1,15 * *', '0 9 * 1-6 *', '0 9 1 * 1', 'nonsense', '', '* * *']) {
      expect(cronWords(cron)).toBeNull();
    }
  });

  it('trims and ignores case for presets', () => {
    expect(cronWords('  @Daily ')).toBe('Every day at 00:00');
  });
});

describe('the helpers', () => {
  it('ordinal', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
  });

  it('listWords', () => {
    expect(listWords([])).toBe('');
    expect(listWords(['Monday'])).toBe('Monday');
    expect(listWords(['Monday', 'Friday'])).toBe('Monday and Friday');
    expect(listWords(['Monday', 'Wednesday', 'Friday'])).toBe('Monday, Wednesday and Friday');
  });

  it('daysOfWeek reads numbers, names, lists and ranges into week order, and refuses steps', () => {
    expect(daysOfWeek('1,3,5')).toEqual([1, 3, 5]);
    expect(daysOfWeek('0,6')).toEqual([6, 0]);
    expect(daysOfWeek('fri,mon')).toEqual([1, 5]);
    expect(daysOfWeek('1-5')).toEqual([1, 2, 3, 4, 5]);
    expect(daysOfWeek('5-7')).toEqual([5, 6, 0]);
    expect(daysOfWeek('*/2')).toBeNull();
    expect(daysOfWeek('8')).toBeNull();
    expect(daysOfWeek('')).toBeNull();
  });
});
