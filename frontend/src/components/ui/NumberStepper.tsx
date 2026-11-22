import { Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface NumberStepperProps {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  min?: number;
  max?: number;
  decreaseLabel: string;
  increaseLabel: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  disabled?: boolean;
}

export function NumberStepper({
  id,
  value,
  onChange,
  min = 0,
  max = 10000,
  decreaseLabel,
  increaseLabel,
  ariaInvalid,
  ariaDescribedBy,
  disabled = false,
}: NumberStepperProps) {
  const numericVal = value.trim() === '' ? null : Number(value);
  const canDecrease =
    !disabled && numericVal !== null && !Number.isNaN(numericVal) && numericVal > min;
  const canIncrease =
    !disabled && (numericVal === null || Number.isNaN(numericVal) || numericVal < max);

  const stepBy = (delta: number) => {
    if (disabled) return;
    const current = numericVal === null || Number.isNaN(numericVal) ? min : numericVal;
    const next = Math.max(min, Math.min(max, current + delta));
    onChange(String(next));
  };

  return (
    <div
      className={`flex items-center h-11 bg-white dark:bg-slate-900 border rounded-md overflow-hidden transition-colors focus-within:border-accent dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-accent/15 dark:focus-within:ring-blue-500/20 ${
        ariaInvalid
          ? 'border-red-400 dark:border-red-500'
          : 'border-slate-300 dark:border-slate-700'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <motion.button
        type="button"
        whileTap={canDecrease ? { scale: 0.9 } : undefined}
        disabled={!canDecrease}
        onClick={() => stepBy(-1)}
        aria-label={decreaseLabel}
        className="h-full w-11 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors shrink-0 border-r border-slate-200 dark:border-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent dark:focus-visible:ring-blue-400"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </motion.button>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          onChange(digits);
        }}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="w-full h-full px-2 bg-transparent text-center font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none disabled:cursor-not-allowed"
      />

      <motion.button
        type="button"
        whileTap={canIncrease ? { scale: 0.9 } : undefined}
        disabled={!canIncrease}
        onClick={() => stepBy(1)}
        aria-label={increaseLabel}
        className="h-full w-11 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors shrink-0 border-l border-slate-200 dark:border-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent dark:focus-visible:ring-blue-400"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </motion.button>
    </div>
  );
}
