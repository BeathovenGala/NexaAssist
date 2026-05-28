"use client";

import Link from "next/link";
import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { HERO, HERO_VIDEO_BADGE } from "./copy";
import { HeroLightBeam } from "./HeroLightBeam";

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="landing-hero relative z-2 flex min-h-[100dvh] flex-col overflow-hidden"
    >
      <HeroLightBeam />

      <div className="landing-hero__content relative z-10 flex flex-1 flex-col pt-28 pb-16 sm:pt-32">
        <div className="landing-container flex flex-1 flex-col justify-center">
          <div className="landing-hero-copy mx-auto flex max-w-3xl flex-col items-center text-center lg:mx-0 lg:max-w-2xl lg:items-start lg:text-left">
            <a
              href={HERO_VIDEO_BADGE.href}
              data-hero-item
              className="landing-glass mb-8 inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:border-white/20"
              style={{ color: "var(--landing-text)" }}
            >
              <span
                className="flex h-8 w-12 items-center justify-center rounded bg-black/40 text-[10px] text-[var(--landing-muted)]"
                aria-hidden
              >
                ▶
              </span>
              {HERO_VIDEO_BADGE.label}
            </a>

            <h1
              id="hero-heading"
              data-hero-item
              className="landing-display landing-headline text-balance"
            >
              {HERO.headline}
            </h1>

            <p data-hero-item className="landing-subhead mt-6 max-w-xl text-pretty">
              {HERO.subcopy}
            </p>

            <div
              data-hero-item
              className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              <AuthModalTrigger
                modal="register"
                className="landing-btn-primary landing-btn-primary-glow px-8"
              >
                {HERO.ctas.primary.label}
              </AuthModalTrigger>
              <AuthModalTrigger modal="login" className="landing-btn-secondary px-8">
                {HERO.ctas.secondary.label}
              </AuthModalTrigger>
            </div>

            <p data-hero-item className="mt-6 text-sm">
              <Link
                href={HERO.ctas.tertiary.href}
                className="font-medium text-[var(--landing-accent)] underline-offset-4 hover:underline"
              >
                {HERO.ctas.tertiary.label}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
