"use client";

import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { HERO } from "./copy";

type HeroSectionProps = {
  reducedMotion: boolean;
  introComplete?: boolean;
};

const SPLINE_SCENE_URL =
  "https://my.spline.design/reededliquidglassprismherosectionconcept-njthe1f6VRebROxjFcPHUn70/";

const FEATURE_PILLS = [
  "Multi-tenant workspace",
  "RBAC & invite flows",
  "AI assistant built-in",
  "Real-time scheduling",
] as const;

export function HeroSection({ reducedMotion: _reducedMotion }: HeroSectionProps) {
  return (
    <>
      {/* ── Fixed background layer ──────────────────────────────────────────
          position:fixed keeps the Spline scene at z=0 for the entire
          time the user scrolls through the hero text + all narrative
          chapters. It disappears only when the cards panel (z=20) covers it.
          No parallax — scene stays completely still.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="na-hero-fixed-bg" aria-hidden>
        <iframe
          title="Liquid glass prism 3D scene"
          src={SPLINE_SCENE_URL}
          frameBorder={0}
          width="100%"
          height="100%"
          className="absolute inset-0 block h-full w-full border-0"
          style={{ pointerEvents: "none" }}
          tabIndex={-1}
          aria-hidden
          allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope"
        />

        {/* Left gradient — readable text on left, Spline visible on right */}
        <div
          className="pointer-events-none absolute inset-0 z-10 hidden lg:block"
          style={{
            background:
              "linear-gradient(100deg, rgba(1,3,8,0.97) 0%, rgba(1,3,8,0.88) 24%, rgba(1,3,8,0.55) 46%, rgba(1,3,8,0.18) 64%, transparent 82%)",
          }}
        />

        {/* Mobile overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-10 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(1,3,8,0.78) 0%, rgba(1,3,8,0.52) 60%, rgba(1,3,8,0.75) 100%)",
          }}
        />

        {/* Nav fade at top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28"
          style={{
            background:
              "linear-gradient(to bottom, rgba(1,3,8,0.70) 0%, transparent 100%)",
          }}
        />

      </div>

      {/* ── Hero text section ───────────────────────────────────────────────
          Normal document flow — one viewport tall. As the user scrolls the
          text moves upward and exits the viewport naturally with no overlap
          against the narrative chapters that follow.
      ─────────────────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        aria-labelledby="hero-heading"
        className="na-hero-text-section"
      >
        <div className="relative z-10 flex h-full w-full items-center">
          <div className="w-full max-w-[640px] px-6 sm:px-10 lg:px-20 xl:px-24">

            {/* Badge */}
            <p
              data-reveal="badge"
              className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
              style={{ color: "rgba(160,210,255,0.82)" }}
            >
              <span
                className="inline-block h-1 w-6 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(80,160,255,0.8), rgba(120,80,255,0.8))",
                }}
                aria-hidden
              />
              {HERO.badge}
            </p>

            {/* Headline */}
            <h1
              id="hero-heading"
              data-reveal="headline"
              className="na-display text-5xl leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]"
              style={{
                textShadow:
                  "0 0 100px rgba(80,140,255,0.5), 0 0 30px rgba(80,140,255,0.25), 0 2px 4px rgba(0,0,0,0.6)",
              }}
            >
              {HERO.headline}
            </h1>

            {/* Divider accent */}
            <div
              className="my-7 h-px w-16"
              style={{
                background:
                  "linear-gradient(90deg, rgba(80,140,255,0.65), rgba(120,80,255,0.4), transparent)",
              }}
              aria-hidden
            />

            {/* Sub-copy */}
            <p
              data-reveal="subcopy"
              className="max-w-md text-base leading-[1.7] sm:text-[1.0625rem]"
              style={{ color: "rgba(185,205,245,0.76)" }}
            >
              {HERO.subcopy}
            </p>

            {/* CTAs */}
            <div
              data-reveal="ctas"
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <AuthModalTrigger
                modal="register"
                className="group relative inline-flex min-h-[48px] items-center justify-center overflow-hidden rounded-full px-8 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.04]"
                style={{
                  background:
                    "linear-gradient(135deg, #3c72e8 0%, #6232d4 100%)",
                  boxShadow:
                    "0 0 32px rgba(60,114,232,0.55), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                <span className="relative z-10 tracking-wide">
                  {HERO.ctas.primary.label}
                </span>
                <span
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(135deg, #5590ff 0%, #7848e8 100%)",
                  }}
                />
              </AuthModalTrigger>

              <AuthModalTrigger
                modal="login"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border px-8 py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.04] hover:bg-white/[0.06]"
                style={{
                  borderColor: "rgba(160,190,255,0.28)",
                  color: "rgba(205,220,255,0.9)",
                  backdropFilter: "blur(10px)",
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: "0 0 16px rgba(100,150,255,0.08)",
                }}
              >
                {HERO.ctas.secondary.label}
              </AuthModalTrigger>
            </div>

            {/* Feature pills */}
            <div
              data-reveal="ctas"
              className="mt-8 flex flex-wrap gap-2"
            >
              {FEATURE_PILLS.map((label) => (
                <span
                  key={label}
                  className="rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-wide"
                  style={{
                    border: "1px solid rgba(100,150,255,0.15)",
                    background: "rgba(20,30,80,0.4)",
                    color: "rgba(175,210,255,0.68)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NexaAssist corner tag — fixed above hero, narrative, and content layers */}
      <div
        className="pointer-events-none fixed bottom-8 right-8 z-[45] hidden lg:flex flex-col items-end gap-1.5"
        aria-hidden
      >
        <span
          className="font-mono text-[13px] font-medium uppercase tracking-[0.22em]"
          style={{ color: "rgba(140,190,255,0.42)" }}
        >
          NexaAssist
        </span>
        <span
          className="h-px w-20"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(100,160,255,0.35))",
          }}
        />
      </div>
    </>
  );
}
