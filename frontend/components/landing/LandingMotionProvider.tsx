"use client";

import gsap from "gsap";
import Lenis from "lenis";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { MOTION, prefersReducedMotion } from "@/lib/landing/motion";

type LandingMotionContextValue = {
  reducedMotion: boolean;
};

const LandingMotionContext = createContext<LandingMotionContextValue>({
  reducedMotion: false,
});

export function useLandingMotion() {
  return useContext(LandingMotionContext);
}

type LandingMotionProviderProps = {
  children: ReactNode;
};

export function LandingMotionProvider({ children }: LandingMotionProviderProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    reducedRef.current = reduced;

    if (reduced) {
      gsap.set("[data-hero-item]", { opacity: 1, y: 0, filter: "blur(0px)" });
      gsap.set(".landing-nav-pill", { opacity: 1, y: 0 });
      gsap.set(".landing-hero-stage", {
        rotateX: 0,
        y: 0,
        scale: 1,
      });
      document.querySelectorAll("[data-landing-reveal]").forEach((el) => {
        el.classList.add("is-visible");
      });
      return;
    }

    let lenis: Lenis | null = null;
    let lenisRaf: ((time: number) => void) | null = null;

    const init = async () => {
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      lenis.on("scroll", ScrollTrigger.update);
      lenisRaf = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(lenisRaf);
      gsap.ticker.lagSmoothing(0);

      if (progressRef.current) {
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${self.progress})`;
            }
          },
        });
      }

      const navPill = document.querySelector(".landing-nav-micro");
      if (navPill) {
        gsap.to(navPill, {
          opacity: 1,
          y: 0,
          duration: MOTION.navDuration,
          ease: MOTION.heroEase,
          delay: 0.1,
          onComplete: () => navPill.classList.add("is-visible"),
        });
      }

      const heroItems = gsap.utils.toArray<HTMLElement>("[data-hero-item]");
      if (heroItems.length > 0) {
        gsap.to(heroItems, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: MOTION.heroDuration,
          stagger: MOTION.heroStagger,
          ease: MOTION.heroEase,
          delay: 0.15,
        });
      }

      ScrollTrigger.refresh();
    };

    void init();

    return () => {
      void import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      });
      if (lenisRaf) {
        gsap.ticker.remove(lenisRaf);
      }
      lenis?.destroy();
    };
  }, []);

  return (
    <LandingMotionContext.Provider value={{ reducedMotion: reducedRef.current }}>
      <div ref={progressRef} className="landing-scroll-progress" aria-hidden />
      {children}
    </LandingMotionContext.Provider>
  );
}
