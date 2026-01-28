import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseVersion = process.env.BASE_VERSION || '1.0.0';
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const buildVersion = `${baseVersion}+${timestamp}`;

const repoRoot = resolve(process.cwd());
const tauriConfigPath = resolve(repoRoot, 'src-tauri', 'tauri.conf.json');
const versionFilePath = resolve(repoRoot, 'src', 'gui', 'renderer', 'version.json');

const tauriConfigRaw = await readFile(tauriConfigPath, 'utf8');
const tauriConfig = JSON.parse(tauriConfigRaw);

tauriConfig.package.version = buildVersion;
await writeFile(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n', 'utf8');

const versionPayload = {
  base: baseVersion,
  build: buildVersion,
  timestamp,
};

await writeFile(versionFilePath, JSON.stringify(versionPayload, null, 2) + '\n', 'utf8');

console.log(`Version set to ${buildVersion}`);
