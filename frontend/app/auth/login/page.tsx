"use client";

import { Suspense, useEffect } from "react";
import { useAuthModal } from "@/lib/auth-modal";

function LoginRedirect() {
  const { openLogin } = useAuthModal();

  useEffect(() => {
    openLogin();
  }, [openLogin]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--na-bg)] text-sm text-[var(--na-muted)]">
      Opening sign in…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--na-bg)] text-[var(--na-muted)]">
          Loading…
        </div>
      }
    >
      <LoginRedirect />
    </Suspense>
  );
}
