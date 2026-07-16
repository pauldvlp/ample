import "server-only";
import { revalidatePath } from "next/cache";

/** Single-user local app: after any mutation, refresh every cached route. */
export function revalidateFinance() {
  revalidatePath("/", "layout");
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}
