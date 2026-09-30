'use strict';
// String Format, from src/nodes/string-format.ts: a template whose {placeholders} are ports; any
// name at all is accepted on first write and remembered.

const HOLE = /\{[A-Za-z0-9_]*\}/g;
const anyPort = () => ({ kind: 'value', coerce: 'none', default: undefined });

function holes(format) {
  const found = format.match(HOLE);
  return found ? found.map((h) => h.substring(1, h.length - 1)) : [];
}

function fill(format, values) {
  let text = format;
  for (const name of holes(format)) {
    const v = values[name];
    // a string pattern: the first occurrence still standing, `$`-sequences in the replacement apply
    text = text.replace('{' + name + '}', v !== undefined ? String(v) : '');
  }
  return text;
}

module.exports = {
  type: 'String Format',
  boot: () => ({ format: '', values: {} }),
  ports: {
    format: { kind: 'value', coerce: 'js-string', default: undefined }
  },
  react: {
    format: (s, v) => ({ state: { format: v } })
  },
  fire: {},
  outs: { formatted: (s) => fill(s.format, s.values) },
  pulses: [],
  dynamic: {
    portsFor: (params) => {
      const ports = {};
      if (typeof params.format !== 'string') return ports;
      for (const name of holes(params.format)) if (!(name in ports)) ports[name] = anyPort();
      return ports;
    },
    accept: () => anyPort(),
    write: (s, name, v) => {
      const values = Object.assign({}, s.values);
      values[name] = v;
      return { state: { values } };
    }
  }
};
