"use client";

import dynamic from "next/dynamic";

const HeroBeamCanvas = dynamic(
  () => import("./hero/HeroBeamCanvas").then((m) => m.HeroBeamCanvas),
  { ssr: false },
);

/** Flowing light pillar — scoped to the hero section only */
export function HeroLightBeam() {
  return (
    <div className="landing-hero-beam" aria-hidden>
      <HeroBeamCanvas />
      <div className="landing-hero-beam__scatter" />
      <div className="landing-hero-beam__grid" />
      <div className="landing-hero-beam__fade-bottom" />
      <div className="landing-hero-beam__vignette" />
    </div>
  );
}
