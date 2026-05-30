"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useAuthModal, type RegisterModalMode } from "@/lib/auth-modal";
import { StarButton } from "@/components/ui/star-button";
import { cn } from "@/lib/utils";

type AuthModalTriggerProps = {
  modal: "login" | "register";
  registerMode?: RegisterModalMode;
  children: ReactNode;
  /** Animated star-border light (marketing CTAs) */
  star?: boolean;
  size?: "default" | "sm" | "lg" | "xl";
  lightColor?: string;
  backgroundColor?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export function AuthModalTrigger({
  modal,
  registerMode = "org",
  children,
  className = "",
  star = false,
  size,
  lightColor = "#FAFAFA",
  backgroundColor = "#141414",
  onClick,
  ...rest
}: AuthModalTriggerProps) {
  const { openLogin, openRegister } = useAuthModal();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (modal === "login") openLogin();
    else openRegister(registerMode);
  };

  if (star) {
    const heightClass =
      size === "sm" ? "h-9 px-4 text-xs" : size === "lg" ? "h-12 px-8 text-base" : "h-11 px-7";

    return (
      <StarButton
        type="button"
        lightColor={lightColor}
        backgroundColor={backgroundColor}
        className={cn("min-w-[8.5rem] rounded-3xl", heightClass, className)}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </StarButton>
    );
  }

  return (
    <button type="button" className={className} onClick={handleClick} {...rest}>
      {children}
    </button>
  );
}
