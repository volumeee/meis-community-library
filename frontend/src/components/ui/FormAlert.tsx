import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormAlertProps {
  id?: string;
  children: ReactNode;
  tone?: 'error' | 'warning';
  withIcon?: boolean;
  className?: string;
}

export function FormAlert({
  id,
  children,
  tone = 'error',
  withIcon = false,
  className = '',
}: FormAlertProps) {
  const toneClasses =
    tone === 'warning'
      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
      : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200';

  return (
    <div
      id={id}
      role="alert"
      className={`rounded-md border px-3.5 py-2.5 text-xs leading-relaxed ${
        withIcon ? 'flex items-start gap-2.5' : ''
      } ${toneClasses} ${className}`}
    >
      {withIcon && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
