/**
 * Where an editor deploy writes (`build/deploy-target.ts`): a folder named after the app inside
 * the one chosen — Richard's ruling 2026-10-22 — and never into, or inside, a project.
 */
import * as path from 'path';

import { chooseDeployFolder, deployFolderName } from '@noodl-utils/compilation/build/deploy-target';

const join = (...parts: string[]) => path.posix.join(...parts);

function choose(chosenDir: string, projects: string[] = [], projectDir = '/work/projects/Shop') {
  return chooseDeployFolder({
    chosenDir,
    projectName: 'My App',
    projectDir,
    join,
    isProjectFolder: (dir) => projects.includes(dir)
  });
}

describe('deploy target', () => {
  it('choosing nodegx_projects deploys to nodegx_projects/<app name>', () => {
    expect(choose('/work/nodegx_projects')).toEqual({ dir: '/work/nodegx_projects/My App', folderName: 'My App' });
  });

  it('choosing the app folder itself (a redeploy) uses it, rather than nesting My App/My App', () => {
    expect(choose('/work/nodegx_projects/My App')).toEqual({ dir: '/work/nodegx_projects/My App', folderName: 'My App' });
  });

  it('when <chosen>/<app name> is a project, the deploy goes beside it and says so', () => {
    const target = choose('/work/projects', [], '/work/projects/My App');
    expect(target).toMatchObject({ dir: '/work/projects/My App-deploy', folderName: 'My App-deploy' });
    expect('note' in target && target.note).toContain('is a project');

    const other = choose('/work/nodegx_projects', ['/work/nodegx_projects/My App']);
    expect(other).toMatchObject({ dir: '/work/nodegx_projects/My App-deploy' });
  });

  it('refuses a folder inside the project — the next deploy would copy it', () => {
    expect(choose('/work/projects/Shop/out')).toHaveProperty('error');
    expect(choose('/work/projects/Shop')).toHaveProperty('error');
  });

  it('refuses a folder that is some other project', () => {
    expect(choose('/work/projects/Other', ['/work/projects/Other'])).toHaveProperty('error');
  });

  it('a sibling whose name only starts like the project is not inside it', () => {
    expect(choose('/work/projects/Shopfront')).toEqual({ dir: '/work/projects/Shopfront/My App', folderName: 'My App' });
  });
});

describe('deployFolderName', () => {
  it('keeps a readable name and replaces what a filesystem refuses', () => {
    expect(deployFolderName('My App')).toBe('My App');
    expect(deployFolderName('a/b:c*d?')).toBe('a-b-c-d');
    expect(deployFolderName('.hidden.')).toBe('hidden');
    expect(deployFolderName('  ')).toBe('app');
    expect(deployFolderName(undefined)).toBe('app');
  });
});
