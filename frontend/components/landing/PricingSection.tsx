"use client";

import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { PRICING_SECTION, PRICING_TIERS } from "./copy";
import { LandingReveal } from "./LandingReveal";

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="landing-section landing-content-panel"
    >
      <div className="landing-container">
        <LandingReveal className="mx-auto max-w-2xl text-center">
          <p className="landing-eyebrow mb-3">{PRICING_SECTION.eyebrow}</p>
          <h2 id="pricing-heading" className="landing-display text-3xl sm:text-4xl">
            {PRICING_SECTION.title}
          </h2>
          <p className="landing-subhead mt-4">{PRICING_SECTION.subtitle}</p>
        </LandingReveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <LandingReveal key={tier.id}>
              <article
                className={`landing-pricing-card flex h-full flex-col p-6 sm:p-8 ${
                  tier.highlighted ? "landing-pricing-card--featured" : ""
                }`}
              >
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--landing-text)]">{tier.name}</h3>
                  <p className="mt-2 text-sm text-[var(--landing-muted)]">{tier.description}</p>
                </div>
                <div className="mb-6">
                  <p className="landing-display text-4xl tracking-tight">
                    {tier.price}
                    {tier.period ? (
                      <span className="text-base font-normal text-[var(--landing-muted)]">
                        {tier.period}
                      </span>
                    ) : null}
                  </p>
                </div>
                <ul className="mb-8 flex flex-1 flex-col gap-3 text-sm text-[var(--landing-muted)]">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--landing-accent)]"
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <AuthModalTrigger
                  modal={tier.ctaModal}
                  className={
                    tier.highlighted
                      ? "landing-btn-primary w-full justify-center"
                      : "landing-btn-secondary w-full justify-center"
                  }
                >
                  {tier.ctaLabel}
                </AuthModalTrigger>
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
