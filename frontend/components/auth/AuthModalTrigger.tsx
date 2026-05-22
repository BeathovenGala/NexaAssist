"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAuthModal, type RegisterModalMode } from "@/lib/auth-modal";

type AuthModalTriggerProps = {
  modal: "login" | "register";
  registerMode?: RegisterModalMode;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export function AuthModalTrigger({
  modal,
  registerMode = "org",
  children,
  className = "",
  onClick,
  ...rest
}: AuthModalTriggerProps) {
  const { openLogin, openRegister } = useAuthModal();

  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (modal === "login") openLogin();
        else openRegister(registerMode);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
