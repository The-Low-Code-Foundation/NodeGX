import BezierEasing from 'bezier-easing';

import type { StateTransition } from '@noodl/types';

import { cssRejectsColor, readColor } from './color-reader';
import type { ReactNodeInstance } from './react-component-node';
import EaseCurves from './easecurves';

/** Maps `t` in [0,1] onto the animated value. */
type Animation = (t: number) => number | string;

/**
 * Animates one of `node`'s inputs from its current value to `endValue`.
 *
 * Three value shapes are supported — colors (interpolated per RGBA channel via the
 * project's style resolution), plain numbers, and unit-bearing `{ value, unit }`
 * objects. Anything else has no meaningful interpolation, so the value is set
 * outright rather than animated; that fallback is deliberate, not a gap.
 *
 * A transition already running on the same port is stopped first, so repeated
 * changes retarget rather than stacking.
 */
export default function transitionParameter(
  node: ReactNodeInstance,
  name: string,
  endValue: unknown,
  transition: StateTransition
): void {
  if (node._transitions && node._transitions[name]) {
    node._transitions[name].stop();
    delete node._transitions[name];
  }

  const startValue = node.getInputValue(name);

  const input = node.getInput(name);

  let animation: Animation | undefined;

  if (input && input.type === 'color') {
    const from = node.context.styles.resolveColor(startValue as string);
    const to = node.context.styles.resolveColor(endValue as string);
    animation = colorAnimation(from, to);
    if (!animation) {
      // GAM-006 (a). A colour the shared reader cannot read (a token with no document, `red`) holds
      // the colour already on screen, and `onFinish` lands it on the value the state names. The
      // hex-only parse this replaced published `#0aNaNNaNNaN` for a token on every frame.
      for (const color of [from, to]) {
        if (color && color !== 'transparent' && !readColor(color)) warnUnreadableColor(node, name, color);
      }
      animation = () => startValue as string;
    }
  } else if (typeof startValue === 'number' && typeof endValue === 'number') {
    animation = numberAnimation(startValue, endValue);
  } else if (
    typeof startValue === 'object' &&
    startValue.hasOwnProperty('value') &&
    typeof endValue === 'object' &&
    endValue.hasOwnProperty('value')
  ) {
    animation = numberAnimation((startValue as any).value, (endValue as any).value);
  }

  if (animation) {
    if (!node._transitions) node._transitions = {};

    const ease = BezierEasing(transition.curve);

    node._transitions[name] = node.context.timerScheduler.createTimer({
      duration: transition.dur,
      onRunning: (t: number) => {
        const v = animation(ease.get(t));
        // A held colour whose start was never set has nothing on screen to hold.
        if (v !== undefined) node.queueInput(name, v);
      },
      onFinish: () => {
        delete node._transitions[name];
        // GAM-006 AC7, States' (b) here. A colour lands on the value its state names, not on the
        // channels the tween parsed out of it. The parse only reads hex, so a token
        // (`var(--primary)`) came out as `#0aNaNNaNNaN` on every frame, the last included, and the
        // browser kept the old colour for good. A stopped transition never reaches here.
        if (input && input.type === 'color' && typeof endValue === 'string' && endValue !== '') {
          node.queueInput(name, endValue);
        }
      }
    });

    node._transitions[name].start();
  } else {
    //no transition supported for this parameter type, so just set it
    node.queueInput(name, endValue);
  }
}

function numberAnimation(start: number, end: number): Animation {
  return (t: number) => {
    return EaseCurves.linear(start, end, t);
  };
}

/**
 * Fills `result` from a colour through the shared reader (GAM-006 (a)), so a `var(--token)` is read
 * off the document rather than as hex. `transparent` and empty values zero the alpha only, leaving
 * the RGB for the caller to borrow from the other endpoint. `false` for a colour it cannot read.
 */
function setRGBA(result: number[], color: string): boolean {
  if (color === 'transparent' || !color) {
    result[3] = 0;
    return true;
  }

  const rgba = readColor(color);
  if (!rgba) return false;
  for (let i = 0; i < 4; ++i) result[i] = rgba[i];
  return true;
}

/**
 * P88 R7: only a colour the browser would also reject is reported, once per node and value. A valid
 * colour the tween cannot read (`red`, a token the page does not define) jumps at the end silently,
 * and where the page cannot be asked (`cssRejectsColor` answers `undefined`) nothing is reported.
 */
function warnUnreadableColor(node: ReactNodeInstance, name: string, color: string): void {
  if (cssRejectsColor(color) !== true) return;
  const warned: Record<string, boolean> = node._warnedUnreadableColors || (node._warnedUnreadableColors = {});
  if (warned[color]) return;
  warned[color] = true;
  // Guarded, as Color Blend's report is: reporting must never be what throws.
  const report = (node as { raiseRuntimeError?: (code: string, message: string, detail?: unknown) => void })
    .raiseRuntimeError;
  if (typeof report !== 'function') return;
  report.call(
    node,
    'visual-states/unreadable-color',
    `A visual state sets ${name} to ${JSON.stringify(color)}, which is not a colour the browser accepts, ` +
      `so it is never drawn. Use #RRGGBB, rgb() or var(--token).`,
    { input: name, color }
  );
}

function componentToHex(c: number): string {
  const hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}

function rgbaToHex(rgba: number[]): string {
  return '#' + componentToHex(rgba[0]) + componentToHex(rgba[1]) + componentToHex(rgba[2]) + componentToHex(rgba[3]);
}

/**
 * Interpolates two colors per channel.
 *
 * A `transparent` endpoint borrows the *other* endpoint's RGB before animating, so
 * fading in from transparent fades up the target hue rather than sliding through
 * black.
 */
function colorAnimation(start: string, end: string): Animation | undefined {
  const rgba0 = [0, 0, 0, 255];
  const rgba1 = [0, 0, 0, 255];
  if (!setRGBA(rgba0, start) || !setRGBA(rgba1, end)) return undefined;

  if (!start || start === 'transparent') {
    rgba0[0] = rgba1[0];
    rgba0[1] = rgba1[1];
    rgba0[2] = rgba1[2];
  }
  if (!end || end === 'transparent') {
    rgba1[0] = rgba0[0];
    rgba1[1] = rgba0[1];
    rgba1[2] = rgba0[2];
  }

  const rgba = [0, 0, 0, 0];

  return (t: number) => {
    rgba[0] = Math.floor(EaseCurves.linear(rgba0[0], rgba1[0], t));
    rgba[1] = Math.floor(EaseCurves.linear(rgba0[1], rgba1[1], t));
    rgba[2] = Math.floor(EaseCurves.linear(rgba0[2], rgba1[2], t));
    rgba[3] = Math.floor(EaseCurves.linear(rgba0[3], rgba1[3], t));

    return rgbaToHex(rgba);
  };
}
