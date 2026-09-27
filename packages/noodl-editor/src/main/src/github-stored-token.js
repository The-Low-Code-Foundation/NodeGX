/**
 * What `github-load-token` read from `jsonstorage`, as either a stored token or `null`.
 *
 * 🔴 `jsonstorage.get` answers a MISSING file with the string `'{}'` (jsonstorage.js, the ENOENT
 * branch), not with nothing, and `'{}'` is truthy. So in any profile that had never signed in to
 * GitHub, the loader went on as if a token were stored. Where `safeStorage` has no encryption
 * (Linux without a keyring, which includes the CI runner), it returned `'{}'` as the plain-text
 * token, and the editor sent `Authorization: Bearer {}` to api.github.com on every launch: a 401
 * and a renderer error. HLT-010's gate found it on its first Linux run to get past launch
 * (2026-09-22, run 35711441660).
 *
 * A stored token is always a non-empty string: base64 ciphertext, or the plain token. `null` is
 * what `github-clear-token` writes. Anything else is not a token.
 */
function storedTokenOrNull(stored) {
  if (typeof stored !== 'string' || stored.length === 0) return null;
  if (stored === JSON.stringify({})) return null;
  return stored;
}

module.exports = { storedTokenOrNull };
