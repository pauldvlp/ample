import "server-only";
import { format } from "date-fns";
import { listThreads, getThreadMessages } from "@/lib/ai/threads";

/**
 * Cross-conversation memory for the assistant. Each turn happens inside ONE
 * thread, but the user often refers back to a decision, plan or number from a
 * DIFFERENT chat ("como quedamos en el otro chat…"). This builds a compact,
 * token-bounded block the agent can lean on:
 *
 *   • an INDEX of the user's other recent conversations (titles + dates) — cheap
 *     awareness that they exist, so the assistant never claims it has no memory
 *     of them; plus
 *   • the transcript tail of the FEW past conversations that actually look
 *     relevant to the current question (keyword-scored), so it can recall detail
 *     WITHOUT dumping the whole history into the prompt.
 *
 * It never loads more than a bounded amount of text, so prompt cost stays flat
 * no matter how long the history grows. Returns "" when there's nothing useful.
 */

const MAX_SCAN_THREADS = 25; // recent threads considered for scoring
const INDEX_LIMIT = 8; // threads listed in the always-on index
const DETAIL_THREADS = 2; // past conversations inlined in full-ish
const DETAIL_MESSAGES = 6; // last N messages kept per inlined thread
const MSG_CHARS = 220; // per-message trim
const MIN_SCORE = 2; // relevance gate before a thread is inlined

/** Common es/en words that shouldn't drive relevance. */
const STOPWORDS = new Set([
  // spanish
  "que", "los", "las", "una", "unos", "unas", "del", "por", "con", "para",
  "como", "más", "mas", "pero", "sus", "este", "esta", "esto", "eso", "esa",
  "ese", "son", "hay", "muy", "sin", "sobre", "entre", "cuando", "donde",
  "porque", "cual", "cuales", "tengo", "tienes", "tiene", "puedo", "puedes",
  "quiero", "hacer", "sabes", "cuánto", "cuanto", "cuánta", "cuanta",
  // english
  "the", "and", "for", "you", "your", "with", "this", "that", "have", "has",
  "are", "was", "what", "when", "where", "which", "how", "can", "could",
  "would", "should", "about", "into", "from", "they", "them", "there",
  "here", "will", "want", "know", "tell", "make", "give", "get",
]);

function terms(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function day(ms: number): string {
  return format(new Date(ms), "yyyy-MM-dd");
}

export async function buildThreadRecall(opts: {
  excludeThreadId?: string | null;
  query: string;
}): Promise<string> {
  const others = (await listThreads(MAX_SCAN_THREADS)).filter(
    (t) => t.id !== opts.excludeThreadId && t.title.trim()
  );
  if (others.length === 0) return "";

  const q = new Set(terms(opts.query));

  // Score every candidate by keyword overlap (title hits weigh more), loading
  // each thread's messages once so the top matches can be inlined below.
  const scored = await Promise.all(
    others.map(async (t) => {
      const msgs = await getThreadMessages(t.id);
      const titleTerms = new Set(terms(t.title));
      const bodyText = msgs.map((m) => m.content).join(" ").toLowerCase();
      let score = 0;
      for (const term of q) {
        if (titleTerms.has(term)) score += 3;
        else if (bodyText.includes(term)) score += 1;
      }
      return { t, msgs, score };
    })
  );

  const indexLines = others
    .slice(0, INDEX_LIMIT)
    .map((t) => `- "${t.title}" (${day(t.updatedAt)})`);

  const relevant = scored
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, DETAIL_THREADS);

  const parts: string[] = [
    `These are the user's OTHER saved conversations with you (not the current`,
    `thread). Use them only when they're relevant to what the user is asking now —`,
    `to recall a past decision, plan or figure they refer back to. Don't confuse`,
    `them with the current thread and don't bring them up unprompted.`,
    ``,
    `## Other conversations (most recent first)`,
    ...indexLines,
  ];

  if (relevant.length) {
    parts.push("", "## Possibly relevant past conversation(s), excerpted");
    for (const r of relevant) {
      parts.push(`### "${r.t.title}" (${day(r.t.updatedAt)})`);
      for (const m of r.msgs.slice(-DETAIL_MESSAGES)) {
        const who = m.role === "user" ? "User" : "You";
        parts.push(`- ${who}: ${collapse(m.content).slice(0, MSG_CHARS)}`);
      }
    }
  }

  return parts.join("\n");
}
