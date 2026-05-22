"use client";

import { useEffect, useState } from "react";
import { GlassModal } from "@/components/ui/GlassModal";
import { LoginFormContent } from "@/components/auth/LoginFormContent";
import { RegisterFormContent } from "@/components/auth/RegisterFormContent";
import { useAuthModal, type RegisterModalMode } from "@/lib/auth-modal";

export function AuthModalHost() {
  const { view, registerMode, close } = useAuthModal();
  const [mode, setMode] = useState<RegisterModalMode>(registerMode);

  useEffect(() => {
    setMode(registerMode);
  }, [registerMode]);

  return (
    <>
      <GlassModal
        open={view === "login"}
        onClose={close}
        title="Sign in"
        description="Secure access to your NexaAssist workspace."
        size="md"
      >
        <LoginFormContent />
      </GlassModal>

      <GlassModal
        open={view === "register"}
        onClose={close}
        title={mode === "org" ? "Create workspace" : "Join as customer"}
        description={
          mode === "org"
            ? "Provision your secure environment for modular operations."
            : "Create your account and request access to an organization."
        }
        size="xl"
      >
        <RegisterFormContent mode={mode} onModeChange={setMode} />
      </GlassModal>
    </>
  );
}
