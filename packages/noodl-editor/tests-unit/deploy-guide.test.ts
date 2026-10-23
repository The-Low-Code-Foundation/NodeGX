/**
 * DEPLOY.md — the how-to-run guide every deploy writes (`build/deploy-guide.ts`).
 *
 * What a person reads in the folder has to match what the folder does: the client-side layout
 * runs with `node serve.js`, the server layout with `npm start`, both take `--port`, and the
 * backend section names the address the export baked in. These rows pin those sentences to the
 * mode and the address they describe.
 */
import {
  DEPLOY_GUIDE_FILE,
  renderDeployConfig,
  renderDeployGuide,
  renderDeployPackageJson,
  renderFullStackGuide,
  renderFullStackPackageJson
} from '@noodl-utils/compilation/build/deploy-guide';

describe('DEPLOY.md', () => {
  it('is not README.md, so a project README copied into the deploy is never overwritten', () => {
    expect(DEPLOY_GUIDE_FILE).toBe('DEPLOY.md');
  });

  it('a client-side deploy says how to serve it, with and without a port, and the SPA fallback', () => {
    const md = renderDeployGuide({ projectName: 'Puppy Planner', runtimeType: 'deploy' });
    expect(md).toContain('# Deploying Puppy Planner');
    expect(md).toContain('node serve.js');
    expect(md).toContain('node serve.js --port 8080');
    expect(md).toContain('first free port from 3000');
    expect(md).toContain('/* /index.html 200');
    // Not the server layout's instructions: there is nothing to build.
    expect(md).not.toContain('npm run build');
  });

  it('a server deploy says how to run SSR and SSG, and how to pass a port through npm', () => {
    const md = renderDeployGuide({ projectName: 'Puppy Planner', runtimeType: 'ssr' });
    expect(md).toContain('npm run build');
    expect(md).toContain('npm start -- --port 8080');
    expect(md).toContain('npm run build:ssg');
    expect(md).not.toContain('node serve.js');
  });

  it('names the backend the export baked in, and says a local one only works on this computer', () => {
    const local = renderDeployGuide({ runtimeType: 'deploy', backendEndpoint: 'http://127.0.0.1:8577' });
    expect(local).toContain('`http://127.0.0.1:8577`');
    expect(local).toContain('**this computer**');

    const remote = renderDeployGuide({ runtimeType: 'deploy', backendEndpoint: 'https://data.example.com' });
    expect(remote).toContain('`https://data.example.com`');
    expect(remote).not.toContain('**this computer**');

    const none = renderDeployGuide({ runtimeType: 'deploy' });
    expect(none).toContain('No backend address is built into this deploy');
  });

  it('DEP-001: says how to re-point the backend, with the command for the layout it is in', () => {
    const csr = renderDeployGuide({ runtimeType: 'deploy', backendEndpoint: 'http://127.0.0.1:8577' });
    expect(csr).toContain('node serve.js --backend-port 8577');
    expect(csr).toContain('node serve.js --backend https://data.example.com');
    expect(csr).toContain('edit `nodegx-config.json`');
    const ssr = renderDeployGuide({ runtimeType: 'ssr', backendEndpoint: 'https://data.example.com' });
    expect(ssr).toContain('npm start -- --backend-port 8577');
    expect(ssr).toContain('npm run ssg -- --backend-port 8577');
  });

  it('a client-side deploy says npm start works and there is nothing to install', () => {
    const md = renderDeployGuide({ runtimeType: 'deploy' });
    expect(md).toContain('`npm start` (and `npm start -- --port 8080`) does the same');
  });

  it('warns about a base URL only when one is set', () => {
    expect(renderDeployGuide({ runtimeType: 'deploy', baseUrl: '/' })).not.toContain('Base URL');
    expect(renderDeployGuide({ runtimeType: 'deploy', baseUrl: 'https://app.example.com/' })).toContain(
      '**Base URL: `https://app.example.com/`.**'
    );
  });

  it('carries no date, so redeploying an unchanged project leaves the file unchanged', () => {
    const input = { projectName: 'A', runtimeType: 'deploy', backendEndpoint: 'https://x.example' };
    expect(renderDeployGuide(input)).toBe(renderDeployGuide(input));
    expect(renderDeployGuide(input)).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});

describe('nodegx-config.json (DEP-001)', () => {
  it('holds exactly the cloudservices the export baked', () => {
    const cloudservices = { endpoint: 'http://localhost:8577', appId: 'a1', type: 'nodegx' };
    expect(JSON.parse(renderDeployConfig({ cloudservices }))).toEqual({ cloudservices });
  });

  it('is an empty object when nothing was baked — never an empty endpoint that reads as an override', () => {
    expect(JSON.parse(renderDeployConfig(undefined))).toEqual({});
    expect(JSON.parse(renderDeployConfig({ cloudservices: { appId: 'a1' } }))).toEqual({});
  });
});

describe('a client-side deploy package.json', () => {
  it('has no dependencies, and npm start runs serve.js', () => {
    const pkg = JSON.parse(renderDeployPackageJson('My Café App!'));
    expect(pkg.scripts).toEqual({ start: 'node serve.js' });
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.private).toBe(true);
  });

  it('turns the project name into a name npm accepts', () => {
    expect(JSON.parse(renderDeployPackageJson('My Café App!')).name).toBe('my-caf-app');
    expect(JSON.parse(renderDeployPackageJson('  ')).name).toBe('nodegx-app');
    expect(JSON.parse(renderDeployPackageJson(undefined)).name).toBe('nodegx-app');
  });
});

describe('DEPLOY.md for a full-stack folder (DEP-002)', () => {
  const NONE = { records: false, users: false, files: false, functions: [] as string[] };
  const TODO = { records: true, users: true, files: false, functions: [] as string[] };

  it('leads with who can read the data: with no rules of its own, a visitor not signed in reads nothing', () => {
    const md = renderFullStackGuide({ projectName: 'Todo List', uses: TODO, hasRules: false });
    expect(md).toContain('# Running Todo List');
    const rules = md.indexOf('## Who can read and change the data');
    expect(rules).toBeGreaterThan(-1);
    // Before the instructions to start it: the empty page is the first thing a person would meet.
    expect(rules).toBeLessThan(md.indexOf('## Start it'));
    expect(md).toContain('A visitor who has not signed in can read nothing and save nothing.');
    expect(md).toContain('nodegx.security.json');
  });

  it("with the project's own rules, says they install on the first start and a later deploy does not change them", () => {
    const md = renderFullStackGuide({ projectName: 'Todo List', uses: TODO, hasRules: true });
    expect(md).toContain('`backend/nodegx.security.json`');
    expect(md).toContain('A later deploy with different rules does not change that copy.');
    expect(md).not.toContain('can read nothing and save nothing');
  });

  it('gives the one command, the Node it needs, and where the data is', () => {
    const md = renderFullStackGuide({ projectName: 'Todo List', uses: TODO, hasRules: true });
    expect(md).toContain('./start.sh');
    expect(md).toContain('start.cmd');
    expect(md).toContain('node start.js --port 8090');
    expect(md).toContain('22.13 or later');
    expect(md).toContain('first free port from 3000');
    expect(md).toContain('`data/` holds the database');
    expect(md).toContain('/_admin');
    // Not the static layout's instructions.
    expect(md).not.toContain('node serve.js');
  });

  it('names what each feature the project uses needs, and only those', () => {
    const md = renderFullStackGuide({
      projectName: 'Lingo',
      uses: { records: true, users: true, files: true, functions: ['speak', 'translate'] },
      hasRules: true
    });
    expect(md).toContain('**Users.**');
    expect(md).toContain('sharp');
    expect(md).toContain('**Cloud functions** (2): `speak`, `translate`.');
    expect(md).toContain('NODEGX_SECRET_<NAME>');

    const recordsOnly = renderFullStackGuide({
      projectName: 'Lingo',
      uses: { ...NONE, records: true },
      hasRules: true
    });
    expect(recordsOnly).toContain('**Records.**');
    expect(recordsOnly).not.toContain('**Users.**');
    expect(recordsOnly).not.toContain('sharp');
    expect(recordsOnly).not.toContain('**Cloud functions**');
  });

  it('says so when the project uses no backend at all', () => {
    const md = renderFullStackGuide({ projectName: 'Clock', uses: NONE, hasRules: false });
    expect(md).toContain('uses no records, users, files or cloud functions');
  });

  it("package.json: npm start runs start.js, and carries the project's name for the backend", () => {
    const pkg = JSON.parse(renderFullStackPackageJson('Todo List'));
    expect(pkg.scripts).toEqual({ start: 'node start.js' });
    expect(pkg.nodegx).toEqual({ name: 'Todo List', layout: 'full-stack' });
    expect(pkg.dependencies).toBeUndefined();
  });

  it('carries no date', () => {
    const input = { projectName: 'Todo List', uses: TODO, hasRules: false };
    expect(renderFullStackGuide(input)).toBe(renderFullStackGuide(input));
    expect(renderFullStackGuide(input)).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});
