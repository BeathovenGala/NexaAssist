import type { ButtonHTMLAttributes } from "react";

export function AuthPrimaryButton({
  className = "",
  type = "submit",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`w-full rounded-md bg-[var(--na-primary-btn)] px-6 py-3 text-[18px] font-semibold text-[var(--na-primary-btn-text)] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
