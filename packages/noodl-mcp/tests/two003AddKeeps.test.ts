/**
 * P112-OWN021-ADDKEEPS — after Add the country or Add the shelf, the fields empty.
 *
 * On 0.4.2 the new country was listed ("Ghana · GHS") while the Country and Currency code fields still said "Ghana" and
 * "GHS", and the same on Shelves: a builder couldn't tell it had worked, and might press again. A second press is
 * refused in words ("There is already a country called Ghana.", graded in nodegx-backend's two-003-checkout spec), so
 * what this grades is the page: the function's `done` clears every field of the add, and only `done` (a refusal keeps
 * what was typed, to correct).
 */
import * as fs from 'fs';
import * as path from 'path';

import { TEMPLATE_DIR } from './two003Template';

interface C {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}
const wires = (rel: string): C[] => JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, 'components', rel, 'connections.json'), 'utf8')).connections;
const clearedBy = (rel: string) =>
  wires(rel)
    .filter((w) => w.toProperty === 'clear')
    .map((w) => `${w.fromId}.${w.fromProperty} → ${w.toId}`)
    .sort();

describe('P112-OWN021-ADDKEEPS — an add that worked empties its fields', () => {
  it('known-firing: the reader sees the Add the country press', () => {
    expect(wires('Pages/Admin/WaysToPay').some((w) => w.fromId === 'wpAddGo' && w.fromProperty === 'onClick')).toBe(true);
  });

  it('Ways to pay: saveCountry’s done clears the Country and the Currency code, and nothing else does', () => {
    expect(clearedBy('Pages/Admin/WaysToPay')).toEqual(['wpCall.done → wpCurrency', 'wpCall.done → wpName']);
  });

  it('Shelves: saveShelf’s done clears the new shelf’s name, and nothing else does', () => {
    expect(clearedBy('Pages/Admin/Shelves')).toEqual(['svCall.done → svName']);
  });
});
