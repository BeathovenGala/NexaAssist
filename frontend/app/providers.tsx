"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth";
import { AuthModalProvider } from "@/lib/auth-modal";
import { AuthModalHost } from "@/components/auth/AuthModalHost";
import { ToastHost } from "@/components/ui/ToastHost";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <AuthModalProvider>
          {children}
          <AuthModalHost />
        </AuthModalProvider>
      </Suspense>
      <ToastHost />
    </AuthProvider>
  );
}
