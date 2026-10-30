// BKO-008 — the backend suite's control: the map's own adapter, with a writer that skips the file. After each edit the
// project's rules and automations files are put back as they were before it, so only the backend changes. The suite
// must say FAIL and name the file.
import fs from 'node:fs';
import path from 'node:path';
import mapAdapter from './backend-adapter.mjs';

export default function skipsTheFile() {
  const map = mapAdapter();
  let dir;
  const FILES = ['nodegx.security.json', 'nodegx.automations.json'];
  return {
    ...map,
    name: 'the backend map, skipping the file (the control)',
    async open(o) {
      dir = o.project;
      return map.open(o);
    },
    async apply(edit) {
      const before = FILES.map((f) => [f, fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : null]);
      const answer = await map.apply(edit);
      for (const [f, text] of before) text === null ? fs.rmSync(path.join(dir, f), { force: true }) : fs.writeFileSync(path.join(dir, f), text);
      return answer;
    }
  };
}
