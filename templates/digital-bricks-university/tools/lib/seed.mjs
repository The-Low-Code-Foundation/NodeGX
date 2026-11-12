/**
 * THE DEMO WORLD, BUILT FROM THE FIXTURES FOR A GIVEN DAY (DBU-01).
 *
 * backend/fixtures/*.json are written for people: offsets from today ("-24d 10:00"), readable keys, steps
 * nested in their learner. tools/lib/world.mjs is the one owner of turning them into backend rows, so
 * setup-backend (which writes them), check-seed (which reads them back) and the browser-only demo
 * (tools/build-demo.mjs) cannot disagree. This module reads the files and hands them over.
 */
import { join } from 'node:path';
import { APP, readJson } from './local.mjs';
import { COACH_TZ, buildWorld as buildFrom, makeClock, resolveRows, zoneOffsetMs } from './world.mjs';

export { COACH_TZ, makeClock, resolveRows, zoneOffsetMs };
export const FILES_DIR = join(APP, 'backend', 'fixtures', 'files');

/**
 * The built-in check-in forms (DBU-10), read from the one place they are defined: the literal between
 * the FORMS markers in components/__cloud__/shared/Checkin forms. Read only, never written.
 */
export function checkinForms() {
  const nodes = readJson('components', '__cloud__', 'shared', 'Checkin forms', 'nodes.json').nodes;
  const script = (nodes.find((n) => n.type === 'JavaScriptFunction') || {}).parameters?.functionScript || '';
  const m = /\/\* FORMS \*\/([\s\S]*?)\/\* END FORMS \*\//.exec(script);
  if (!m) throw new Error('seed: no FORMS literal in __cloud__/shared/Checkin forms');
  return JSON.parse(m[1]);
}

/** The fixtures and forms buildWorld reads. */
export function worldSources() {
  return {
    library: readJson('backend', 'fixtures', 'library.json'),
    people: readJson('backend', 'fixtures', 'learners.json'),
    forms: checkinForms()
  };
}

/** The world for `now`: users (with roles), files to upload (with their owner), and rows per collection. */
export function buildWorld(now = new Date()) {
  return buildFrom(now, worldSources());
}
