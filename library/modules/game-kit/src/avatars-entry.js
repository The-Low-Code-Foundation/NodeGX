// The avatar bundle — vendored into index.js above kit.js by build.mjs.
// DiceBear core is MIT; the five collections' licences are named in README.md.
import { createAvatar } from '@dicebear/core';
import * as pixelArt from '@dicebear/pixel-art';
import * as funEmoji from '@dicebear/fun-emoji';
import * as thumbs from '@dicebear/thumbs';
import * as bigSmile from '@dicebear/big-smile';
import * as adventurer from '@dicebear/adventurer';

export const styles = {
  'pixel-art': pixelArt,
  'fun-emoji': funEmoji,
  thumbs: thumbs,
  'big-smile': bigSmile,
  adventurer: adventurer
};

/** An SVG string for `seed` in `style`. Unknown styles fall back to pixel-art. */
export function avatarSvg(style, seed, options) {
  const s = styles[style] || pixelArt;
  return createAvatar(s, Object.assign({ seed: String(seed || '') }, options || {})).toString();
}
