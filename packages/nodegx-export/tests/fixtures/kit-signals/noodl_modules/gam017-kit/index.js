(function () {
  var h = React.createElement;
  // Each face stamps how many times it has reacted: an effect on the prop, skipping 0, as the docs show.
  function Face(label, prop) {
    return function (props) {
      var el = React.useRef(null);
      var seen = React.useRef(0);
      var reacted = React.useState(0);
      React.useEffect(function () { props.noodlNode && props.noodlNode.setDOMElement(el.current); }, []);
      React.useEffect(function () {
        if (!props[prop]) return;
        seen.current += 1;
        reacted[1](seen.current);
      }, [props[prop]]);
      return h('div', { ref: el, 'data-face': label, 'data-prop': String(props[prop]), 'data-reacted': String(reacted[0]),
        style: { width: '120px', height: '24px', background: '#36c', color: '#fff' } }, label + ' ' + reacted[0]);
    };
  }
  var SignalProp = {
    name: 'gam017.SignalProp',
    noodlNodeAsProp: true,
    getReactComponent: function () { return Face('signal-prop', 'play'); },
    inputProps: { play: { type: 'signal', displayName: 'Play', group: 'Actions' } }
  };
  var InputsRoute = {
    name: 'gam017.InputsRoute',
    noodlNodeAsProp: true,
    getReactComponent: function () { return Face('inputs-route', 'count'); },
    initialize: function () { this.props.count = 0; },
    inputs: {
      // No `type`: `valueChangedToTrue` alone makes it a signal, in the runtime and in the export.
      play: { displayName: 'Play', group: 'Actions',
        valueChangedToTrue: function () { this.props.count += 1; this.forceUpdate(); } }
    }
  };
  Noodl.defineModule({ reactNodes: [SignalProp, InputsRoute] });
})();
