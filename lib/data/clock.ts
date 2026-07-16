import "server-only";
import { getSettings } from "./settings";

/**
 * The app's notion of "now".
 *
 * In simulation mode with a set `simDate`, this returns the simulated clock so
 * the whole app (dashboard month, budgets period, recurring due, goals ETA,
 * reports series) can travel through time together. Otherwise it's the real
 * wall-clock. Every server read that computes a "current"/"today"/"due" value
 * should go through this instead of `new Date()`.
 */
export async function getNow(): Promise<Date> {
  const s = await getSettings();
  if (s.simulationActive && s.simDate) return new Date(s.simDate);
  return new Date();
}

/** Epoch-ms convenience form of {@link getNow}. */
export async function nowMs(): Promise<number> {
  return (await getNow()).getTime();
}
