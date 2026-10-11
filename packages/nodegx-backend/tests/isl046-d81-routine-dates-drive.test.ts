/**
 * P109 ISL-046 · P78-D81 — the routine pane's date fields show the routine that is open.
 *
 * The pane stays drawn while the person picks another routine from the list, so its two Date pickers
 * are one field reused for the next record. An end date before the start is refused, and the record
 * keeps its empty end. The field still showed the refused day — and when the next routine's end was
 * empty too, that routine showed it as well, because an unchanged `Value` re-runs nothing (DEF-046).
 *
 * Driven on `templates/todo-list-demo/` with no backend; the record is read from the demo's storage.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { placeStarterAssets } from './helpers/judge';
import { clickAt, clickButton } from './helpers/members-drive';
import { withRenderedPage } from './helpers/site-drive';
import type { RenderedPage } from './helpers/site-drive';
import { clickWords, text, until, wait } from './helpers/todo-drive';

jest.setTimeout(300_000);

const REPO = path.join(__dirname, '..', '..', '..');
const DEMO_DIR = path.join(REPO, 'templates', 'todo-list-demo');
/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Demo.ts`. */
const STORAGE_KEY = 'nodegx-todo-list-demo-v1';
/** Seeded in `tpl008Demo.ts`: Pilates starts in five days, the tablets twelve days ago; neither ends. */
const PILATES = 'Pilates';
const TABLETS = 'Take the tablets';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NOW = new Date();
const plus = (n: number) => iso(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + n));

async function press(page: RenderedPage, expr: string): Promise<boolean> {
  const at = String(
    await page.evaluate(`(function () {
      var e = ${expr};
      if (!e) return 'absent';
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = e.getBoundingClientRect();
      return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    })()`)
  );
  if (at === 'absent') return false;
  const { x, y } = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, x, y);
  return true;
}

/** Pick a day in the Nth date picker on the page, through its calendar. */
async function pickDateIn(page: RenderedPage, nth: number, day: string): Promise<void> {
  if (!(await press(page, `document.querySelectorAll('.ndg-dp-input')[${nth}]`))) throw new Error(`no date picker ${nth}`);
  await until('calendar open', () => page.evaluate(`!!document.querySelector('.ndg-dp-pop')`), (v) => v === true, 5_000);
  for (let i = 0; i < 24; i++) {
    if (await press(page, `document.querySelector('.ndg-dp-pop [data-day="${day}"]')`)) return;
    if (!(await press(page, `document.querySelector('.ndg-dp-pop [data-nav="1"]')`))) break;
  }
  throw new Error(`${day} never appeared in the calendar`);
}

const fields = async (page: RenderedPage): Promise<string[]> =>
  JSON.parse(String(await page.evaluate(`JSON.stringify(Array.from(document.querySelectorAll('.ndg-dp-input')).map(function (e) { return e.value; }))`))) as string[];

describe('P78-D81 — the routine pane’s dates are the open routine’s', () => {
  let driveError = '';
  const R: Record<string, unknown> = {};

  beforeAll(async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl046-d81-'));
    fs.cpSync(DEMO_DIR, projectDir, { recursive: true });
    const placed = placeStarterAssets(projectDir);
    if (placed.failed.length) throw new Error(`starter assets failed: ${placed.failed.join(', ')}`);

    await withRenderedPage({ projectDir }, async (page) => {
      await page.setViewport({ width: 1280, height: 1400 });
      const routine = async (title: string): Promise<Record<string, unknown> | undefined> => {
        const raw = await page.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
        const store = typeof raw === 'string' ? (JSON.parse(raw) as { Routine?: Array<Record<string, unknown>> }) : null;
        return (store?.Routine ?? []).find((r) => r.title === title);
      };
      try {
        await until('list drawn', () => text(page), (s) => s.includes('Today ('));
        const today = String(
          await page.evaluate(`(function () {
            var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) { return (x.innerText || '').trim().indexOf('Today (') === 0; })[0];
            return b ? (b.innerText || '').trim() : '';
          })()`)
        );
        await clickButton(page, today);
        await until('Today drawn', () => text(page), (s) => s.includes('Things that repeat'));

        await clickWords(page, PILATES);
        await until('Pilates open', () => text(page), (s) => s.includes('Every Tue and Thu at 18:30'));
        await wait(800);
        R.pilatesOpened = await fields(page);
        await pickDateIn(page, 1, plus(1));
        await until('refused', () => text(page), (s) => s.includes('It cannot end before it starts.'));
        await wait(800);
        R.refused = await fields(page);
        R.pilatesEnd = (await routine(PILATES))?.endDate;

        await clickWords(page, TABLETS);
        await until('tablets open', () => text(page), (s) => s.includes('Every day at 08:00 and 20:00'));
        await wait(1200);
        R.tablets = await fields(page);
        R.tabletsRecord = await routine(TABLETS);
        R.tabletsSaysRefusal = (await text(page)).includes('It cannot end before it starts.');
        console.log(`D81 reading: the refusal sentence is still shown on the next routine: ${R.tabletsSaysRefusal}`);
        R.consoleErrors = [...page.consoleErrors];
      } catch (error) {
        driveError = error instanceof Error ? error.message : String(error);
        R.textAtFailure = (await text(page).catch(() => '')).slice(0, 2000);
      }
    });
  });

  it('drives to the end without a step failing', () => {
    expect({ driveError, at: R.textAtFailure }).toEqual({ driveError: '', at: undefined });
  });

  it('the refused end date is not written (the arm reached the refusal)', () => {
    expect(R.pilatesOpened).toEqual([plus(5), '']);
    expect(R.refused).toEqual([plus(5), plus(1)]);
    expect(R.pilatesEnd).toBe('');
  });

  it('the next routine shows its own start and its own empty end, not the day refused on the last one', () => {
    const record = R.tabletsRecord as Record<string, unknown> | undefined;
    expect(record?.endDate).toBe('');
    expect(R.tablets).toEqual([record?.startDate, '']);
  });

  it('no console errors', () => {
    expect(R.consoleErrors).toEqual([]);
  });
});
