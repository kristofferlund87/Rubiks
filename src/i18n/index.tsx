import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STRINGS, type Lang, type Strings } from './strings';

const STORAGE_KEY = 'cubehelper.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'sv') return saved;
  } catch {
    /* ignore */
  }
  // Svenska om det är telefonens/webbläsarens förstahandsspråk, annars engelska.
  const first = navigator.languages?.[0] ?? navigator.language ?? '';
  return first.toLowerCase().startsWith('sv') ? 'sv' : 'en';
}

const I18nContext = createContext<{ lang: Lang; t: Strings; setLang(l: Lang): void } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      t: STRINGS[lang],
      setLang(l: Lang) {
        setLangState(l);
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {
          /* ignore */
        }
      },
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
