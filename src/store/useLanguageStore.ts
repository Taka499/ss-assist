import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { analytics } from '../lib/analytics';
import type { Language } from '../types';

interface LanguageStore {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

/**
 * Detect browser language and return appropriate Language value
 */
function detectBrowserLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('zh-hant') || browserLang === 'zh-tw' || browserLang === 'zh-hk') {
    return 'zh-Hant';
  }
  if (browserLang.startsWith('zh')) {
    return 'zh-Hans';
  }
  if (browserLang.startsWith('ja')) {
    return 'ja';
  }
  return 'en'; // Default to English for other languages
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      lang: detectBrowserLanguage(),

      setLanguage: (lang: Language) => {
        analytics.trackLanguageChange(lang);
        set({ lang });
      },

      // Simple translation helper - returns key or fallback
      // Full translation loading will be implemented in Phase 4
      t: (key: string, fallback?: string) => fallback || key,
    }),
    {
      name: 'ss-lang',
      // Only persist the lang property, not the functions
      partialize: (state) => ({ lang: state.lang }),
    }
  )
);
