import { dict } from './dict';

export type Language = 'es' | 'en';
export type TVars = Record<string, string | number>;
export type TFunction = (key: string, vars?: TVars) => string;

export const LANGUAGES: { value: Language; label: string; native: string }[] = [
  { value: 'es', label: 'Spanish', native: 'Español' },
  { value: 'en', label: 'English', native: 'English' },
];

export const DEFAULT_LANGUAGE: Language = 'es';

/** Build a translator for a language. Missing keys fall back to Spanish, then
 *  to the key itself. `{name}` placeholders are interpolated from `vars`. */
export function createTranslator(lang: Language): TFunction {
  const primary = dict[lang] ?? dict.es;
  const fallback = dict.es;
  return (key, vars) => {
    let s = primary[key] ?? fallback[key] ?? key;
    if (vars) {
      for (const k in vars) {
        s = s.split(`{${k}}`).join(String(vars[k]));
      }
    }
    return s;
  };
}
