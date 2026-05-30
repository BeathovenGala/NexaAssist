"use client";

import { cn } from "@/lib/utils";

/** Stand-in when WebGL is off (sandboxed IDE preview). Real scene loads in Chrome/Edge. */
export function SplineRobotFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col items-center justify-center",
        className,
      )}
      role="img"
      aria-label="3D robot preview"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(167,139,250,0.35),transparent_65%)]" />
      <svg
        viewBox="0 0 200 240"
        className="relative h-[min(100%,220px)] w-auto drop-shadow-[0_0_40px_rgba(167,139,250,0.45)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="100" cy="200" rx="52" ry="12" fill="rgba(0,0,0,0.45)" />
        <path
          d="M100 28c-22 0-40 16-40 42v48c0 8 6 14 14 14h8l6 28 6-28h8c8 0 14-6 14-14V70c0-26-18-42-40-42z"
          fill="url(#robotBody)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
        />
        <circle cx="82" cy="78" r="10" fill="#0a0a12" stroke="rgba(255,255,255,0.5)" />
        <circle cx="118" cy="78" r="10" fill="#0a0a12" stroke="rgba(255,255,255,0.5)" />
        <circle cx="82" cy="78" r="4" fill="#a78bfa" />
        <circle cx="118" cy="78" r="4" fill="#a78bfa" />
        <path
          d="M88 98h24c0 8-6 12-12 12s-12-4-12-12z"
          fill="rgba(255,255,255,0.12)"
        />
        <path
          d="M58 110h-18c-4 0-8 4-8 8v22c0 4 4 8 8 8h18M142 110h18c4 0 8 4 8 8v22c0 4-4 8-8 8h-18"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="robotBody" x1="60" y1="28" x2="140" y2="180" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e4e4e7" />
            <stop offset="0.45" stopColor="#a1a1aa" />
            <stop offset="1" stopColor="#52525b" />
          </linearGradient>
        </defs>
      </svg>
      <p className="relative mt-3 max-w-[220px] text-center text-[10px] leading-snug text-white/40">
        3D preview unavailable — check WebGL is enabled, or reload the page
      </p>
    </div>
  );
}
