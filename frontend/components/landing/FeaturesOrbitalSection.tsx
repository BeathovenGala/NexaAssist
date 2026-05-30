"use client";

import dynamic from "next/dynamic";
import {
  BarChart3,
  Calendar,
  Megaphone,
  MessageCircle,
  Package,
  Sparkles,
} from "lucide-react";

import type { TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { OrbitTimelinePlaceholder } from "@/components/ui/orbit-timeline-placeholder";

import { FEATURES_SECTION, PILLARS, SPLINE_ORBIT_SCENE } from "./copy";
import { MarketingReveal } from "./MarketingReveal";

const RadialOrbitalTimeline = dynamic(
  () =>
    import("@/components/ui/radial-orbital-timeline").then((m) => m.RadialOrbitalTimeline),
  {
    ssr: false,
    loading: () => <OrbitTimelinePlaceholder />,
  },
);

const ICON_MAP = {
  calendar: Calendar,
  box: Package,
  sparkles: Sparkles,
  megaphone: Megaphone,
  message: MessageCircle,
  chart: BarChart3,
} as const;

function buildTimelineData(): TimelineItem[] {
  return PILLARS.map((pillar, index) => ({
    id: index + 1,
    title: pillar.title,
    date: pillar.id.toUpperCase(),
    content: pillar.summary,
    category: "module",
    icon: ICON_MAP[pillar.icon],
    relatedIds: [
      ...((index > 0 ? [index] : []) as number[]),
      ...(index < PILLARS.length - 1 ? [index + 2] : []),
    ].filter((id) => id >= 1 && id <= PILLARS.length),
    status: index < 4 ? "completed" : index === 4 ? "in-progress" : "pending",
    energy: 55 + index * 7,
  }));
}

export function FeaturesOrbitalSection() {
  return (
    <section
      id="orbit"
      aria-labelledby="features-heading"
      className="marketing-section min-h-[90vh] bg-black"
    >
      <div className="marketing-container mb-10 text-center">
        <MarketingReveal>
          <p className="marketing-eyebrow mb-3 text-white/50">{FEATURES_SECTION.eyebrow}</p>
          <h2 id="features-heading" className="marketing-display text-3xl sm:text-4xl">
            {FEATURES_SECTION.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">{FEATURES_SECTION.subtitle}</p>
        </MarketingReveal>
      </div>
      <RadialOrbitalTimeline
        timelineData={buildTimelineData()}
        centerScene={SPLINE_ORBIT_SCENE}
      />
    </section>
  );
}
