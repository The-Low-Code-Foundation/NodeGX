/**
 * P102 — a `px` length as the shadow codec reads it: `0`, `4px`, `-3px`, `0.5px`, `0px`.
 *
 * The spelling is kept (`0` and `0px` are both read, and each is written back as it came).
 * `em`, `rem`, `%` and a unit-less non-zero number are refused: CMP-002 §3 sends them to text
 * mode, and CMP-006 counts how often each one turns up on real projects.
 */
import { readCssNumber } from './split';
import type { PxLength } from './types';

const PX = /^(-?[0-9.]+)px$/;

export function readPxLength(text: string): PxLength | null {
  if (text === '0' || text === '0px') return { n: 0, css: text };
  const m = PX.exec(text);
  if (!m) return null;
  const n = readCssNumber(m[1]);
  if (n === null) return null;
  return { n, css: text };
}

export function writePxLength(length: PxLength): string {
  return length.css;
}
