import "server-only";

import { getDashboardData } from "@/lib/data/dashboard";
import { getDebts } from "@/lib/data/debts";
import { getRecurringRules } from "@/lib/data/recurring";
import { getRecentTransactions } from "@/lib/data/transactions";
import { getSettings } from "@/lib/data/settings";
import { getNow } from "@/lib/data/clock";
import { formatMoney, formatPercent } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { ACCOUNT_TYPE_META } from "@/lib/constants";

/**
 * Assembles a rich, privacy-local financial snapshot for LLM prompts. This is
 * the model's ONLY window into the user's data, so it is deliberately thorough:
 * per-account balances, the full budget, every active recurring rule, every open
 * debt WITH its installment plan (cuotas) and payment progress, goals with pace,
 * a multi-month trend and a good slice of recent transactions. Everything is
 * pre-formatted in the user's currency + locale so the model never reasons about
 * cents. Only a summarized-but-complete view is sent — never the raw ledger — and
 * it goes to whichever provider the user configured.
 */
export async function buildFinanceContext(opts?: {
  /** how many recent transactions to include (default 24) */
  recentLimit?: number;
}): Promise<string> {
  const recentLimit = opts?.recentLimit ?? 24;

  const [d, debts, recurring, recent, s, now] = await Promise.all([
    getDashboardData(),
    getDebts(),
    getRecurringRules(),
    getRecentTransactions(recentLimit),
    getSettings(),
    getNow(),
  ]);

  const m = (c: number) =>
    formatMoney(c, { currency: s.baseCurrency, locale: s.locale });
  const pct = (r: number) => formatPercent(r, { locale: s.locale });
  const day = (dt: Date | number) => formatDate(dt, "yyyy-MM-dd");
  const daysFromNow = (dt: Date) =>
    Math.round((dt.getTime() - now.getTime()) / 86_400_000);

  const L: string[] = [];
  const push = (...xs: string[]) => L.push(...xs);
  const blank = () => L.push("");

  /* ------------------------------- header -------------------------------- */
  push(`# Financial snapshot for ${s.displayName || "the user"}`);
  push(`As of ${day(now)} (${formatDate(now, "PPPP")}).`);
  push(`Base currency: ${s.baseCurrency}. Locale: ${s.locale}.`);
  if (s.simulationActive)
    push(`NOTE: the app is in SIMULATION mode — "now" is a simulated clock.`);

  /* ----------------------------- net worth ------------------------------- */
  blank();
  push("## Net worth");
  push(
    `Net worth ${m(d.netWorth)} = assets ${m(d.assets)} − liabilities ${m(
      d.liabilities
    )}. 30-day change ${m(d.netWorthDelta.amount)} (${pct(d.netWorthDelta.pct)}).`
  );

  /* ------------------------------ accounts ------------------------------- */
  blank();
  push("## Accounts (current balances)");
  if (d.accounts.length) {
    for (const a of d.accounts) {
      const typeLabel = ACCOUNT_TYPE_META[a.type]?.group ?? a.type;
      const flags: string[] = [];
      if (!a.includeInNetWorth) flags.push("not in net worth");
      if (a.currency !== s.baseCurrency) flags.push(`held in ${a.currency}`);
      const extra = flags.length ? ` [${flags.join(", ")}]` : "";
      push(`- ${a.name} (${a.type}/${typeLabel}): ${m(a.balance)}${extra}`);
    }
    if (d.creditUtilization.length) {
      push("Credit-card utilization:");
      for (const c of d.creditUtilization)
        push(
          `- ${c.name}: ${m(c.used)} used of ${m(c.limit)} limit (${pct(c.pct)})`
        );
    }
  } else {
    push("- (no accounts yet)");
  }

  /* ------------------------------ cash flow ------------------------------ */
  blank();
  push("## Cash flow");
  push(
    `This month — income ${m(d.thisMonth.income)}, expenses ${m(
      d.thisMonth.expense
    )}, net ${m(d.thisMonth.net)}. Savings rate ${pct(d.savingsRate)}.`
  );
  push(
    `Last month — income ${m(d.lastMonth.income)}, expenses ${m(
      d.lastMonth.expense
    )}, net ${m(d.lastMonth.net)}. Spending vs last month ${pct(
      d.spendingDeltaPct
    )}.`
  );
  if (d.incomeVsExpense.length) {
    push("Monthly trend (income / expense / net):");
    for (const mth of d.incomeVsExpense)
      push(
        `- ${mth.month}: ${m(mth.income)} / ${m(mth.expense)} / ${m(mth.net)}`
      );
  }

  /* ------------------------------- budgets ------------------------------- */
  if (d.budget && (d.budget.lines.length || d.budget.unbudgeted.length)) {
    blank();
    push(`## Budget (${d.budget.period})`);
    if (d.budget.totalBudget > 0)
      push(
        `Total budget ${m(d.budget.totalBudget)}, spent ${m(
          d.budget.totalSpent
        )}, remaining ${m(d.budget.remaining)} (${pct(d.budget.pct)} used).`
      );
    for (const l of d.budget.lines) {
      const over = l.amount > 0 && l.spent > l.amount ? " ⚠ OVER" : "";
      push(
        `- ${l.categoryName}: spent ${m(l.spent)} of ${m(l.amount)} (${pct(
          l.pct
        )})${over}`
      );
    }
    const unb = d.budget.unbudgeted.filter((u) => u.spent > 0).slice(0, 8);
    if (unb.length) {
      push("Spending in categories with no budget:");
      for (const u of unb) push(`- ${u.name}: ${m(u.spent)}`);
    }
  }

  /* ------------------------- top spend categories ------------------------ */
  if (d.topCategories.length) {
    blank();
    push("## Top spending categories (this month)");
    for (const c of d.topCategories.slice(0, 8))
      push(`- ${c.name}: ${m(c.amount)} (${pct(c.pct)})`);
  }

  /* -------------------------------- goals -------------------------------- */
  const activeGoals = d.goals.filter((g) => g.status === "active");
  const otherGoals = d.goals.filter((g) => g.status !== "active");
  if (activeGoals.length) {
    blank();
    push("## Savings goals");
    for (const g of activeGoals) {
      const parts = [
        `${g.name}: ${m(g.currentAmount)} / ${m(g.targetAmount)} (${pct(
          g.pct
        )}), ${m(g.remaining)} to go`,
      ];
      if (g.targetDate) parts.push(`target ${day(g.targetDate)}`);
      if (g.monthlyPace != null) parts.push(`pace ${m(g.monthlyPace)}/mo`);
      if (g.projectedDate) parts.push(`projected ${day(g.projectedDate)}`);
      push(`- ${parts.join(", ")}`);
    }
    if (otherGoals.length)
      push(
        `(${otherGoals.length} other goal(s): ${otherGoals
          .map((g) => `${g.name} — ${g.status}`)
          .join(", ")})`
      );
  }

  /* ------------------------- recurring & subscriptions ------------------- */
  const activeRules = recurring.filter((r) => r.isActive);
  if (recurring.length) {
    blank();
    push("## Recurring rules");
    const monthlyOut = activeRules
      .filter((r) => r.type !== "income")
      .reduce((sum, r) => sum + r.monthlyEquivalent, 0);
    const monthlyIn = activeRules
      .filter((r) => r.type === "income")
      .reduce((sum, r) => sum + r.monthlyEquivalent, 0);
    const subs = activeRules.filter((r) => r.isSubscription);
    const subTotal = subs.reduce((sum, r) => sum + r.monthlyEquivalent, 0);
    push(
      `Active: ${activeRules.length}. Est. monthly recurring — out ${m(
        monthlyOut
      )}, in ${m(monthlyIn)}, net ${m(monthlyIn - monthlyOut)}.`
    );
    if (subs.length)
      push(
        `Subscriptions: ${subs.length}, ~${m(subTotal)}/mo (~${m(
          subTotal * 12
        )}/yr).`
      );
    for (const r of activeRules.slice(0, 30)) {
      const tags: string[] = [];
      if (r.isSubscription) tags.push("subscription");
      if (r.autoPost) tags.push("auto-posts");
      const meta = [r.categoryName, r.accountName].filter(Boolean).join(" · ");
      push(
        `- ${r.name} — ${r.type} ${m(Math.abs(r.amount))} every ${
          r.interval > 1 ? `${r.interval} ` : ""
        }${r.frequency}, next ${day(r.nextDueDate)}${
          meta ? ` [${meta}]` : ""
        }${tags.length ? ` (${tags.join(", ")})` : ""}`
      );
    }
    const paused = recurring.length - activeRules.length;
    if (paused > 0) push(`(${paused} paused rule(s) not listed.)`);
  }

  /* ---------------------------- upcoming bills --------------------------- */
  if (d.upcomingBills.length) {
    blank();
    push("## Upcoming bills (next 30 days)");
    for (const b of d.upcomingBills.slice(0, 10))
      push(
        `- ${b.name}: ${m(Math.abs(b.amount))} due ${day(b.nextDueDate)} (in ${
          b.daysUntil
        } day(s))`
      );
  }

  /* -------------------------------- debts -------------------------------- */
  const openDebts = debts.filter((db) => db.status === "open");
  const settledCount = debts.length - openDebts.length;
  if (openDebts.length) {
    blank();
    push("## Debts & loans");
    const owedToYou = openDebts
      .filter((db) => db.kind === "receivable")
      .reduce((sum, db) => sum + db.outstanding, 0);
    const youOwe = openDebts
      .filter((db) => db.kind === "payable")
      .reduce((sum, db) => sum + db.outstanding, 0);
    push(
      `Owed to you ${m(owedToYou)}; you owe ${m(youOwe)}. ${
        openDebts.length
      } open${settledCount ? `, ${settledCount} settled` : ""}.`
    );
    for (const db of openDebts) {
      const dir = db.kind === "receivable" ? "owed to you" : "you owe";
      const label = [db.counterparty, db.name].filter(Boolean).join(" — ");
      const due = db.dueDate ? `, due ${day(db.dueDate)}` : "";
      push(
        `- ${label} (${dir}): outstanding ${m(db.outstanding)} of ${m(
          db.principal
        )}, paid ${m(db.paid)}${due}`
      );

      // Installment plan ("cuotas"): the schedule the user cares about.
      const inst = db.installments;
      if (inst.length) {
        const paidN = inst.filter((i) => i.paidPaymentId).length;
        const pending = inst.filter((i) => !i.paidPaymentId);
        const overdue = pending.filter((i) => i.dueDate.getTime() < now.getTime());
        const bits = [`${inst.length} cuotas, ${paidN} paid, ${pending.length} pending`];
        if (overdue.length) bits.push(`${overdue.length} OVERDUE`);
        push(`    Plan: ${bits.join("; ")}.`);
        for (const i of pending.slice(0, 6)) {
          const dn = daysFromNow(i.dueDate);
          const when =
            dn < 0 ? `${-dn}d overdue` : dn === 0 ? "today" : `in ${dn}d`;
          push(
            `      · cuota ${m(i.amount)} due ${day(i.dueDate)} (${when})${
              i.note ? ` — ${i.note}` : ""
            }`
          );
        }
        if (pending.length > 6)
          push(`      · …and ${pending.length - 6} more cuota(s)`);
      }
    }
  } else if (settledCount) {
    blank();
    push("## Debts & loans");
    push(`No open debts. ${settledCount} settled.`);
  }

  /* -------------------------- recent transactions ------------------------ */
  if (recent.length) {
    blank();
    push(`## Recent transactions (latest ${recent.length})`);
    for (const tx of recent) {
      const who =
        tx.payee ||
        (tx.type === "transfer"
          ? `Transfer → ${tx.transferAccountName ?? "?"}`
          : tx.category?.name || tx.type);
      const cat = tx.category?.name ? ` [${tx.category.name}]` : "";
      const acc = tx.account?.name ? ` {${tx.account.name}}` : "";
      push(`- ${day(tx.date)} ${who} ${m(tx.amount)}${cat}${acc}`);
    }
  }

  return L.join("\n");
}
