import { Body, ResponseType, fetch } from '@tauri-apps/api/http';
import { platform, version as osVersion } from '@tauri-apps/api/os';
import { invoke } from '@tauri-apps/api/tauri';
import versionInfo from '../version.json';

const ENDPOINT = import.meta.env.VITE_TELEMETRY_ENDPOINT ?? 'https://tokenlabs.cn/api/events/launch';
const INSTALL_ID_KEY = 'conduct.installId';
const SESSION_REPORT_KEY = 'conduct.telemetry.sessionReported';
let inFlight = false;

const createInstallId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const getInstallId = (): string => {
  if (typeof window === 'undefined') return createInstallId();
  const existing = window.localStorage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;
  const created = createInstallId();
  window.localStorage.setItem(INSTALL_ID_KEY, created);
  return created;
};

const normalizePlatform = (value: string): string => {
  if (value === 'darwin') return 'macos';
  if (value === 'windows') return 'windows';
  if (value === 'linux') return 'linux';
  return value;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const logTelemetry = async (message: string) => {
  try {
    await invoke('log_telemetry_event', { message });
  } catch {
    // Ignore logging failures.
  }
};

const toLocalIsoString = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  const millis = String(value.getMilliseconds()).padStart(3, '0');
  const offset = -value.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${sign}${offsetHours}:${offsetMinutes}`;
};

export const reportLaunch = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (inFlight) {
    await logTelemetry('skip in_flight');
    return;
  }
  if (window.sessionStorage.getItem(SESSION_REPORT_KEY) === '1') {
    await logTelemetry('skip already_reported_session');
    return;
  }
  inFlight = true;
  window.sessionStorage.setItem(SESSION_REPORT_KEY, '1');

  const installId = getInstallId();
  const [platformRaw, osVersionRaw] = await Promise.all([platform(), osVersion()]);
  const payload = {
    install_id: installId,
    app_version: versionInfo.base ?? versionInfo.build ?? '0.0.0',
    platform: normalizePlatform(platformRaw),
    os_version: osVersionRaw ?? '',
    locale: navigator.language || 'en',
    timestamp: toLocalIsoString(new Date()),
  };

  await logTelemetry(`start endpoint=${ENDPOINT}`);

  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: Body.json(payload),
          responseType: ResponseType.JSON,
          timeout: 3,
        });
        if (response.ok) {
          await logTelemetry(`success attempt=${attempt} status=${response.status}`);
          return;
        }
        await logTelemetry(`failed attempt=${attempt} status=${response.status}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await logTelemetry(`error attempt=${attempt} message=${message}`);
      }
      if (attempt < 3) {
        await sleep(500);
      }
    }
    await logTelemetry('give_up max_retries=3');
  } finally {
    inFlight = false;
  }
};
