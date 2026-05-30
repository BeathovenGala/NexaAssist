"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type GradientGlowFrameProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

/** Bottom gradient glow layers from 3dmk Gradient — wraps content for hero/auth cards */
export function GradientGlowFrame({
  children,
  className,
  innerClassName,
}: GradientGlowFrameProps) {
  return (
    <div className={cn("ocean-glass-card relative overflow-hidden rounded-[28px]", className)}>
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-25 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-2/3"
        style={{
          background: `
            radial-gradient(ellipse at bottom right, rgba(46, 212, 199, 0.45) -10%, transparent 70%),
            radial-gradient(ellipse at bottom left, rgba(78, 231, 213, 0.35) -10%, transparent 70%)
          `,
          filter: "blur(40px)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.05) 100%)",
          boxShadow:
            "0 0 20px 3px rgba(46, 212, 199, 0.5), 0 0 30px 5px rgba(78, 231, 213, 0.35)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 h-full w-full overflow-hidden rounded-[26px]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
