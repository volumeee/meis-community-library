interface BorrowerTextFieldProps {
  id: string;
  errorId: string;
  label: string;
  type: 'text' | 'tel';
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  placeholder: string;
  className: string;
  disabled?: boolean;
  maxLength?: number;
}
export function BorrowerTextField({
  id,
  errorId,
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  className,
  disabled = false,
  maxLength,
}: BorrowerTextFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
      >
        {label} <span className="text-red-600 dark:text-red-400">*</span>
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        className={className}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
