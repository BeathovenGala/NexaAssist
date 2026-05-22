"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type AuthModalView = "login" | "register" | null;
export type RegisterModalMode = "org" | "customer";

type AuthModalContextValue = {
  view: AuthModalView;
  registerMode: RegisterModalMode;
  openLogin: () => void;
  openRegister: (mode?: RegisterModalMode) => void;
  close: () => void;
  switchToLogin: () => void;
  switchToRegister: (mode?: RegisterModalMode) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

function stripAuthParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("auth");
  params.delete("mode");
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<AuthModalView>(null);
  const [registerMode, setRegisterMode] = useState<RegisterModalMode>("org");

  const close = useCallback(() => {
    setView(null);
    if (pathname?.startsWith("/auth/")) {
      router.replace("/");
      return;
    }
    const remainder = stripAuthParams(searchParams.toString());
    router.replace(`${pathname ?? "/"}${remainder}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const openLogin = useCallback(() => {
    setView("login");
  }, []);

  const openRegister = useCallback((mode: RegisterModalMode = "org") => {
    setRegisterMode(mode);
    setView("register");
  }, []);

  const switchToLogin = useCallback(() => {
    setView("login");
  }, []);

  const switchToRegister = useCallback((mode: RegisterModalMode = "org") => {
    setRegisterMode(mode);
    setView("register");
  }, []);

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login") {
      setView("login");
      return;
    }
    if (auth === "register") {
      const mode = searchParams.get("mode");
      setRegisterMode(mode === "customer" ? "customer" : "org");
      setView("register");
    }
  }, [searchParams]);

  useEffect(() => {
    const root = document.documentElement;
    if (view) {
      root.classList.add("na-auth-modal-open");
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        root.classList.remove("na-auth-modal-open");
        document.body.style.overflow = prev;
      };
    }
    root.classList.remove("na-auth-modal-open");
  }, [view]);

  const value = useMemo(
    () => ({
      view,
      registerMode,
      openLogin,
      openRegister,
      close,
      switchToLogin,
      switchToRegister,
    }),
    [view, registerMode, openLogin, openRegister, close, switchToLogin, switchToRegister],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}
