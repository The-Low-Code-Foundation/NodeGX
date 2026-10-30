// Finding a NodeGX project's backend with no flags. A project linked to a local backend records it in
// nodegx.project.json (metadata.cloudservices: the backend's id and address); NodeGX keeps each local backend
// in ~/.noodl/backends/<id>/ (config.json: its port; secrets.json: its admin credential). NODEGX_BACKENDS_DIR
// moves that folder, as it does for NodeGX itself.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const backendsRoot = () => process.env.NODEGX_BACKENDS_DIR || path.join(os.homedir(), '.noodl', 'backends');

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

/** Every local backend NodeGX knows about: { id, name, port, url, token }. */
export function localBackends() {
  let ids = [];
  try {
    ids = fs.readdirSync(backendsRoot());
  } catch {
    return [];
  }
  const out = [];
  for (const id of ids) {
    const config = readJson(path.join(backendsRoot(), id, 'config.json'));
    if (!config?.port) continue;
    const secrets = readJson(path.join(backendsRoot(), id, 'secrets.json'));
    out.push({ id: config.id ?? id, name: config.name ?? id, port: config.port, url: `http://127.0.0.1:${config.port}`, token: secrets?.adminToken ?? null });
  }
  return out;
}

/**
 * The backend a project is linked to, or a refusal in words that says what to do.
 * Returns { url, token, name, id }.
 */
export function projectBackend(projectDir) {
  const projectFile = path.join(projectDir, 'nodegx.project.json');
  const project = readJson(projectFile);
  if (!project) throw new Error(`${projectDir} is not a NodeGX project (it has no nodegx.project.json). Run this inside your project's folder, or name the folder.`);
  const cloud = project.metadata?.cloudservices ?? {};
  const id = cloud.instanceId ?? cloud.appId;
  if (!id) throw new Error(`This project isn't linked to a backend. In NodeGX, open the project and add a backend in Backend Services, or pass --backend <url> --token-file <file>.`);
  const known = localBackends().find((b) => b.id === id);
  if (!known) throw new Error(`The project is linked to the backend "${id}", but it isn't on this computer (${backendsRoot()}). Pass --backend <url> --token-file <file> for a backend elsewhere.`);
  if (!known.token) throw new Error(`The backend "${known.name}" has no admin credential yet. Start it once from NodeGX, then try again.`);
  return known;
}
