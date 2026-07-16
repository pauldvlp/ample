"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn, iconStrokeVars } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/form-fields";
import { Icon } from "@/components/shared/icon";
import { useSettings, useT } from "@/components/providers/settings-provider";
import { useIsClient } from "@/hooks/use-is-client";
import { updateSettings, type SettingsPatch } from "@/lib/actions/settings";
import { refreshRates, setManualRate } from "@/lib/actions/rates";
import { CURRENCIES, LOCALES, UI_FONTS, ZOOM_STEPS } from "@/lib/constants";
import { LANGUAGES, type Language } from "@/lib/i18n";
import type { Settings } from "@/db/schema";

type ThemeValue = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeValue; icon: React.ElementType }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

const WEEKDAY_KEYS = [
  "settings.weekday.sunday",
  "settings.weekday.monday",
  "settings.weekday.tuesday",
  "settings.weekday.wednesday",
  "settings.weekday.thursday",
  "settings.weekday.friday",
  "settings.weekday.saturday",
];

export function SettingsForm({
  settings,
  usedCurrencies = [],
}: {
  settings: Settings;
  usedCurrencies?: string[];
}) {
  const { hideAmounts, toggleHideAmounts } = useSettings();
  const t = useT();
  const WEEKDAYS = WEEKDAY_KEYS.map((k) => t(k));

  const [displayName, setDisplayName] = React.useState(settings.displayName);
  const [baseCurrency, setBaseCurrency] = React.useState(settings.baseCurrency);
  const [locale, setLocale] = React.useState(settings.locale);
  const [firstDayOfWeek, setFirstDayOfWeek] = React.useState(settings.firstDayOfWeek);
  const [budgetStartDay, setBudgetStartDay] = React.useState(
    String(settings.budgetStartDay)
  );
  const [pending, setPending] = React.useState(false);

  const dirty =
    displayName.trim() !== settings.displayName ||
    baseCurrency !== settings.baseCurrency ||
    locale !== settings.locale ||
    firstDayOfWeek !== settings.firstDayOfWeek ||
    (Number(budgetStartDay) || 0) !== settings.budgetStartDay;

  async function save() {
    const name = displayName.trim() || "Ample";
    const day = Math.min(28, Math.max(1, Math.round(Number(budgetStartDay) || 1)));
    const patch: SettingsPatch = {
      displayName: name,
      baseCurrency,
      locale,
      firstDayOfWeek,
      budgetStartDay: day,
    };
    setPending(true);
    const res = await updateSettings(patch);
    setPending(false);
    if (res.ok) {
      // normalise local state to what was actually persisted
      setDisplayName(name);
      setBudgetStartDay(String(day));
      toast.success(t("settings.toast.saved"));
    } else {
      toast.error(t("settings.toast.saveError"));
    }
  }

  return (
    <>
      {/* ------------------------------- Profile ------------------------------ */}
      <SectionCard
        title={t("settings.profile.title")}
        description={t("settings.profile.description")}
        hairline
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("settings.displayName.label")}
            htmlFor="set-name"
            hint={t("settings.displayName.hint")}
          >
            <Input
              id="set-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("settings.displayName.placeholder")}
            />
          </Field>
          <Field
            label={t("settings.currency.label")}
            hint={t("settings.currency.hint")}
          >
            <Select
              value={baseCurrency}
              onValueChange={(v) => setBaseCurrency(v ?? "")}
              items={Object.fromEntries(
                CURRENCIES.map((c) => [c.code, `${c.code} · ${c.label}`])
              )}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("settings.currency.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-ledger text-muted-foreground">
                      {c.symbol}
                    </span>
                    <span>{c.label}</span>
                    <span className="text-muted-foreground">{c.code}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>

      {/* ----------------------------- Preferences ---------------------------- */}
      <SectionCard
        title={t("settings.preferences.title")}
        description={t("settings.preferences.description")}
      >
        <div className="space-y-4">
          <Field label={t("settings.language.label")}>
            <LanguageControl />
          </Field>

          <Field label={t("settings.theme.label")} hint={t("settings.theme.hint")}>
            <ThemeControl />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("settings.format.label")}
              hint={t("settings.format.hint")}
            >
              <Select
                value={locale}
                onValueChange={(v) => setLocale(v ?? "")}
                items={Object.fromEntries(LOCALES.map((l) => [l.code, l.label]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("settings.format.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      <span>{l.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label={t("settings.firstDay.label")}
              hint={t("settings.firstDay.hint")}
            >
              <Select
                value={String(firstDayOfWeek)}
                onValueChange={(v) =>
                  setFirstDayOfWeek(Number(v ?? String(firstDayOfWeek)))
                }
                items={Object.fromEntries(WEEKDAYS.map((d, i) => [String(i), d]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("settings.firstDay.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>
                      <span>{d}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label={t("settings.budgetDay.label")}
            htmlFor="set-budget-day"
            hint={t("settings.budgetDay.hint")}
            className="sm:max-w-[12rem]"
          >
            <Input
              id="set-budget-day"
              type="number"
              min={1}
              max={28}
              value={budgetStartDay}
              onChange={(e) => setBudgetStartDay(e.target.value)}
              className="font-ledger tnum"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ----------------------------- Appearance ----------------------------- */}
      <SectionCard
        title={t("appearance.title")}
        description={t("appearance.description")}
      >
        <AppearanceControl />
      </SectionCard>

      {/* --------------------------- Currencies / FX -------------------------- */}
      <SectionCard title={t("fx.title")} description={t("fx.description")}>
        <CurrencyControl usedCurrencies={usedCurrencies} />
      </SectionCard>

      {/* ------------------------------- Privacy ------------------------------ */}
      <SectionCard
        title={t("settings.privacy.title")}
        description={t("settings.privacy.description")}
      >
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {t("privacy.hide")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.privacy.hideDescription")}
            </p>
          </div>
          <Switch
            checked={hideAmounts}
            onCheckedChange={() => {
              const next = !hideAmounts;
              toggleHideAmounts();
              toast.success(
                next
                  ? t("settings.toast.amountsHidden")
                  : t("settings.toast.amountsShown")
              );
            }}
            aria-label={t("privacy.hide")}
          />
        </div>
      </SectionCard>

      {/* --------------------------- Save (text/selects) ---------------------- */}
      <div className="flex items-center justify-end gap-3">
        {dirty && (
          <p className="text-xs text-muted-foreground">
            {t("settings.unsaved")}
          </p>
        )}
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? t("action.saving") : t("action.saveChanges")}
        </Button>
      </div>
    </>
  );
}

/** Segmented light / dark / system control backed by next-themes. */
function ThemeControl() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const current = mounted ? (theme as ThemeValue | undefined) : undefined;

  function choose(value: ThemeValue) {
    setTheme(value);
    void updateSettings({ theme: value });
    toast.success(
      t("settings.toast.themeSet", { theme: t(`theme.${value}`) })
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1">
      {THEME_OPTIONS.map((opt) => {
        const active = current === opt.value;
        const Ico = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => choose(opt.value)}
            aria-pressed={active}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Ico className={cn("size-3.5", active && "text-brass")} />
            {t(`theme.${opt.value}`)}
          </button>
        );
      })}
    </div>
  );
}

/** Font + zoom controls (applied live via the settings provider). */
const STROKE_STEPS = [1, 1.25, 1.5, 2] as const;

function AppearanceControl() {
  const t = useT();
  const { uiFont, uiScale, iconStroke, setFont, setScale, setIconStroke } =
    useSettings();
  return (
    <div className="space-y-4">
      <Field label={t("appearance.font")} hint={t("appearance.fontHint")}>
        <Select
          value={uiFont}
          onValueChange={(v) => setFont(v ?? "geist")}
          items={Object.fromEntries(UI_FONTS.map((f) => [f.value, f.label]))}
        >
          <SelectTrigger className="w-full sm:max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UI_FONTS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("appearance.zoom")} hint={t("appearance.zoomHint")}>
        <div className="grid max-w-xs grid-cols-4 gap-1.5 rounded-xl bg-muted/60 p-1">
          {ZOOM_STEPS.map((z) => {
            const active = uiScale === z;
            return (
              <button
                key={z}
                type="button"
                onClick={() => setScale(z)}
                aria-pressed={active}
                className={cn(
                  "tnum rounded-lg px-2 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {z}%
              </button>
            );
          })}
        </div>
      </Field>
      <Field
        label={t("appearance.iconStroke")}
        hint={t("appearance.iconStrokeHint")}
      >
        <div className="grid max-w-xs grid-cols-4 gap-1.5 rounded-xl bg-muted/60 p-1">
          {STROKE_STEPS.map((s) => {
            const active = Math.abs(iconStroke - s) < 0.01;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setIconStroke(s)}
                aria-pressed={active}
                style={{ ...iconStrokeVars(s) } as React.CSSProperties}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon name="Sparkles" className="size-4" />
                <span className="tnum">×{s}</span>
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

/** Exchange rates: refresh from the internet + manual per-currency editing.
 *  Currencies actually used anywhere (e.g. USD for foreign-priced bills) float
 *  to the top so they're never buried at the bottom of the alphabetical list. */
// Common foreign currencies pinned near the top even before they're used, so
// the one you care about (e.g. USD) is never buried at the end of the list.
const PINNED = ["USD", "EUR"];

function CurrencyControl({ usedCurrencies }: { usedCurrencies: string[] }) {
  const t = useT();
  const { currency: base, rates } = useSettings();
  const [pending, setPending] = React.useState(false);
  const used = new Set(usedCurrencies.filter((c) => c !== base));
  // priority = actually-used ∪ pinned commons; used gets the "in use" badge.
  const priority = new Set([...used, ...PINNED.filter((c) => c !== base)]);
  const pinIdx = (c: string) => {
    const i = PINNED.indexOf(c);
    return i === -1 ? 99 : i;
  };
  const codes = Object.keys(rates)
    .filter((c) => c !== base)
    .sort((a, b) => {
      const pa = priority.has(a);
      const pb = priority.has(b);
      if (pa !== pb) return pa ? -1 : 1; // priority currencies first
      if (pa && pb) {
        // used before merely-pinned, then by pinned order (USD before EUR)
        if (used.has(a) !== used.has(b)) return used.has(a) ? -1 : 1;
        if (pinIdx(a) !== pinIdx(b)) return pinIdx(a) - pinIdx(b);
      }
      return a.localeCompare(b);
    });

  async function refresh() {
    setPending(true);
    const res = await refreshRates();
    setPending(false);
    if (res.ok) toast.success(t("fx.updatedToast"));
    else toast.error(res.error || t("fx.refreshError"));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("fx.base")}:{" "}
          <span className="font-medium text-foreground">{base}</span>
        </p>
        <Button size="sm" variant="outline" onClick={refresh} disabled={pending}>
          {pending ? t("fx.refreshing") : t("fx.refresh")}
        </Button>
      </div>
      {codes.length === 0 ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          {t("fx.none")}
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {codes.map((code) => (
            <RateRow
              key={code}
              code={code}
              base={base}
              rate={rates[code]}
              inUse={used.has(code)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RateRow({
  code,
  base,
  rate,
  inUse,
}: {
  code: string;
  base: string;
  rate: number;
  inUse?: boolean;
}) {
  const t = useT();
  const [val, setVal] = React.useState(String(rate));
  // Reset the editable field when `rate` changes externally (e.g. a refresh
  // from the internet) — done during render, not an effect, so it can't lag
  // a render behind and clobber a keystroke the user just made.
  const [prevRate, setPrevRate] = React.useState(rate);
  if (rate !== prevRate) {
    setPrevRate(rate);
    setVal(String(rate));
  }

  async function save() {
    const n = Number(val);
    if (!(n > 0) || n === rate) return;
    await setManualRate(code, n);
  }

  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/40">
      <span className="tnum flex w-14 shrink-0 items-center gap-1 text-muted-foreground">
        1 {code}
      </span>
      {inUse && (
        <span className="rounded-full bg-brass/15 px-1.5 py-0.5 text-[0.55rem] font-medium uppercase tracking-wide text-brass">
          {t("fx.inUse")}
        </span>
      )}
      <span className="text-muted-foreground">=</span>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        type="number"
        step="0.0001"
        min="0"
        className="tnum h-8 w-28 font-ledger"
      />
      <span className="text-muted-foreground">{base}</span>
    </li>
  );
}

/** Segmented Español / English control. Primary way to switch UI language. */
function LanguageControl() {
  const { language, setLanguage } = useSettings();

  return (
    <div
      className="grid gap-1.5 rounded-xl bg-muted/60 p-1"
      style={{ gridTemplateColumns: `repeat(${LANGUAGES.length}, minmax(0, 1fr))` }}
    >
      {LANGUAGES.map((lang) => {
        const active = language === lang.value;
        return (
          <button
            key={lang.value}
            type="button"
            onClick={() => setLanguage(lang.value as Language)}
            aria-pressed={active}
            className={cn(
              "flex items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {lang.native}
          </button>
        );
      })}
    </div>
  );
}
