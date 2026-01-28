import { create } from 'zustand';
import type { Language } from '../i18n/strings';

const STORAGE_KEY = 'conduct.language';

const readStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'zh' || stored === 'en' ? stored : 'en';
};

interface UiState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useUiStore = create<UiState>((set) => ({
  language: readStoredLanguage(),
  setLanguage: (language) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    set({ language });
  },
}));
