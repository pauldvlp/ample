'use client';

import { cn } from '@/lib/utils';

/** A linear budget/progress meter. `value` is a ratio (0..1+, may exceed 1). */
export function Meter({
  value,
  color,
  height = 8,
  className,
  tone = 'auto',
}: {
  value: number;
  color?: string;
  height?: number;
  className?: string;
  /** auto = green→brass→red by fullness; brand = always the given color */
  tone?: 'auto' | 'brand';
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const over = value > 1;

  const autoColor =
    value >= 1 ? 'var(--negative)' : value >= 0.85 ? 'var(--brass)' : 'var(--positive)';
  const fill = tone === 'brand' ? (color ?? 'var(--primary)') : autoColor;

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-muted', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped * 100}%`, backgroundColor: fill }}
      />
      {over && (
        <div
          className="absolute inset-y-0 right-0 rounded-full"
          style={{
            width: 6,
            backgroundColor: 'var(--negative)',
            boxShadow: '0 0 6px var(--negative)',
          }}
        />
      )}
    </div>
  );
}
