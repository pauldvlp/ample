import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after hydration. Replaces the classic
 * `useState(false)` + `useEffect(() => setMounted(true), [])` shim (which
 * trips `react-hooks/set-state-in-effect`) with the store-based idiom React
 * recommends for client-only reads.
 */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
