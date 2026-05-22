import type { ReactNode, SelectHTMLAttributes } from "react";

type AuthSelectProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: boolean;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function AuthSelect({
  id,
  label,
  hint,
  error,
  className = "",
  children,
  ...selectProps
}: AuthSelectProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]"
      >
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error || undefined}
        className={`w-full rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2.5 text-sm text-[var(--na-text)] outline-none transition focus:border-[var(--na-accent)]/50 focus:ring-2 focus:ring-[var(--na-accent)]/20 ${className}`}
        {...selectProps}
      >
        {children}
      </select>
      {hint ? <div className="text-xs text-[var(--na-muted)]/70">{hint}</div> : null}
    </div>
  );
}
