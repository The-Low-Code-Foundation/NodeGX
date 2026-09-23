/**
 * THE THREE FIXTURES, READ FROM ONE PLACE (TASK-L171 §1).
 *
 * Until L171 the fixtures were the Static Data nodes the pages read, and every
 * tool dug them out of the three `Data/Fixture …` components. The pages read
 * the backend now, so the fixtures MOVED — they did not vanish — to
 * `backend/fixtures/<name>.json`, byte for byte, and they are what they always
 * were to the tools: the seed's source (build-seed) and the expected output of
 * each read function (check-read-functions, check-seed).
 *
 * One reader, so a tool cannot go on reading a component that no longer holds
 * the data and pass by comparing nothing. An absent file throws by name.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend', 'fixtures');
export const FIXTURE_NAMES = ['lesson', 'programme', 'roster'];

/** The raw text, exactly as stored — `tools/check-specimen.mjs` compares it byte for byte. */
export function fixtureText(name) {
  if (!FIXTURE_NAMES.includes(name)) throw new Error(`fixtures: no fixture called "${name}" (have ${FIXTURE_NAMES.join(', ')})`);
  const file = join(FIXTURES, `${name}.json`);
  if (!existsSync(file)) throw new Error(`fixtures: ${file} is missing — the fixtures live in backend/fixtures/ since TASK-L171`);
  return readFileSync(file, 'utf8');
}

/** The parsed array: `[lesson]`, `[programme]`, or the roster's rows. */
export function fixture(name) {
  return JSON.parse(fixtureText(name));
}
