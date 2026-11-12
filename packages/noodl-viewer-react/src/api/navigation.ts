import { envBaseUrl, pathUnderBase } from '../nodes/navigation/base-path';
import { RouterHandler } from '../nodes/navigation/router-handler';

const NoodlRuntime = require('@noodl/runtime');

export interface PopupResult {
  /** The Close Popup node's action name, with its `closeAction-` prefix stripped. */
  action: string;
  parameters: unknown;
}

export interface NavigateToPathOptions {
  /** Appended as a `?a=1&b=2` query string, each name and value URL-encoded; a `null` or `undefined` value is left out. */
  query?: Record<string, unknown>;
}

interface NavigationApi {
  /** Set by `createNoodlAPI` immediately after this module is loaded. */
  _noodlRuntime?: any;
  showPopup(componentPath: string, params?: Record<string, unknown>): Promise<PopupResult>;
  navigate(routerName: string, targetPageName: string, params?: Record<string, string | number | boolean>): void;
  navigateToPath(path: string, options?: NavigateToPathOptions): void;
}

/** `Noodl.Navigation` — the navigation half of the project-facing JavaScript API. */
const navigation: NavigationApi = {
  async showPopup(componentPath, params) {
    return new Promise((resolve) => {
      navigation._noodlRuntime.context.showPopup(componentPath, params, {
        // NDA-010 §3: a popup opened from script gets the same single-slot default as one
        // opened from a Show Popup node. `Noodl.Navigation.showPopup` is awaited, so a
        // dismissal has to settle the promise or the caller waits for ever.
        onDismissPopup: () => {
          resolve({ action: 'dismissed', parameters: {} });
        },
        onClosePopup: (action: string | undefined, results: unknown) => {
          resolve({
            // `action` is undefined for a plain close — only a Close Popup node with a named
            // close action supplies one. `undefined.replace` threw a TypeError out of the
            // close handler, so every scripted popup closed with the ordinary Close crashed
            // here rather than resolving.
            action: action ? action.replace('closeAction-', '') : '',
            parameters: results
          });
        }
      });
    });
  },

  navigate(routerName, targetPageName, params) {
    RouterHandler.instance.navigate(routerName, {
      target: targetPageName,
      params: params
    });
  },

  /**
   * Pushes a URL and fires a synthetic `popstate` so the Router reacts, since
   * `pushState` alone does not emit one.
   *
   * Which half of the URL the path lands in depends on the project's
   * `navigationPathType` setting: `hash` (the default, and what an unset value
   * means) puts it after `#`, `path` puts it in the pathname.
   */
  navigateToPath(path, options) {
    let hashPath: string, urlPath: string;
    const navigationPathType = NoodlRuntime.instance.getProjectSettings()['navigationPathType'];
    if (navigationPathType === undefined || navigationPathType === 'hash') hashPath = path;
    // P123-STU015-BASEURL: an absolute path goes under the base the app is served under, which the routers take off
    else urlPath = pathUnderBase(path, envBaseUrl());

    const query = [];
    if (options && options.query !== undefined) {
      for (const key in options.query) {
        // P107-D21 (ISL-028): encoded, and a null left out — the Navigate To Path node's rule, so the two agree
        const v = options.query[key];
        if (v !== undefined && v !== null) query.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
      }
    }

    const compiledUrl =
      (urlPath !== undefined ? urlPath : '') +
      (query.length >= 1 ? '?' + query.join('&') : '') +
      (hashPath !== undefined ? '#' + hashPath : '');

    window.history.pushState({}, '', compiledUrl);
    dispatchEvent(new PopStateEvent('popstate', {}));
  }
};

export default navigation;
