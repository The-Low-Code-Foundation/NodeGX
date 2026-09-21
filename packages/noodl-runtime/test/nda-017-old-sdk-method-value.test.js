/**
 * A MODULE BUILT WITH THE OLD NOODL SDK MUST SURVIVE ITS NODE BEING DELETED.
 *
 * Found by the Digital Bricks Training template (TASK-L164, 2026-09-21): pressing any navigation
 * button blanked the page with `Cannot read properties of undefined (reading 'call')`, thrown from
 * `i18next-noodl` as the old page's `Translation` nodes were deleted.
 *
 * The old SDK shim — bundled into 38 modules in `library/modules/` — wraps a node's `onNodeDeleted`
 * like this, at module load, BEFORE the runtime sees the definition:
 *
 *     t.methods._onNodeDeleted = function () {
 *       this.__proto__.__proto__._onNodeDeleted.call(this);
 *       t.methods.onNodeDeleted.value.call(this);
 *     };
 *
 * `t.methods` is the very object the runtime receives as `opts.methods`, and `.value` only ever
 * existed because `defineNode` used to overwrite each method in that object with its descriptor, in
 * place. NDA-017 §2 (2026-09-06) stopped the in-place mutation — correctly: it made `defineNode`
 * non-idempotent — and with it the shim's `.value` became `undefined`. Nothing failed until a node
 * that defines `onNodeDeleted` was deleted, which is exactly when a page unmounts.
 *
 * The shim below is transcribed from `i18next-noodl/index.js`, minified names and all, so this test
 * fails the way the module does rather than the way a tidier re-statement of it would.
 */

const NodeContext = require('../src/nodecontext');
const NodeDefinition = require('../src/nodedefinition');

/** Build a definition the way the old SDK's `Noodl.defineNode` does. */
function oldSdkDefinition(name, deleted) {
  const e = {
    name,
    category: 'Utilities',
    methods: {
      onNodeDeleted: function () {
        deleted.push(this.id);
      },
      greet: function () {
        return 'hello from ' + this.id;
      }
    }
  };
  const t = { name: e.name, category: e.category };
  t.methods = t.prototypeExtensions = {};
  for (const o in e.methods) t.prototypeExtensions[o] = e.methods[o];
  if (t.methods.onNodeDeleted) {
    t.methods._onNodeDeleted = function () {
      this.__proto__.__proto__._onNodeDeleted.call(this);
      t.methods.onNodeDeleted.value.call(this);
    };
  }
  return t;
}

describe('NDA-017: the old SDK shim still reads a method by `.value`', () => {
  it('deletes a node whose module wraps onNodeDeleted, and runs the author\'s handler', () => {
    const deleted = [];
    const context = new NodeContext();
    context.nodeRegister.register(NodeDefinition.defineNode(oldSdkDefinition('NDA017 Old SDK', deleted)));
    const node = context.nodeRegister.createNode('NDA017 Old SDK', 'old-1');

    expect(() => node._onNodeDeleted()).not.toThrow();
    expect(deleted).toEqual(['old-1']);
  });

  it('keeps an ordinary method callable, and defineNode idempotent on the same object', () => {
    const deleted = [];
    const opts = oldSdkDefinition('NDA017 Twice', deleted);
    const first = NodeDefinition.defineNode(opts);
    // The corpus registers the same module object twice whenever two graphs use it; NDA-017's
    // original failure was a second call finding frozen descriptors ("Cannot redefine property").
    const second = NodeDefinition.defineNode(opts);

    for (const def of [first, second]) {
      const context = new NodeContext();
      context.nodeRegister.register(def);
      const node = context.nodeRegister.createNode('NDA017 Twice', 'twice-1');
      expect(node.greet()).toBe('hello from twice-1');
      expect(() => node._onNodeDeleted()).not.toThrow();
    }
    expect(deleted).toEqual(['twice-1', 'twice-1']);
  });

  it('does not mutate the methods map it was handed', () => {
    const deleted = [];
    const opts = oldSdkDefinition('NDA017 No Mutation', deleted);
    const before = Object.keys(opts.methods).map((k) => [k, opts.methods[k]]);
    NodeDefinition.defineNode(opts);
    // Every entry is still the author's own function, not a descriptor put in its place.
    expect(Object.keys(opts.methods).map((k) => [k, opts.methods[k]])).toEqual(before);
    for (const [, v] of before) expect(typeof v).toBe('function');
  });

  it('leaves a hand-written { value } descriptor working as before', () => {
    const context = new NodeContext();
    context.nodeRegister.register(
      NodeDefinition.defineNode({
        name: 'NDA017 Descriptor',
        category: 'Utilities',
        methods: { answer: { value: () => 42 } }
      })
    );
    expect(context.nodeRegister.createNode('NDA017 Descriptor', 'd-1').answer()).toBe(42);
  });
});
