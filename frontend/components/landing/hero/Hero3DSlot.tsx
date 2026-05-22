"use client";

import dynamic from "next/dynamic";

const HeroScene = dynamic(
  () => import("./HeroScene").then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full w-full animate-pulse rounded-xl bg-[var(--na-surface)]/30"
        aria-hidden
      />
    ),
  },
);

type Hero3DSlotProps = {
  introComplete?: boolean;
};

export function Hero3DSlot({ introComplete = true }: Hero3DSlotProps) {
  return (
    <div
      id="hero-3d-slot"
      data-reveal="hero-slot"
      className="na-monitor-shell na-hero-canvas-glow relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-[var(--na-border-subtle)] shadow-[0_25px_50px_rgba(0,0,0,0.45)] lg:min-h-[420px]"
      style={{ aspectRatio: "664 / 500" }}
    >
      <HeroScene introComplete={introComplete} />
    </div>
  );
}

export function HeroStaticPoster() {
  return (
    <div
      id="hero-3d-slot"
      data-reveal="hero-slot"
      className="na-monitor-shell relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-[var(--na-border-subtle)] shadow-[0_25px_50px_rgba(0,0,0,0.45)] lg:min-h-[420px]"
      style={{ aspectRatio: "664 / 500" }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#1a1c1c] to-[var(--na-bg-deep)]"
        aria-hidden
      />
      <div className="na-scanline pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden />
      <div className="absolute inset-[10%] flex flex-col rounded-lg border border-[var(--na-border-subtle)] bg-[rgba(18,20,20,0.55)] p-4 backdrop-blur-sm sm:p-6">
        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--na-cyan)] opacity-80">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--na-cyan)" }}
          />
          NexaAssist OS · operational
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-16 rounded bg-[var(--na-surface)]/50" />
          <div className="h-16 rounded bg-[var(--na-surface)]/50" />
          <div className="col-span-2 h-20 rounded bg-[var(--na-surface)]/35" />
        </div>
      </div>
    </div>
  );
}
