// Test-only stand-in for `next/cache` so server actions can run outside a Next
// request scope (revalidatePath otherwise throws "static generation store missing").
export function revalidatePath(): void {}
export function revalidateTag(): void {}
export function unstable_cache<T extends (...a: never[]) => unknown>(fn: T): T {
  return fn;
}
export function unstable_noStore(): void {}
