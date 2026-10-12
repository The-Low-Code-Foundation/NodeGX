/**
 * P112 OWN-006 — the editor suite, out of the kit's own package.
 *
 * `@nodegx/project-contract/editor-suite`: the adapter an editor implements (`open`, `apply`, `save`,
 * optionally `graphTarget`), the eight-edit vocabulary, the reference that applies those edits through
 * this package's store, the comparison (ids matched, layout free, everything else equal) and the
 * runner that says PASS or names the file, the node and the field. In memory, no `fs`: a page can run
 * it on its own editor. The command over a folder on disk is `@nodegx/project-contract/editor-suite-node`.
 *
 * It lives here, beside the format, rather than as a package of its own: the suite grades the format's
 * rules, the kit is one install (OWN-011), and a stranger who has the format has the suite.
 */
export * from './editor-suite/edits';
export * from './editor-suite/compare';
export * from './editor-suite/suite';
