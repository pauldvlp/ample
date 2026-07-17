import { type NextRequest } from 'next/server';
import { aiStream, getAiConfig } from '@/lib/ai/provider';
import { planAndExecute, buildAnswerSystem, type AgentChatMessage } from '@/lib/ai/agent';
import { appendMessage, createThread, threadExists } from '@/lib/ai/threads';
import { buildThreadRecall } from '@/lib/ai/recall';
import type { ExecutedAction } from '@/lib/ai/agent-tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streaming agentic finance chat. Two phases inside one response:
 *   1. PLAN + ACT — one JSON call decides which tools to run, then they run
 *      against the real server actions. The executed results are emitted up front
 *      as an `actions` event so the UI can render the chips immediately.
 *   2. ANSWER — a second, STREAMED call writes the natural-language reply,
 *      grounded in the same rich snapshot and aware of exactly what just changed.
 *
 * The whole turn is persisted to a chat thread (history): the new user message
 * up front, then the assistant reply once it settles — even if the client
 * disconnects mid-stream — so reopening the thread shows a complete transcript.
 *
 * The wire format is NDJSON (one JSON object per line):
 *   {"type":"thread","threadId":"…","title":"…"} — once, the active thread
 *   {"type":"actions","actions":[...]}   — once, when tools ran (omitted if none)
 *   {"type":"delta","text":"..."}        — many, the streamed reply
 *   {"type":"error","message":"..."}     — on failure
 *   {"type":"done"}                      — always last
 */

function sanitize(messages: unknown): AgentChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m): m is AgentChatMessage =>
        !!m &&
        typeof m === 'object' &&
        ((m as AgentChatMessage).role === 'user' || (m as AgentChatMessage).role === 'assistant') &&
        typeof (m as AgentChatMessage).content === 'string',
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function POST(req: NextRequest) {
  const cfg = await getAiConfig();
  if (!cfg.enabled) return new Response('ai-disabled', { status: 403 });

  let body: { messages?: unknown; threadId?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('bad-request', { status: 400 });
  }

  const history = sanitize(body.messages);
  if (!history.length) return new Response('empty', { status: 400 });
  const requestedThreadId =
    typeof body.threadId === 'string' && body.threadId ? body.threadId : null;
  const lastUser = history[history.length - 1]?.content ?? '';

  const encoder = new TextEncoder();
  const line = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Never let a client disconnect (enqueue-after-close) abort our own
      // bookkeeping — persistence must still complete in `finally`.
      const send = (obj: unknown) => {
        try {
          controller.enqueue(line(obj));
        } catch {
          /* stream already closed by the client */
        }
      };

      let threadId: string | null = requestedThreadId;
      let full = '';
      let executed: ExecutedAction[] = [];
      let sawError = false;

      try {
        // --- Resolve the thread + persist the user turn ------------------
        if (!threadId || !(await threadExists(threadId))) threadId = await createThread();
        const { title } = await appendMessage(threadId, {
          role: 'user',
          content: lastUser,
        });
        send({ type: 'thread', threadId, title });

        // Cross-thread memory: let this turn draw on the user's OTHER saved
        // conversations when relevant (token-bounded; excludes this thread).
        const recall = await buildThreadRecall({
          excludeThreadId: threadId,
          query: lastUser,
        });

        // --- Phase 1: plan + execute tools -------------------------------
        const { actions, ctx, snapshot, messages, message } = await planAndExecute(history, cfg, {
          recall,
        });
        executed = actions;

        if (actions.length) send({ type: 'actions', actions });

        // --- Phase 2: stream the grounded reply --------------------------
        const system = buildAnswerSystem(ctx, snapshot, actions, recall);
        let streamed = false;
        try {
          for await (const delta of aiStream({ system, messages, maxTokens: 2000 }, cfg)) {
            if (delta) {
              streamed = true;
              full += delta;
              send({ type: 'delta', text: delta });
            }
          }
        } catch (streamErr) {
          // Fall back to the planner's own message so a stream hiccup never
          // leaves the user with silent action chips and nothing else.
          if (!streamed && message) {
            full = message;
            send({ type: 'delta', text: message });
            streamed = true;
          } else {
            throw streamErr;
          }
        }

        // Some models can emit only "thinking" tokens and no visible text;
        // fall back to the planner message rather than an empty bubble.
        if (!streamed && message) {
          full = message;
          send({ type: 'delta', text: message });
        }
      } catch (e) {
        sawError = true;
        const msg = e instanceof Error ? e.message : 'error';
        send({ type: 'error', message: msg });
      } finally {
        // Record the assistant turn regardless of how phase 2 ended (empty,
        // streamed, or errored) so the persisted thread stays complete.
        if (threadId) {
          try {
            await appendMessage(threadId, {
              role: 'assistant',
              content: full,
              actions: executed.length ? executed : null,
              error: sawError && !full && executed.length === 0,
            });
          } catch {
            /* persistence is best-effort; never crash the response */
          }
        }
        send({ type: 'done' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
