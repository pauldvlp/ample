import { listThreads, getThreadMessages } from "@/lib/ai/threads";
import { AssistantWorkspace } from "@/components/ai/assistant-workspace";

// Chat history lives in SQLite; render per-request so the panel + the deep-linked
// thread always reflect the latest state.
export const dynamic = "force-dynamic";
export const metadata = { title: "Asistente" };

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const sp = await searchParams;
  const requested = typeof sp.t === "string" ? sp.t : null;

  const threads = await listThreads();
  const activeThreadId =
    requested && threads.some((th) => th.id === requested) ? requested : null;
  const initialMessages = activeThreadId
    ? await getThreadMessages(activeThreadId)
    : [];

  return (
    <AssistantWorkspace
      threads={threads}
      activeThreadId={activeThreadId}
      initialMessages={initialMessages}
    />
  );
}
