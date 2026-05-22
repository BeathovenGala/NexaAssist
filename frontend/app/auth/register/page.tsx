"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthModal } from "@/lib/auth-modal";

function RegisterRedirect() {
  const { openRegister } = useAuthModal();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get("mode") === "customer" ? "customer" : "org";
    openRegister(mode);
  }, [openRegister, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--na-bg)] text-sm text-[var(--na-muted)]">
      Opening registration…
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--na-bg)] text-[var(--na-muted)]">
          Loading…
        </div>
      }
    >
      <RegisterRedirect />
    </Suspense>
  );
}
