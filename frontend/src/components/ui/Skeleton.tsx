import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'primary' | 'subtle';
}

export function Skeleton({ className = '', tone = 'primary', ...props }: SkeletonProps) {
  const toneClass =
    tone === 'primary'
      ? 'bg-slate-200/85 dark:bg-slate-800'
      : 'bg-slate-100 dark:bg-slate-800/65';

  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded ${toneClass} ${className}`}
      {...props}
    />
  );
}
