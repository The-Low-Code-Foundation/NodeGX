/**
 * DEPLOY.md — the how-to-run guide every deploy writes (`build/deploy-guide.ts`).
 *
 * What a person reads in the folder has to match what the folder does: the client-side layout
 * runs with `node serve.js`, the server layout with `npm start`, both take `--port`, and the
 * backend section names the address the export baked in. These rows pin those sentences to the
 * mode and the address they describe.
 */
import { DEPLOY_GUIDE_FILE, renderDeployGuide } from '@noodl-utils/compilation/build/deploy-guide';

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
    // Not the server layout's instructions.
    expect(md).not.toContain('npm start');
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
