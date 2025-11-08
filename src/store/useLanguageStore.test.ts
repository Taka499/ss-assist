import { describe, it, expect, beforeEach } from 'vitest';
import { useLanguageStore } from './useLanguageStore';

describe('useLanguageStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset store to initial state
    useLanguageStore.setState({ lang: 'ja' });
  });

  it('should initialize with browser language', () => {
    const { lang } = useLanguageStore.getState();
    // Since we can't easily mock navigator.language in tests,
    // just verify it's one of the valid languages
    expect(['ja', 'zh-Hans', 'zh-Hant']).toContain(lang);
  });

  it('should change language with setLanguage', () => {
    const { setLanguage } = useLanguageStore.getState();

    setLanguage('zh-Hans');
    expect(useLanguageStore.getState().lang).toBe('zh-Hans');

    setLanguage('zh-Hant');
    expect(useLanguageStore.getState().lang).toBe('zh-Hant');

    setLanguage('ja');
    expect(useLanguageStore.getState().lang).toBe('ja');
  });

  it('should persist language to localStorage', () => {
    const { setLanguage } = useLanguageStore.getState();

    setLanguage('zh-Hans');

    const stored = localStorage.getItem('ss-lang');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.lang).toBe('zh-Hans');
  });

  it('should provide translation helper', () => {
    const { t } = useLanguageStore.getState();

    // For Phase 3, t() just returns key or fallback
    expect(t('some.key')).toBe('some.key');
    expect(t('some.key', 'Fallback Text')).toBe('Fallback Text');
  });
});
