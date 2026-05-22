import type { ReactNode } from "react";

type AuthSplitShellProps = {
  left: ReactNode;
  right: ReactNode;
};

/**
 * Split horizontal layout matching Figma Registration / Sign In frames (1280-wide reference).
 */
export function AuthSplitShell({ left, right }: AuthSplitShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--na-bg)] lg:flex-row">
      <aside className="relative flex w-full flex-col justify-between border-b border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] px-8 py-10 lg:w-[46%] lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
        {left}
      </aside>
      <section className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
        <div className="mx-auto w-full max-w-md">{right}</div>
      </section>
    </div>
  );
}
