import { ProjectModel } from '@noodl-models/projectmodel';
import { useEffect } from 'react';
import { CanvasView } from '../../../VisualCanvas/CanvasView';
import { ipcRenderer } from 'electron';

/** The capture cadence. Unchanged by HLT-002 — the interval was never the defect. */
const CAPTURE_INTERVAL_MS = 20 * 1000;

/**
 * The project card's picture, refreshed while a project is open.
 *
 * 🔴 **HLT-002 — the reply listener used to leak one handler per tick.** The detached-preview
 * branch registered an `ipcRenderer.once('viewer-capture-thumb-reply')` every 20 seconds, and
 * `viewer.js` only replies *when it captured something*. Every skipped capture therefore left a
 * `once` listener installed forever: on a 42-minute session that is ~126 of them, all waiting for
 * a reply that already went to the first one in the queue.
 *
 * It was survivable while skips were rare. HLT-002's guard makes them *ordinary* — the app preview
 * is hidden for as long as anyone uses the bench or the board — so the fix that cures the
 * rejections would have turned a slow leak into a fast one if this were left alone. Counting what
 * a fix CAUSES rather than only what it cures is HLT-001's lesson and this phase's standing rule
 * ([[a-drive-that-counts-only-the-cured-error-cannot-see-a-trade]]).
 *
 * One listener now, installed with the interval and removed with it.
 */
export function useCaptureThumbnails(canvasView: CanvasView, viewerDetached: boolean) {
  useEffect(() => {
    const onReply = (_event: unknown, url: string) => {
      if (url) {
        ProjectModel.instance.setThumbnailFromDataURI(url);
      }
    };
    ipcRenderer.on('viewer-capture-thumb-reply', onReply);

    const timer = setInterval(async () => {
      if (viewerDetached) {
        // The detached window owns the decision about whether a capture is possible — it is the
        // window the preview is actually in, and `captureThumbnail` there makes the same check.
        ipcRenderer.send('viewer-capture-thumb');
      } else {
        // `captureThumbnail` contains its own failures and returns `null` when it could not
        // capture, so there is nothing to catch here and nothing that can reject.
        const thumb = await canvasView?.captureThumbnail();
        if (thumb) {
          ProjectModel.instance.setThumbnailFromDataURI(thumb.toDataURL());
        }
      }
    }, CAPTURE_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      ipcRenderer.off('viewer-capture-thumb-reply', onReply);
    };
  }, [canvasView, viewerDetached]);
}
