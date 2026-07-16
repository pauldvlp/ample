/**
 * Checks the assistant's product-knowledge layer (lib/ai/app-knowledge.ts): the
 * rendered guide must describe the real app — every screen, the key settings and
 * (the regression that started this) SIMULATION MODE — and the roadmap must be
 * clearly labelled as planned. Then it renders the ANSWER system prompt
 * (buildAnswerSystem — what the user actually reads) and asserts the knowledge is
 * wired in, so the model can no longer claim a real feature doesn't exist.
 * No LLM / network / DB queries.
 */
import { buildAppKnowledge, PLANNED_FEATURES } from "@/lib/ai/app-knowledge";
import { buildAnswerSystem } from "@/lib/ai/agent";
import type { AgentCtx } from "@/lib/ai/agent-tools";

function assert(name: string, cond: boolean) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const guide = buildAppKnowledge();
  console.log("\n========== buildAppKnowledge() ==========\n");
  console.log(guide);
  console.log("\n=========================================\n");

  // 1) every sidebar screen is documented (route mentioned) ------------------
  const routes = [
    "(/)",
    "/assistant",
    "/accounts",
    "/transactions",
    "/budgets",
    "/goals",
    "/recurring",
    "/debts",
    "/reports",
    "/categories",
    "/settings",
  ];
  for (const r of routes)
    assert(`documents the ${r} screen`, guide.includes(r));

  // 2) the headline fix: simulation mode is described AND affirmed to exist ---
  assert("describes simulation mode", /simulation mode/i.test(guide));
  assert(
    "affirms simulation mode exists (anti-confabulation)",
    /DOES EXIST/i.test(guide) && /time-machine/i.test(guide)
  );

  // 3) key settings / options are covered ------------------------------------
  assert("covers base currency + HNL", /base currency/i.test(guide) && /HNL/.test(guide));
  assert("covers language toggle", /Language/.test(guide));
  assert("covers privacy / hide amounts", /hide amounts/i.test(guide));
  assert("covers AI provider setting", /provider/i.test(guide) && /Anthropic/.test(guide));
  assert("covers exchange rates", /exchange rates/i.test(guide));

  // 4) capabilities & guardrails ---------------------------------------------
  assert("states there are no delete tools", /NO delete tools/i.test(guide));
  assert("mentions cuotas / installments", /cuotas/i.test(guide));

  // 5) roadmap is present and clearly labelled as not-yet-available ----------
  assert("roadmap section rendered", /Roadmap/.test(guide));
  assert(
    "roadmap flagged as planned / not available",
    /not available yet/i.test(guide) && /planned/i.test(guide)
  );
  assert("roadmap lists the seeded planned features", PLANNED_FEATURES.length > 0 &&
    PLANNED_FEATURES.every((f) => guide.includes(f.title)));

  // 6) the knowledge is actually wired into the streamed ANSWER prompt -------
  const ctx: AgentCtx = {
    base: "HNL",
    locale: "es-HN",
    lang: "es",
    now: new Date(),
    accounts: [],
    categories: [],
    debts: [],
    goals: [],
    recurring: [],
  };
  const answerPrompt = buildAnswerSystem(ctx, "SNAPSHOT_PLACEHOLDER", []);
  assert(
    "answer prompt includes the ABOUT THE AMPLE APP section",
    answerPrompt.includes("=== ABOUT THE AMPLE APP ===")
  );
  assert(
    "answer prompt carries the simulation-mode knowledge",
    /simulation mode/i.test(answerPrompt) && /DOES EXIST/i.test(answerPrompt)
  );
  assert(
    "answer prompt still includes the financial snapshot",
    answerPrompt.includes("SNAPSHOT_PLACEHOLDER")
  );

  console.log(
    process.exitCode ? "\nSOME CHECKS FAILED ❌" : "\nALL APP-KNOWLEDGE CHECKS PASSED ✅"
  );
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(2);
});
