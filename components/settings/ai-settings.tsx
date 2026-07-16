"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/form-fields";
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
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useT } from "@/components/providers/settings-provider";
import {
  saveAiConfig,
  testAiConnection,
  fetchAiModels,
} from "@/lib/actions/ai-config";
import {
  AI_PROVIDER_LIST,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  SUGGESTED_MODELS,
  PROVIDER_KEY_URLS,
  sortModelsCheapFirst,
  type AiProviderId,
} from "@/lib/ai/models";
import {
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";

export function AiSettings({
  enabled: initialEnabled,
  provider: initialProvider,
  model: initialModel,
  hasKey,
}: {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  hasKey: boolean;
}) {
  const t = useT();
  const router = useRouter();

  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [provider, setProvider] = React.useState<AiProviderId>(
    (initialProvider as AiProviderId) ?? "anthropic"
  );
  const [model, setModel] = React.useState(initialModel ?? "");
  const [apiKey, setApiKey] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [keySaved, setKeySaved] = React.useState(hasKey);

  const canUse = (apiKey.trim().length > 0 || keySaved) && !!provider;

  // Deep-link target: when arriving at /settings#ai-settings (e.g. from the
  // assistant's "Enable" button) scroll here and flash the card to locate it.
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [flash, setFlash] = React.useState(false);
  React.useEffect(() => {
    const check = () => {
      if (window.location.hash !== "#ai-settings") return;
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlash(false);
      requestAnimationFrame(() => setFlash(true));
      window.setTimeout(() => setFlash(false), 2600);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // model options: models fetched live from the provider (best) or curated
  // suggestions, plus any custom saved model so it always shows.
  const [fetchedModels, setFetchedModels] = React.useState<string[] | null>(null);
  const [loadingModels, setLoadingModels] = React.useState(false);
  const DEFAULT_MODEL = "__default__";
  const modelOptions = React.useMemo(() => {
    const base =
      fetchedModels && fetchedModels.length
        ? fetchedModels
        : SUGGESTED_MODELS[provider];
    const list = [...base];
    if (model && !list.includes(model)) list.unshift(model);
    return list;
  }, [provider, model, fetchedModels]);

  async function loadModels() {
    if (!canUse) {
      toast.error(t("ai.missingKey"));
      return;
    }
    setLoadingModels(true);
    const res = await fetchAiModels({
      provider,
      apiKey: apiKey.trim() || undefined,
    });
    setLoadingModels(false);
    if (res.ok && res.data) {
      setFetchedModels(sortModelsCheapFirst(res.data.models));
      toast.success(t("ai.modelsLoaded", { n: res.data.models.length }));
    } else {
      toast.error(
        !res.ok && res.error === "missing-key"
          ? t("ai.missingKey")
          : t("ai.modelsError", { error: !res.ok ? res.error : "" })
      );
    }
  }

  async function save(nextEnabled = enabled) {
    if (nextEnabled && !canUse) {
      toast.error(t("ai.missingKey"));
      return;
    }
    setSaving(true);
    const res = await saveAiConfig({
      enabled: nextEnabled,
      provider,
      apiKey: apiKey.trim() || undefined,
      model: model.trim() || null,
    });
    setSaving(false);
    if (res.ok) {
      setEnabled(nextEnabled);
      if (apiKey.trim()) setKeySaved(true);
      setApiKey("");
      toast.success(nextEnabled ? t("ai.savedOn") : t("ai.savedOff"));
      router.refresh();
    } else {
      toast.error(
        res.error === "missing-key" ? t("ai.missingKey") : t("ai.saveError")
      );
    }
  }

  async function test() {
    if (!canUse) {
      toast.error(t("ai.missingKey"));
      return;
    }
    setTesting(true);
    const res = await testAiConnection({
      provider,
      apiKey: apiKey.trim() || undefined,
      model: model.trim() || null,
    });
    setTesting(false);
    if (res.ok) toast.success(t("ai.testOk"));
    else toast.error(t("ai.testFail", { error: res.error }));
  }

  return (
    <div id="ai-settings" ref={cardRef} data-tour="settings-ai" className="scroll-mt-24">
    <SectionCard
      className={cn(flash && "ample-flash")}
      title={
        <span className="flex items-center gap-2">
          <HugeiconsIcon icon={SparklesIcon} className="hg-icon size-4 text-brass" />
          {t("ai.title")}
        </span>
      }
      description={t("ai.description")}
    >
      <div className="space-y-4">
        {/* enable */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{t("ai.enableLabel")}</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? t("ai.enabledHint") : t("ai.disabledHint")}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => {
              if (v) void save(true);
              else void save(false);
            }}
          />
        </div>

        <Field label={t("ai.provider")}>
          <Select
            value={provider}
            onValueChange={(v) => {
              setProvider((v as AiProviderId) ?? "anthropic");
              setModel("");
              setFetchedModels(null);
            }}
            items={Object.fromEntries(
              AI_PROVIDER_LIST.map((p) => [p, PROVIDER_LABELS[p]])
            )}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDER_LIST.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t(`ai.tier.${provider}`)}
          </p>
        </Field>

        <Field
          label={t("ai.apiKey")}
          hint={keySaved ? t("ai.keySaved") : undefined}
        >
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keySaved ? "••••••••••••••••" : t("ai.apiKeyPlaceholder")}
            autoComplete="off"
          />
          <a
            href={PROVIDER_KEY_URLS[provider]}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            {t("ai.getKey", { provider: PROVIDER_LABELS[provider] })}
          </a>
        </Field>

        <Field label={t("ai.model")} hint={t("ai.modelHint")}>
          <Select
            value={model || DEFAULT_MODEL}
            onValueChange={(v) =>
              setModel(v && v !== DEFAULT_MODEL ? v : "")
            }
            items={{
              [DEFAULT_MODEL]: t("ai.modelDefault", {
                model: DEFAULT_MODELS[provider],
              }),
              ...Object.fromEntries(modelOptions.map((m) => [m, m])),
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_MODEL}>
                {t("ai.modelDefault", { model: DEFAULT_MODELS[provider] })}
              </SelectItem>
              {modelOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  <span className="font-mono text-xs">{m}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("ai.modelSafeHint")}
          </p>
          <button
            type="button"
            onClick={loadModels}
            disabled={loadingModels || !canUse}
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/80 hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-3", loadingModels && "animate-spin")}
            />
            {fetchedModels
              ? t("ai.modelsRefresh", { n: fetchedModels.length })
              : t("ai.loadModels")}
          </button>
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => save()} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {t("action.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={test}
            disabled={testing || !canUse}
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            {t("ai.test")}
          </Button>
        </div>

        <p
          className={cn(
            "flex items-start gap-1.5 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground"
          )}
        >
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-positive" />
          {t("ai.privacyNote")}
        </p>
      </div>
    </SectionCard>
    </div>
  );
}
