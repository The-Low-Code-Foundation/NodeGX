'use strict';

/**
 * P109 ISL-008 — the defaults sheet, written into a server-rendered page.
 *
 * A visual node no longer writes its defaults inline: they are class rules in one `<style id="noodl-default-styles">`
 * (`src/default-style-layer.ts`). In a browser that sheet is created on the first render. A server render has no
 * `document`, so the rules gather in `globalThis.__noodlDefaultStyleRules` instead, and this writes them into the
 * served HTML. Without it, every server-rendered page would paint WITHOUT its nodes' defaults (no `display: flex`
 * on a Group) until hydration, and a statically generated page would never get them back on a client that does not
 * hydrate.
 *
 * 🔴 **As the FIRST element of `<head>`.** The defaults lose to an author class of equal specificity only by coming
 * first; written anywhere later, the author's own stylesheet in the template would come before it and lose.
 *
 * CommonJS, like `inject-seo.js`, for the same two consumers (the bundled server and jest, no transform).
 *
 * @param {string} html            The rendered HTML document.
 * @param {string[]|undefined} rules  `.ndl-d-…{…}` rules, in registration order.
 * @returns {string}
 */
function injectDefaultStyles(html, rules) {
  if (!Array.isArray(rules) || rules.length === 0) return html;
  // `</` cannot appear in a declaration this runtime writes, but a value is the author's string; never end the
  // element early.
  const css = rules.join('').replace(/<\//g, '<\\/');
  const element = `<style id="noodl-default-styles">${css}</style>`;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (!head) return element + html;
  const at = head.index + head[0].length;
  return html.slice(0, at) + element + html.slice(at);
}

module.exports = { injectDefaultStyles };
