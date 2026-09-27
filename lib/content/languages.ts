/**
 * Workspace language catalogue — authority: ERPFY-MASTER-PLAN.md sections 32 (step 4),
 * 42 (Regional), 71 (Language), 99 (no fake functionality).
 *
 * `interfaceReady` is the honest part. English is the only language the interface is
 * actually translated into today. Choosing another language records the workspace's
 * intended language — a real stored setting the Regional screens will read — and the
 * interface switches to it when that translation ships with the Phase 23 localisation
 * foundation. Nothing here claims a translated interface that does not exist.
 */

export type Language = {
  code: string;
  /** English name, so the list is readable before any translation exists. */
  name: string;
  /** The language's own name, shown alongside. */
  endonym: string;
  direction: 'ltr' | 'rtl';
  interfaceReady: boolean;
};

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', endonym: 'English', direction: 'ltr', interfaceReady: true },
  { code: 'ar', name: 'Arabic', endonym: 'العربية', direction: 'rtl', interfaceReady: false },
  { code: 'bn', name: 'Bengali', endonym: 'বাংলা', direction: 'ltr', interfaceReady: false },
  { code: 'de', name: 'German', endonym: 'Deutsch', direction: 'ltr', interfaceReady: false },
  { code: 'es', name: 'Spanish', endonym: 'Español', direction: 'ltr', interfaceReady: false },
  { code: 'fr', name: 'French', endonym: 'Français', direction: 'ltr', interfaceReady: false },
  { code: 'hi', name: 'Hindi', endonym: 'हिन्दी', direction: 'ltr', interfaceReady: false },
  { code: 'id', name: 'Indonesian', endonym: 'Bahasa Indonesia', direction: 'ltr', interfaceReady: false },
  { code: 'ms', name: 'Malay', endonym: 'Bahasa Melayu', direction: 'ltr', interfaceReady: false },
  { code: 'nl', name: 'Dutch', endonym: 'Nederlands', direction: 'ltr', interfaceReady: false },
  { code: 'pt', name: 'Portuguese', endonym: 'Português', direction: 'ltr', interfaceReady: false },
  { code: 'sw', name: 'Swahili', endonym: 'Kiswahili', direction: 'ltr', interfaceReady: false },
  { code: 'tr', name: 'Turkish', endonym: 'Türkçe', direction: 'ltr', interfaceReady: false },
  { code: 'ur', name: 'Urdu', endonym: 'اردو', direction: 'rtl', interfaceReady: false },
];

export const DEFAULT_LANGUAGE = 'en';

export function findLanguage(code: string): Language | undefined {
  return LANGUAGES.find((language) => language.code === code.toLowerCase());
}

export function languageLabel(code: string): string {
  const language = findLanguage(code);
  return language ? language.name : code;
}
