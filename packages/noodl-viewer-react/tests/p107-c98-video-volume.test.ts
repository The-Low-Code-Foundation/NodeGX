/**
 * P107-C98 — a Video's Volume outside 0 to 1, or not a number, no longer blanks the page.
 *
 * `CachedVideo.componentDidUpdate` wrote the Volume straight to the `<video>`, whose setter throws outside 0 to 1
 * (IndexSizeError) and for a value that is not a finite number (TypeError). The throw was in React's commit, so the
 * page unmounted. A Slider's default range is 0 to 100, so wiring one to Volume was enough.
 *
 * The setter is jsdom's (the same one the runtime target's conformance runs on): each raw value below is first shown
 * to throw there, so the clamp is graded against a setter that really refuses it.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { JSDOM } = require('jsdom');

import { playableVolume } from '../src/components/visual/Video/Video';

const video = (): HTMLVideoElement => new JSDOM('<!doctype html><video></video>').window.document.querySelector('video');

describe('P107-C98 — the volume a <video> takes', () => {
  it.each([
    [50, 1],
    [2, 1],
    [Infinity, 1],
    [-0.5, 0],
    [-Infinity, 0],
    [undefined, 1],
    [NaN, 1],
    ['loud', 1]
  ])('%p, which the element refuses, plays at %p', (raw, expected) => {
    const el = video();
    expect(() => {
      el.volume = raw as number;
    }).toThrow();
    el.volume = playableVolume(raw);
    expect(el.volume).toBe(expected);
  });

  it.each([
    [0.5, 0.5],
    [0, 0],
    [1, 1],
    ['0.5', 0.5],
    [null, 0]
  ])('%p, which the element took, plays as it did (%p)', (raw, expected) => {
    const before = video();
    before.volume = raw as number;
    const after = video();
    after.volume = playableVolume(raw);
    expect(after.volume).toBe(before.volume);
    expect(after.volume).toBe(expected);
  });
});
