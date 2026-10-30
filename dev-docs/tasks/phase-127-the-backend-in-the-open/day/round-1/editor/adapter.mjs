// The backend suite's door into this tool (see the kit's guide). `handed(person)` plays that person's day with the same
// code the page's server calls (lib/day.mjs `playDay`) and returns the steps the page shows, in order. This tool
// changes nothing, so it offers no `apply`, and its edit script is empty.
//
//   npx -p @nodegx/backend-kit backend-suite adapter.mjs <a copy of the app> suite/edits.json --backend <url> --token-file <file>

import { backend, openProject } from '@nodegx/backend-kit';
import { makeWorld, playDay, handedSteps } from './lib/day.mjs';

export default function () {
  let ctx = null;
  return {
    name: 'A day in the life',
    open({ project, backend: url, token }) {
      const be = backend(url, token);
      ctx = { be, project: openProject(project), world: makeWorld(be) };
    },
    async handed(person) {
      const day = await playDay({ ...ctx, personId: person.id });
      return handedSteps(day);
    },
    close() {}
  };
}
