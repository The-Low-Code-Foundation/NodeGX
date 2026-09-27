/**
 * GAM-021 — a plan is not warned about the scroll setting it is about to apply.
 *
 * P78 D56: a plan created with `scroll: "page"` on a project whose `bodyScroll` is unset got
 * `page-cannot-scroll` on every page it staged, and again from `apply_plan` — whose very next act is
 * to write `bodyScroll: true`. The warning described a state the same call replaces, and its
 * recommended fix was the one the agent had already made.
 *
 * The rule is not relaxed. `checkPageScroll` still fires on a project that really has not decided
 * (P79's lesson projects), so the arm with no `scroll` is in the same run as the arms that must be
 * silent: a spec that only reads silence would pass on a rule that never fires.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { ProjectV2File } from '../src/editor-deps';
import { call, connect, copyFixture, readJson, TestSession } from './helpers';

interface CreatePlanResponse {
  planId: string;
  operations: Array<{ id: string; kind: string; target: string }>;
}

interface Diagnosed {
  validation?: { diagnostics?: Array<{ code: string; location: { component?: string } }> };
}

const PAGE_NODES = [
  { id: 'sc_page', type: 'Page', parameters: { title: 'Scores', urlPath: 'scores' } },
  { id: 'sc_text', type: 'Text', parent: 'sc_page', parameters: { text: 'Scores' } }
];

const CODE = 'page-cannot-scroll';

function codes(res: { data: Diagnosed }): string[] {
  return (res.data.validation?.diagnostics ?? []).map((d) => d.code);
}

function bodyScroll(dir: string): unknown {
  return ((readJson<ProjectV2File>(dir, 'nodegx.project.json').settings ?? {}) as Record<string, unknown>).bodyScroll;
}

function setBodyScroll(dir: string, value: boolean): void {
  const project = readJson<ProjectV2File>(dir, 'nodegx.project.json');
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ ...project, settings: { ...project.settings, bodyScroll: value } }, null, 2)
  );
}

/** One page, one plan: the staging response and the apply response, both read. */
async function stageAndApply(session: TestSession, scroll?: 'page' | 'app') {
  const plan = await call<CreatePlanResponse>(session, 'create_plan', {
    request: 'Add a scores page',
    ...(scroll ? { scroll } : {}),
    operations: [{ kind: 'create', target: 'Pages/Scores', intent: 'The high-score table' }]
  });
  expect(plan.isError).toBe(false);
  const staged = await call<Diagnosed>(session, 'stage_plan_operation', {
    plan_id: plan.data.planId,
    operation_id: plan.data.operations[0].id,
    nodes: PAGE_NODES,
    visual_roots: ['sc_page']
  });
  expect(staged.isError).toBe(false);
  const applied = await call<Diagnosed>(session, 'apply_plan', { plan_id: plan.data.planId });
  expect(applied.isError).toBe(false);
  return { staged: codes(staged), applied: codes(applied) };
}

describe('GAM-021 — the plan door judges the scroll setting the apply will leave', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fixture precondition: the demo project has not decided about scrolling', () => {
    // Every arm below means something only if the project starts unset.
    expect(bodyScroll(dir)).toBeUndefined();
  });

  /**
   * Each arm is ONE assertion over all three readings, so a red names every door at once. Read
   * separately, the staging line fails first and the apply door and the disk go unread.
   */
  it('AC1/AC2 — `scroll: "page"` on an unset project: no warning at either door, and bodyScroll lands true', async () => {
    const { staged, applied } = await stageAndApply(session, 'page');
    expect({ staged: staged.includes(CODE), applied: applied.includes(CODE), bodyScroll: bodyScroll(dir) }).toEqual({
      staged: false,
      applied: false,
      bodyScroll: true
    });
  });

  it('AC3 — the true positive stays: no `scroll` on an unset project is still told, at both doors', async () => {
    const { staged, applied } = await stageAndApply(session);
    expect({ staged: staged.includes(CODE), applied: applied.includes(CODE), bodyScroll: bodyScroll(dir) }).toEqual({
      staged: true,
      applied: true,
      bodyScroll: undefined
    });
  });

  it('AC4 — `scroll: "app"` on an unset project: no warning, and bodyScroll lands false', async () => {
    const { staged, applied } = await stageAndApply(session, 'app');
    expect({ staged: staged.includes(CODE), applied: applied.includes(CODE), bodyScroll: bodyScroll(dir) }).toEqual({
      staged: false,
      applied: false,
      bodyScroll: false
    });
  });

  it('AC4 — a project already `false` with a plan saying "page": no warning, and it stays false', async () => {
    setBodyScroll(dir, false);
    const { staged, applied } = await stageAndApply(session, 'page');
    expect({ staged: staged.includes(CODE), applied: applied.includes(CODE), bodyScroll: bodyScroll(dir) }).toEqual({
      staged: false,
      applied: false,
      bodyScroll: false
    });
  });
});
