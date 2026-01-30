import { create } from 'zustand';
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';
import { relaunch } from '@tauri-apps/api/process';
import { listen, TauriEvent } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

const AUTO_CHECK_KEY = 'conduct.autoCheckUpdates';

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'installing' | 'error';

const readAutoCheck = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(AUTO_CHECK_KEY);
  if (stored === null) return true;
  return stored === 'true';
};

interface UpdateState {
  autoCheckEnabled: boolean;
  setAutoCheckEnabled: (enabled: boolean) => void;
  status: UpdateStatus;
  latestVersion: string | null;
  releaseNotes: string | null;
  lastCheckedAt: string | null;
  downloadProgress: number | null;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  installUpdateNow: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  autoCheckEnabled: readAutoCheck(),
  setAutoCheckEnabled: (enabled) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTO_CHECK_KEY, String(enabled));
    }
    set({ autoCheckEnabled: enabled });
  },
  status: 'idle',
  latestVersion: null,
  releaseNotes: null,
  lastCheckedAt: null,
  downloadProgress: null,
  error: null,
  checkForUpdates: async () => {
    const now = new Date().toISOString();
    set({ status: 'checking', error: null, lastCheckedAt: now });
    try {
      const result = await checkUpdate();
      if (!result.shouldUpdate) {
        set({
          status: 'up-to-date',
          latestVersion: null,
          releaseNotes: null,
          downloadProgress: null,
          lastCheckedAt: now,
          error: null,
        });
        return;
      }
      const latestVersion = result.manifest?.version ?? null;
      const releaseNotes = result.manifest?.body ?? null;
      set({
        status: 'update-available',
        latestVersion,
        releaseNotes,
        downloadProgress: null,
        lastCheckedAt: now,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({
        status: 'error',
        error: message || 'Unknown error',
        lastCheckedAt: now,
        downloadProgress: null,
      });
    }
  },
  installUpdateNow: async () => {
    const { status } = get();
    if (status !== 'update-available') return;
    let unlistenProgress: UnlistenFn | null = null;
    let downloadedBytes = 0;
    let totalBytes: number | null = null;
    set({ status: 'installing', error: null, downloadProgress: 0 });
    try {
      unlistenProgress = await listen<{ chunkLength: number; contentLength?: number }>(
        TauriEvent.DOWNLOAD_PROGRESS,
        (event) => {
          const payload = event.payload;
          if (!payload) return;
          downloadedBytes += payload.chunkLength ?? 0;
          if (typeof payload.contentLength === 'number') {
            totalBytes = payload.contentLength;
          }
          if (totalBytes && totalBytes > 0) {
            const progress = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
            set({ downloadProgress: progress });
          }
        }
      );
      await installUpdate();
      await relaunch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ status: 'error', error: message || 'Unknown error' });
    } finally {
      if (unlistenProgress) {
        await unlistenProgress();
      }
    }
  },
}));
