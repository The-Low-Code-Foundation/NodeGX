import React from 'react';

import { OverlayHost } from '../../src/editor/src/views/nodegrapheditor/canvas/OverlayHost';

/**
 * React 19 commits root.render() through its own scheduler; under a loaded
 * test run a single macrotask tick is not always enough. Poll until the
 * condition holds (or a deadline passes, letting the expectation fail loudly).
 *
 * 🔴 HLT-001: teardown is now asynchronous too. `OverlayHost` unmounts through
 * `unmountReactRoot`, which defers to a macrotask so a teardown running inside a
 * React render does not trip React's "synchronously unmount" error — 1,538 of
 * them on one driven session with the deferral removed. So the assertions that a
 * container is EMPTY are polled, exactly like the assertions that it FILLED.
 * ⚠️ The bookkeeping assertions (`hasSlot`) stay immediate on purpose: forgetting
 * the slot is synchronous, and polling it would hide a host that never forgot.
 */
function waitFor(condition: () => boolean, then: () => void, deadline = 2000) {
  const started = Date.now();
  const tick = () => {
    if (condition() || Date.now() - started > deadline) {
      then();
    } else {
      setTimeout(tick, 10);
    }
  };
  setTimeout(tick, 0);
}

describe('OverlayHost', () => {
  let host: OverlayHost;
  let container: HTMLElement;

  beforeEach(() => {
    host = new OverlayHost();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    host.unmountAll();
    container.remove();
  });

  it('creates a slot root once and re-renders into it', function (done) {
    host.renderSlot('test', container, React.createElement('span', null, 'one'));
    host.renderSlot('test', container, React.createElement('span', null, 'two'));

    waitFor(
      () => container.textContent === 'two',
      () => {
        expect(container.textContent).toBe('two');
        expect(host.hasSlot('test')).toBe(true);
        done();
      }
    );
  });

  it('returns false and warns when the container is missing', () => {
    const warn = spyOn(console, 'warn');
    expect(host.renderSlot('missing', null, React.createElement('span'))).toBe(false);
    expect(warn).toHaveBeenCalled();
    expect(host.hasSlot('missing')).toBe(false);
  });

  it('recreates the root when the slot container changes', function (done) {
    const other = document.createElement('div');
    document.body.appendChild(other);

    host.renderSlot('test', container, React.createElement('span', null, 'one'));
    host.renderSlot('test', other, React.createElement('span', null, 'two'));

    waitFor(
      () => other.textContent === 'two',
      () => {
        expect(container.textContent).toBe('');
        expect(other.textContent).toBe('two');
        other.remove();
        done();
      }
    );
  });

  it('unmountSlot clears the slot content and forgets the slot', function (done) {
    host.renderSlot('test', container, React.createElement('span', null, 'one'));
    waitFor(
      () => container.textContent === 'one',
      () => {
        host.unmountSlot('test');
        expect(host.hasSlot('test')).toBe(false);
        waitFor(
          () => container.textContent === '',
          () => {
            expect(container.textContent).toBe('');
            done();
          }
        );
      }
    );
  });

  it('mount returns a handle that can update and unmount an ephemeral root', function (done) {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const handle = host.mount(el, React.createElement('b', null, 'a'));
    waitFor(
      () => el.textContent === 'a',
      () => {
        expect(el.textContent).toBe('a');
        handle.update(React.createElement('b', null, 'b'));
        waitFor(
          () => el.textContent === 'b',
          () => {
            expect(el.textContent).toBe('b');
            handle.unmount();
            handle.unmount(); // double unmount is a safe no-op
            waitFor(
              () => el.textContent === '',
              () => {
                expect(el.textContent).toBe('');
                el.remove();
                done();
              }
            );
          }
        );
      }
    );
  });

  it('unmountAll clears slots and ephemeral roots', function (done) {
    const el = document.createElement('div');
    document.body.appendChild(el);

    host.renderSlot('test', container, React.createElement('span', null, 'slot'));
    host.mount(el, React.createElement('b', null, 'eph'));

    waitFor(
      () => container.textContent === 'slot' && el.textContent === 'eph',
      () => {
        host.unmountAll();
        expect(host.hasSlot('test')).toBe(false);
        waitFor(
          () => container.textContent === '' && el.textContent === '',
          () => {
            expect(container.textContent).toBe('');
            expect(el.textContent).toBe('');
            el.remove();
            done();
          }
        );
      }
    );
  });
});
