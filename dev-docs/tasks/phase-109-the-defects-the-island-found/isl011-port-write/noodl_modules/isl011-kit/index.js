/**
 * P109 ISL-011 AC1 — the smallest kit with the trap: a root whose CLASS says display:grid in the kit's own stylesheet,
 * while `defaultCss` says display:block. `World` carries the defaultCss; `WorldBare` is the known-firing control
 * (the same component, no defaultCss). Each spreads `props.style` on its root, as every docs sample does.
 *
 * ISL-011 AC3 copy (P109 s3): both nodes also declare an `opacity` style input, so a wire can change it after mount —
 * a later style write goes straight onto the DOM (`setStyle`), and the grid must survive it and the next render.
 */
(function () {
  var h = React.createElement;
  var CSS = '.isl011-k{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;width:320px}.isl011-c{height:20px;background:#6a6}';
  function ensureStyle() {
    if (document.getElementById('isl011-style')) return;
    var s = document.createElement('style');
    s.id = 'isl011-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function World(marker) {
    return function (props) {
      var el = React.useRef(null);
      React.useEffect(function () {
        ensureStyle();
        props.noodlNode && props.noodlNode.setDOMElement(el.current);
      }, []);
      return h(
        'div',
        { ref: el, className: 'isl011-k', 'data-isl011': marker, style: props.style },
        [1, 2, 3, 4].map(function (i) { return h('div', { key: i, className: 'isl011-c', 'data-isl011-cell': marker }); })
      );
    };
  }
  Noodl.defineModule({
    reactNodes: [
      { name: 'isl011.World', noodlNodeAsProp: true, defaultCss: { display: 'block' }, inputCss: { opacity: { displayName: 'Opacity', type: 'number', default: 1 } }, getReactComponent: function () { return World('with-default'); } },
      { name: 'isl011.WorldBare', noodlNodeAsProp: true, inputCss: { opacity: { displayName: 'Opacity', type: 'number', default: 1 } }, getReactComponent: function () { return World('bare'); } }
    ]
  });
})();
