import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve the per-family SVG stroke widths for the global icon-stroke multiplier
 * (settings → appearance). Returns literal CSS custom-property values so the CSS
 * can use a plain `var()` instead of `calc(... * var())` — Gecko (Firefox/Zen)
 * does NOT apply a unitless `calc()` result to `stroke-width`, which left icons
 * stuck at their native weight there. Bases match each family's chosen weight:
 * Hugeicons 1.8, lucide 2. Used identically on the server (root <html> style,
 * no FOUC) and the client (live change in the settings provider).
 */
export function iconStrokeVars(scale: number): Record<'--hg-stroke' | '--lucide-stroke', string> {
  const r = (n: number) => String(Math.round(n * 1000) / 1000);
  return {
    '--hg-stroke': r(1.8 * scale),
    '--lucide-stroke': r(2 * scale),
  };
}
