"use client";

import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { FINAL_CTA } from "./copy";
import { LandingReveal } from "./LandingReveal";

export function FinalCta() {
  return (
    <section id="cta" aria-labelledby="cta-heading" className="landing-section pb-28">
      <div className="landing-container">
        <LandingReveal>
          <div className="landing-glass mx-auto max-w-3xl rounded-2xl px-8 py-16 text-center sm:px-12">
            <h2 id="cta-heading" className="landing-display text-3xl sm:text-4xl">
              {FINAL_CTA.title}
            </h2>
            <p className="landing-subhead mx-auto mt-4 max-w-xl">{FINAL_CTA.body}</p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <AuthModalTrigger modal="register" className="landing-btn-primary px-8">
                {FINAL_CTA.primary.label}
              </AuthModalTrigger>
              <AuthModalTrigger modal="login" className="landing-btn-secondary px-8">
                {FINAL_CTA.secondary.label}
              </AuthModalTrigger>
            </div>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--landing-muted)]">
              {FINAL_CTA.trustBullets.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="text-[var(--landing-accent)]" aria-hidden>
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
