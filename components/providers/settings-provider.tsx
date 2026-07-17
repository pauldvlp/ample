'use client';

import * as React from 'react';
import { es as dfEs, enUS as dfEn } from 'date-fns/locale';
import { setDefaultOptions } from 'date-fns';
import { setHideAmounts as persistHideAmounts, updateSettings } from '@/lib/actions/settings';
import { enterSimulation, exitSimulation, advanceSimClock } from '@/lib/actions/simulation';
import { formatMoney as fmtMoney, convertToBase, type FormatMoneyOptions } from '@/lib/money';
import { iconStrokeVars } from '@/lib/utils';
import { createTranslator, type Language, type TFunction } from '@/lib/i18n';

export interface AppSettings {
  currency: string;
  locale: string;
  displayName: string;
  firstDayOfWeek: number;
  language: Language;
  uiFont: string;
  uiScale: number;
  iconStroke: number;
  simulationActive: boolean;
  /** simulated clock (epoch ms) while in simulation mode, else null */
  simDate: number | null;
  rates: Record<string, number>;
  /** whether the AI assistant is enabled (the API key never reaches the client) */
  aiEnabled: boolean;
  aiProvider: string | null;
}

interface SettingsContextValue extends AppSettings {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  money: (cents: number, opts?: FormatMoneyOptions) => string;
  /** format an amount in a specific currency (e.g. a USD original price) */
  foreign: (cents: number, currency: string, opts?: FormatMoneyOptions) => string;
  /** convert minor units of `currency` into the base currency */
  toBase: (cents: number, currency: string) => number;
  t: TFunction;
  setLanguage: (lang: Language) => void;
  setFont: (font: string) => void;
  setScale: (scale: number) => void;
  setIconStroke: (scale: number) => void;
  enterSim: () => Promise<void>;
  exitSim: () => Promise<void>;
  /** advance the simulated clock and auto-post due recurring (+ optionally the
   *  projected budget spending); returns count posted */
  advanceSim: (
    days: number,
    includeBudget?: boolean,
  ) => Promise<{ posted: number; date: number } | null>;
  simPending: boolean;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

function applyDateLocale(lang: Language) {
  setDefaultOptions({ locale: lang === 'es' ? dfEs : dfEn });
}

export function SettingsProvider({
  children,
  settings,
  initialHideAmounts,
}: {
  children: React.ReactNode;
  settings: AppSettings;
  initialHideAmounts: boolean;
}) {
  const [hideAmounts, setHide] = React.useState(initialHideAmounts);
  const [language, setLang] = React.useState<Language>(settings.language);
  const [uiFont, setUiFont] = React.useState(settings.uiFont);
  const [uiScale, setUiScale] = React.useState(settings.uiScale);
  const [iconStroke, setIconStrokeState] = React.useState(settings.iconStroke);
  const [simActive, setSimActive] = React.useState(settings.simulationActive);
  const [simPending, setSimPending] = React.useState(false);
  const firstRun = React.useRef(true);

  applyDateLocale(language);

  React.useEffect(() => {
    document.documentElement.classList.toggle('privacy-on', hideAmounts);
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    void persistHideAmounts(hideAmounts);
  }, [hideAmounts]);

  const toggleHideAmounts = React.useCallback(() => {
    setHide((prev) => !prev);
  }, []);

  const setLanguage = React.useCallback((lang: Language) => {
    setLang(lang);
    applyDateLocale(lang);
    void updateSettings({ language: lang });
  }, []);

  const setFont = React.useCallback((font: string) => {
    setUiFont(font);
    document.documentElement.dataset.font = font;
    void updateSettings({ uiFont: font });
  }, []);

  const setScale = React.useCallback((scale: number) => {
    const clamped = Math.max(80, Math.min(130, Math.round(scale)));
    setUiScale(clamped);
    document.documentElement.style.fontSize = `${clamped}%`;
    void updateSettings({ uiScale: clamped });
  }, []);

  const setIconStroke = React.useCallback((scale: number) => {
    const clamped = Math.max(1, Math.min(2, scale));
    setIconStrokeState(clamped);
    const root = document.documentElement;
    const vars = iconStrokeVars(clamped);
    root.style.setProperty('--hg-stroke', vars['--hg-stroke']);
    root.style.setProperty('--lucide-stroke', vars['--lucide-stroke']);
    void updateSettings({ iconStroke: clamped });
  }, []);

  const enterSim = React.useCallback(async () => {
    setSimPending(true);
    const res = await enterSimulation();
    setSimPending(false);
    if (res.ok) setSimActive(true);
  }, []);

  const exitSim = React.useCallback(async () => {
    setSimPending(true);
    const res = await exitSimulation();
    setSimPending(false);
    if (res.ok) setSimActive(false);
  }, []);

  const advanceSim = React.useCallback(async (days: number, includeBudget = true) => {
    setSimPending(true);
    const res = await advanceSimClock(days, includeBudget);
    setSimPending(false);
    return res.ok && res.data ? res.data : null;
  }, []);

  const money = React.useCallback(
    (cents: number, opts?: FormatMoneyOptions) =>
      fmtMoney(cents, {
        currency: settings.currency,
        locale: settings.locale,
        ...opts,
      }),
    [settings.currency, settings.locale],
  );

  const foreign = React.useCallback(
    (cents: number, currency: string, opts?: FormatMoneyOptions) =>
      fmtMoney(cents, { currency, locale: settings.locale, ...opts }),
    [settings.locale],
  );

  const toBase = React.useCallback(
    (cents: number, currency: string) =>
      convertToBase(cents, currency, settings.currency, settings.rates),
    [settings.currency, settings.rates],
  );

  const t = React.useMemo(() => createTranslator(language), [language]);

  const value = React.useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      language,
      uiFont,
      uiScale,
      iconStroke,
      simulationActive: simActive,
      hideAmounts,
      toggleHideAmounts,
      money,
      foreign,
      toBase,
      t,
      setLanguage,
      setFont,
      setScale,
      setIconStroke,
      enterSim,
      exitSim,
      advanceSim,
      simPending,
    }),
    [
      settings,
      language,
      uiFont,
      uiScale,
      iconStroke,
      simActive,
      hideAmounts,
      toggleHideAmounts,
      money,
      foreign,
      toBase,
      t,
      setLanguage,
      setFont,
      setScale,
      setIconStroke,
      enterSim,
      exitSim,
      advanceSim,
      simPending,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

export function useT(): TFunction {
  return useSettings().t;
}
