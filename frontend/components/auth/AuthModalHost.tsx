"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { LoginFormContent } from "@/components/auth/LoginFormContent";
import { RegisterFormContent } from "@/components/auth/RegisterFormContent";
import { SignInCard } from "@/components/ui/sign-in-card";
import { useAuthModal, type RegisterModalMode } from "@/lib/auth-modal";

const backdropTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };
const panelTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

function AuthModalBackdrop({
  open,
  onClose,
  panelClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  panelClassName?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="auth-modal-backdrop"
          className="na-modal-backdrop fixed inset-0 z-[9000] grid place-items-center p-4 sm:p-6 [&]:animate-none"
          role="presentation"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={backdropTransition}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          style={{ pointerEvents: "auto" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`w-full max-h-[calc(100dvh-2rem)] outline-none ${panelClassName ?? "max-w-[min(100%,34rem)]"}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 16 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
            transition={panelTransition}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AuthModalHost() {
  const { view, registerMode, close } = useAuthModal();
  const [mode, setMode] = useState<RegisterModalMode>(registerMode);

  useEffect(() => {
    setMode(registerMode);
  }, [registerMode]);

  return (
    <>
      <AuthModalBackdrop open={view === "login"} onClose={close}>
        <SignInCard
          title="Sign in"
          description="Secure access to your NexaAssist workspace."
          onClose={close}
        >
          <LoginFormContent />
        </SignInCard>
      </AuthModalBackdrop>

      <AuthModalBackdrop open={view === "register"} onClose={close}>
        <SignInCard
          className="max-w-xl"
          title={mode === "org" ? "Create workspace" : "Join as customer"}
          description={
            mode === "org"
              ? "Provision your secure environment for modular operations."
              : "Create your account and request access to an organization."
          }
          onClose={close}
        >
          <RegisterFormContent mode={mode} onModeChange={setMode} />
        </SignInCard>
      </AuthModalBackdrop>
    </>
  );
}
