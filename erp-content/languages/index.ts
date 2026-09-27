/**
 * ERPFY Localization & Languages
 *
 * Equivalent to wp-content/languages/ in WordPress.
 * Supports multi-language translation dictionaries and locale formatting.
 */

export interface LocaleDefinition {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
];

export const DEFAULT_LOCALE = 'en';

export function getLocale(code: string): LocaleDefinition {
  return SUPPORTED_LOCALES.find(l => l.code === code) || SUPPORTED_LOCALES[0];
}
