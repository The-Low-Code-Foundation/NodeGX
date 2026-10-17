// OWN-008 control (the brief's own "prove the suite can fail"): the stranger's adapter, unchanged, except that its
// save writes the suite script's `paddingTop: 8` as the string "8". A PASS here means the adapter is not what saves.
const real = require(process.env.OWN008_ADAPTER);
const candidate = real.adapter ?? real.default ?? real;

module.exports = {
  adapter: () => {
    const inner = typeof candidate === 'function' ? candidate() : candidate;
    return new Proxy(inner, {
      get(target, prop) {
        if (prop === 'name') return `${target.name} (control: paddingTop as a string)`;
        if (prop === 'save') {
          return async () => {
            const saved = { ...(await target.save()) };
            let hit = 0;
            for (const [file, text] of Object.entries(saved)) {
              if (!file.endsWith('nodes.json')) continue;
              saved[file] = text.replace(/"paddingTop":\s*8\b/, () => (hit++, '"paddingTop": "8"'));
            }
            if (!hit) throw new Error('control: no saved "paddingTop": 8 to break');
            return saved;
          };
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  }
};
