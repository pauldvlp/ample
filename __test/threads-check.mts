/**
 * Round-trip check for persisted AI chat threads (history). Exercises the
 * lib/ai/threads data layer against a throwaway SQLite DB: create → append a
 * full turn (user + assistant, with actions + auto-derived title) → list
 * (ordering) → read (ordering + parsed actions) → rename → delete (cascade) →
 * clear all. No LLM / network.
 */
import {
  createThread,
  appendMessage,
  listThreads,
  getThreadMessages,
  threadExists,
  deleteThread,
  deleteAllThreads,
  renameThread,
} from "@/lib/ai/threads";
import type { ExecutedAction } from "@/lib/ai/agent-tools";

function assert(name: string, cond: boolean) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  // 1) create + persist a full turn ----------------------------------------
  const t1 = await createThread();
  assert("createThread returns an id", typeof t1 === "string" && t1.length > 0);
  assert("new thread exists", await threadExists(t1));

  const acts: ExecutedAction[] = [
    { tool: "add_transaction", ok: true, label: "Gasto", detail: "L 500" },
  ];
  const { title } = await appendMessage(t1, {
    role: "user",
    content: "¿En qué gasté 500 hoy?",
  });
  await appendMessage(t1, {
    role: "assistant",
    content: "Registré un gasto de **L 500**.",
    actions: acts,
  });

  assert("title derived from first user message", title === "¿En qué gasté 500 hoy?");

  // 2) read the transcript back ---------------------------------------------
  const msgs = await getThreadMessages(t1);
  assert("both turns persisted", msgs.length === 2);
  assert(
    "ordered user → assistant",
    msgs[0]?.role === "user" && msgs[1]?.role === "assistant"
  );
  assert("assistant content preserved", !!msgs[1]?.content.includes("L 500"));
  assert(
    "actions round-trip parsed",
    Array.isArray(msgs[1]?.actions) &&
      msgs[1]?.actions?.length === 1 &&
      msgs[1]?.actions?.[0].ok === true &&
      msgs[1]?.actions?.[0].detail === "L 500"
  );
  assert("user turn stores null actions", msgs[0]?.actions === null);

  // 3) a second thread floats to the top of the history ---------------------
  const t2 = await createThread();
  await appendMessage(t2, { role: "user", content: "¿Cómo va mi ahorro?" });
  const list = await listThreads();
  assert("both threads listed", list.length === 2);
  assert("most-recently-updated thread first", list[0]?.id === t2);
  assert(
    "summary carries the derived title",
    !!list.find((x) => x.id === t1 && x.title === "¿En qué gasté 500 hoy?")
  );
  assert(
    "updatedAt is epoch ms",
    typeof list[0]?.updatedAt === "number" && list[0]!.updatedAt > 0
  );

  // 4) rename ----------------------------------------------------------------
  await renameThread(t1, "Gastos de hoy");
  const renamed = await listThreads();
  assert(
    "rename reflected in listing",
    !!renamed.find((x) => x.id === t1 && x.title === "Gastos de hoy")
  );

  // 5) delete one → its messages cascade ------------------------------------
  await deleteThread(t1);
  assert("deleted thread gone", !(await threadExists(t1)));
  assert(
    "deleted thread's messages cascaded",
    (await getThreadMessages(t1)).length === 0
  );
  assert("other thread survives", (await listThreads()).length === 1);

  // 6) clear all -------------------------------------------------------------
  await deleteAllThreads();
  assert("clear-all empties the history", (await listThreads()).length === 0);

  console.log(
    process.exitCode ? "\nSOME CHECKS FAILED ❌" : "\nALL THREAD CHECKS PASSED ✅"
  );
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(2);
});
