import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getSettings } from "@/lib/data/settings";
import { DEFAULT_MODELS } from "@/lib/ai/models";
import type { AiProvider } from "@/db/schema";

/**
 * Unified, provider-agnostic LLM layer. All three providers (Anthropic, OpenAI,
 * Google) are reached through the same two calls — `aiGenerate` (one-shot text,
 * optional JSON mode) and `aiStream` (token stream for chat). The API key is
 * read from settings on the server and NEVER leaves it. AI is opt-in: callers
 * should check `cfg.enabled` (or catch `AiNotConfiguredError`) and fall back to
 * the offline heuristic where one exists (e.g. quick-add).
 */

export interface AiConfig {
  enabled: boolean;
  provider: AiProvider | null;
  apiKey: string | null;
  model: string | null;
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiGenerateOptions {
  system?: string;
  messages: AiMessage[];
  maxTokens?: number;
  /** hint the provider to return strict JSON (still returned as a string) */
  json?: boolean;
  temperature?: number;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI is not configured");
    this.name = "AiNotConfiguredError";
  }
}

export async function getAiConfig(): Promise<AiConfig> {
  const s = await getSettings();
  return {
    enabled: s.aiEnabled,
    provider: s.aiProvider,
    apiKey: s.aiApiKey,
    model: s.aiModel,
  };
}

function requireReady(cfg: AiConfig): asserts cfg is AiConfig & {
  provider: AiProvider;
  apiKey: string;
} {
  if (!cfg.enabled || !cfg.provider || !cfg.apiKey) {
    throw new AiNotConfiguredError();
  }
}

function modelFor(cfg: AiConfig & { provider: AiProvider }): string {
  return cfg.model?.trim() || DEFAULT_MODELS[cfg.provider];
}

/* -------------------------------------------------------------------------- */
/*  One-shot generation                                                       */
/* -------------------------------------------------------------------------- */

export async function aiGenerate(
  opts: AiGenerateOptions,
  cfgIn?: AiConfig
): Promise<string> {
  const cfg = cfgIn ?? (await getAiConfig());
  requireReady(cfg);
  const model = modelFor(cfg);
  const maxTokens = opts.maxTokens ?? 1024;

  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: opts.temperature,
      system: opts.json
        ? `${opts.system ?? ""}\nRespond with ONLY a single valid JSON value, no prose, no markdown fences.`.trim()
        : opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  if (cfg.provider === "openai") {
    const client = new OpenAI({ apiKey: cfg.apiKey });
    const res = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      temperature: opts.temperature,
      response_format: opts.json ? { type: "json_object" } : undefined,
      messages: [
        ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
        ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  // google
  const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
  const res = await ai.models.generateContent({
    model,
    contents: toGoogleContents(opts.messages),
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: maxTokens,
      temperature: opts.temperature,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  });
  return res.text ?? "";
}

/* -------------------------------------------------------------------------- */
/*  Streaming generation (chat)                                               */
/* -------------------------------------------------------------------------- */

export async function* aiStream(
  opts: AiGenerateOptions,
  cfgIn?: AiConfig
): AsyncGenerator<string> {
  const cfg = cfgIn ?? (await getAiConfig());
  requireReady(cfg);
  const model = modelFor(cfg);
  const maxTokens = opts.maxTokens ?? 1024;

  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    for await (const ev of stream) {
      if (
        ev.type === "content_block_delta" &&
        ev.delta.type === "text_delta"
      ) {
        yield ev.delta.text;
      }
    }
    return;
  }

  if (cfg.provider === "openai") {
    const client = new OpenAI({ apiKey: cfg.apiKey });
    const stream = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      stream: true,
      messages: [
        ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
        ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
    return;
  }

  // google
  const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
  const stream = await ai.models.generateContentStream({
    model,
    contents: toGoogleContents(opts.messages),
    config: { systemInstruction: opts.system, maxOutputTokens: maxTokens },
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toGoogleContents(messages: AiMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

/** Tolerant JSON extraction — strips ``` fences / surrounding prose. */
export function parseJsonLoose<T = unknown>(text: string): T | null {
  if (!text) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.search(/[[{]/);
  if (start === -1) return null;
  // find the matching closing bracket from the end
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/**
 * List the models the given key can actually use. This is the robust way to
 * populate the model picker — provider model catalogs change constantly and a
 * hardcoded ID can 404 for a given project (e.g. new Gemini projects lose
 * access to older pinned models). Filters to chat/generate-capable models.
 */
export async function listAvailableModels(
  provider: AiProvider,
  apiKey: string
): Promise<string[]> {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const out: string[] = [];
    for await (const m of client.models.list({ limit: 100 })) {
      if (m.id) out.push(m.id);
    }
    return out;
  }

  if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    const out: string[] = [];
    for await (const m of client.models.list()) {
      // keep chat-capable families only (skip embeddings/tts/whisper/image…)
      if (m.id && /^(gpt-|o\d|chatgpt)/i.test(m.id)) out.push(m.id);
    }
    return out.sort();
  }

  // google
  const ai = new GoogleGenAI({ apiKey });
  const out: string[] = [];
  const pager = await ai.models.list();
  for await (const m of pager) {
    const name = (m.name ?? "").replace(/^models\//, "");
    if (!name) continue;
    const actions = m.supportedActions;
    if (actions && actions.length > 0 && !actions.includes("generateContent")) {
      continue;
    }
    out.push(name);
  }
  return out.sort();
}

/** Validate an API key with a tiny live call. Returns {ok} or {ok:false,error}. */
export async function verifyAiKey(
  provider: AiProvider,
  apiKey: string,
  model?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const text = await aiGenerate(
      {
        system: "You are a connectivity check.",
        messages: [{ role: "user", content: "Reply with the single word: ok" }],
        maxTokens: 8,
      },
      { enabled: true, provider, apiKey, model: model ?? null }
    );
    if (typeof text === "string") return { ok: true };
    return { ok: false, error: "empty response" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unknown error",
    };
  }
}
