/**
 * P123-STU015-BASEURL — the path an app is served under, taken off what the routers read and put on what they write.
 *
 * `Noodl.Env.BaseUrl` is where the app lives: "/" for a deploy at the root, "/runtime/" in `@nodegx/preview`'s frame, a
 * full URL ("https://host/my-folder") for a deploy in a folder. The Page Router cut that many characters off the address
 * it read, but no writer put the base on: the Router, the Page Stack, Navigate To Path and `Noodl.Navigation.navigateToPath`
 * all pushed "/sign-in". Under "/runtime/" that read back as "" (nine characters cut), so every navigation by path
 * landed on the start page; in a folder, a reload asked the server for a path outside the app. The Page Stack ignored
 * the base when reading. Both directions go through here now, in path mode only (a hash path never holds the base).
 */

/**
 * `Noodl.Env.BaseUrl`, or nothing where there is no `Noodl.Env` (a server render, a test). Read off `globalThis`, where
 * the page's script puts `Noodl`: the bare global is declared only in this package's typings, and the runtime's
 * node-spec target compiles these files without them.
 */
export function envBaseUrl(): unknown {
  const noodl = (globalThis as { Noodl?: { Env?: Record<string, unknown> } }).Noodl;
  return noodl && noodl.Env ? noodl.Env['BaseUrl'] : undefined;
}

/** The base's path, starting and ending with "/". "/" when there is none, or it is relative ("./"), or unreadable. */
export function appBasePath(baseUrl: unknown): string {
  if (typeof baseUrl !== 'string' || baseUrl === '') return '/';
  let path = baseUrl;
  if (!path.startsWith('/')) {
    try {
      path = new URL(path).pathname;
    } catch {
      return '/';
    }
  }
  return path.endsWith('/') ? path : path + '/';
}

/** A browser pathname as the app's own path: the base taken off, and no leading "/" ("/runtime/sign-in" → "sign-in"). */
export function pathWithinApp(pathname: string, baseUrl: unknown): string {
  if (!pathname) return pathname;
  const base = appBasePath(baseUrl);
  if (pathname.startsWith(base)) return pathname.substring(base.length);
  // The base itself without its last "/" ("/runtime") is the app's root.
  if (pathname + '/' === base) return '';
  return pathname[0] === '/' ? pathname.substring(1) : pathname;
}

/** An app path as the browser's pathname under the base ("/sign-in" → "/runtime/sign-in"). A relative path is left as written. */
export function pathUnderBase(path: string, baseUrl: unknown): string {
  if (!path || path[0] !== '/') return path;
  const base = appBasePath(baseUrl);
  return base === '/' ? path : base + path.substring(1);
}
