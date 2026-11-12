/**
 * P112-S11-REFUSALWORDS — a project from a newer NodeGX is refused in NodeGX's name, and the launcher is told the
 * refusal was explained, so it does not add "Its project.json is missing" beside it.
 *
 * Graded on the real `projectFromDirectory` with its collaborators mocked: the modal, the toast layer, the project
 * model's file read and the format detection. Four arms:
 *  - a newer format → the modal names NodeGX, both formats and the NodeGX download page, and the callback carries
 *    `{ explained: true }`;
 *  - the copy before a format update cannot be made (the s12 path) → its own error toast, and explained;
 *  - the person cancels the upgrade prompt → explained (they chose it; nothing to add);
 *  - control: a folder whose file cannot be read → no refusal, so the launcher's own toast still shows.
 *
 * Mutants: drop `EXPLAINED` from the newer-format `callback` → arm 1 reddens; put the noodl.net link back → arm 1
 * reddens on the link; pass `EXPLAINED` from the unreadable-file branch → the control reddens.
 */

/* eslint-env jest */

const showErrorModal = jest.fn();
const showConfirmModal = jest.fn();
const showError = jest.fn();
let legacyContent: unknown;

jest.mock('@noodl-utils/bugtracker', () => ({ bugtracker: { debug: jest.fn(), track: jest.fn() } }));
jest.mock('@noodl-utils/filesystem', () => ({ __esModule: true, default: { instance: { readDirectorySync: () => [] } } }));
jest.mock('../src/shared/model', () => ({ __esModule: true, default: { _listenersEnabled: true } }));
jest.mock('../src/editor/src/views/popuplayer', () => ({
  __esModule: true,
  default: { instance: { showErrorModal: (...a: unknown[]) => showErrorModal(...a), showConfirmModal: (...a: unknown[]) => showConfirmModal(...a) } }
}));
jest.mock('../src/editor/src/views/ToastLayer/ToastLayer', () => ({
  ToastLayer: { hideAll: jest.fn(), showError: (...a: unknown[]) => showError(...a), showInfo: jest.fn() }
}));
jest.mock('../src/editor/src/models/projectmodel', () => ({
  ProjectModel: {
    readJSONFromDirectory: (_dir: string, cb: (content: unknown) => void) => cb(legacyContent),
    fromJSON: jest.fn()
  }
}));
jest.mock('@noodl-models/ProjectPatches/applypatches', () => ({ applyPatches: jest.fn() }));
jest.mock('@noodl-models/ProjectPatches/upgradeOnLoad', () => ({
  describeUpgradeReport: jest.fn(),
  upgradeOnLoad: () => ({ sections: [], files: [] })
}));
jest.mock('@noodl/platform', () => ({
  filesystem: {
    exists: () => false,
    join: (...p: string[]) => p.join('/'),
    dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
    basename: (p: string) => p.split('/').pop(),
    makeUniquePath: (p: string) => p,
    copyFolder: () => Promise.reject(new Error('disk full'))
  }
}));
jest.mock('../src/editor/src/services/ProjectStructure', () => ({
  projectStructureService: { detectFormat: () => Promise.resolve('legacy') }
}));
jest.mock('../src/editor/src/services/ProjectStructure/featureFlags', () => ({ isV2FormatEnabled: () => true }));

import { projectFromDirectory } from '../src/editor/src/models/projectmodel.editor';
import { RUN_ON_VALUE_CHANGE_FORMAT_VERSION } from '../src/editor/src/models/ProjectPatches/runOnValueChangeMigration';

const supported = Number(RUN_ON_VALUE_CHANGE_FORMAT_VERSION);

function open(content: unknown, args?: Record<string, unknown>): Promise<unknown[]> {
  legacyContent = content;
  return new Promise((resolve) => projectFromDirectory('/projects/Desk', (...result) => resolve(result), args));
}

beforeEach(() => {
  showErrorModal.mockReset();
  showConfirmModal.mockReset();
  showError.mockReset();
});

describe('P112-S11-REFUSALWORDS — a refusal in NodeGX words, and the launcher told it was explained', () => {
  it('a newer format: the modal names NodeGX, both formats and the download page; the refusal is explained', async () => {
    const [project, refusal] = await open({ version: supported + 1, components: [] });
    expect(project).toBeUndefined();
    expect(refusal).toEqual({ explained: true });

    expect(showErrorModal).toHaveBeenCalledTimes(1);
    const { title, message } = showErrorModal.mock.calls[0][0];
    expect(title).toContain('NodeGX');
    expect(message).toContain(`project format ${supported + 1}`);
    expect(message).toContain(`up to ${supported}`);
    expect(message).toContain('https://nodegx.io/download');
    expect(`${title} ${message}`).not.toMatch(/noodl\.net|\bNoodl\b/);
  });

  it('the copy before a format update cannot be made: its own error, and explained (the s12 path)', async () => {
    const [project, refusal] = await open({ version: supported - 1, components: [] });
    expect(project).toBeUndefined();
    expect(refusal).toEqual({ explained: true });
    expect(showError).toHaveBeenCalledTimes(1);
    expect(showError.mock.calls[0][0]).toContain('disk full');
  });

  it('the person cancels the upgrade prompt: explained, with nothing added', async () => {
    showConfirmModal.mockImplementation(({ onCancel }) => onCancel());
    const [project, refusal] = await open({ version: supported - 1, components: [] }, { showUpgradeModal: true });
    expect(project).toBeUndefined();
    expect(refusal).toEqual({ explained: true });
    expect(showError).not.toHaveBeenCalled();
  });

  it('control: a file that cannot be read carries no refusal, so the launcher still says so', async () => {
    const result = await open(undefined);
    expect(result).toEqual([]);
    expect(showErrorModal).not.toHaveBeenCalled();
  });
});
