"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

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

const CustomIcon = ({ src, alt, size }: { src: string; alt: string; size?: number }) => (
  <Image src={src} alt={alt} width={size || 48} height={size || 48} className="object-contain" />
);

const ICON_MAP = {
  calendar: (props: any) => <CustomIcon src="/newicons/appointment.png" alt="calendar" {...props} />,
  box: (props: any) => <CustomIcon src="/newicons/inventory_2897785.png" alt="inventory" {...props} />,
  sparkles: (props: any) => <CustomIcon src="/newicons/robot_10935645.png" alt="robot" {...props} />,
  megaphone: (props: any) => <CustomIcon src="/newicons/announcments.png" alt="announcements" {...props} />,
  message: (props: any) => <CustomIcon src="/newicons/whatsapp.jpg" alt="whatsapp" {...props} />,
  chart: (props: any) => <CustomIcon src="/newicons/analytics.png" alt="analytics" {...props} />,
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
      className="marketing-section min-h-[90vh] bg-[var(--bg-section-2)]"
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
