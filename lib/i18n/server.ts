import "server-only";
import { cache } from "react";
import { setDefaultOptions } from "date-fns";
import { es as dfEs, enUS as dfEn } from "date-fns/locale";
import { getSettings } from "@/lib/data/settings";
import { createTranslator, type Language, type TFunction } from "./index";

/** Current UI language from settings (per-request cached). Also aligns the
 *  date-fns default locale so month/day names render in the active language on
 *  the server. */
export const getLanguage = cache(async (): Promise<Language> => {
  const s = await getSettings();
  const lang = (s.language as Language) ?? "es";
  setDefaultOptions({ locale: lang === "es" ? dfEs : dfEn });
  return lang;
});

/** Server-side translator for use in Server Components:
 *    const t = await getT();  t("accounts.title")
 */
export const getT = cache(async (): Promise<TFunction> => {
  return createTranslator(await getLanguage());
});
