import type { InputHTMLAttributes, ReactNode } from "react";

type AuthFieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

export function AuthField({
  id,
  label,
  hint,
  error,
  className = "",
  ...inputProps
}: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error || undefined}
        className={`w-full rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2.5 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/40 outline-none transition focus:border-[var(--na-accent)]/50 focus:ring-2 focus:ring-[var(--na-accent)]/20 ${className}`}
        {...inputProps}
      />
      {hint ? <div className="text-xs text-[var(--na-muted)]/70">{hint}</div> : null}
    </div>
  );
}
