/**
 * P123-STU008-BACKENDPUBLIC — a deploy does not publish the backend's files.
 *
 * `nodegx.security.json` is the backend's whole access policy, and `backend/` holds its schema, seed data, fixtures
 * and proposed triggers. The backend reads both from the project folder and the app reads neither, yet a deploy
 * copied both to the public site (measured 2026-10-20 on the todo-list template, and 2026-10-22 on a person's own
 * deploy: `backend/schema.json` beside `index.html`). The default rules are the one list the editor's Deploy
 * button and the npm engine share, so they are graded here.
 */
import { buildIgnoreMatcher } from '../../src/editor/src/utils/compilation/build/ignore';

describe('P123-STU008-BACKENDPUBLIC — the default deploy rules', () => {
  it.each([true, false])('🔴 excludes the access policy and backend/ (v2 project: %s)', (isV2Project) => {
    const matcher = buildIgnoreMatcher({ isV2Project, ignoreFileContent: null });
    // P127 BKO-001: nodegx.automations.json, the workflows and triggers, is the backend's too.
    for (const file of ['nodegx.security.json', 'nodegx.automations.json', 'backend/schema.json', 'backend/seed/members.json']) {
      expect(matcher.match(file).ignored).toBe(true);
    }
  });

  it('only at the project root: an asset folder called backend deeper down still ships', () => {
    const matcher = buildIgnoreMatcher({ isV2Project: true, ignoreFileContent: null });
    expect(matcher.match('assets/backend/diagram.png').ignored).toBe(false);
    expect(matcher.match('docs-public/nodegx.security.json').ignored).toBe(false);
  });

  it('a project that wants them published says so with !/backend/ — gitignore cannot re-include a file under an excluded folder', () => {
    const optIn = buildIgnoreMatcher({ isV2Project: true, ignoreFileContent: '!/backend/\n!/nodegx.security.json\n' });
    expect(optIn.match('backend/schema.json').ignored).toBe(false);
    expect(optIn.match('nodegx.security.json').ignored).toBe(false);

    const tooDeep = buildIgnoreMatcher({ isV2Project: true, ignoreFileContent: '!backend/schema.json\n' });
    expect(tooDeep.match('backend/schema.json').ignored).toBe(true);
  });

  it('control: the files a deployed app needs are still copied', () => {
    const matcher = buildIgnoreMatcher({ isV2Project: true, ignoreFileContent: null });
    for (const file of ['index.html', 'favicon.png', 'assets/logo.svg', 'backend.png']) {
      expect(matcher.match(file).ignored).toBe(false);
    }
  });
});
