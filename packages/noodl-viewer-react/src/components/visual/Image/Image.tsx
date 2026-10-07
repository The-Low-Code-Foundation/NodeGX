import React from 'react';

import { layerDefaults, withDefaultsClass } from '../../../default-style-layer';
import Layout from '../../../layout';
import PointerListeners from '../../../pointerlisteners';
import { Noodl } from '../../../types';
import { noodlRootRef } from '../../noodl-root-ref';

export interface ImageProps extends Noodl.ReactProps {
  dom: {
    alt?: string;
    src: string;
    srcSet?: string;
    onLoad?: () => void;
  };

  /** NDA-012 (Visual): the `On Error` signal, no longer a bare DOM forward. */
  onError?: () => void;
  /** NDA-012 (Visual): the `Error` string that has to accompany it. */
  imageError?: (message: string) => void;
}

/**
 * Report a failed image load on all three surfaces — NDA-012 (Visual), checks B1/B2.
 *
 * The same three the Failure Contract asks for and that `Video.reportFailure` already
 * satisfies: the runtime error channel (so `On App Error` and a deployed console can see it,
 * where `editorConnection.sendWarning` reaches neither), the signal a graph branches on, and
 * the message that stops the signal from being information-free.
 *
 * `<img>`'s `error` event carries **no reason at all** — there is no `MediaError` equivalent,
 * so a 404, a DNS failure, a CORS refusal and an undecodable file are one indistinguishable
 * event. Naming the source that failed is therefore the whole of the available diagnosis, and
 * it is the part an author needs: the usual cause is a URL built from a record property that
 * arrived empty or wrong.
 */
function reportImageError(props: ImageProps, src: string | undefined) {
  const message = src
    ? 'The image could not be loaded: ' + src
    : 'The image could not be loaded — no Source was set';

  props.noodlNode?.raiseRuntimeError('image/load-failed', message, { src });
  props.imageError && props.imageError(message);
  props.onError && props.onError();
}

export function Image(props: ImageProps) {
  const style = { ...props.style };

  Layout.size(style, props);
  Layout.align(style, props);

  if (style.opacity === 0) {
    style.pointerEvents = 'none';
  }

  // P107-C93 — the based source goes in a local, never back into `props.dom`: that object is the
  // node's stored value, and a sub-path base still starts with '/', so writing it back prepended
  // the base again at every render (/x/a.png, /x/x/a.png, …). The `startsWith(baseUrl)` guard is
  // the background image port's: a source that already carries the base keeps it once.
  let src = props.dom?.src;
  if (src?.startsWith('/')) {
    const baseUrl = Noodl.Env && Noodl.Env['BaseUrl'];
    if (baseUrl && !src.startsWith(baseUrl)) {
      src = baseUrl + src.substring(1);
    }
  }

// P109 ISL-008 — defaults leave the inline style for the defaults sheet, so an author's class can override them.
const defaultsClass = layerDefaults(style);

  return (
    <img
      ref={noodlRootRef(props.noodlNode)}
      className={withDefaultsClass(props.className, defaultsClass)}
      {...props.dom}
      {...PointerListeners(props)}
      src={src}
      // After the `props.dom` spread, so it is this handler and not a stale forwarded one.
      onError={() => reportImageError(props, src)}
      style={style}
    />
  );
}
