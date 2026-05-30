"use client";

import type { ReactNode } from "react";

import { GlowCard } from "@/components/ui/glow-card";
import { GradientGlowFrame } from "@/components/ui/gradient-glow-frame";
import { cn } from "@/lib/utils";

export type MarketingGridCardProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  featured?: boolean;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange" | "neutral";
};

/** Bento / feature grid cell — GlowCard + gradient frame (3dmk grid_card pattern) */
export function MarketingGridCard({
  children,
  className,
  innerClassName,
  featured = false,
  glowColor = "purple",
}: MarketingGridCardProps) {
  return (
    <GlowCard customSize glowColor={glowColor} className={cn("h-full w-full p-0", className)}>
      <GradientGlowFrame
        className="h-full"
        innerClassName={cn(
          "flex min-h-[220px] flex-col justify-between p-6 md:min-h-[260px] md:p-8",
          featured && "md:min-h-[300px]",
          innerClassName,
        )}
      >
        {children}
      </GradientGlowFrame>
    </GlowCard>
  );
}
