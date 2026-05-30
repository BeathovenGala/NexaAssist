"use client";

import { FEATURES_SECTION, PILLARS } from "./copy";
import { PillarIcon } from "./icons";
import { MarketingReveal } from "./MarketingReveal";
import { MarketingGridCard } from "@/components/ui/marketing-grid-card";

const GLOW_COLORS = ["purple", "blue", "green", "orange", "blue", "purple"] as const;

export function ServicesBento() {
  return (
    <section
      id="product"
      aria-labelledby="features-heading"
      className="relative bg-black py-24 md:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
        <MarketingReveal className="mb-14 max-w-2xl">
          <p className="marketing-eyebrow mb-3 text-white/50">{FEATURES_SECTION.eyebrow}</p>
          <h2
            id="features-heading"
            className="marketing-display text-3xl text-white sm:text-4xl md:text-5xl"
          >
            {FEATURES_SECTION.title}
          </h2>
          <p className="mt-4 text-base text-neutral-400 md:text-lg">{FEATURES_SECTION.subtitle}</p>
        </MarketingReveal>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PILLARS.map((pillar, index) => {
            const isFeatured = index === 0;
            const glowColor = GLOW_COLORS[index % GLOW_COLORS.length];
            return (
              <li key={pillar.id} className={isFeatured ? "md:col-span-2" : undefined}>
                <MarketingReveal>
                  <MarketingGridCard featured={isFeatured} glowColor={glowColor}>
                    <div className="relative flex h-full flex-col justify-between">
                      <div>
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">
                          <PillarIcon name={pillar.icon} size={28} />
                        </div>
                        <h3 className="text-2xl font-semibold text-white md:text-3xl">
                          {pillar.title}
                        </h3>
                        <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-300 md:text-lg">
                          {pillar.summary}
                        </p>
                      </div>
                      <p className="mt-4 max-w-lg text-sm text-neutral-500 md:text-base">
                        {pillar.description}
                      </p>
                    </div>
                  </MarketingGridCard>
                </MarketingReveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
