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
  renderDeployPackageJson
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
