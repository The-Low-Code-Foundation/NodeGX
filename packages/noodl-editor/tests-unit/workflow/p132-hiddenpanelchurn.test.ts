/**
 * P132-HIDDENPANELCHURN — a warning set that changes nothing says nothing.
 *
 * Measured in the dev editor on a Greenhouse copy (2026-11-04): with only a page open, `warningsChanged` fired ~480
 * times a second. The Components panel bumps a counter on every `warningsChanged`, its rebuild reads page info, that
 * reads a Page Inputs node's names through `readNameList`, and `readNameList` clears its warning on every read. A
 * clear of a warning that was not there still announced a change, so the two fed each other once per
 * `setTimeout(1)` for as long as a project was open (the top bar and every mounted dialog re-rendering with them:
 * ~14,000 DOM changes a second in the dialog portal).
 *
 * This spec drives the REAL `WarningsModel` and the REAL `readNameList`; only the model's heavy neighbours are stubbed.
 */

jest.mock('@noodl-models/componentmodel', () => ({ ComponentModel: class {} }));
jest.mock('@noodl-models/projectmodel', () => ({ ProjectModel: { instance: null } }));
jest.mock('../../src/editor/src/models/nodelibrary', () => ({ NodeLibrary: { instance: { on: () => undefined } } }));

import { WarningsModel } from '../../src/editor/src/models/warningsmodel';
import { readNameList } from '../../src/editor/src/models/NodeTypeAdapters/nameListParameter.warnings';

const component = { name: '/Pages/Home' };
const pageInputs = (pathParams: unknown) => ({ id: 'pi-1', parameters: { pathParams }, owner: { owner: component } });

function counting(model: WarningsModel) {
  let n = 0;
  const group = { id: 'p132-churn-spec' };
  model.on('warningsChanged', () => n++, group);
  return { count: () => n, stop: () => model.off(group) };
}

describe('P132-HIDDENPANELCHURN: WarningsModel.setWarning announces only a change', () => {
  let model: WarningsModel;
  beforeEach(() => {
    jest.useFakeTimers();
    model = new WarningsModel();
  });
  afterEach(() => jest.useRealTimers());

  it('a clear of a warning that is not there announces nothing', () => {
    const c = counting(model);
    model.setWarning({ component, node: { id: 'n' }, key: 'k' }, undefined);
    jest.advanceTimersByTime(5);
    expect(c.count()).toBe(0);
  });

  it('a set, then a clear of it, each announce once', () => {
    const c = counting(model);
    const ref = { component, node: { id: 'n' }, key: 'k' };
    model.setWarning(ref, { message: 'off-format' });
    jest.advanceTimersByTime(5);
    expect(c.count()).toBe(1);
    expect(model.getNumberOfWarningsForComponent(component, {})).toBe(1);
    model.setWarning(ref, undefined);
    jest.advanceTimersByTime(5);
    expect(c.count()).toBe(2);
    expect(model.getNumberOfWarningsForComponent(component, {})).toBe(0);
  });

  it('the same words set again as a fresh object announce nothing; other words announce', () => {
    const c = counting(model);
    const ref = { component, node: { id: 'n' }, key: 'k' };
    model.setWarning(ref, { level: 'warning', message: 'off-format' });
    jest.advanceTimersByTime(5);
    model.setWarning(ref, { level: 'warning', message: 'off-format' });
    jest.advanceTimersByTime(5);
    expect(c.count()).toBe(1);
    model.setWarning(ref, { level: 'warning', message: 'another problem' });
    jest.advanceTimersByTime(5);
    expect(c.count()).toBe(2);
  });

  it('the same object set again still announces (its owner may have changed it in place)', () => {
    const c = counting(model);
    const ref = { component, node: { id: 'n' }, key: 'k' };
    const w = { level: 'warning', message: 'one' };
    model.setWarning(ref, w);
    jest.advanceTimersByTime(5);
    w.message = 'two';
    model.setWarning(ref, w);
    jest.advanceTimersByTime(5);
    expect(c.count()).toBe(2);
  });

  it('the loop: a listener that reads names on every warningsChanged settles instead of firing forever', () => {
    const real = WarningsModel.instance;
    WarningsModel.instance = model;
    try {
      const c = counting(model);
      const good = pageInputs('id,slug');
      const group = { id: 'p132-churn-panel' };
      // the Components panel's shape: a change bumps a counter, and the re-render that follows (a later task, which is
      // what made it a loop: a read inside the notification itself is swallowed by the pending flag) reads names
      model.on('warningsChanged', () => setTimeout(() => readNameList(good, 'pathParams'), 0), group);
      model.setWarning({ component, node: { id: 'other' }, key: 'start' }, { message: 'something else' });
      for (let i = 0; i < 50; i++) jest.advanceTimersByTime(2);
      expect(c.count()).toBe(1);
      model.off(group);
    } finally {
      WarningsModel.instance = real;
    }
  });

  it('an off-format name list read again and again files its warning once', () => {
    const real = WarningsModel.instance;
    WarningsModel.instance = model;
    try {
      const c = counting(model);
      const bad = pageInputs(['id', 'slug']);
      const group = { id: 'p132-churn-panel-bad' };
      model.on('warningsChanged', () => setTimeout(() => readNameList(bad, 'pathParams'), 0), group);
      readNameList(bad, 'pathParams');
      for (let i = 0; i < 50; i++) jest.advanceTimersByTime(2);
      expect(c.count()).toBe(1);
      expect(model.getNumberOfWarningsForComponent(component, {})).toBe(1);
      model.off(group);
    } finally {
      WarningsModel.instance = real;
    }
  });
});
