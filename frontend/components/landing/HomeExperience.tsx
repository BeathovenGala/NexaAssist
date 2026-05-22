"use client";

import dynamic from "next/dynamic";
import gsap from "gsap";
import Lenis from "lenis";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  prefersReducedMotion,
  shouldPlayIntro,
} from "@/lib/landing/motion";
import { FOOTER } from "./copy";
import { FeatureOverview } from "./FeatureOverview";
import { FinalCta } from "./FinalCta";
import { HeroSection } from "./HeroSection";
import { LandingNav } from "./LandingNav";
import { NarrativeBlocks } from "./NarrativeBlocks";
import { ParticleIntro } from "./ParticleIntro";

const ScrollNarrative = dynamic(
  () => import("./scroll/ScrollNarrative").then((m) => m.ScrollNarrative),
  { ssr: false },
);

const REVEAL_SELECTOR =
  "[data-reveal='nav'],[data-reveal='badge'],[data-reveal='headline'],[data-reveal='subcopy'],[data-reveal='ctas'],[data-reveal='scroll-hint'],[data-reveal='feature-card']";

export function HomeExperience() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [introComplete, setIntroComplete] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  /* ── Lenis smooth scroll + GSAP ScrollTrigger integration ── */
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    });

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    setReducedMotion(reduced);

    if (reduced || !shouldPlayIntro()) {
      setIntroComplete(true);
      setShowIntro(false);
      setIntroReady(true);
      return;
    }

    gsap.set(REVEAL_SELECTOR, { opacity: 0, y: 24, filter: "blur(6px)" });
    setIntroComplete(false);
    setShowIntro(true);
    setIntroReady(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      const reduced = mq.matches;
      setReducedMotion(reduced);
      if (reduced) {
        setIntroComplete(true);
        setShowIntro(false);
        gsap.set(REVEAL_SELECTOR, { opacity: 1, y: 0, filter: "blur(0px)" });
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    setShowIntro(false);
    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }, []);

  useEffect(() => {
    if (!introComplete) return;
    let t = 0;
    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      t = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    return () => window.clearTimeout(t);
  }, [introComplete]);

  const cinematic = !reducedMotion;

  return (
    <div
      id="top"
      className={`text-[var(--na-text)] ${introReady && showIntro && !reducedMotion ? "na-intro-active" : ""}`}
      style={{ background: "#010308" }}
    >
      {introReady && showIntro && !reducedMotion ? (
        <ParticleIntro onComplete={handleIntroComplete} />
      ) : null}

      <LandingNav cinematic={cinematic} />

      <main className="relative">
        <HeroSection reducedMotion={reducedMotion} introComplete={introComplete} />

        {/* Narrative: z=10, transparent (overlayMode), floats over fixed hero bg */}
        <div className="na-narrative-float">
          <ScrollNarrative reducedMotion={reducedMotion} overlayMode={true} />
        </div>

        {/* Cards panel: z=20 solid bg — covers the fixed hero when reached */}
        <div id="features" className="na-content-panel">
          <FeatureOverview />
          <NarrativeBlocks />
          <FinalCta />
        </div>
      </main>

      <footer
        className="relative"
        style={{
          background: "rgba(4,6,20,0.98)",
          borderTop: "1px solid rgba(100,130,200,0.1)",
        }}
      >
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 py-10 text-sm sm:flex-row sm:px-12"
          style={{ color: "rgba(160,180,220,0.45)" }}
        >
          <p>{FOOTER.copyright}</p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap justify-center gap-6">
              {FOOTER.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="transition hover:text-white/80"
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
  );
}
