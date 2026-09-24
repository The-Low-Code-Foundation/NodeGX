/**
 * STYLE-001 Phase 4: PreviewTokenInjector
 *
 * Injects design token CSS custom properties into the preview webview so that
 * var(--token-name) references in user projects resolve to the correct values.
 *
 * Architecture:
 * - Singleton service, initialised once at app startup
 * - CanvasView calls `notifyDomReady(webview)` after each dom-ready event
 * - Subscribes to StyleTokensModel 'tokensChanged' and re-injects on every change
 * - Uses `executeJavaScript` to insert/update a <style id="noodl-design-tokens"> in the
 *   preview's <head>. The style element is created on first injection and updated in place
 *   on subsequent calls, avoiding repeated DOM mutations.
 *
 * CSS escaping:
 * - The CSS block is passed as a JSON-encoded string inside the script so that backticks,
 *   backslashes, and dollar signs in token values cannot break template literal parsing.
 */

import { StyleTokensModel } from '../models/StyleTokensModel';

const STYLE_ELEMENT_ID = 'noodl-design-tokens';

/**
 * P102 CMP-001 / RC-7 — the draft's element. Inserted **after** `STYLE_ELEMENT_ID`'s so the one
 * variable it holds wins the cascade, and removed on Apply, Cancel, Escape and project close.
 */
const DRAFT_ELEMENT_ID = 'noodl-design-tokens-draft';

export class PreviewTokenInjector {
  private static _instance: PreviewTokenInjector | null = null;

  /** The token being composed and its draft value, or `null` when no composer is open. */
  private _draft: { name: string; value: string } | null = null;
  private _draftFrame: number | null = null;

  /**
   * Every preview surface that needs tokens. AIX-008 added a second one (the
   * authoring sandbox), and a single reference silently meant "whichever
   * announced itself last" — the other would keep whatever CSS it started with
   * and drift on the next token change.
   */
  private readonly _webviews = new Set<Electron.WebviewTag>();
  private _tokensModel: StyleTokensModel | null = null;

  private constructor() {}

  static get instance(): PreviewTokenInjector {
    if (!PreviewTokenInjector._instance) {
      PreviewTokenInjector._instance = new PreviewTokenInjector();
    }
    return PreviewTokenInjector._instance;
  }

  /**
   * Attach a StyleTokensModel instance. Called once when the project loads.
   * The injector subscribes to 'tokensChanged' and re-injects whenever tokens change.
   */
  attachModel(model: StyleTokensModel): void {
    // Detach previous model if any — off(context) removes all listeners bound to `this`
    this._tokensModel?.off(this);

    this._tokensModel = model;

    // A composer left open across a project switch must not hand the next project its draft.
    this.clearDraft();

    model.on('tokensChanged', () => this._inject(), this);
  }

  /**
   * Called by CanvasView after each dom-ready event (once the session is valid).
   * Stores the webview reference and immediately injects the current tokens.
   */
  notifyDomReady(webview: Electron.WebviewTag): void {
    this._webviews.add(webview);
    this._injectInto(webview);
    // A preview that reloaded mid-slide gets the draft back, or the canvas would stop following.
    if (this._draft) this._writeDraftInto(webview, this._draft);
  }

  // ─── P102 RC-7: the draft ────────────────────────────────────────────────────

  /**
   * Show a value on the canvas **without saving it**: one `<style>` after the token block,
   * holding one variable. 🔴 Nothing here touches the model, the file or the undo stack
   * (README §6.9). Writes are coalesced to one per animation frame, so a slider dragged across
   * a hundred positions queues one `executeJavaScript`, not a hundred.
   */
  setDraft(name: string, value: string): void {
    this._draft = { name, value };
    if (this._draftFrame !== null) return;
    // ⚠️ A timer, not `requestAnimationFrame`: rAF never fires while the window is hidden, and an
    // editor driven headlessly (every drive in `scripts/devtools/`) IS hidden — `document.hidden`
    // is true and a draft scheduled on a frame would never reach the canvas. One frame's worth of
    // milliseconds gives the same coalescing either way.
    this._draftFrame = window.setTimeout(() => {
      this._draftFrame = null;
      const draft = this._draft;
      if (!draft) return;
      for (const webview of this._webviews) this._writeDraftInto(webview, draft);
    }, 16);
  }

  /** Remove the draft element from every preview. Safe to call when there is none. */
  clearDraft(): void {
    if (this._draftFrame !== null) {
      window.clearTimeout(this._draftFrame);
      this._draftFrame = null;
    }
    if (!this._draft) return;
    this._draft = null;
    const script = `
      (function() {
        var el = document.getElementById('${DRAFT_ELEMENT_ID}');
        if (el) el.remove();
      })();
    `;
    for (const webview of this._webviews) {
      webview.executeJavaScript(script).catch(() => {
        // Webview navigated or was destroyed — nothing to remove.
      });
    }
  }

  /** The draft as it stands, for a spec or a drive to read. */
  get draft(): { name: string; value: string } | null {
    return this._draft;
  }

  private _writeDraftInto(webview: Electron.WebviewTag, draft: { name: string; value: string }): void {
    const css = JSON.stringify(`:root {\n  ${draft.name}: ${draft.value};\n}`);
    const script = `
      (function() {
        var id = '${DRAFT_ELEMENT_ID}';
        var el = document.getElementById(id);
        if (!el) {
          el = document.createElement('style');
          el.id = id;
          var tokens = document.getElementById('${STYLE_ELEMENT_ID}');
          if (tokens && tokens.parentNode) tokens.insertAdjacentElement('afterend', el);
          else (document.head || document.documentElement).appendChild(el);
        }
        el.textContent = ${css};
      })();
    `;
    webview.executeJavaScript(script).catch(() => {
      // Webview navigated or was destroyed — no action needed.
    });
  }

  /**
   * Stop tracking a preview surface. Without an argument this clears them all,
   * which is what the canvas being destroyed used to mean.
   */
  clearWebview(webview?: Electron.WebviewTag): void {
    if (webview) this._webviews.delete(webview);
    else this._webviews.clear();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private _inject(): void {
    for (const webview of this._webviews) this._injectInto(webview);
  }

  private _injectInto(webview: Electron.WebviewTag): void {
    if (!this._tokensModel) return;

    const css = this._tokensModel.generateCss();
    if (!css) return;

    // JSON-encode the CSS to safely pass it through executeJavaScript without
    // worrying about backticks, backslashes, or $ signs in token values.
    const encodedCss = JSON.stringify(css);

    const script = `
      (function() {
        var id = '${STYLE_ELEMENT_ID}';
        var el = document.getElementById(id);
        if (!el) {
          el = document.createElement('style');
          el.id = id;
          (document.head || document.documentElement).appendChild(el);
        }
        el.textContent = ${encodedCss};
      })();
    `;

    // executeJavaScript returns a Promise — we intentionally don't await it here
    // because injection is best-effort and we don't want to block the caller.
    // Errors are swallowed because the webview may navigate away at any time.
    webview.executeJavaScript(script).catch(() => {
      // Webview navigated or was destroyed — no action needed.
    });
  }
}

/**
 * One-time initialisation: wire the injector to the global EventDispatcher so it
 * can pick up the StyleTokensModel when a project loads.
 *
 * Call this from the editor bootstrap (e.g. EditorTopBar or App startup).
 */
export function initPreviewTokenInjector(tokensModel: StyleTokensModel): void {
  PreviewTokenInjector.instance.attachModel(tokensModel);
}
