"use client";

import { SiteIntroGate } from "./SiteIntroGate";
import { FeaturesOrbitalSection } from "./FeaturesOrbitalSection";
import { FinalCta } from "./FinalCta";
import { HowItWorksSection } from "./HowItWorksSection";
import { MarketingHero } from "./MarketingHero";
import { MarketingPricingSection } from "./MarketingPricingSection";
import { SecurityBand } from "./SecurityBand";
import { ServicesBento } from "./ServicesBento";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { TrustStrip } from "./TrustStrip";
import { ChatbotWidget } from "@/components/ui/chatbot-widget";

export function HomeExperience() {
  return (
    <SiteIntroGate>
      <div id="top" className="marketing-page relative">
        <SiteNav />

        <main>
          <MarketingHero />
          <TrustStrip />
          <FeaturesOrbitalSection />
          <ServicesBento />
          <MarketingPricingSection />
          <HowItWorksSection />
          <SecurityBand />
          <FinalCta />
        </main>

        <SiteFooter />
        <ChatbotWidget />
      </div>
    </SiteIntroGate>
  );
}
