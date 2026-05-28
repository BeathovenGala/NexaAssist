"use client";

import { FOOTER } from "./copy";
import { FeatureShowcase } from "./FeatureShowcase";
import { FinalCta } from "./FinalCta";
import { HeroSection } from "./HeroSection";
import { HowItWorks } from "./HowItWorks";
import { LandingMotionProvider } from "./LandingMotionProvider";
import { LandingNav } from "./LandingNav";
import { LandingPillars } from "./LandingPillars";
import { SecurityBand } from "./SecurityBand";
import { PricingSection } from "./PricingSection";
import { TrustStrip } from "./TrustStrip";

export function HomeExperience() {
  return (
    <LandingMotionProvider>
      <div id="top" className="landing-page" data-theme="dark">
        <div className="landing-starfield" aria-hidden />
        <div className="landing-grain" aria-hidden />

        <LandingNav />

        <main className="relative z-2">
          <HeroSection />
          <div className="landing-content-stack">
            <TrustStrip />
            <LandingPillars />
            <FeatureShowcase />
            <PricingSection />
            <HowItWorks />
            <SecurityBand />
            <FinalCta />
          </div>
        </main>

        <footer
          className="relative z-2 border-t py-10"
          style={{ borderColor: "var(--landing-border)" }}
        >
          <div className="landing-container flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
            <p className="text-[var(--landing-muted)]">{FOOTER.copyright}</p>
            <nav aria-label="Footer">
              <ul className="flex flex-wrap justify-center gap-6">
                {FOOTER.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[var(--landing-muted)] transition hover:text-[var(--landing-text)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
      </div>
    </LandingMotionProvider>
  );
}
