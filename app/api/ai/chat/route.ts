import { type NextRequest } from "next/server";
import {
  aiStream,
  getAiConfig,
  type AiMessage,
} from "@/lib/ai/provider";
import { buildFinanceContext } from "@/lib/ai/context";
import { buildAppKnowledge } from "@/lib/ai/app-knowledge";
import { getSettings } from "@/lib/data/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANG_NAME: Record<string, string> = { es: "Spanish", en: "English" };

/**
 * Streaming finance chat. The user's own configured provider answers questions
 * grounded in a compact snapshot of their data (built server-side). Streams
 * plain-text token deltas so the client can render progressively.
 */
export async function POST(req: NextRequest) {
  const cfg = await getAiConfig();
  if (!cfg.enabled) {
    return new Response("ai-disabled", { status: 403 });
  }

  let body: { messages?: AiMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad-request", { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter(
      (m): m is AiMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-12);

  if (!messages.length) return new Response("empty", { status: 400 });

  const s = await getSettings();
  const lang = LANG_NAME[s.language] ?? "English";
  const context = await buildFinanceContext({ recentLimit: 20 });

  const system =
    `You are Amp, Ample's personal-finance assistant. Answer the user's questions ` +
    `using the financial snapshot for FIGURES — never invent numbers. For how the ` +
    `app itself works (its screens, settings and modes, e.g. simulation mode), use ` +
    `ABOUT THE AMPLE APP — it is authoritative, so never claim a real feature doesn't ` +
    `exist, and present anything under "Roadmap" as planned, not yet available. Be ` +
    `concise, friendly and specific; format with short markdown when helpful. ` +
    `If neither section has the answer, say so briefly. Reply in ${lang}.\n\n` +
    `=== ABOUT THE AMPLE APP ===\n${buildAppKnowledge()}\n\n` +
    `=== FINANCIAL SNAPSHOT ===\n${context}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of aiStream({
          system,
          messages,
          maxTokens: 900,
        })) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
