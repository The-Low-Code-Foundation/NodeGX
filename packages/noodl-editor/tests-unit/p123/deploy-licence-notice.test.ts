/**
 * NPMAUDIT-LICENCE — a deployed folder says which licence covers what (Richard, 2026-10-23: state the split
 * everywhere it ships). The tools are GPL-3.0; what an app runs on is MIT; the app's own files are its builder's.
 * `deployToFolder` writes `NODEGX-LICENSE.txt` from the runtime files it actually wrote, and copies the third-party
 * notices a bundler extracted beside a runtime file.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  DEPLOY_LICENCE_FILE,
  renderLicenceNotice,
  RUNTIME_MIT_LICENSE
} from '../../src/editor/src/utils/compilation/build/deploy-guide';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const WRITTEN = ['noodl-app.png', 'load_terminator.js', 'noodl.deploy.js', 'react.production.min.js', 'react-dom.production.min.js', 'index-3fa2c1.js', 'index.html'];

describe('NPMAUDIT-LICENCE — the deployed folder says which licence covers what', () => {
  it('carries the runtime’s own MIT text, verbatim from every MIT runtime package', () => {
    for (const pkg of ['noodl-runtime', 'noodl-viewer-react', 'noodl-viewer-cloud']) {
      expect(RUNTIME_MIT_LICENSE).toBe(fs.readFileSync(path.join(REPO, 'packages', pkg, 'LICENSE'), 'utf8'));
    }
    expect(DEPLOY_LICENCE_FILE).toBe('NODEGX-LICENSE.txt');
  });

  it('names the app’s files as its builder’s, the runtime files as MIT, React as React’s and the notices file', () => {
    const notice = renderLicenceNotice(WRITTEN, ['noodl.deploy.js.LICENSE.txt']);
    expect(notice).toContain('belong to whoever\nbuilt it. NodeGX puts no licence on them.');
    expect(notice).toContain('The NodeGX runtime runs the app: noodl-app.png, load_terminator.js, noodl.deploy.js. It is under the MIT licence');
    expect(notice).toContain('index-3fa2c1.js and index.html start the runtime, with the app filled in.');
    expect(notice).toContain('react.production.min.js and react-dom.production.min.js are React, under React\'s own MIT licence');
    expect(notice).toContain('noodl.deploy.js.LICENSE.txt lists the other open-source code inside noodl.deploy.js');
    expect(notice).toContain('The NodeGX editor and tools are under the GPL-3.0. What an app runs on is under the MIT licence.');
    expect(notice.endsWith(RUNTIME_MIT_LICENSE.replace(/\n*$/, '\n'))).toBe(true);
  });

  it('control: a folder with no notices file and no React says nothing about either', () => {
    const notice = renderLicenceNotice(['noodl.deploy.js', 'index.html'], []);
    expect(notice).not.toContain('React');
    expect(notice).not.toContain('LICENSE.txt lists');
  });
});
