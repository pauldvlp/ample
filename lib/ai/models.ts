/** Client-safe AI provider metadata (no SDK / server-only imports). */

export const AI_PROVIDER_LIST = ['anthropic', 'openai', 'google'] as const;
export type AiProviderId = (typeof AI_PROVIDER_LIST)[number];

export const PROVIDER_LABELS: Record<AiProviderId, string> = {
  anthropic: 'Anthropic — Claude',
  openai: 'OpenAI — GPT',
  google: 'Google — Gemini',
};

/** Cheapest capable default per provider (used when no model is set).
 *  Google: `gemini-flash-latest` is an auto-updating alias, so it keeps working
 *  as Google rotates model versions (avoids the 404s that pinned IDs like
 *  `gemini-2.5-flash-lite` hit for new projects). */
export const DEFAULT_MODELS: Record<AiProviderId, string> = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-4o-mini',
  google: 'gemini-flash-latest',
};

/** Suggested models offered in the picker. Curated to models that are broadly
 *  available on each provider's cheapest/free tier. */
export const SUGGESTED_MODELS: Record<AiProviderId, string[]> = {
  anthropic: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5-mini', 'gpt-4o'],
  // `*-latest` aliases track the newest GA release and never 404 as Google
  // rotates versions; the 3.x pins are the current GA models. (The 2.5 pins are
  // omitted — they 404 for new projects.) Use "Load available models" in the UI
  // to fetch the exact list your key can use.
  google: [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ],
};

/** Where each provider hands out API keys — shown as a helper link. */
export const PROVIDER_KEY_URLS: Record<AiProviderId, string> = {
  anthropic: 'https://console.anthropic.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
  google: 'https://aistudio.google.com/apikey',
};

/** Which provider is friendliest for someone who doesn't want to deal with
 *  billing — Google has a genuine free tier (no card). Surfaced in the UI. */
export const FREE_TIER_PROVIDER: AiProviderId = 'google';

/** Name fragments that mark a cheaper / free-tier-friendly model tier, so the
 *  affordable ones sort to the top of a fetched model list. */
export const CHEAP_MODEL_HINTS = /(flash-lite|lite|nano|mini|haiku|flash|small|8b|scout)/i;

/** Sort a model-id list so the cheap tiers come first (then alphabetical). */
export function sortModelsCheapFirst(models: string[]): string[] {
  return [...models].sort((a, b) => {
    const ca = CHEAP_MODEL_HINTS.test(a) ? 0 : 1;
    const cb = CHEAP_MODEL_HINTS.test(b) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });
}
