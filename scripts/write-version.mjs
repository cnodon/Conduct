import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const packageJsonPath = resolve(repoRoot, 'package.json');
const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonRaw);
const baseVersion = process.env.BASE_VERSION || packageJson.version || '1.0.0';
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const buildVersion = `${baseVersion}+${timestamp}`;

const tauriConfigPath = resolve(repoRoot, 'src-tauri', 'tauri.conf.json');
const versionFilePath = resolve(repoRoot, 'src', 'gui', 'renderer', 'version.json');

const tauriConfigRaw = await readFile(tauriConfigPath, 'utf8');
const tauriConfig = JSON.parse(tauriConfigRaw);

tauriConfig.package.version = baseVersion;
await writeFile(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n', 'utf8');

const versionPayload = {
  base: baseVersion,
  build: buildVersion,
  timestamp,
};

await writeFile(versionFilePath, JSON.stringify(versionPayload, null, 2) + '\n', 'utf8');

console.log(`Version set to ${buildVersion}`);
