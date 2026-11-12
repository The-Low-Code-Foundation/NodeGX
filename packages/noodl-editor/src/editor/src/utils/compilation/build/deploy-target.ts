/**
 * Where an editor deploy writes: a folder named after the app, inside the folder the person chose.
 *
 * Richard's ruling (2026-10-22): choosing `nodegx_projects` deploys to `nodegx_projects/My App/`,
 * not into `nodegx_projects` itself, where the app's files would sit loose among everything else.
 *
 * Pure — the caller passes `isProjectFolder` — so the rules are testable without a filesystem.
 * The CLI (`nodegx deploy <project> <out>`) is not routed through this: there `<out>` is the
 * deploy folder, named by the person on purpose.
 */

/** A folder holding either of these is a project. Deploy files must never be written into one. */
export const PROJECT_FILES = ['project.json', 'nodegx.project.json'];

/**
 * The project's name as a folder name: characters no filesystem allows are replaced, and leading
 * dots (hidden folders) and trailing dots or spaces (Windows drops them) are trimmed.
 */
export function deployFolderName(projectName: string | undefined): string {
  const cleaned = (projectName ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/^[.\s-]+/, '')
    .replace(/[.\s-]+$/, '')
    .trim();
  return cleaned || 'app';
}

export type DeployTarget = { dir: string; folderName: string; note?: string } | { error: string };

type ChooseArgs = {
  /** The folder the person picked in the dialog. */
  chosenDir: string;
  projectName: string | undefined;
  /** The open project's own folder. */
  projectDir: string | undefined;
  join: (...parts: string[]) => string;
  isProjectFolder: (dir: string) => boolean;
};

function normalise(dir: string): string {
  return dir.replace(/[\\/]+$/, '');
}

function isInside(dir: string, parent: string): boolean {
  const d = normalise(dir);
  const p = normalise(parent);
  return d === p || d.startsWith(p + '/') || d.startsWith(p + '\\');
}

function basename(dir: string): string {
  const parts = normalise(dir).split(/[\\/]/);
  return parts[parts.length - 1];
}

export function chooseDeployFolder({ chosenDir, projectName, projectDir, join, isProjectFolder }: ChooseArgs): DeployTarget {
  const folderName = deployFolderName(projectName);

  // A deploy inside the project would be copied into the next deploy, and the one after that.
  if (projectDir && isInside(chosenDir, projectDir)) {
    return {
      error: 'That folder is inside the project. Choose a folder outside it — the deploy gets its own folder there.'
    };
  }
  if (isProjectFolder(chosenDir)) {
    return { error: 'That folder is a project. Choose the folder that should hold the deployed app.' };
  }

  // The person picked the app's folder itself — a redeploy into last time's folder. Use it as it is
  // rather than nesting `My App/My App/`.
  if (basename(chosenDir) === folderName) {
    return { dir: chosenDir, folderName };
  }

  const dir = join(chosenDir, folderName);
  // `nodegx_projects/My App` is often the project itself, when projects and deploys share a parent.
  if ((projectDir && normalise(dir) === normalise(projectDir)) || isProjectFolder(dir)) {
    const fallback = `${folderName}-deploy`;
    return {
      dir: join(chosenDir, fallback),
      folderName: fallback,
      note: `"${folderName}" there is a project, so the app was deployed to "${fallback}" beside it.`
    };
  }
  return { dir, folderName };
}
