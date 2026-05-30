"use client";

import { cn } from "@/lib/utils";

/** Metallic robot stand-in — works without WebGL (IDE preview, WebGL off). */
export function AnimatedRobotFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "robot-fallback-root relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      role="img"
      aria-label="NexaAssist robot"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(167,139,250,0.45),transparent_62%)]" />
      <div className="robot-fallback-float relative w-[78%] max-w-[220px]">
        <svg
          viewBox="0 0 240 280"
          className="h-auto w-full drop-shadow-[0_12px_48px_rgba(167,139,250,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="120" cy="252" rx="56" ry="14" fill="rgba(0,0,0,0.55)" />
          <path
            d="M120 36c-28 0-50 20-50 52v58c0 10 8 18 18 18h10l8 34 8-34h10c10 0 18-8 18-18V88c0-32-22-52-50-52z"
            fill="url(#robotMetal)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
          />
          <path
            d="M72 118H48c-6 0-10 5-10 10v28c0 5 4 10 10 10h24M168 118h24c6 0 10 5 10 10v28c0 5-4 10-10 10h-24"
            stroke="url(#armGrad)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <rect x="88" y="108" width="64" height="28" rx="8" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.15)" />
          <circle cx="98" cy="92" r="12" fill="#050508" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          <circle cx="142" cy="92" r="12" fill="#050508" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          <circle className="robot-eye-glow" cx="98" cy="92" r="5" fill="#c4b5fd" />
          <circle className="robot-eye-glow" cx="142" cy="92" r="5" fill="#c4b5fd" style={{ animationDelay: "0.4s" }} />
          <path d="M104 128h32c0 10-8 16-16 16s-16-6-16-16z" fill="rgba(255,255,255,0.08)" />
          <defs>
            <linearGradient id="robotMetal" x1="70" y1="36" x2="170" y2="210" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fafafa" />
              <stop offset="0.35" stopColor="#a1a1aa" />
              <stop offset="0.7" stopColor="#52525b" />
              <stop offset="1" stopColor="#27272a" />
            </linearGradient>
            <linearGradient id="armGrad" x1="48" y1="118" x2="192" y2="156" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d4d4d8" />
              <stop offset="1" stopColor="#71717a" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
