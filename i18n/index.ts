import type { Language } from '../src/types';

// UI translations
import ja from './locales/ja.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';
import en from './locales/en.json';

// Tag translations
import tagsZhHans from './tags/zh-Hans.json';
import tagsZhHant from './tags/zh-Hant.json';
import tagsEn from './tags/en.json';

const locales = {
  ja,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  en,
};

const tags: Record<Language, any> = {
  ja: {}, // Japanese is embedded in data/tags.json
  'zh-Hans': tagsZhHans,
  'zh-Hant': tagsZhHant,
  en: tagsEn,
};

/**
 * Translation hook for UI text
 *
 * @param lang - The current language
 * @returns Object with t() function for translating keys
 *
 * @example
 * const { t } = useTranslation(lang);
 * t('app.title') // Returns translated app title
 * t('roster.selected', { count: 5 }) // Returns "Selected: 5" with interpolation
 */
export function useTranslation(lang: Language) {
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = locales[lang];

    // Traverse the nested object
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to Japanese
        value = locales.ja;
        for (const k of keys) {
          value = value?.[k];
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key not found: ${key}`);
      return key; // Return key if translation not found
    }

    // Simple interpolation: {{param}}
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const replacement = params[key];
        return replacement !== undefined ? String(replacement) : '';
      });
    }

    return value;
  };

  return { t };
}

/**
 * Get tag translation by tag ID
 *
 * @param lang - The current language
 * @param category - Tag category (role, style, faction, element, rarity)
 * @param tagId - The tag ID (e.g., "role-001")
 * @param fallback - Fallback text (usually Japanese from tags.json)
 * @returns Translated tag name
 *
 * @example
 * getTagTranslation('en', 'role', 'role-001', 'バランサー') // Returns "Balancer"
 * getTagTranslation('ja', 'role', 'role-001', 'バランサー') // Returns "バランサー"
 */
export function getTagTranslation(
  lang: Language,
  category: string,
  tagId: string,
  fallback: string
): string {
  if (lang === 'ja') return fallback;
  return tags[lang]?.[category]?.[tagId] || fallback;
}
