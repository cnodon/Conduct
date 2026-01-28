import { STRINGS } from './strings';
import { useUiStore } from '../store/useUiStore';

export const useI18n = () => {
  const language = useUiStore((state) => state.language);
  const setLanguage = useUiStore((state) => state.setLanguage);
  const strings = STRINGS[language] ?? STRINGS.en;

  return { language, setLanguage, strings };
};
